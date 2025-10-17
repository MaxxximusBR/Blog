// app/api/adsb/emergencies/route.ts
import { NextResponse } from 'next/server';

type Tar1090Aircraft = {
  hex?: string;
  flight?: string;
  squawk?: string;
  r?: string; // às vezes "r" vem como callsign
  [k: string]: any;
};

const DEF_SOURCES = [
  // Tente primeiro o que você definir em ADSB_JSON (pode ser sua instância tar1090)
  process.env.ADSB_JSON?.trim(),
  // Tente o padrão do ADSB.fi (pode dar 403 em alguns provedores)
  'https://globe.adsb.fi/data/aircraft.json',
  // Coloque aqui mirrors alternativos, se tiver:
  // 'https://SEU-MIRROR/data/aircraft.json',
].filter(Boolean) as string[];

function pickCallsign(a: Tar1090Aircraft) {
  const raw = (a.flight || a.r || '').trim();
  return raw ? raw.replace(/\s+/g, '') : undefined;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);

    // Modo DEMO para testar o badge na UI: /api/adsb/emergencies?demo=1
    if (u.searchParams.get('demo') === '1') {
      return NextResponse.json({
        ok: true,
        count: 1,
        flights: [{ hex: 'abc123', flight: 'TEST7700' }],
        source: 'demo',
        ts: Date.now(),
      });
    }

    const sources = DEF_SOURCES.length
      ? DEF_SOURCES
      : ['https://globe.adsb.fi/data/aircraft.json'];

    const headers: Record<string, string> = {
      'User-Agent':
        'OVNIS2025/1.0 (+https://github.com/) Mozilla/5.0; Vercel/Next.js',
      'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
      // alguns CDNs exigem um referer plausível
      'Referer': 'https://globe.adsb.fi/',
    };

    let lastErr: string | null = null;

    for (const src of sources) {
      try {
        const r = await fetch(src, { headers, cache: 'no-store' });
        if (!r.ok) {
          lastErr = `HTTP ${r.status}`;
          continue;
        }
        const j = (await r.json()) as { aircraft?: Tar1090Aircraft[] };

        const ac = Array.isArray(j?.aircraft) ? j.aircraft : [];
        const emerg = ac.filter(
          (a) => a?.squawk === '7700' || a?.squawk === 7700
        );

        const flights = emerg.map((a) => ({
          hex: a.hex,
          flight: pickCallsign(a),
        }));

        return NextResponse.json({
          ok: true,
          count: flights.length,
          flights,
          source: src,
          ts: Date.now(),
        });
      } catch (e: any) {
        lastErr = e?.message || String(e);
        continue;
      }
    }

    return NextResponse.json(
      { ok: false, error: lastErr || 'no_source_ok' },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
