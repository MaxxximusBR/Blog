// app/api/adsb/emergencies/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Trace = Array<Record<string, any>>;
const UA = 'ufo-anuario-adsb/1.0';

// util
function bad(error: string, trace?: Trace, status = 200) {
  return NextResponse.json({ ok: false, error, trace }, { status });
}
function ok(data: any, trace?: Trace) {
  return NextResponse.json({ ok: true, ...data, trace });
}
function num(v: string | null, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function withTimeout<T>(p: Promise<T>, ms: number, tag: string) {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout_${tag}_${ms}ms`)), ms);
    p.then(
      (x) => { clearTimeout(id); resolve(x); },
      (e) => { clearTimeout(id); reject(e); },
    );
  });
}
function inBox(lat: number, lon: number, a: number, b: number, c: number, d: number) {
  // caixa geográfica (lamin, lomin, lamax, lomax)
  const lamin = Math.min(a, c), lamax = Math.max(a, c);
  const lomin = Math.min(b, d), lomax = Math.max(b, d);
  return lat >= lamin && lat <= lamax && lon >= lomin && lon <= lomax;
}

/* -------------------- OPEN SKY -------------------- */
async function discoverTokenUrl(trace: Trace): Promise<string | null> {
  const cands = [
    'https://auth.opensky-network.org/realms/opensky-network/.well-known/openid-configuration',
    'https://auth.opensky-network.org/auth/realms/opensky-network/.well-known/openid-configuration',
  ];
  for (const url of cands) {
    try {
      const r = await withTimeout(fetch(url, { cache: 'no-store' }), 10000, 'wellknown');
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      const te = j?.token_endpoint;
      if (typeof te === 'string' && te.startsWith('http')) return te;
    } catch { /* segue */ }
  }
  trace.push({ step: 'token_wellknown_fail' });
  return null;
}

async function fetchOSKToken(trace: Trace) {
  const cid = (process.env.OPEN_SKY_CLIENT_ID || '').trim();
  const sec = (process.env.OPEN_SKY_CLIENT_SECRET || '').trim();
  let tokenUrl = (process.env.OPEN_SKY_TOKEN_URL || '').trim();

  if (!cid || !sec) throw new Error('missing_client_env');
  if (!tokenUrl) tokenUrl = (await discoverTokenUrl(trace)) || '';
  if (!tokenUrl) throw new Error('token_url_not_found');

  const tryMode = async (mode: 'basic'|'post') => {
    const headers: Record<string,string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': UA,
    };
    let body: URLSearchParams;
    if (mode === 'basic') {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${cid}:${sec}`).toString('base64');
      body = new URLSearchParams({ grant_type: 'client_credentials' });
    } else {
      body = new URLSearchParams({ grant_type: 'client_credentials', client_id: cid, client_secret: sec });
    }
    const r = await withTimeout(fetch(tokenUrl, { method:'POST', headers, body, cache:'no-store' }), 15000, `token_${mode}`);
    const txt = await r.text().catch(()=> '');
    if (!r.ok) throw new Error(`token_http_${r.status}:${txt.slice(0,200)}`);
    const j = JSON.parse(txt);
    const t = j?.access_token;
    if (!t) throw new Error('token_no_access_token');
    return t as string;
  };

  // tenta basic → post (com alguns retries pequenos)
  for (let i=0;i<3;i++){
    try { return await tryMode('basic'); } catch (e:any) { trace.push({ step:'token_basic_error', i, error: String(e?.message||e) }); }
    try { return await tryMode('post');  } catch (e:any) { trace.push({ step:'token_post_error',  i, error: String(e?.message||e) }); }
    await new Promise(res => setTimeout(res, 400));
  }
  throw new Error('token_failed');
}

async function getFromOpenSky(lamin:number,lomin:number,lamax:number,lomax:number, trace: Trace) {
  const qs = new URLSearchParams({
    lamin: String(lamin), lomin: String(lomin),
    lamax: String(lamax), lomax: String(lomax),
  });
  // OAuth primeiro
  try {
    const token = await fetchOSKToken(trace);
    const r = await withTimeout(fetch(`https://opensky-network.org/api/states/all?${qs}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept':'application/json', 'User-Agent': UA },
      cache: 'no-store',
    }), 15000, 'osk_states_oauth');
    if (!r.ok) throw new Error(`osk_oauth_http_${r.status}`);
    const j = await r.json();
    return j;
  } catch (e:any) {
    trace.push({ step:'osk_oauth_failed', error: String(e?.message||e) });
  }

  // cai para BASIC se tiver user/pass
  const u = (process.env.OPEN_SKY_USER || '').trim();
  const p = (process.env.OPEN_SKY_PASS || '').trim();
  if (!u || !p) throw new Error('osk_oauth_and_no_basic_env');

  const r = await withTimeout(fetch(`https://opensky-network.org/api/states/all?${qs}`, {
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64'), 'Accept':'application/json', 'User-Agent': UA },
    cache: 'no-store',
  }), 15000, 'osk_states_basic');
  if (!r.ok) throw new Error(`osk_basic_http_${r.status}`);
  return r.json();
}

/* -------------------- TAR1090 FALLBACK -------------------- */
async function getFromTar1090(lamin:number,lomin:number,lamax:number,lomax:number, trace: Trace) {
  const src = (process.env.ADSB_JSON || 'https://globe.adsb.fi/data/aircraft.json').trim();
  const r = await withTimeout(fetch(src, { cache: 'no-store', headers: { 'Accept':'application/json', 'User-Agent': UA } }), 15000, 'tar1090');
  if (!r.ok) throw new Error(`tar1090_http_${r.status}`);
  const j = await r.json();
  // formato tar1090: { now, messages, aircraft: [ { hex, flight, lat, lon, squawk, ... } ] }
  const arr: any[] = Array.isArray(j?.aircraft) ? j.aircraft : [];
  const filtered = arr
    .filter(a => (a?.squawk === '7700' || a?.squawk === 7700))
    .filter(a => typeof a?.lat === 'number' && typeof a?.lon === 'number'
              ? inBox(a.lat, a.lon, lamin, lomin, lamax, lomax)
              : true)
    .map(a => ({ hex: String(a.hex||'').toLowerCase(), flight: String(a.flight||'').trim(), lat: a.lat, lon: a.lon }));
  return { source: 'tar1090', flights: filtered };
}

/* -------------------- handler -------------------- */
export async function GET(req: Request) {
  const trace: Trace = [];
  try {
    const url = new URL(req.url);
    const lamin = num(url.searchParams.get('lamin'), -35);
    const lomin = num(url.searchParams.get('lomin'), -68);
    const lamax = num(url.searchParams.get('lamax'), -34);
    const lomax = num(url.searchParams.get('lomax'), -58);
    const backend = (url.searchParams.get('backend') || '').toLowerCase(); // 'opensky' | 'tar1090' | ''
    const debug = url.searchParams.get('debug') != null;

    trace.push({ step:'params', lamin, lomin, lamax, lomax, backend });

    // 1) Fonte escolhida explicitamente
    if (backend === 'tar1090') {
      const out = await getFromTar1090(lamin,lomin,lamax,lomax,trace);
      return ok({ count: out.flights.length, flights: out.flights, backend: out.source }, debug ? trace : undefined);
    }
    if (backend === 'opensky') {
      const j = await getFromOpenSky(lamin,lomin,lamax,lomax,trace);
      const flights = (Array.isArray(j?.states) ? j.states : [])
        .filter((s: any) => Array.isArray(s) && (s[6] != null) && (s[5] != null))
        .map((s:any) => ({
          hex: String(s[0] || '').trim().toLowerCase(),
          flight: String(s[1] || '').trim(),
          lat: s[6], lon: s[5], squawk: s[14],
        }))
        .filter((x:any) => x.squawk === '7700' || x.squawk === 7700);
      return ok({ count: flights.length, flights, backend: 'opensky' }, debug ? trace : undefined);
    }

    // 2) Automático: tenta OpenSky → fallback tar1090
    try {
      const j = await getFromOpenSky(lamin,lomin,lamax,lomax,trace);
      const flights = (Array.isArray(j?.states) ? j.states : [])
        .filter((s: any) => Array.isArray(s) && (s[6] != null) && (s[5] != null))
        .map((s:any) => ({
          hex: String(s[0] || '').trim().toLowerCase(),
          flight: String(s[1] || '').trim(),
          lat: s[6], lon: s[5], squawk: s[14],
        }))
        .filter((x:any) => x.squawk === '7700' || x.squawk === 7700);
      return ok({ count: flights.length, flights, backend: 'opensky' }, debug ? trace : undefined);
    } catch (e:any) {
      trace.push({ step:'opensky_failed', error: String(e?.message || e) });
      const out = await getFromTar1090(lamin,lomin,lamax,lomax,trace);
      return ok({ count: out.flights.length, flights: out.flights, backend: out.source }, debug ? trace : undefined);
    }
  } catch (e:any) {
    trace.push({ step:'fatal', error: String(e?.message||e) });
    return bad(e?.message || 'fetch_failed', trace);
  }
}
