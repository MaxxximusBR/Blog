// app/api/adsb/upstream/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function bool(v: string | null) {
  return v === '1' || v?.toLowerCase() === 'true';
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Variáveis de ambiente
  const UPSTREAM =
    process.env.ADSB_UPSTREAM || 'https://globe.adsb.fi/data/aircraft.json';
  const REFERER =
    process.env.ADSB_REFERER || 'https://globe.adsb.fi/';

  const headers: Record<string, string> = {
    // Alguns alvos checam o Referer
    Referer: REFERER,
    // Evita negociações estranhas
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
    'User-Agent':
      'OVNIsBlog/1.0 (+https://github.com/MaxxximusBR/Blog) server-fetch',
  };

  try {
    const r = await fetch(UPSTREAM, {
      method: 'GET',
      headers,
      // não deixar cachear no edge/host
      cache: 'no-store',
      // timeout básico (na infra Vercel funciona como abort no lado deles)
      // @ts-ignore
      next: { revalidate: 0 },
    });

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, status: r.status, error: `Upstream HTTP ${r.status}` },
        { status: 502 }
      );
    }

    // Se quiser depurar o JSON "puro"
    if (bool(url.searchParams.get('raw'))) {
      const text = await r.text();
      return new NextResponse(text, {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    const j = await r.json();
    return NextResponse.json(
      { ok: true, source: 'upstream', ts: Date.now(), ...j },
      {
        status: 200,
        headers: { 'cache-control': 'no-store' },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 502 }
    );
  }
}
