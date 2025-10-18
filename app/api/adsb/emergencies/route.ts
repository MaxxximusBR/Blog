// app/api/adsb/emergencies/route.ts
export const dynamic = 'force-dynamic';

function num(v: string | null, def: number) {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : def;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lamin = num(url.searchParams.get('lamin'), -35);
    const lomin = num(url.searchParams.get('lomin'), -68);
    const lamax = num(url.searchParams.get('lamax'), -34);
    const lomax = num(url.searchParams.get('lomax'), -58);

    // >>> MONTA URL ABSOLUTA PARA O UPSTREAM <<<
    const upstream = new URL('/api/adsb/upstream', url.origin);
    upstream.searchParams.set('lamin', String(lamin));
    upstream.searchParams.set('lomin', String(lomin));
    upstream.searchParams.set('lamax', String(lamax));
    upstream.searchParams.set('lomax', String(lomax));

    const r = await fetch(upstream.toString(), { cache: 'no-store' });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return new Response(
        JSON.stringify({ ok: false, error: 'upstream_http_' + r.status, body }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      );
    }

    const j = await r.json();
    const ac = Array.isArray(j?.aircraft) ? j.aircraft : [];

   // depois de calcular `flights`...
const demo = url.searchParams.get('demo') === '1';
if (demo && flights.length === 0) {
  flights.push({ hex: 'demo7700', flight: 'DEMO7700' });
}    
    // aceita squawk em string/number e normaliza
    const emerg = ac.filter((a: any) => String(a?.squawk || '').trim() === '7700');

    const flights = emerg.map((a: any) => ({
      hex: String(a?.hex || '').toLowerCase(),
      flight: (a?.flight || '').trim(),
    }));

    return new Response(
      JSON.stringify({ ok: true, count: flights.length, flights }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || 'internal_error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
