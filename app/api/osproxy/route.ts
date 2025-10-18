// app/api/osproxy/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Trace = Array<Record<string, any>>;
const UA = 'vercel-osproxy/1.3';

function ok(data: any, trace?: Trace) {
  return NextResponse.json({ ok: true, ...data, trace });
}
function bad(error: string, trace?: Trace, status = 200) {
  return NextResponse.json({ ok: false, error, trace }, { status });
}
function num(v: string | null, d: number) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout_${label}_${ms}ms`)), ms);
    p.then(
      (x) => { clearTimeout(id); resolve(x); },
      (e) => { clearTimeout(id); reject(e); }
    );
  });
}

/* ---------------- token discovery + fetch ---------------- */
async function discoverTokenUrl(trace: Trace): Promise<string | null> {
  const cands = [
    'https://auth.opensky-network.org/realms/opensky-network/.well-known/openid-configuration',
    // fallback legado
    'https://auth.opensky-network.org/auth/realms/opensky-network/.well-known/openid-configuration',
  ];
  for (const url of cands) {
    try {
      const r = await withTimeout(fetch(url, { cache: 'no-store' }), 12000, 'wellknown');
      trace.push({ step: 'wellknown_resp', url, status: r.status });
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      const te = j?.token_endpoint;
      if (typeof te === 'string' && te.startsWith('http')) {
        trace.push({ step: 'wellknown_token_endpoint', token: te });
        return te;
      }
    } catch (e: any) {
      trace.push({ step: 'wellknown_error', url, error: String(e?.message || e) });
    }
  }
  return null;
}

async function fetchToken(trace: Trace, retries = 2): Promise<string> {
  const cid = (process.env.OPEN_SKY_CLIENT_ID || '').trim();
  const sec = (process.env.OPEN_SKY_CLIENT_SECRET || '').trim();
  let tokenUrl = (process.env.OPEN_SKY_TOKEN_URL || '').trim();

  if (!cid || !sec) throw new Error('missing_client_env');
  if (!tokenUrl) tokenUrl = (await discoverTokenUrl(trace)) || '';
  if (!tokenUrl) throw new Error('token_url_not_found');

  const tryOnce = async (mode: 'basic' | 'post') => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': UA,
    };
    let body: URLSearchParams;

    if (mode === 'basic') {
      headers.Authorization = 'Basic ' + Buffer.from(`${cid}:${sec}`).toString('base64');
      body = new URLSearchParams({ grant_type: 'client_credentials' });
    } else {
      body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cid,
        client_secret: sec,
      });
    }

    const r = await withTimeout(fetch(tokenUrl, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    }), 15000, `token_${mode}`);

    trace.push({ step: `token_${mode}_resp`, status: r.status });
    const text = await r.text().catch(() => '');
    let j: any = {};
    try { j = JSON.parse(text); } catch {}

    if (!r.ok) {
      trace.push({ step: `token_${mode}_http_${r.status}`, body: text.slice(0, 400) });
      throw new Error(`token_http_${r.status}`);
    }
    const t = j?.access_token;
    if (!t) {
      trace.push({ step: `token_${mode}_no_access_token`, body: text.slice(0, 400) });
      throw new Error('token_no_access_token');
    }
    return t as string;
  };

  for (let i = 0; i <= retries; i++) {
    try {
      return await tryOnce('basic');
    } catch (e: any) {
      trace.push({ step: 'token_basic_error', attempt: i, error: String(e?.message || e) });
    }
    try {
      return await tryOnce('post');
    } catch (e: any) {
      trace.push({ step: 'token_post_error', attempt: i, error: String(e?.message || e) });
      await new Promise(res => setTimeout(res, 600));
    }
  }
  throw new Error('token_failed');
}

/* ---------------- callers ---------------- */
async function callStatesWithOAuth(qs: URLSearchParams, trace: Trace) {
  const token = await fetchToken(trace);
  const url = `https://opensky-network.org/api/states/all?${qs.toString()}`;
  const r = await withTimeout(fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': UA,
    },
    cache: 'no-store',
  }), 15000, 'states_oauth');

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    trace.push({ step: 'opensky_oauth_http_' + r.status, url, body: t.slice(0, 400) });
    throw new Error('opensky_oauth_http_' + r.status);
  }
  return r.json();
}

async function callStatesWithBasic(qs: URLSearchParams, trace: Trace) {
  const user = (process.env.OPEN_SKY_USER || '').trim();
  const pass = (process.env.OPEN_SKY_PASS || '').trim();
  if (!user || !pass) throw new Error('missing_basic_env');

  const url = `https://opensky-network.org/api/states/all?${qs.toString()}`;
  const r = await withTimeout(fetch(url, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'),
      Accept: 'application/json',
      'User-Agent': UA,
    },
    cache: 'no-store',
  }), 15000, 'states_basic');

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    trace.push({ step: 'opensky_basic_http_' + r.status, url, body: t.slice(0, 400) });
    throw new Error('opensky_basic_http_' + r.status);
  }
  return r.json();
}

/* ---------------- handler ---------------- */
export async function GET(req: Request) {
  const trace: Trace = [];
  // ⚠️ 'debug' precisa estar fora do try/catch
  let debug = false;

  try {
    const url = new URL(req.url);
    const lamin = num(url.searchParams.get('lamin'), -35);
    const lomin = num(url.searchParams.get('lomin'), -68);
    const lamax = num(url.searchParams.get('lamax'), -34);
    const lomax = num(url.searchParams.get('lomax'), -58);
    debug = url.searchParams.get('debug') != null;
    const backend = (url.searchParams.get('backend') || '').toLowerCase(); // 'oauth' | 'basic' | ''

    trace.push({ step: 'params', lamin, lomin, lamax, lomax, backend });

    const qs = new URLSearchParams({
      lamin: String(lamin),
      lomin: String(lomin),
      lamax: String(lamax),
      lomax: String(lomax),
    });

    let data: any;
    if (backend === 'basic') {
      data = await callStatesWithBasic(qs, trace);
    } else if (backend === 'oauth') {
      data = await callStatesWithOAuth(qs, trace);
    } else {
      try {
        data = await callStatesWithOAuth(qs, trace);
      } catch (e: any) {
        trace.push({ step: 'oauth_failed_fallback', error: String(e?.message || e) });
        data = await callStatesWithBasic(qs, trace);
      }
    }

    return ok({ data }, debug ? trace : undefined);
  } catch (e: any) {
    trace.push({ step: 'fatal', error: String(e?.message || e) });
    return bad(e?.message || 'fetch_failed', debug ? trace : undefined);
  }
}
