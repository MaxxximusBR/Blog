import { list, put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  id?: string;       // se vier, atualiza
  date?: string;
  title?: string;
  url?: string;
  image?: string;
  summary?: string;  // até 1600
};

async function load(): Promise<any[]> {
  const L = await list({ prefix: 'indexes/' });
  const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
  if (!it?.url) return [];
  const r = await fetch(it.url, { cache: 'no-store' });
  return r.ok ? await r.json() : [];
}

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;

    const idIn = String(b.id || '').trim() || undefined;
    const date = String(b.date || '').trim();
    const title = String(b.title || '').trim();
    const url = String(b.url || '').trim();
    const image = String(b.image || '').trim() || undefined;
    const summaryRaw = String(b.summary || '').trim();
    const summary = summaryRaw ? summaryRaw.slice(0, 1600) : undefined;

    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) {
      return new Response(JSON.stringify({ ok:false, msg:'Data inválida (AAAA-MM-DD).' }), { status: 400 });
    }
    if (!title) {
      return new Response(JSON.stringify({ ok:false, msg:'Informe o título.' }), { status: 400 });
    }
    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ ok:false, msg:'URL externa inválida.' }), { status: 400 });
    }

    const items = await load();

    let item: any;
    if (idIn) {
      // EDITAR: procura por id e atualiza
      const ix = items.findIndex((x: any) => x.id === idIn);
      if (ix >= 0) {
        items[ix] = { ...items[ix], date, title, url, image, summary };
        item = items[ix];
      } else {
        // se não achar, cria novo com o id fornecido
        item = { id: idIn, date, title, url, image, summary };
        items.push(item);
      }
    } else {
      // CRIAR
      const now = Date.now();
      const id = `n-${date}-${now}`;
      item = { id, date, title, url, image, summary };
      items.push(item);
    }

    // ordena por data desc, depois id desc
    items.sort((a: any, b: any) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)
    );

    await put('indexes/news.json', JSON.stringify(items, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return new Response(JSON.stringify({ ok:true, item }), { headers:{'content-type':'application/json'}});
  } catch (e: any) {
    return new Response(JSON.stringify({ ok:false, msg: e?.message || 'Falha' }), { status: 500 });
  }
}
