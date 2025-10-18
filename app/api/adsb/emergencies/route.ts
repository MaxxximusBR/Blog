// app/api/adsb/emergencies/route.ts
export const dynamic = 'force-dynamic';

type Flight = { hex: string; flight: string };

function dedupe<T>(arr: T[], key: (v: T) => string) {
  const m = new Map<string, T>();
  for (const x of arr) m.set(key(x), x);
  return Array.from(m.values());
}

// -------- Helpers de parsing --------

// OpenSky / Airplanes.live (schema "states": array de arrays)
function parseStatesArray(json: any): Flight[] {
  const states: any[] = Array.isArray(json?.states) ? json.states : [];
  // posições: https://opensky-network.org/apidoc/rest.html#response
  // [0] icao24, [1] callsign, [14] squawk
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

// -------- Fetchers --------

async function fetchAirplanesLive(signal?: AbortSignal) {
  // states sem bbox -> global
  const url = 'https://api.airplanes.live/v2/states';
  const r = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json, text/plain;q=0.8, */*;q=0.5',
      'User-Agent': 'Mozilla/5.0',
    },
    cache: 'no-store',
    signal,
  });
  if (!r.ok) throw new Error(`airplanes_http_${r.status}`);
  const j = await r.json().catch(() => ({}));
  return parseStatesArray(j);
}

async function fetchOpenSky(signal?: AbortSignal) {
  const u = process.env.OPEN_SKY_USER || '';
  const p = process.env.OPEN_SKY_PASS || '';
  const url = 'https://opensky-network.org/api/states/all';

  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain;q=0.8, */*;q=0.5',
  };
  if (u && p) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
  }

  const r = await fetch(url, { headers, cache: 'no-store', signal });
  if (!r.ok) throw new Error(`opensky_http_${r.status}`);
  const j = await r.json().catch(() => ({}));
  return parseStatesArray(j);
}

// -------- Handler --------

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

  const trace: Array<{ step: string; error?: string }> = [];
  const ctrl = new AbortController();
  const { signal } = ctrl;

  try {
    // 1) Airplanes.live
    try {
      const flights = dedupe(await fetchAirplanesLive(signal), f => f.hex);
      if (flights.length) {
        return Response.json({ ok: true, count: flights.length, flights, source: 'airplanes.live', ts: Date.now() });
      }
      trace.push({ step: 'airplanes_live', error: 'no_7700' });
    } catch (e: any) {
      trace.push({ step: 'airplanes_error', error: String(e?.message || e) });
    }

    // 2) OpenSky
    try {
      const flights = dedupe(await fetchOpenSky(signal), f => f.hex);
      if (flights.length) {
        return Response.json({ ok: true, count: flights.length, flights, source: 'opensky', ts: Date.now() });
      }
      trace.push({ step: 'opensky', error: 'no_7700' });
    } catch (e: any) {
      trace.push({ step: 'opensky_error', error: String(e?.message || e) });
    }

    // se nada funcionou
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
