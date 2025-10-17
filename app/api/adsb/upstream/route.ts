// app/api/adsb/upstream/route.ts
export const dynamic = 'force-dynamic';

const UPSTREAM = process.env.ADSB_UPSTREAM || 'https://globe.adsb.fi/data/aircraft.json';
const REFERRER = process.env.ADSB_REFERER || 'https://globe.adsb.fi/';

export async function GET(req: Request) {
  try {
    const u = new URL(UPSTREAM); // garante URL válida (evita "Failed to parse URL")
    const r = await fetch(u.toString(), {
      // Sem cache pra não ficar com arquivo antigo
      cache: 'no-store',
      headers: {
        // alguns proxies do globe checam estritamente:
        'Referer': REFERRER,
        'Origin': REFERRER.replace(/\/+$/, ''), // sem barra final
        'User-Agent': 'OVNIs-2025/1.0 (+https://blog)',
        'Accept': 'application/json,text/plain;q=0.8,*/*;q=0.5',
      },
      // Vercel às vezes precisa de keepalive para upstreams lerdos
      // @ts-expect-error: runtime node
      keepalive: true,
    });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return Response.json(
        { ok: false, status: r.status, error: `Upstream HTTP ${r.status}`, body: body.slice(0, 300) },
        { status: 502 }
      );
    }

    // Não alteramos o conteúdo — só repassamos
    const json = await r.json();
    return Response.json(json, { headers: { 'cache-control': 'no-store' } });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || 'upstream_error' },
      { status: 500 }
    );
  }
}
