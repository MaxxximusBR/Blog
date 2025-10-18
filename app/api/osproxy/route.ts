// app/api/osproxy/route.ts

// use Edge (mais estável p/ fetch externo na Vercel)
export const runtime = 'edge';

function b64(str: string) {
  // btoa existe no Edge; no Node caímos no Buffer
  // @ts-ignore
  if (typeof btoa !== 'undefined') return btoa(str);
  // @ts-ignore
  return Buffer.from(str).toString('base64');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const debug = searchParams.get('debug');

  try {
    const user = process.env.OPEN_SKY_USER || '';
    const pass = process.env.OPEN_SKY_PASS || '';
    if (!user || !pass) {
      const msg = 'missing OPEN_SKY_USER / OPEN_SKY_PASS';
      if (debug) return json({ ok: false, error: msg }, 500);
      return json({ ok: false, error: 'internal error' }, 500);
    }

    // repassa os mesmos params
    const url = 'https://opensky-network.org/api/states/all?' + searchParams.toString();

    const r = await fetch(url, {
      headers: {
        Authorization: 'Basic ' + b64(`${user}:${pass}`),
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      // sem cache aqui
      cache: 'no-store',
    });

    // modo debug: ecoa status / url se der zebra
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      const err = `opensky_http_${r.status}`;
      if (debug) {
        return json({ ok: false, error: err, url, body: body.slice(0, 600) }, r.status || 502);
      }
      return json({ ok: false, error: 'internal error' }, r.status || 502);
    }

    // passa o corpo direto (stream)
    return new Response(r.body, {
      status: r.status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (e: any) {
    if (searchParams.get('debug')) {
      return json({ ok: false, error: e?.message || String(e) }, 500);
    }
    return json({ ok: false, error: 'internal error' }, 500);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
