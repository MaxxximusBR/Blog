import { NextResponse } from 'next/server';

// cache CDN (ISR) por 60s
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get('ids') ?? '').toUpperCase().replace(/\s+/g, '');
  const hours = searchParams.get('hours') ?? '12';
  if (!ids) return NextResponse.json({ error: 'ids required' }, { status: 400 });

  // 1) Tentativa: novo endpoint AWC
  const urlNew = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(
    ids
  )}&hours=${encodeURIComponent(hours)}&format=json`;

  try {
    const resNew = await fetch(urlNew, {
      headers: { 'User-Agent': 'LuzesDoAbismo/Blog (metar proxy)' },
      next: { revalidate: 60 },
    });
    if (resNew.ok) {
      const json = await resNew.json();
      // Se veio conteúdo, devolvemos como está
      const hasData =
        (Array.isArray(json?.metars) && json.metars.length > 0) ||
        (Array.isArray(json?.METAR) && json.METAR.length > 0) ||
        (Array.isArray(json?.data) && json.data.length > 0) ||
        (Array.isArray(json) && json.length > 0);
      if (hasData) {
        return NextResponse.json(json, {
          headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
        });
      }
      // se vier vazio, fazemos fallback
    }
  } catch {
    // segue para fallback
  }

  // 2) Fallback: ADDS (dataserver_current)
  const urlAdds = `https://aviationweather.gov/adds/dataserver_current/httpparam?datasource=metars&requestType=retrieve&format=JSON&stationString=${encodeURIComponent(
    ids
  )}&hoursBeforeNow=${encodeURIComponent(hours)}`;

  const resAdds = await fetch(urlAdds, {
    headers: { 'User-Agent': 'LuzesDoAbismo/Blog (metar proxy)' },
    next: { revalidate: 60 },
  });

  if (!resAdds.ok) {
    const txt = await resAdds.text();
    return new NextResponse(txt || 'Upstream error', { status: resAdds.status });
  }

  const jsonAdds = await resAdds.json();
  return NextResponse.json(jsonAdds, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}
