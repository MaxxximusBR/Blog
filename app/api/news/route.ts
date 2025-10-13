// Lista pública de notícias (para a página /news)
import { list } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type NewsItem = {
  id: string;        // ex.: "n-2025-10-12-<ts>"
  date: string;      // "YYYY-MM-DD"
  title: string;
  url: string;       // link externo
  image?: string;    // opcional (capa)
};

async function loadIndex(): Promise<NewsItem[]> {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (it?.url) {
      const r = await fetch(it.url, { cache: 'no-store' });
      if (r.ok) return (await r.json()) as NewsItem[];
    }
  } catch {}
  return [];
}

export async function GET() {
  const items = await loadIndex();
  // ordena por data desc e, em empate, id desc
  const ordered = items
    .filter(n => n && n.date && n.title && n.url)
    .slice()
    .sort((a,b)=> (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)));
  return new Response(JSON.stringify(ordered), { headers: { 'content-type': 'application/json' }});
}
