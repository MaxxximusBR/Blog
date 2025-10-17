export const dynamic = 'force-dynamic';

function asArray<T>(x: any): T[] { return Array.isArray(x) ? x : []; }

// Normaliza o squawk para string
function sq(x: any): string | null {
  if (x == null) return null;
  const s = String(x).trim();
  return s ? s : null;
}

export async function GET(req: Request) {
  const trace: any[] = [];
  const url = new URL(req.url);
  const wantDebug = url.searchParams.get('debug') === '1';
  const wantDemo  = url.searchParams.get('demo') === '1';

  try {
    if (wantDemo) {
      return Response.json({
        ok: true,
        count: 1,
        flights: [{ hex: 'abc123', flight: 'TEST7700' }],
        source: 'demo',
        ts: Date.now()
      });
    }

    // 1) ADSB.fi via nosso proxy
    let adsbFlights: { hex: string; flight: string }[] = [];
    try {
      const r = await fetch(`${process.env.ADSB_JSON || '/api/adsb/upstream'}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`adsb_http_${r.status}`);
      const j = await r.json();

      // tar1090: j.aircraft?
      const ac = asArray<any>(j?.aircraft ?? j);
      adsbFlights = ac
        .filter(a => {
          const s = sq(a?.squawk ?? a?.sqk);
          return s === '7700';
        })
        .map(a => ({
          hex: String(a?.hex || a?.icao || '').trim(),
          flight: String(a?.flight || a?.callsign || '').trim()
        }))
        .filter(f => f.hex);
    } catch (e: any) {
      trace.push({ step: 'adsb_error', error: String(e?.message || e), src: `${process.env.ADSB_JSON || '/api/adsb/upstream'}` });
    }

    // 2) OpenSky (opcional, mas recomendado com user/pass)
    let osFlights: { hex: string; flight: string }[] = [];
    try {
      const lat = Number(url.searchParams.get('lat') ?? -30.03);
      const lon = Number(url.searchParams.get('lon') ?? -51.22);
      const r   = Number(url.searchParams.get('r')   ?? 4);
      const lamin = lat - r, lamax = lat + r, lomin = lon - r, lomax = lon + r;
      const q = `lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
      const osUrl = `https://opensky-network.org/api/states/all?${q}`;

      const headers: Record<string, string> = { 'User-Agent': 'OVNIs-2025/1.0 (+https://blog)' };
      const u = process.env.OPEN_SKY_USER;
      const p = process.env.OPEN_SKY_PASS;
      if (u && p) headers['Authorization'] = 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

      const r2 = await fetch(osUrl, { headers, cache: 'no-store' });
      if (!r2.ok) throw new Error(`opensky_http_${r2.status}`);
      const j2 = await r2.json();

      const states = asArray<any>(j2?.states);
      osFlights = states
        .map((s) => ({
          hex: String(s?.[0] || '').trim(),
          flight: String(s?.[1] || '').trim(),
          squawk: sq(s?.[14] ?? s?.[6]) // índice do squawk no OpenSky pode variar
        }))
        .filter(x => x.hex && x.squawk === '7700')
        .map(x => ({ hex: x.hex, flight: x.flight }));
    } catch (e: any) {
      trace.push({ step: 'opensky_error', error: `Error: ${String(e?.message || e)}` });
    }

    const flights = [...adsbFlights, ...osFlights];
    const unique = Array.from(new Map(flights.map(f => [f.hex || `${f.hex}-${f.flight}`, f])).values());

    if (unique.length > 0) {
      return Response.json({ ok: true, count: unique.length, flights: unique, ts: Date.now() });
    }

    // Nenhuma fonte trouxe algo:
    const payload = { ok: false, error: 'All sources failed', ...(wantDebug ? { trace } : {}) };
    return Response.json(payload, { status: 500 });

  } catch (e: any) {
    const payload = { ok: false, error: String(e?.message || e), ...(wantDebug ? { trace } : {}) };
    return Response.json(payload, { status: 500 });
  }
}
