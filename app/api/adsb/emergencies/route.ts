export const dynamic = 'force-dynamic';

type Flight = { hex: string; flight: string };

function makeAbsolute(base: URL, maybeUrl: string): string {
  try {
    // absoluta? retorna do jeito que está
    new URL(maybeUrl);
    return maybeUrl;
  } catch {
    // relativa: monta a partir do origin da requisição
    const p = maybeUrl.startsWith('/') ? maybeUrl.slice(1) : maybeUrl;
    return `${base.origin}/${p}`;
  }
}

function okJson(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** tenta ler aircraft.json (tar1090/ADSB.fi) */
async function fromAdsbJson(srcUrl: string) {
  const r = await fetch(srcUrl, { cache: 'no-store' });
  if (!r.ok) throw new Error(`adsb_http_${r.status}`);
  const j = await r.json();

  // formatos possíveis: { aircraft: [...] } (tar1090) ou algo compatível
  const arr: any[] = Array.isArray(j?.aircraft) ? j.aircraft : Array.isArray(j) ? j : [];
  const emerg = arr.filter(a => String(a?.squawk || '') === '7700');

  const flights: Flight[] = emerg.map(a => ({
    hex: String(a?.hex || '').trim(),
    flight: String(a?.flight || '').trim(),
  }));
  return flights;
}

/** fallback via seu /api/opensky (usa matriz states; squawk é o índice 14) */
async function fromOpenSky(reqUrl: string) {
  // latitude/longitude/radius opcionais via query (senão usa um bounding box neutro)
  const u = new URL(reqUrl);
  const lat = u.searchParams.get('lat') ?? '-15';
  const lon = u.searchParams.get('lon') ?? '-55';
  const r   = u.searchParams.get('r')   ?? '20';

  const os = await fetch(`${u.origin}/api/opensky?lat=${lat}&lon=${lon}&r=${r}`, { cache: 'no-store' });
  if (!os.ok) throw new Error(`opensky_http_${os.status}`);
  const j = await os.json();

  const flights: Flight[] = (j?.items || [])
    .filter((s: any) => (s?.squawk ?? s?.[14]) === '7700') // compatibilidade com seu route atual
    .map((s: any) => ({
      hex: String(s?.hex ?? s?.[0] ?? '').trim(),
      flight: String(s?.callsign ?? s?.[1] ?? '').trim(),
    }));

  return flights;
}

export async function GET(req: Request) {
  const now = Date.now();
  const trace: any[] = [];

  try {
    const url = new URL(req.url);

    // forçar demo
    if (url.searchParams.get('demo') === '1') {
      return okJson({
        ok: true,
        count: 1,
        flights: [{ hex: 'abc123', flight: 'TEST7700' }],
        source: 'demo',
        ts: now,
      });
    }

    // 1) tentativa: ADSB_JSON (aceita absoluta ou relativa)
    const envSrc = process.env.ADSB_JSON || '';
    let flights: Flight[] = [];
    let used = '';

    if (envSrc) {
      const src = makeAbsolute(url, envSrc);
      try {
        flights = await fromAdsbJson(src);
        used = 'adsb_json';
        trace.push({ step: 'adsb_ok', took_ms: Date.now() - now, src });
      } catch (e: any) {
        trace.push({ step: 'adsb_error', error: String(e), src });
      }
    } else {
      trace.push({ step: 'adsb_skip', reason: 'ADSB_JSON not set' });
    }

    // 2) fallback: OpenSky (se nada veio do ADSB)
    if (!flights.length) {
      try {
        flights = await fromOpenSky(req.url);
        used = 'opensky';
        trace.push({ step: 'opensky_ok', took_ms: Date.now() - now });
      } catch (e: any) {
        trace.push({ step: 'opensky_error', error: String(e) });
      }
    }

    // nada? retorna erro com trace (útil pra debug)
    if (!flights.length) {
      const body = { ok: false, error: 'All sources failed', trace };
      return okJson(body, 500);
    }

    return okJson({ ok: true, count: flights.length, flights, source: used, ts: now });
  } catch (e: any) {
    return okJson({ ok: false, error: e?.message || 'internal' }, 500);
  }
}
