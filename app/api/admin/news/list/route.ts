import { list } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (!it?.url) return Response.json({ ok: true, items: [] });
    const r = await fetch(it.url, { cache: 'no-store' });
    const items = r.ok ? await r.json() : [];
    // já vem ordenado do save, mas garantimos
    items.sort((a:any,b:any)=> (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
    return Response.json({ ok: true, items });
  } catch (e:any) {
    return Response.json({ ok:false, msg: e?.message || 'Falha' }, { status: 500 });
  }
}
