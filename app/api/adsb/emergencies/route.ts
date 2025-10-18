export const dynamic = 'force-dynamic';

type Flight = { hex: string; flight: string };
type Trace = { step: string; url?: string; error?: string };

function parseStates(json: any): Flight[] {
  const st: any[] = Array.isArray(json?.states) ? json.states : [];
  const out: Flight[] = [];
  for (const s of st) {
    if (!Array.isArray(s)) continue;
    const hex = String(s[0] || '').trim();
    const callsign = String(s[1] || '').trim();
    const squawk = String(s[14] ?? '').trim();
    if (squawk === '7700') {
      out.push({ hex, flight: callsign || hex.toUpperCase() });
    }
  }
  return out;
}

async function fetchJSON(url: string, init?: RequestInit) {
  const r = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Accept': 'application/json, text/plain;q=0.8, */*;q=0.5',
      'User-Agent': 'Mozilla/5.0',
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!r.ok) {
    const body = await r.text().catch(()=>'');
    const err = new Error(`http_${r.status}`);
    (err as any).status = r.status;
    (err as any).body = body.slice(0,300);
    throw err;
  }
  return r.json();
}

// Bounding box do Brasil (ajuste se quiser ampliar/reduzir)
const BR_BBOX = { lamin: -35, lamax: 6, lomin: -74, lomax: -34 };

async function fetchOpenSkyBBox(trace: Trace[]) {
  const u = process.env.OPEN_SKY_USER || '';
  const p = process.env.OPEN_SKY_PASS || '';

  const qs = new URLSearchParams({
    lamin: String(BR_BBOX.lamin),
    lamax: String(BR_BBOX.lamax),
    lomin: String(BR_BBOX.lomin),
    lomax: String(BR_BBOX.lomax),
  });

  const url = `https://opensky-network.org/api/states/all?${qs}`;
  const headers: Record<string,string> = {};
  if (u && p) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
  }

  try {
    const j = await fetchJSON(url, { headers });
    const flights = parseStates(j);
    trace.push({ step: flights.length ? 'opensky_ok_7700' : 'opensky_ok_sem_7700', url });
    return flights;
  } catch (e:any) {
    trace.push({ step: 'opensky_error', url, error: String(e?.message || e) });
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const demo  = searchParams.get('demo') === '1';
  const debug = searchParams.get('debug') === '1';

  if (demo) {
    return Response.json({
      ok: true,
      count: 1,
      flights: [{ hex: 'abc123', flight: 'TEST7700' }],
      source: 'demo',
      ts: Date.now(),
    });
  }

  const trace: Trace[] = [];

  // apenas OpenSky com BBOX (estável e leve)
  const flights = await fetchOpenSkyBBox(trace);

  // Se falhar ou vier vazio, retornamos ok:true, count:0 (UI fica silenciosa)
  return Response.json({
    ok: true,
    count: flights.length,
    flights,
    source: 'opensky',
    ts: Date.now(),
    ...(debug ? { trace } : {}),
  });
}
