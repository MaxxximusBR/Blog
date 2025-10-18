export const dynamic = 'force-dynamic';

type Flight = { hex: string; flight: string };
type Trace = { step: string; error?: string; url?: string };

function dedupe<T>(arr: T[], key: (v: T) => string) {
  const m = new Map<string, T>();
  for (const x of arr) m.set(key(x), x);
  return Array.from(m.values());
}

// OpenSky / Airplanes.live -> schema "states": array de arrays
function parseStatesArray(json: any): Flight[] {
  const states: any[] = Array.isArray(json?.states) ? json.states : [];
  const out: Flight[] = [];
  for (const s of states) {
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
    const body = await r.text().catch(() => '');
    const err = new Error(`http_${r.status}`);
    (err as any).status = r.status;
    (err as any).body = body.slice(0, 300);
    throw err;
  }
  return r.json();
}

async function fetchAirplanesLive(trace: Trace[], signal?: AbortSignal): Promise<Flight[]> {
  const candidates = [
    'https://api.airplanes.live/v2/states',
    'https://api.airplanes.live/v2/states/all',
    'https://api.airplanes.live/v2/states?lamin=-90&lomin=-180&lamax=90&lomax=180',
  ];

  for (const url of candidates) {
    try {
      const j = await fetchJSON(url, { signal });
      const flights = parseStatesArray(j);
      if (flights.length) return flights;
      // sem 7700 nesta fonte — registra e tenta próxima
      trace.push({ step: 'airplanes_no_7700', url });
    } catch (e: any) {
      trace.push({ step: 'airplanes_error', url, error: String(e?.message || e) });
      // tenta a próxima variação
    }
  }
  // nenhuma variação retornou 7700
  return [];
}

async function fetchOpenSky(trace: Trace[], signal?: AbortSignal): Promise<Flight[]> {
  const u = process.env.OPEN_SKY_USER || '';
  const p = process.env.OPEN_SKY_PASS || '';
  const url = 'https://opensky-network.org/api/states/all';

  const headers: Record<string, string> = {};
  if (u && p) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
  }

  try {
    const j = await fetchJSON(url, { headers, signal });
    const flights = parseStatesArray(j);
    if (flights.length) return flights;
    trace.push({ step: 'opensky_no_7700', url });
    return [];
  } catch (e: any) {
    trace.push({ step: 'opensky_error', url, error: String(e?.message || e) });
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const demo = searchParams.get('demo') === '1';
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
  const ctrl = new AbortController();
  const { signal } = ctrl;

  try {
    // 1) Airplanes.live (3 variações)
    const flightsAL = dedupe(await fetchAirplanesLive(trace, signal), f => f.hex);
    if (flightsAL.length) {
      return Response.json({ ok: true, count: flightsAL.length, flights: flightsAL, source: 'airplanes.live', ts: Date.now(), ...(debug ? { trace } : {}) });
    }

    // 2) OpenSky (fallback)
    const flightsOS = dedupe(await fetchOpenSky(trace, signal), f => f.hex);
    if (flightsOS.length) {
      return Response.json({ ok: true, count: flightsOS.length, flights: flightsOS, source: 'opensky', ts: Date.now(), ...(debug ? { trace } : {}) });
    }

    return Response.json(
      debug ? { ok: false, error: 'All sources failed', trace } : { ok: false, error: 'All sources failed' },
      { status: 502 }
    );
  } catch (e: any) {
    return Response.json(
      debug ? { ok: false, error: String(e?.message || e), trace } : { ok: false, error: 'server_error' },
      { status: 500 }
    );
  } finally {
    ctrl.abort();
  }
}
