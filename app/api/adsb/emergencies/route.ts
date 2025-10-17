import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);

  // 1) fonte "primária" (tar1090/json) definida por env ou padrão /api/adsb/upstream
  const envJson = process.env.ADSB_JSON || '/api/adsb/upstream';
  const primary = envJson.startsWith('http') ? envJson : new URL(envJson, url.origin).href;

  // 2) fallback: seu route de OpenSky (Brasil central como exemplo)
  //    ajuste os valores se quiser outro centro/raio.
  const openskyLocal = new URL('/api/opensky', url.origin); // <- use o caminho real onde seu route está
  openskyLocal.searchParams.set('lat', '-14.2'); // centro aproximado BR
  openskyLocal.searchParams.set('lon', '-51.9');
  openskyLocal.searchParams.set('r', '20');      // raio "grande" (~20º) para cobrir o país
  const fallback = openskyLocal.href;

  // Função utilitária de fetch+normalize
  async function getFromTar1090Like(src: string) {
    const r = await fetch(src, { cache: 'no-store' });
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    // esperamos { aircraft:[{hex,flight,squawk}...] }
    const arr = Array.isArray(j?.aircraft) ? j.aircraft : [];
    return {
      ok: true,
      aircraft: arr.map((a:any) => ({
        hex: (a?.hex || a?.icao || '').toString(),
        flight: (a?.flight || a?.callsign || '').toString().trim(),
        squawk: (a?.squawk || '').toString(),
      })),
      source: j?.source || 'tar1090',
    };
  }

  async function getFromYourOpenSky(src: string) {
    const r = await fetch(src, { cache: 'no-store' });
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    // seu route retorna { ok:true, items:[{hex, callsign, squawk, ...}] }
    const items = Array.isArray(j?.items) ? j.items : [];
    return {
      ok: true,
      aircraft: items.map((it:any) => ({
        hex: (it?.hex || '').toString(),
        flight: (it?.callsign || '').toString().trim(),
        squawk: (it?.squawk || '').toString(),
      })),
      source: 'opensky-local',
    };
  }

  // Tenta primary → fallback
  let data = await getFromTar1090Like(primary);
  if (!data.ok) data = await getFromYourOpenSky(fallback);

  if (!data.ok) {
    return NextResponse.json(
      { ok: false, error: `All sources failed (${data.status || 'unknown'})` },
      { status: 502 }
    );
  }

  // Filtra SQUAWK 7700
  const emerg = (data.aircraft || []).filter((a:any) => (a?.squawk || '') === '7700');
  const flights = emerg.map((a:any) => ({ hex: a.hex, flight: a.flight }));

  return NextResponse.json({
    ok: true,
    count: flights.length,
    flights,
    source: data.source,
    ts: Date.now(),
  });
}
