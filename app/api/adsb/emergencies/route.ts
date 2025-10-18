export const dynamic = 'force-dynamic';

function b64(u: string, p: string) {
  return Buffer.from(`${u}:${p}`).toString('base64');
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const demo = url.searchParams.get('demo') === '1';
    const debug = url.searchParams.get('debug') === '1';

    if (demo) {
      return Response.json({
        ok: true,
        count: 1,
        flights: [{ hex: 'abc123', flight: 'TEST7700' }],
        source: 'demo',
        ts: Date.now(),
      });
    }

    const u = process.env.OPEN_SKY_USER || '';
    const p = process.env.OPEN_SKY_PASS || '';

    const headers: Record<string, string> = {};
    if (u && p) headers['Authorization'] = 'Basic ' + b64(u, p);

    // usa o filtro nativo de squawk=7700
    const oskyUrl = 'https://opensky-network.org/api/states/all?squawk=7700';

    const res = await fetch(oskyUrl, {
      headers,
      // evita cache, e dá um tempinho pro servidor responder
      cache: 'no-store',
      // @ts-ignore (Node runtime aceita)
      keepalive: true,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (debug) {
        return Response.json({
          ok: false,
          error: `OpenSky HTTP ${res.status}`,
          body: body.slice(0, 400),
        }, { status: 502 });
      }
      return Response.json({ ok: false, error: 'OpenSky error' }, { status: 502 });
    }

    const json = await res.json();
    const states: any[] = Array.isArray(json?.states) ? json.states : [];

    const flights = states.map((s: any[]) => ({
      hex: String(s?.[0] ?? '').trim(),    // icao24
      flight: String(s?.[1] ?? '').trim(), // callsign
    })).filter(f => f.hex);

    return Response.json({
      ok: true,
      count: flights.length,
      flights,
      source: 'opensky:squawk=7700',
      ts: Date.now(),
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || 'fail' }, { status: 500 });
  }
}
