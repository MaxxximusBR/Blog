// app/api/adsb/emergencies/route.ts
export const dynamic = 'force-dynamic';

type BBox = { lamin:number; lomin:number; lamax:number; lomax:number };
function clamp(n:number, min:number, max:number){ return Math.max(min, Math.min(max, n)); }
function bboxFromCenter(lat:number, lon:number, r:number): BBox {
  const lamin = clamp(lat - r, -89, 89);
  const lamax = clamp(lat + r, -89, 89);
  const lomin = clamp(lon - r, -179, 179);
  const lomax = clamp(lon + r,  -179, 179);
  return { lamin, lomin, lamax, lomax };
}
function resolveBBox(url: URL): BBox {
  const gp = (k:string) => url.searchParams.get(k);
  const hasBBox = ['lamin','lomin','lamax','lomax'].every(k => gp(k) !== null);
  if (hasBBox) {
    return {
      lamin: clamp(Number(gp('lamin')), -89, 89),
      lomin: clamp(Number(gp('lomin')), -179, 179),
      lamax: clamp(Number(gp('lamax')), -89, 89),
      lomax: clamp(Number(gp('lomax')), -179, 179),
    };
  }
  const lat = gp('lat') != null ? Number(gp('lat')) : -30.03;
  const lon = gp('lon') != null ? Number(gp('lon')) : -51.22;
  const r   = gp('r')   != null ? Number(gp('r'))   : 5;
  return bboxFromCenter(lat, lon, r);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { lamin, lomin, lamax, lomax } = resolveBBox(url);

    const qs = new URLSearchParams({
      lamin: String(lamin), lomin: String(lomin),
      lamax: String(lamax), lomax: String(lomax),
    });
    if (url.searchParams.get('debug')) qs.set('debug','1');

    const res = await fetch(`/api/adsb/upstream?${qs.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.text().catch(()=> '');
      return new Response(JSON.stringify({
        ok:false, error:'upstream_fail', status:res.status, body: body.slice(0,600)
      }), { status: 502, headers: { 'content-type':'application/json' }});
    }

    // shape normalizado pelo /upstream
    const j = await res.json();
    const ac: any[] = Array.isArray(j?.aircraft) ? j.aircraft : [];

    const emerg = ac.filter(a => {
      const s = a?.squawk;
      if (s == null) return false;
      // aceita '7700', 7700, '07700', etc.
      const str = String(s).replace(/\D+/g, '');
      return str === '7700';
    });

    const flights = emerg.map(a => ({
      hex: String(a?.hex || '').toLowerCase(),
      flight: (a?.flight || a?.callsign || '').trim(),
      squawk: a?.squawk ?? null,
      lat: typeof a?.lat === 'number' ? a.lat : undefined,
      lon: typeof a?.lon === 'number' ? a.lon : undefined,
    }));

    return new Response(JSON.stringify({
      ok:true,
      backend: j?.source || 'upstream',
      count: flights.length,
      flights,
    }), { headers: { 'content-type':'application/json' }});
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, error:String(e?.message || e) }), {
      status: 500, headers: { 'content-type':'application/json' }
    });
  }
}
