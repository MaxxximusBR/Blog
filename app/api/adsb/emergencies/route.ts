import { NextResponse } from 'next/server';

// Configure via ENVs no Vercel se quiser outra instância:
// ex.: https://seu-tar1090/data/aircraft.json
const ADSB_JSON = process.env.ADSB_JSON || 'https://globe.adsb.fi/data/aircraft.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const r = await fetch(ADSB_JSON, { cache: 'no-store' });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `HTTP ${r.status}` }, { status: 200 });
    }
    const j = await r.json();
    const arr = Array.isArray(j?.aircraft) ? j.aircraft : [];

    const list = arr.filter((a: any) => a?.squawk === '7700' || a?.emergency);
    const flights = list.map((a: any) => ({
      hex: a?.hex,
      flight: (a?.flight || '').trim(),
      squawk: a?.squawk || null,
      alt: a?.alt_baro ?? null,
      lat: a?.lat ?? null,
      lon: a?.lon ?? null,
    }));

    return NextResponse.json({
      ok: true,
      count: flights.length,
      flights,
      source: ADSB_JSON,
      ts: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
