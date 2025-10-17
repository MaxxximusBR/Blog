export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  // Env vars (com defaults seguros)
  const UPSTREAM =
    process.env.ADSB_UPSTREAM || 'https://globe.adsb.fi/data/aircraft.json';
  const REFERRER =
    process.env.ADSB_REFERER || 'https://globe.adsb.fi/';

  try {
    const u = new URL(UPSTREAM);

    const r = await fetch(u.toString(), {
      cache: 'no-store',
      headers: {
        Referer: REFERRER,
        Origin: REFERRER.replace(/\/+$/, ''), // sem barra no final
        'User-Agent': 'OVNIs-2025/1.0 (+https://github.com/)',
        Accept: 'application/json,text/plain;q=0.8,*/*;q=0.5',
      },
      keepalive: true,
    });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return new Response(
        JSON.stringify({
          ok: false,
          status: r.status,
          error: `Upstream HTTP ${r.status}`,
          body: body.slice(0, 500),
        }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      );
    }

    // Se quiser o payload bruto
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('raw') === '1';
    const text = await r.text();
    const contentType = r.headers.get('content-type') || 'application/json';

    if (raw) {
      return new Response(text, { headers: { 'content-type': contentType } });
    }

    // Tenta validar como JSON antes de devolver
    try {
      const json = JSON.parse(text);
      return new Response(JSON.stringify({ ok: true, data: json }), {
        headers: { 'content-type': 'application/json' },
      });
    } catch {
      return new Response(
        JSON.stringify({
          ok: false,
          status: 200,
          error: 'Invalid JSON from upstream',
        }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      );
    }
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
