// app/api/admin/news/save/route.ts
import { list, put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  date?: string;
  title?: string;
  url?: string;
  image?: string;
  summary?: string; // NOVO
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

    const date = String(b.date || '').trim();
    const title = String(b.title || '').trim();
    const url = String(b.url || '').trim();
    const image = (String(b.image || '').trim() || undefined) as string | undefined;

    // resumo opcional
    let summary = String(b.summary ?? '').trim();
    if (summary.length > 600) summary = summary.slice(0, 600); // limite de 600 chars
    if (!summary) summary = ''; // para que undefined seja omitido no JSON

    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) {
      return new Response(JSON.stringify({ ok: false, msg: 'Data inválida (AAAA-MM-DD).' }), { status: 400 });
    }
    if (!title) {
      return new Response(JSON.stringify({ ok: false, msg: 'Informe o título.' }), { status: 400 });
    }
    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ ok: false, msg: 'URL externa inválida.' }), { status: 400 });
    }

    const now = Date.now();
    const id = `n-${date}-${now}`;
    const item: Record<string, any> = { id, date, title, url };
    if (image) item.image = image;
    if (summary) item.summary = summary; // só grava se houver conteúdo

    const items = await load();
    items.push(item);

    // ordena por data DESC e, em empate, por id DESC (mais recente primeiro)
    items.sort((a: any, b: any) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));

    await put('indexes/news.json', JSON.stringify(items, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return new Response(JSON.stringify({ ok: true, item }), { headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, msg: e?.message || 'Falha' }), { status: 500 });
  }
}
