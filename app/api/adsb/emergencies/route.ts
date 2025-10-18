// app/api/adsb/emergencies/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function num(x: any, d: number) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // BBOX (obrigatório para upstream)
  const lamin = num(url.searchParams.get('lamin'), NaN);
  const lomin = num(url.searchParams.get('lomin'), NaN);
  const lamax = num(url.searchParams.get('lamax'), NaN);
  const lomax = num(url.searchParams.get('lomax'), NaN);

  // fallback: se não vier bbox, usa uma área moderada no Sudeste BR
  const hasBox = [lamin, lomin, lamax, lomax].every(Number.isFinite);
  const a = hasBox ? { lamin, lomin, lamax, lomax }
                   : { lamin: -35, lomin: -74, lamax: 6, lomax: -34 }; // BR amplo

  const demo = url.searchParams.get('demo') === '1';

  try {
    const qs = new URLSearchParams({
      lamin: String(a.lamin),
      lomin: String(a.lomin),
      lamax: String(a.lamax),
      lomax: String(a.lomax),
    }).toString();

    // Usa seu agregador (OpenSky público / OAuth / fallback tar1090 via proxy se configurado)
    const r = await fetch(`${process.env.NEXT_PUBLIC_ADSB_UPSTREAM ?? ''}/api/adsb/upstream?${qs}`, {
      cache: 'no-store',
    }).catch(() => null);

    if (!r || !r.ok) {
      return NextResponse.json({ ok: false, error: 'upstream_failed' }, { status: 502 });
    }

    const j = await r.json().catch(() => ({} as any));
    const ac = Array.isArray(j?.aircraft) ? j.aircraft : [];

    // filtra 7700 (string/number)
    const emerg = ac.filter(
      (a: any) => a?.squawk === '7700' || a?.squawk === 7700
    );

    const flights =
      emerg.map((a: any) => ({
        hex: String(a?.hex || '').toLowerCase(),
        flight: String(a?.flight || '').trim(),
      })) ?? [];

    // demo opcional
    if (demo && flights.length === 0) {
      flights.push({ hex: 'demo7700', flight: 'DEMO7700' });
    }

    return NextResponse.json({ ok: true, count: flights.length, flights });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
