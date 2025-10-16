import { NextResponse } from 'next/server';

export const revalidate = 120;

const BR_FIRS = ['SBAZ', 'SBBS', 'SBRE', 'SBCW']; // Amazônica, Brasília, Recife, Curitiba

export async function GET() {
  const url = 'https://aviationweather.gov/api/data/isigmet?format=geojson';

  const res = await fetch(url, {
    headers: { 'User-Agent': 'LuzesDoAbismo/Blog (sigmet proxy)' },
    next: { revalidate: 120 },
  });

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text || 'Upstream error', { status: res.status });
  }

  const gj = await res.json(); // GeoJSON
  // filtro conservador: propriedade pode vir como fir, firId, firname etc.
  const filtered = {
    type: 'FeatureCollection',
    features: (gj?.features ?? []).filter((f: any) => {
      const p = f?.properties ?? {};
      const s = `${p.fir ?? ''} ${p.firId ?? ''} ${p.firname ?? ''} ${p.firName ?? ''}`.toUpperCase();
      return BR_FIRS.some(code => s.includes(code));
    }),
  };

  return NextResponse.json(filtered, {
    headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=60' },
  });
}
