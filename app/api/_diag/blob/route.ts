import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await put(
      'diagnostics/ping.txt',
      new TextEncoder().encode('ok ' + Date.now()),
      { access: 'public', addRandomSuffix: false, contentType: 'text/plain' }
    );
    const l = await list({ prefix: 'diagnostics/' });
    return NextResponse.json({ ok: true, wrote: r.url, count: l.blobs?.length ?? 0 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'fail', hasToken: !!process.env.BLOB_READ_WRITE_TOKEN },
      { status: 500 }
    );
  }
}

