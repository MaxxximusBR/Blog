// app/api/adsb/emergencies/route.ts
import { NextResponse } from 'next/server';

type Tar1090Aircraft = {
  hex?: string;
  flight?: string;
  squawk?: string;       // tar1090 costuma entregar string
  r?: string;            // às vezes callsign vem em "r"
  [k: string]: any;
};

const DEF_SOURCES = [
  process.env.ADSB_JSON?.trim(),                     // sua instância/mirror (opção preferida)
  'https://globe.adsb.fi/data/aircraft.json',        // fallback (pode dar 403)
  // adicione mais mirrors aqui se quiser
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

    // Modo DEMO para testar a UI: /api/adsb/emergencies?demo=1
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

        // ✅ corrige o erro de tipos: força comparação como string
        const emerg = ac.filter((a) => String(a?.squawk) === '7700');

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
