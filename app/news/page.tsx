import type { Metadata } from 'next';
import { list } from '@vercel/blob';

export const metadata: Metadata = {
  title: 'Notícias | Anuário OVNIs 2025',
  description: 'Últimas notícias publicadas no portal.',
};

export const dynamic = 'force-dynamic';

type NewsEntry = {
  id: string;
  date: string;     // AAAA-MM-DD
  title: string;
  url: string;      // link externo
  image?: string;
  summary?: string;
};

function fmtDate(d: string) {
  const [y,m,dd] = d.split('-').map(Number);
  const dt = new Date(y, (m||1)-1, dd||1);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function loadNews(): Promise<NewsEntry[]> {
  try {
    const L = await list({ prefix: 'indexes/' });
    const bucketItem = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (!bucketItem?.url) return [];
    const r = await fetch(bucketItem.url, { cache: 'no-store' });
    if (!r.ok) return [];
    const arr = await r.json();
    return (arr as NewsEntry[]).slice().sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)
    );
  } catch {
    return [];
  }
}

export default async function NoticiasPage() {
  const items = await loadNews();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <section className="rounded-2xl bg-[#0e1624] px-6 py-5 shadow-lg">
        <h1 className="text-2xl font-semibold">Notícias</h1>
        <p className="opacity-75">Atualizações e matérias selecionadas.</p>
      </section>

      {items.length === 0 ? (
        <div className="opacity-70">Nenhuma notícia publicada ainda.</div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => {
            const host = (() => {
              try { return new URL(n.url).host.replace(/^www\./,''); } catch { return ''; }
            })();
            return (
              <article key={n.id} className="rounded-2xl bg-[#0e1624] p-5 shadow-lg flex flex-col">
                {/* header com GIF + título */}
                <div className="flex items-start gap-2 mb-2">
                  <img
                    src="/media/brknews.gif"
                    alt="Notícia"
                    width={65}
                    height={24}
                    className="h-[18px] w-[18px] mt-0.5 rounded-sm ring-1 ring-white/10 shadow-sm"
                    loading="lazy"
                  />
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold leading-snug hover:underline"
                  >
                    {n.title}
                  </a>
                </div>

                <div className="text-xs opacity-70 mb-3">
                  {fmtDate(n.date)} {host && <span>· {host}</span>}
                </div>

                {n.image ? (
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={n.image}
                      alt=""
                      className="w-full aspect-[16/9] object-cover rounded-lg border border-white/10"
                      loading="lazy"
                    />
                  </a>
                ) : null}

                {n.summary ? (
                  <p
                    className="text-sm opacity-85 mt-3"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 4 as any,
                      WebkitBoxOrient: 'vertical' as any,
                      overflow: 'hidden'
                    }}
                  >
                    {n.summary}
                  </p>
                ) : null}

                <div className="mt-auto pt-4">
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm inline-flex items-center gap-2"
                  >
                    Ler notícia
                    <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-80">
                      <path fill="currentColor" d="M14 3l7 7l-1.414 1.414L15 7.828V21h-2V7.828l-4.586 4.586L7 10l7-7z"/>
                    </svg>
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
