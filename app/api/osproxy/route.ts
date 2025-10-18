// app/api/osproxy/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Trace = Array<Record<string, any>>;

function bad(msg: string, trace?: Trace, status = 200) {
  return NextResponse.json({ ok: false, error: msg, trace }, { status });
}
function ok(data: any, trace?: Trace) {
  return NextResponse.json({ ok: true, ...data, trace });
}
function num(v: string | null, def: number) {
  if (v == null) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/** Pega access_token no Keycloak da OpenSky.
 * 1) Tenta client_secret_basic (Authorization: Basic)
 * 2) Fallback client_secret_post (credenciais no corpo)
 */
async function getOpenSkyToken(trace: Trace) {
  const url = (process.env.OPEN_SKY_TOKEN_URL || '').trim();
  const cid = (process.env.OPEN_SKY_CLIENT_ID || '').trim();
  const csec = (process.env.OPEN_SKY_CLIENT_SECRET || '').trim();

  if (!url || !cid || !csec) {
    throw new Error('missing_env_vars');
  }

  // 1) BASIC
  try {
    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    const basic = 'Basic ' + Buffer.from(`${cid}:${csec}`).toString('base64');

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basic,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'vercel-osproxy/1.0',
      },
      body,
      cache: 'no-store',
    });

    trace.push({ step: 'token_basic_resp', status: r.status });
    if (r.ok) {
      const j = await r.json();
      if (j?.access_token) return j.access_token as string;
      trace.push({ step: 'token_basic_no_access_token', body: j });
    } else {
      const txt = await r.text().catch(() => '');
      trace.push({ step: 'token_basic_http_' + r.status, body: txt.slice(0, 500) });
    }
  } catch (e: any) {
    trace.push({ step: 'token_basic_error', error: String(e?.message || e) });
  }

  // 2) POST (client_secret_post)
  {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: cid,
      client_secret: csec,
    });

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'vercel-osproxy/1.0',
      },
      body,
      cache: 'no-store',
    });

    trace.push({ step: 'token_post_resp', status: r.status });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      trace.push({ step: 'token_post_http_' + r.status, body: txt.slice(0, 500) });
      throw new Error('token_http_' + r.status);
    }
    const j = await r.json();
    if (!j?.access_token) {
      trace.push({ step: 'token_post_no_access_token', body: j });
      throw new Error('token_no_access_token');
    }
    return j.access_token as string;
  }
}

export async function GET(req: Request) {
  const trace: Trace = [];
  try {
    const u = new URL(req.url);

    // caixa (bbox) — defaults seguros pro teste (BR Sul)
    const lamin = num(u.searchParams.get('lamin'), -35);
    const lomin = num(u.searchParams.get('lomin'), -68);
    const lamax = num(u.searchParams.get('lamax'), -34);
    const lomax = num(u.searchParams.get('lomax'), -58);
    const debug = u.searchParams.get('debug') != null;

    trace.push({ step: 'params', lamin: String(lamin), lomin: String(lomin), lamax: String(lamax), lomax: String(lomax) });

    // 1) token
    const token = await getOpenSkyToken(trace);
    if (!token) return bad('token_failed', trace);

    // 2) chama states/all com Bearer
    const qs = new URLSearchParams({
      lamin: String(lamin),
      lomin: String(lomin),
      lamax: String(lamax),
      lomax: String(lomax),
      // se quiser “ver” o request no response, ative: extended=1 (OpenSky ignora parâmetros não suportados)
    });

    const url = `https://opensky-network.org/api/states/all?${qs.toString()}`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'vercel-osproxy/1.0',
      },
      cache: 'no-store',
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      trace.push({ step: 'opensky_http_' + r.status, url, body: txt.slice(0, 500) });
      return bad('opensky_http_' + r.status, debug ? trace : undefined);
    }

    const j = await r.json();
    // você pode opcionalmente filtrar/transformar aqui
    return ok({ url, data: j }, debug ? trace : undefined);
  } catch (e: any) {
    trace.push({ step: 'fatal', error: String(e?.message || e) });
    return bad(e?.message || 'internal_error', trace);
  }
}
