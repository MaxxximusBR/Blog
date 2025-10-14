export const dynamic = 'force-dynamic';

function clamp(v:number,min:number,max:number){ return Math.max(min, Math.min(max, v)); }

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = clamp(Number(searchParams.get('lat') ?? -30.03), -89, 89);
    const lon = clamp(Number(searchParams.get('lon') ?? -51.22), -179, 179);
    const r   = clamp(Number(searchParams.get('r')   ?? 4), 0.5, 10);

    const lamin = lat - r, lamax = lat + r, lomin = lon - r, lomax = lon + r;
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    const headers: Record<string, string> = {};
    const u = process.env.OPEN_SKY_USER;
    const p = process.env.OPEN_SKY_PASS;
    if (u && p) headers['Authorization'] = 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      return new Response(JSON.stringify({ ok:false, msg:`OpenSky: ${res.status}`, body: txt.slice(0,300) }), { status: 502 });
    }
    const json = await res.json();

    const items = (json?.states || [])
      .filter((s:any) => Array.isArray(s) && s[6] != null && s[5] != null)
      .map((s:any) => ({
        hex: String(s[0] || '').trim(),
        callsign: String(s[1] || '').trim(),
        country: s[2],
        lon: s[5],
        lat: s[6],
        altitude: s[13] ?? s[8],
        speed: s[9],
        heading: s[10],
        last: s[4],
      }));

    return new Response(JSON.stringify({ ok:true, items }), { headers: { 'content-type':'application/json' }});
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, msg: e?.message || 'Falha' }), { status: 500 });
  }
}
