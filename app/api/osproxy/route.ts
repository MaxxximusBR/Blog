// app/api/osproxy/route.ts
export const dynamic = 'force-dynamic';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(debug = false) {
  const trace: any[] = [];
  try {
    if (cachedToken && Date.now() < tokenExpiresAt) {
      if (debug) trace.push({ step: 'token_cache_hit', exp: tokenExpiresAt });
      return { token: cachedToken, trace };
    }

    const clientId = process.env.OPEN_SKY_CLIENT_ID;
    const clientSecret = process.env.OPEN_SKY_CLIENT_SECRET;
    const tokenUrl =
      process.env.OPEN_SKY_TOKEN_URL ||
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

    if (!clientId || !clientSecret) {
      throw new Error('missing_env_vars');
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    const txt = await resp.text();
    if (debug) trace.push({ step: 'token_resp', status: resp.status, body: txt.slice(0, 400) });

    if (!resp.ok) throw new Error('token_http_' + resp.status);

    const data = JSON.parse(txt);
    if (!data?.access_token) throw new Error('token_missing');

    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + Math.max(10, (data.expires_in ?? 300) - 30) * 1000;

    return { token: cachedToken, trace };
  } catch (e: any) {
    if (debug) trace.push({ step: 'token_error', error: String(e?.message || e) });
    throw { trace, error: e };
  }
}

async function tryFetchStates(url: string, bearer: string, debug: boolean) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${bearer}`,
    Accept: 'application/json',
    'User-Agent': 'maxximus-blog/1.0',
  };
  const resp = await fetch(url, { headers });
  const body = await resp.text();
  return { ok: resp.ok, status: resp.status, body, url };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const debug = searchParams.get('debug') === '1';

  const lamin = searchParams.get('lamin');
  const lomin = searchParams.get('lomin');
  const lamax = searchParams.get('lamax');
  const lomax = searchParams.get('lomax');

  const trace: any[] = [];
  if (debug) trace.push({ step: 'params', lamin, lomin, lamax, lomax });

  if ([lamin, lomin, lamax, lomax].some(v => v == null || v === '')) {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing_query', trace }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    // 1) token
    let tokenInfo;
    try {
      tokenInfo = await getAccessToken(debug);
      if (debug) trace.push(...(tokenInfo.trace || []), { step: 'token_ok' });
    } catch (te: any) {
      const t = te?.trace || [];
      return new Response(
        JSON.stringify({ ok: false, error: 'token_failed', trace: [...trace, ...t] }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
    const token = tokenInfo.token as string;

    // 2) Tenta no host novo (API) e, se falhar, cai para o antigo.
    const urls = [
      `https://api.opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`,
      `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`,
    ];

    let lastResult: any = null;
    for (const url of urls) {
      try {
        const r = await tryFetchStates(url, token, debug);
        if (debug) trace.push({ step: 'fetch_try', url, status: r.status, ok: r.ok, sample: r.body.slice(0, 200) });
        if (r.ok) {
          const data = JSON.parse(r.body);
          return new Response(JSON.stringify({ ok: true, ...data, source: url.includes('api.') ? 'api' : 'legacy' }), {
            headers: { 'content-type': 'application/json' },
          });
        }
        lastResult = r;
      } catch (e: any) {
        lastResult = { status: 0, body: String(e?.message || e), url };
        if (debug) trace.push({ step: 'fetch_error', url, error: lastResult.body });
      }
    }

    // Nenhum host deu certo
    return new Response(
      JSON.stringify({
        ok: false,
        error: lastResult ? `opensky_http_${lastResult.status || 'fetch_failed'}` : 'fetch_failed',
        url: lastResult?.url,
        body: (lastResult?.body || '').slice(0, 400),
        trace,
      }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  } catch (e: any) {
    if (debug) trace.push({ step: 'fatal', error: String(e?.message || e) });
    return new Response(JSON.stringify({ ok: false, error: 'internal_error', trace }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
