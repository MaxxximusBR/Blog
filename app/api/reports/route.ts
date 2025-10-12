// app/api/reports/route.ts
import { NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';

const INDEX_PATH = 'indexes/reports.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const res = await list({ prefix: 'indexes/' });
  // @ts-ignore
  const item = res.blobs.find(b => b.pathname === INDEX_PATH || b.pathname.endsWith('/reports.json'));

  if (!item) {
    await put(INDEX_PATH, JSON.stringify([], null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
    return NextResponse.json([]);
  }

  // @ts-ignore
  const url: string | undefined = item.url;
  if (!url) return NextResponse.json([]);

  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return NextResponse.json([]);
    const json = await r.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json([]);
  }
}
