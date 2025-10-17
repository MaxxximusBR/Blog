// app/api/adsb/upstream/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const upstream = process.env.ADSB_UPSTREAM || 'https://globe.adsb.fi/data/aircraft.json';
  const headers: Record<string,string> = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'accept': 'application/json,text/plain,*/*',
    // alguns upstreams exigem Referer
    'referer': process.env.ADSB_REFERER || 'https://globe.adsb.fi/'
  };

  try {
    const r = await fetch(upstream, { headers, cache: 'no-store' });
    if (!r.ok) {
      return NextResponse.json({ ok:false, error:`upstream ${r.status}` }, { status: 200 });
    }
    const j = await r.json();
    return NextResponse.json(j, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'fetch-failed' }, { status: 200 });
  }
}
