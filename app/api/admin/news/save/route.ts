import { list, put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  id?: string;           // se vier, edita; se não, cria
  date?: string;         // YYYY-MM-DD
  title?: string;
  url?: string;          // link externo
  image?: string;        // opcional
  summary?: string;      // opcional (até 1600 chars)
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

    const id = String(b.id || '').trim() || undefined;
    const date = String(b.date || '').trim();
    const title = String(b.title || '').trim();
    const url = String(b.url || '').trim();
    const image = String(b.image || '').trim() || undefined;
    const summary = (b.summary ?? '').toString().trim() || undefined;

    // validações
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ ok: false, msg: 'Data inválida (use AAAA-MM-DD).' }), { status: 400 });
    }
    if (!title) {
      return new Response(JSON.stringify({ ok: false, msg: 'Informe o título.' }), { status: 400 });
    }
    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ ok: false, msg: 'URL externa inválida.' }), { status: 400 });
    }
    if (summary && summary.length > 1600) {
      return new Response(JSON.stringify({ ok: false, msg: 'Resumo muito longo (máx. 1600 caracteres).' }), { status: 400 });
    }

    const items = await load();

    if (id) {
      // edição
      const idx = items.findIndex((n: any) => n.id === id);
      if (idx < 0) {
        return new Response(JSON.stringify({ ok: false, msg: 'Notícia não encontrada para edição.' }), { status: 404 });
      }
      items[idx] = { ...items[idx], date, title, url, image, summary };
    } else {
      // criação
      const nid = `n-${date}-${Date.now()}`;
      items.push({ id: nid, date, title, url, image, summary });
    }

    // ordenação: data desc + id desc
    items.sort((a: any, b: any) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1
    );

    // ⬇️ permitir sobrescrever o mesmo arquivo
    await put('indexes/news.json', JSON.stringify(items, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, msg: e?.message || 'Falha' }), { status: 500 });
  }
}
