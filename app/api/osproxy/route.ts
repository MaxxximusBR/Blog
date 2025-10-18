// app/api/osproxy/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Trace = Array<Record<string, any>>;

function JBad(msg: string, trace?: Trace, status = 200) {
  return NextResponse.json({ ok: false, error: msg, trace }, { status });
}
function JOk(data: any, trace?: Trace) {
  return NextResponse.json({ ok: true, ...data, trace });
}
function asNum(v: string | null, def: number) {
  if (v == null) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout_${label}_${ms}ms`)), ms);
    p.then(x => { clearTimeout(id); resolve(x); }, e => { clearTimeout(id); reject(e); });
  });
}

/** Tenta descobrir o token_endpoint do OpenSky via .well-known.
 *  Testa com e sem /auth */
async function discoverTokenUrl(trace: Trace): Promise<string | null> {
  const bases = [
    'https://auth.opensky-network.org',
  ];
  const paths = [
    '/realms/opensky-network/.well-known/openid-configuration',             // sem /auth
    '/auth/realms/opensky-network/.well-known/openid-configuration',        // legado com /auth
  ];

  for (const base of bases) {
    for (const path of paths) {
      const url = base + path;
      try {
        const r = await withTimeout(fetch(url, { cache: 'no-store' }), 8000, 'wellknown');
        trace.push({ step: 'wellknown_resp', url, status: r.status });
        if (!r.ok) continue;
        const j = await r.json().catch(() => null);
        const token = j?.token_endpoint;
        if (typeof token === 'string' && token.startsWith('http')) {
          trace.push({ step: 'wellknown_token_endpoint', token });
          return token;
        }
      } catch (e: any) {
        trace.push({ step: 'wellknown_error', url, error: String(e?.message || e) });
      }
    }
  }
  return null;
}

/** Pega access_token do Keycloak do OpenSky
 *  1) Usa OPEN_SKY_TOKEN_URL se existir
 *  2) Senão, descobre pelo .well-known
 *  3) Tenta client_secret_basic; se falhar, cai para client_secret_post
 */
async function getToken(trace: Trace): Promise<string> {
  const cid = (process.env.OPEN_SKY_CLIENT_ID || '').trim();
  const csec = (process.env.OPEN_SKY_CLIENT_SECRET || '').trim();
  let tokenUrl = (process.env.OPEN_SKY_TOKEN_URL || '').trim();

  if (!cid || !csec) throw new Error('missing_client_env');

  if (!tokenUrl) {
    tokenUrl = await discoverTokenUrl(trace) || '';
  }
  if (!tokenUrl) throw new Error('token_url_not_found');

  // 1) client_secret_basic
  try {
    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    const basic = 'Basic ' + Buffer.from(`${cid}:${csec}`).toString('base64');
    const r = await withTimeout(fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: basic,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'vercel-osproxy/1.1',
      },
      body,
      cache: 'no-store',
    }), 8000, 'token_basic');

    trace.push({ step: 'token_basic_resp', status: r.status });
    if (r.ok) {
      const j = await r.json();
      if (j?.access_token) return j.access_token as string;
      trace.push({ step: 'token_basic_no_access_token', body: j });
    } else {
      const txt = await r.text().catch(() => '');
      trace.push({ step: 'token_basic_http_' + r.status, body: txt.slice(0, 400) });
    }
  } catch (e: any) {
    trace.push({ step: 'token_basic_error', error: String(e?.message || e) });
  }

  // 2) client_secret_post
  const body2 = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cid,
    client_secret: csec,
  });
  const r2 = await withTimeout(fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'vercel-osproxy/1.1',
    },
    body: body2,
    cache: 'no-store',
  }), 8000, 'token_post');

  trace.push({ step: 'token_post_resp', status: r2.status });
  if (!r2.ok) {
    const txt = await r2.text().catch(() => '');
    trace.push({ step: 'token_post_http_' + r2.status, body: txt.slice(0, 400) });
    throw new Error('token_http_' + r2.status);
  }
  const j2 = await r2.json().catch(() => ({}));
  const token = j2?.access_token;
  if (!token) {
    trace.push({ step: 'token_post_no_access_token', body: j2 });
    throw new Error('token_no_access_token');
  }
  return token as string;
}

export async function GET(req: Request) {
  const trace: Trace = [];
  try {
    const url = new URL(req.url);
    const lamin = asNum(url.searchParams.get('lamin'), -35);
    const lomin = asNum(url.searchParams.get('lomin'), -68);
    const lamax = asNum(url.searchParams.get('lamax'), -34);
    const lomax = asNum(url.searchParams.get('lomax'), -58);
    const debug = url.searchParams.get('debug') != null;

    trace.push({ step: 'params', lamin, lomin, lamax, lomax });

    const token = await getToken(trace);

    const qs = new URLSearchParams({
      lamin: String(lamin),
      lomin: String(lomin),
      lamax: String(lamax),
      lomax: String(lomax),
    });
    const statesUrl = `https://opensky-network.org/api/states/all?${qs.toString()}`;

    const r = await withTimeout(fetch(statesUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'vercel-osproxy/1.1',
      },
      cache: 'no-store',
    }), 9000, 'states');

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      trace.push({ step: 'opensky_http_' + r.status, url: statesUrl, body: txt.slice(0, 400) });
      return JBad('opensky_http_' + r.status, debug ? trace : undefined);
    }

    const data = await r.json();
    return JOk({ url: statesUrl, data }, debug ? trace : undefined);
  } catch (e: any) {
    trace.push({ step: 'fatal', error: String(e?.message || e) });
    return JBad(e?.message || 'fetch_failed', trace);
  }
}
