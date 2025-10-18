export const dynamic = 'force-dynamic';

export async function GET() {
  const url = 'https://globe.adsb.fi/data/aircraft.json';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'adsb-proxy', 'Accept': 'application/json' } });
    if (!r.ok) return new Response(`upstream ${r.status}`, { status: 502 });
    const j = await r.text();
    return new Response(j, { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return new Response(`fetch failed: ${e.message}`, { status: 502 });
  }
}
