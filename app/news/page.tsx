// app/news/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { list } from '@vercel/blob';

export const metadata: Metadata = {
  title: 'Notícias | Anuário OVNIs 2025',
  description: 'Atualizações e matérias selecionadas.',
};

export const dynamic = 'force-dynamic';

type NewsItem = {
  id: string;
  date: string;   // YYYY-MM-DD ou ISO
  title?: string;
  title_ai?: string;
  url: string;    // link externo
  image?: string;
  summary?: string;
  summary_ai?: string;
  tags?: string[];            // opcional (IA)
  relevance_note?: string;    // opcional (IA)
  relevance_score?: number;   // opcional (IA)
  source?: string;            // opcional (robô)
};

async function loadNews(): Promise<NewsItem[]> {
  // 1) tenta o índice oficial (usado pelo admin/promote)
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (it?.url) {
      const r = await fetch(it.url, { cache: 'no-store' });
      if (r.ok) {
        const arr = (await r.json()) as NewsItem[];
        if (Array.isArray(arr) && arr.length) {
          return arr
            .slice()
            .sort((a, b) => {
              const ad = new Date(a.date).getTime();
              const bd = new Date(b.date).getTime();
              if (ad < bd) return 1;
              if (ad > bd) return -1;
              return (a.id || '').localeCompare(b.id || '') * -1;
            });
        }
      }
    }
  } catch {
    // cai para o fallback
  }

  // 2) FALLBACK: ler o índice do robô (news/uap/index.json) e montar os cards
  try {
    const L2 = await list({ prefix: 'news/uap/' });
    const idx = (L2.blobs as any[]).find(b => b.pathname === 'news/uap/index.json');
    if (!idx?.url) return [];

    const r2 = await fetch(idx.url, { cache: 'no-store' });
    if (!r2.ok) return [];

    const payload = (await r2.json()) as { items?: { url: string }[] };
    const urls = Array.isArray(payload.items) ? payload.items.map(i => i.url) : [];

    // baixa só os 18 mais recentes para não pesar o SSR
    const limited = urls.slice(0, 18);
    const items: NewsItem[] = [];
    for (const url of limited) {
      try {
        const rr = await fetch(url, { cache: 'no-store' });
        if (!rr.ok) continue;
        const obj = await rr.json();

        // mapeia o objeto do robô para o formato da página
        const title = obj.title_ai || obj.title || '(sem título)';
        const summary = obj.summary_ai || obj.summary || '';
        const date =
          (obj.published_at || obj.created_at || new Date().toISOString()).slice(0, 10);

        items.push({
          id: obj.id || crypto.randomUUID(),
          date,
          title,
          title_ai: obj.title_ai,
          url: obj.url || '',
          image: obj.image_url || undefined,
          summary,
          summary_ai: obj.summary_ai,
          tags: obj.topics || obj.tags || [],
          relevance_note: obj.relevance_note,
          relevance_score: obj.relevance_score,
          source: obj.source || 'robô',
        });
      } catch {
        // ignora item ruim
      }
    }

    return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  } catch {
    return [];
  }
}

export default async function NewsPage() {
  const items = await loadNews();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      {/* HERO: metade esquerda texto, metade direita GIF (sem botão) */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0e1624] px-6 py-7 shadow-lg min-h-[150px] border border-white/10">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Notícias</h1>
            <p className="opacity-75">
              Atualizações automáticas e matérias selecionadas (priorizando resumos em PT-BR via IA).
            </p>
          </div>
          <div className="pointer-events-none w-40 md:w-56 opacity-70">
            <img
              src="/media/brknews.gif"
              alt=""
              className="w-full h-auto object-contain select-none"
            />
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="opacity-70">Nenhuma notícia publicada.</div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => {
            const shownTitle = (n as any).title_ai ?? n.title ?? '(sem título)';
            const shownSummary = (n as any).summary_ai ?? n.summary ?? '';
            const dateStr = n.date ? new Date(n.date).toLocaleDateString('pt-BR') : '';
            const score = (n as any).relevance_score as number | undefined;
            const scoreTxt = typeof score === 'number' ? `${Math.round(score * 100)}%` : undefined;

            return (
              <article
                key={n.id}
                className="rounded-2xl bg-[#0e1624] p-5 shadow-lg flex flex-col border border-white/10"
              >
                <div className="flex items-start gap-2 mb-2">
                  <img
                    src="/media/brknews.gif"
                    alt="Breaking News"
                    width={32}
                    height={32}
                    className="mt-0.5 shrink-0"
                  />
                  <Link
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold leading-snug hover:underline"
                    title={n.title && n.title !== shownTitle ? n.title : shownTitle}
                  >
                    {shownTitle}
                  </Link>
                </div>

                <div className="text-xs opacity-70 flex items-center gap-2">
                  <span>{dateStr}</span>
                  {(n as any).source && <span>• {(n as any).source}</span>}
                  {scoreTxt && (
                    <span className="ml-auto rounded bg-white/10 px-2 py-0.5">{scoreTxt}</span>
                  )}
                </div>

                {n.image && (
                  <img
                    src={n.image}
                    alt=""
                    className="rounded-lg mt-3 border border-white/10"
                    loading="lazy"
                  />
                )}

                {/* RESUMO COMPLETO — sem truncar */}
                {shownSummary && (
                  <p className="text-sm opacity-90 mt-3 whitespace-pre-wrap break-words">
                    {shownSummary}
                  </p>
                )}

                {/* tags AI */}
                {Array.isArray((n as any).tags) && (n as any).tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(n as any).tags.map((t: string) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded bg-white/10 text-[11px] tracking-wide uppercase"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <Link href={n.url} target="_blank" rel="noopener noreferrer" className="btn">
                    Ler na fonte
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
