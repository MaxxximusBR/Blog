import { list, put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  id?: string;       // NOVO — se vier, atualiza
  date?: string;
  title?: string;
  url?: string;
  image?: string;
  summary?: string;
};

async function load(): Promise<any[]> {
  const L = await list({ prefix: 'indexes/' });
  const it = (L.blobs as any[]).find((b) => b.pathname === 'indexes/news.json');
  if (!it?.url) return [];
  const r = await fetch(it.url, { cache: 'no-store' });
  return r.ok ? await r.json() : [];
}

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;

    // validações
    const date = String(b.date || '').trim();
    const title = String(b.title || '').trim();
    const url = String(b.url || '').trim();
    const image = (String(b.image || '').trim() || undefined) as string | undefined;
    let summary = String(b.summary ?? '').trim();
    if (summary.length > 600) summary = summary.slice(0, 600);

    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) {
      return Response.json({ ok: false, msg: 'Data inválida (AAAA-MM-DD).' }, { status: 400 });
    }
    if (!title) return Response.json({ ok: false, msg: 'Informe o título.' }, { status: 400 });
    if (!/^https?:\/\//i.test(url)) return Response.json({ ok: false, msg: 'URL externa inválida.' }, { status: 400 });

    const items = await load();
    let item: any;

    if (b.id) {
      // EDIÇÃO
      const idx = items.findIndex((x) => x.id === b.id);
      if (idx === -1) return Response.json({ ok: false, msg: 'Notícia não encontrada.' }, { status: 404 });
      item = { ...items[idx], date, title, url, image: image || '', summary };
      items[idx] = item;
    } else {
      // CRIAÇÃO
      const now = Date.now();
      const id = `n-${date}-${now}`;
      item = { id, date, title, url, image: image || '', summary };
      items.push(item);
    }

    items.sort((a:any,b:any)=> (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));

    await put('indexes/news.json', JSON.stringify(items, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return Response.json({ ok: true, item });
  } catch (e:any) {
    return Response.json({ ok:false, msg: e?.message || 'Falha' }, { status: 500 });
  }
}
