// app/api/adsb/upstream/route.ts
export const dynamic = 'force-dynamic';

type BBox = { lamin:number; lomin:number; lamax:number; lomax:number };

function clamp(n:number, min:number, max:number){ return Math.max(min, Math.min(max, n)); }

/** Constrói bbox a partir de lat/lon + raio (graus) */
function bboxFromCenter(lat:number, lon:number, r:number): BBox {
  const lamin = clamp(lat - r, -89, 89);
  const lamax = clamp(lat + r, -89, 89);
  const lomin = clamp(lon - r, -179, 179);
  const lomax = clamp(lon + r, -179, 179);
  return { lamin, lomin, lamax, lomax };
}

/** Tenta ler bbox; se não vier, usa centro+raio; se nada, usa um bbox padrão BR-Sul */
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
  const r   = gp('r')   != null ? Number(gp('r'))   : 5;   // ~5° ~ 550km
  return bboxFromCenter(lat, lon, r);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { lamin, lomin, lamax, lomax } = resolveBBox(url);

    const upstream = process.env.ADSB_UPSTREAM?.replace(/\/+$/,'');
    if (!upstream) {
      // Sem worker? responda shape vazio mas ok=false
      return new Response(JSON.stringify({
        ok:false, status:503, error:'ADSB_UPSTREAM_missing',
        hint:'Defina ADSB_UPSTREAM no Vercel apontando para seu Cloudflare Worker',
      }), { status: 503, headers: { 'content-type':'application/json' }});
    }

    const qs = new URLSearchParams({
      lamin: String(lamin),
      lomin: String(lomin),
      lamax: String(lamax),
      lomax: String(lomax),
    });
    // Opcional: debug repassado
    if (url.searchParams.get('debug')) qs.set('debug','1');

    const r = await fetch(`${upstream}?${qs.toString()}`, {
      // importante p/ alguns upstreams
      headers: {
        'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
        'User-Agent': 'OVNIs2025/adsb-upstream',
      },
      cache: 'no-store',
    });

    if (!r.ok) {
      const body = await r.text().catch(()=> '');
      return new Response(JSON.stringify({
        ok:false,
        status:r.status,
        error:'Upstream HTTP '+r.status,
        body: body.slice(0, 1000),
      }), { status: 400, headers: { 'content-type':'application/json' }});
    }

    // Normalizamos a saída do worker para { now, aircraft: [...] }
    const j = await r.json().catch(() => ({}));
    const aircraft = Array.isArray(j?.aircraft) ? j.aircraft : [];
    return new Response(JSON.stringify({
      ok:true,
      now: j?.now ?? Math.floor(Date.now()/1000),
      aircraft,
      source: j?.source ?? 'upstream',
    }), { headers: { 'content-type':'application/json' }});
  } catch (e:any) {
    return new Response(JSON.stringify({
      ok:false, status:500, error: String(e?.message || e)
    }), { status: 500, headers: { 'content-type':'application/json' }});
  }
}
