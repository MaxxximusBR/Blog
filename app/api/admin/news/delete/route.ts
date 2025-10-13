import { list, put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function load(): Promise<any[]> {
  const L = await list({ prefix: 'indexes/' });
  const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
  if (!it?.url) return [];
  const r = await fetch(it.url, { cache: 'no-store' });
  return r.ok ? await r.json() : [];
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json() as { id?: string };
    if (!id) return new Response(JSON.stringify({ ok:false, msg:'ID ausente.' }), { status: 400 });

    const items = await load();
    const next = items.filter((n:any)=> n.id !== id);

    await put('indexes/news.json', JSON.stringify(next, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return new Response(JSON.stringify({ ok:true }), { headers:{'content-type':'application/json'}});
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, msg: e?.message || 'Falha' }), { status: 500 });
  }
}
