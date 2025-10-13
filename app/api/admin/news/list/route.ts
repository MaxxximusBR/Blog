import { list } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (!it?.url) return new Response(JSON.stringify([]), { headers:{'content-type':'application/json'}});
    const r = await fetch(it.url, { cache: 'no-store' });
    const json = r.ok ? await r.json() : [];
    return new Response(JSON.stringify(json), { headers:{'content-type':'application/json'}});
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || 'fail' }), { status: 500 });
  }
}
