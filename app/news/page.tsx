import type { Metadata } from 'next';
import { list } from '@vercel/blob';

export const metadata: Metadata = {
  title: 'Notícias | Anuário OVNIs 2025',
  description: 'Destaques e links externos.',
};

export const dynamic = 'force-dynamic';

type NewsItem = { id:string; date:string; title:string; url:string; image?:string };

function fmtDate(iso: string) {
  const [y,m,d] = iso.split('-').map(Number);
  const dt = new Date(y, (m||1)-1, d||1);
  return dt.toLocaleDateString('pt-BR');
}

async function load(): Promise<NewsItem[]> {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (!it?.url) return [];
    const r = await fetch(it.url, { cache: 'no-store' });
    const arr = r.ok ? await r.json() : [];
    return (arr as NewsItem[]).filter(n=> n && n.date && n.title && n.url)
      .sort((a,b)=> (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)));
  } catch { return []; }
}

export default async function NewsPage() {
  const items = await load();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <section className="rounded-2xl bg-[#0e1624] px-6 py-5 shadow-lg">
        <h1 className="text-2xl font-semibold">Notícias</h1>
        <p className="opacity-75">Destaques e links externos.</p>
      </section>

      {!items.length ? (
        <div className="opacity-70">Nenhuma notícia ainda.</div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(n => (
            <article key={n.id} className="rounded-2xl bg-[#0e1624] p-4 shadow-lg flex flex-col">
              {n.image && (
                <a href={n.url} target="_blank" rel="noopener noreferrer">
                  {/* imagem de capa opcional */}
                  <img src={n.image} alt="" className="rounded-lg mb-3 w-full h-40 object-cover"/>
                </a>
              )}
              <div className="text-xs opacity-70 mb-1">{fmtDate(n.date)}</div>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                {n.title}
              </a>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
