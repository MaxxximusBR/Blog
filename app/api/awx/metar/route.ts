import { NextResponse } from 'next/server';

export const revalidate = 60; // ISR no edge/cache do Vercel

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids') ?? '';
  const hours = searchParams.get('hours') ?? '12'; // últimas 12h por padrão
  if (!ids) return NextResponse.json({ error: 'ids required' }, { status: 400 });

  const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(
    ids
  )}&hours=${encodeURIComponent(hours)}&format=json`;

  const res = await fetch(url, {
    // recomendado pelo AWC: user-agent identificável
    headers: { 'User-Agent': 'LuzesDoAbismo/Blog (metar proxy)' },
    // cache control adicional
    next: { revalidate: 60 },
  });

  // repassa status/erro do AWC
  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text || 'Upstream error', { status: res.status });
  }

  // entrega JSON cru do AWC
  const data = await res.json();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}
