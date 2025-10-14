import { list, put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  date?: string;
  title?: string;
  url?: string;
  image?: string;
  summary?: string; // <— agora suportado
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

    const date = String(b.date || '').trim();
    const title = String(b.title || '').trim();
    const url = String(b.url || '').trim();
    const image = String(b.image || '').trim() || undefined;
    const summaryRaw = typeof b.summary === 'string' ? b.summary : '';
    // normaliza espaços do resumo
    const summary = summaryRaw.replace(/\s+/g, ' ').trim() || undefined;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ ok: false, msg: 'Data inválida (AAAA-MM-DD).' }), { status: 400 });
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

    const now = Date.now();
    const id = `n-${date}-${now}`;
    const item = { id, date, title, url, image, summary }; // <— salva resumo

    const items = await load();
    items.push(item);

    // ordena: mais recentes primeiro
    items.sort((a: any, b: any) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)
    );

    await put('indexes/news.json', JSON.stringify(items, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return new Response(JSON.stringify({ ok: true, item }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, msg: e?.message || 'Falha' }), {
      status: 500,
    });
  }
}
