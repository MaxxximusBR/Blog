import { list, put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function load(): Promise<any[]> {
  const L = await list({ prefix: 'indexes/' });
  const it = (L.blobs as any[]).find((b) => b.pathname === 'indexes/news.json');
  if (!it?.url) return [];
  const r = await fetch(it.url, { cache: 'no-store' });
  return r.ok ? await r.json() : [];
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return Response.json({ ok:false, msg:'ID obrigatório.' }, { status: 400 });

    const items = await load();
    const before = items.length;
    const filtered = items.filter((x:any) => x.id !== id);

    if (filtered.length === before) {
      return Response.json({ ok:false, msg:'Notícia não encontrada.' }, { status: 404 });
    }

    await put('indexes/news.json', JSON.stringify(filtered, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return Response.json({ ok:true, removed: id });
  } catch (e:any) {
    return Response.json({ ok:false, msg: e?.message || 'Falha' }, { status: 500 });
  }
}
