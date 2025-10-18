// app/api/adsb/emergencies/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Trace = Array<Record<string, any>>;
const UA = 'ufo-anuario-adsb/1.1';

// ---------- helpers ----------
const ok = (data: any, trace?: Trace) =>
  NextResponse.json({ ok: true, ...data, trace });

const softFail = (why: string, trace?: Trace) =>
  // Não estoura erro na UI: volta lista vazia
  NextResponse.json({ ok: true, backend: 'none', count: 0, flights: [], why, trace });

const asNum = (s: string | null, d: number) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : d;
};

const withTimeout = <T,>(p: Promise<T>, ms: number, tag: string) =>
  new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout_${tag}_${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(id); resolve(v); },
      (e) => { clearTimeout(id); reject(e); },
    );
  });

const inBox = (lat: number, lon: number, a: number, b: number, c: number, d: number) => {
  const lamin = Math.min(a, c), lamax = Math.max(a, c);
  const lomin = Math.min(b, d), lomax = Math.max(b, d);
  return lat >= lamin && lat <= lamax && lon >= lomin && lon <= lomax;
};

// ---------- OpenSky (opcional) ----------
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

  const tryMode = async (mode: 'basic' | 'post') => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': UA,
    };
    let body: URLSearchParams;
    if (mode === 'basic') {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${cid}:${sec}`).toString('base64');
      body = new URLSearchParams({ grant_type: 'client_credentials' });
    } else {
      body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cid,
        client_secret: sec,
      });
    }
    const r = await withTimeout(
      fetch(tokenUrl, { method: 'POST', headers, body, cache: 'no-store' }),
      15000,
      `token_${mode}`
    );
    const txt = await r.text().catch(() => '');
    if (!r.ok) throw new Error(`token_http_${r.status}:${txt.slice(0, 200)}`);
    const j = JSON.parse(txt);
    const t = j?.access_token;
    if (!t) throw new Error('token_no_access_token');
    return t as string;
  };

  for (let i = 0; i < 2; i++) {
    try { return await tryMode('basic'); } catch (e: any) { trace.push({ step: 'token_basic_error', i, error: String(e?.message || e) }); }
    try { return await tryMode('post'); }  catch (e: any) { trace.push({ step: 'token_post_error',  i, error: String(e?.message || e) }); }
    await new Promise(res => setTimeout(res, 300));
  }
  throw new Error('token_failed');
}

async function getFromOpenSky(lamin: number, lomin: number, lamax: number, lomax: number, trace: Trace) {
  const qs = new URLSearchParams({ lamin: String(lamin), lomin: String(lomin), lamax: String(lamax), lomax: String(lomax) });

  // 1) OAuth
  try {
    const token = await fetchOSKToken(trace);
    const r = await withTimeout(fetch(`https://opensky-network.org/api/states/all?${qs}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'User-Agent': UA },
      cache: 'no-store',
    }), 15000, 'osk_oauth');
    if (!r.ok) throw new Error(`osk_oauth_http_${r.status}`);
    return await r.json();
  } catch (e: any) {
    trace.push({ step: 'osk_oauth_failed', error: String(e?.message || e) });
  }

  // 2) Basic
  const u = (process.env.OPEN_SKY_USER || '').trim();
  const p = (process.env.OPEN_SKY_PASS || '').trim();
  if (!u || !p) throw new Error('osk_oauth_and_no_basic_env');

  const r = await withTimeout(fetch(`https://opensky-network.org/api/states/all?${qs}`, {
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64'), 'Accept': 'application/json', 'User-Agent': UA },
    cache: 'no-store',
  }), 15000, 'osk_basic');
  if (!r.ok) throw new Error(`osk_basic_http_${r.status}`);
  return r.json();
}

// ---------- TAR1090 (multi-fonte) ----------
function sourcesFromEnv(): string[] {
  // 1) lista explícita (vírgulas)
  const list = (process.env.ADSB_JSON_LIST || '').split(',')
    .map(s => s.trim()).filter(Boolean);

  // 2) single
  const single = (process.env.ADSB_JSON || '').trim();
  if (single) list.push(single);

  // defaults de cortesia (podem falhar/rodiziar; altere se quiser)
  if (list.length === 0) {
    list.push('https://globe.adsb.fi/data/aircraft.json');
  }
  // remove dup
  return Array.from(new Set(list));
}

async function tryTar1090Source(url: string, lamin:number,lomin:number,lamax:number,lomax:number) {
  // cache-buster leve para evitar CDN 502 em sequência
  const bust = url.includes('?') ? `&_=${Date.now()}` : `?_=${Date.now()}`;
  const full = url + bust;

  const r = await withTimeout(fetch(full, {
    cache: 'no-store',
    headers: { 'Accept': 'application/json, text/plain;q=0.9, */*;q=0.5', 'User-Agent': UA },
  }), 12000, 'tar1090_fetch');

  if (!r.ok) throw new Error(`tar1090_http_${r.status}`);
  const txt = await r.text(); // tolera JSON “quebrado” com vírgula final etc.
  let j: any = null;
  try {
    j = JSON.parse(txt);
  } catch {
    // tenta consertos simples
    const fixed = txt.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    j = JSON.parse(fixed);
  }

  const arr: any[] = Array.isArray(j?.aircraft) ? j.aircraft : [];
  const flights = arr
    .filter(a => a && (a.squawk === '7700' || a.squawk === 7700))
    .filter(a => (typeof a.lat === 'number' && typeof a.lon === 'number')
      ? inBox(a.lat, a.lon, lamin, lomin, lamax, lomax)
      : true)
    .map(a => ({
      hex: String(a.hex || '').toLowerCase(),
      flight: String(a.flight || '').trim(),
      lat: a.lat, lon: a.lon,
    }));

  return { flights };
}

async function getFromTar1090Multi(lamin:number,lomin:number,lamax:number,lomax:number, trace: Trace) {
  const sources = sourcesFromEnv();
  let lastErr: any = null;

  for (const src of sources) {
    try {
      const { flights } = await tryTar1090Source(src, lamin,lomin,lamax,lomax);
      return { backend: 'tar1090', source: src, flights };
    } catch (e: any) {
      lastErr = e;
      trace.push({ step: 'tar1090_fail', src, error: String(e?.message || e) });
      // tenta o próximo
    }
  }
  throw lastErr || new Error('tar1090_all_failed');
}

// ---------- handler ----------
export async function GET(req: Request) {
  const trace: Trace = [];
  const url = new URL(req.url);

  const lamin = asNum(url.searchParams.get('lamin'), -35);
  const lomin = asNum(url.searchParams.get('lomin'), -68);
  const lamax = asNum(url.searchParams.get('lamax'), -34);
  const lomax = asNum(url.searchParams.get('lomax'), -58);
  const backend = (url.searchParams.get('backend') || '').toLowerCase(); // '', 'opensky', 'tar1090'
  const debug = url.searchParams.get('debug') != null;

  trace.push({ step: 'params', lamin, lomin, lamax, lomax, backend });

  try {
    // 1) forçar tar1090
    if (backend === 'tar1090') {
      try {
        const out = await getFromTar1090Multi(lamin,lomin,lamax,lomax,trace);
        return ok({ backend: out.backend, count: out.flights.length, flights: out.flights, source: out.source }, debug ? trace : undefined);
      } catch (e: any) {
        // não derruba página
        return softFail(String(e?.message || e), debug ? trace : undefined);
      }
    }

    // 2) forçar OpenSky
    if (backend === 'opensky') {
      try {
        const j = await getFromOpenSky(lamin,lomin,lamax,lomax,trace);
        const flights = (Array.isArray(j?.states) ? j.states : [])
          .filter((s: any) => Array.isArray(s) && s[6] != null && s[5] != null)
          .map((s:any) => ({ hex: String(s[0]||'').trim().toLowerCase(), flight: String(s[1]||'').trim(), lat: s[6], lon: s[5], squawk: s[14] }))
          .filter((x:any) => x.squawk === '7700' || x.squawk === 7700);
        return ok({ backend: 'opensky', count: flights.length, flights }, debug ? trace : undefined);
      } catch (e:any) {
        return softFail(String(e?.message || e), debug ? trace : undefined);
      }
    }

    // 3) automático: OpenSky → tar1090
    try {
      const j = await getFromOpenSky(lamin,lomin,lamax,lomax,trace);
      const flights = (Array.isArray(j?.states) ? j.states : [])
        .filter((s: any) => Array.isArray(s) && s[6] != null && s[5] != null)
        .map((s:any) => ({ hex: String(s[0]||'').trim().toLowerCase(), flight: String(s[1]||'').trim(), lat: s[6], lon: s[5], squawk: s[14] }))
        .filter((x:any) => x.squawk === '7700' || x.squawk === 7700);
      return ok({ backend: 'opensky', count: flights.length, flights }, debug ? trace : undefined);
    } catch (e:any) {
      trace.push({ step: 'opensky_failed', error: String(e?.message || e) });
      try {
        const out = await getFromTar1090Multi(lamin,lomin,lamax,lomax,trace);
        return ok({ backend: out.backend, count: out.flights.length, flights: out.flights, source: out.source }, debug ? trace : undefined);
      } catch (e2:any) {
        trace.push({ step: 'tar1090_all_failed', error: String(e2?.message || e2) });
        return softFail('no_backend_available', debug ? trace : undefined);
      }
    }
  } catch (e:any) {
    trace.push({ step: 'fatal', error: String(e?.message || e) });
    // soft-fail mesmo em erros inesperados
    return softFail('unexpected', debug ? trace : undefined);
  }
}
