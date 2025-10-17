// app/api/adsb/emergencies/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Flight = { hex: string; flight: string | null };

function pickFlightsFromAdsb(j: any): Flight[] {
  // tar1090/aircraft.json -> { aircraft: [ { squawk, hex, flight, ... }, ... ] }
  const arr = Array.isArray(j?.aircraft) ? j.aircraft : [];
  return arr
    .filter((a: any) => {
      if (!a) return false;
      const sq = (a.squawk ?? '').toString();
      // aceita “7700” como string ou número:
      return sq === '7700' || sq === '07600' || +sq === 7700;
    })
    .map((a: any) => ({
      hex: String(a.hex || '').trim(),
      flight: (a.flight ?? a.callsign ?? '').toString().trim() || null,
    }));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.has('debug');
  const demo  = url.searchParams.has('demo');

  // Fonte principal: seu proxy interno para o ADSB (definido via env)
  const ADSB_JSON = process.env.ADSB_JSON || '/api/adsb/upstream';

  // --- DEMO curto, para testar a UI ---
  if (demo) {
    return NextResponse.json({
      ok: true,
      count: 1,
      flights: [{ hex: 'abc123', flight: 'TEST7700' }],
      source: 'demo',
      ts: Date.now(),
    });
  }

  const trace: any[] = []; // coletar diagnóstico quando ?debug=1

  // 1) Tenta ADSB primeiro (única fonte obrigatória)
  try {
    const r = await fetch(ADSB_JSON, { cache: 'no-store' });
    trace.push({ step: 'adsb_fetch', status: r.status });
    if (!r.ok) throw new Error(`ADSB ${r.status}`);
    const j = await r.json();
    const flights = pickFlightsFromAdsb(j);
    trace.push({ step: 'adsb_parsed', flights: flights.length });

    return NextResponse.json({
      ok: true,
      count: flights.length,
      flights,
      source: 'adsb',
      ts: Date.now(),
      ...(debug ? { trace } : {}),
    });
  } catch (e: any) {
    trace.push({ step: 'adsb_error', error: String(e?.message || e) });
  }

  // 2) (Opcional) Se quiser manter OpenSky como fallback, descomente abaixo:
  // try {
  //   const r = await fetch(
  //     `${process.env.NEXT_PUBLIC_ORIGIN ?? ''}/api/opensky?lat=-30.03&lon=-51.22&r=5`,
  //     { cache: 'no-store' }
  //   );
  //   trace.push({ step: 'opensky_fetch', status: r.status });
  //   if (r.ok) {
  //     const j = await r.json();
  //     // OpenSky não tem squawk nesta sua rota; normalmente não serve para 7700.
  //   } else {
  //     throw new Error(`OpenSky ${r.status}`);
  //   }
  // } catch (e: any) {
  //   trace.push({ step: 'opensky_error', error: String(e?.message || e) });
  // }

  // Se chegou aqui, falhou todas as fontes
  return NextResponse.json(
    {
      ok: false,
      error: 'All sources failed',
      ...(debug ? { trace } : {}),
    },
    { status: 500 }
  );
}
