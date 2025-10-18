export const runtime = 'edge'; // Edge = mais rápido e bom p/ fetch externos

export async function GET(req: Request) {
  try {
    const { search } = new URL(req.url);
    const u = process.env.OPEN_SKY_USER || '';
    const p = process.env.OPEN_SKY_PASS || '';
    if (!u || !p) {
      return new Response(JSON.stringify({ ok: false, error: 'missing creds' }), { status: 500 });
    }

    const url = 'https://opensky-network.org/api/states/all' + search;
    const auth = 'Basic ' + btoa(`${u}:${p}`);

    const r = await fetch(url, {
      headers: {
        Authorization: auth,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
    });

    return new Response(r.body, {
      status: r.status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'proxy_fail' }), { status: 500 });
  }
}
