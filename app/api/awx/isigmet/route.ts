import { NextResponse } from 'next/server';

// cache CDN (ISR) por 2 min
export const revalidate = 120;

const BR_FIRS = ['SBAZ', 'SBBS', 'SBRE', 'SBCW']; // Amazônica, Brasília, Recife, Curitiba

export async function GET() {
  // 1) Novo endpoint (GeoJSON)
  const urlNew = 'https://aviationweather.gov/api/data/isigmet?format=geojson';

  try {
    const res = await fetch(urlNew, {
      headers: { 'User-Agent': 'LuzesDoAbismo/Blog (sigmet proxy)' },
      next: { revalidate: 120 },
    });
    if (res.ok) {
      const gj = await res.json();
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
  } catch {
    // continua no fallback
  }

  // 2) Fallback ADDS: GeoJSON de SIGMET
  const urlAdds =
    'https://aviationweather.gov/adds/dataserver_current/httpparam?datasource=sigmet&requestType=retrieve&format=GEOJSON';

  const resAdds = await fetch(urlAdds, {
    headers: { 'User-Agent': 'LuzesDoAbismo/Blog (sigmet proxy)' },
    next: { revalidate: 120 },
  });

  if (!resAdds.ok) {
    const txt = await resAdds.text();
    return new NextResponse(txt || 'Upstream error', { status: resAdds.status });
  }

  const gj = await resAdds.json();
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
