// app/api/osproxy/route.ts
export const dynamic = 'force-dynamic';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const clientId = process.env.OPEN_SKY_CLIENT_ID!;
  const clientSecret = process.env.OPEN_SKY_CLIENT_SECRET!;
  const tokenUrl =
    process.env.OPEN_SKY_TOKEN_URL ||
    'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error('OAuth token fetch failed: ' + res.status);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
  return cachedToken!;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const debug = searchParams.get('debug') === '1';

  const lamin = searchParams.get('lamin');
  const lomin = searchParams.get('lomin');
  const lamax = searchParams.get('lamax');
  const lomax = searchParams.get('lomax');

  try {
    const token = await getAccessToken();

    const url = `https://api.opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!r.ok) {
      const body = await r.text();
      return new Response(
        JSON.stringify({
          ok: false,
          error: `opensky_http_${r.status}`,
          url,
          body: body.slice(0, 400),
        }),
        { status: r.status, headers: { 'content-type': 'application/json' } }
      );
    }

    const data = await r.json();
    return new Response(JSON.stringify({ ok: true, ...data }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message || 'internal_error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
