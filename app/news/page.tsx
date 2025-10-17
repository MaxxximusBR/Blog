// app/news/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { list } from '@vercel/blob';
import crypto from 'node:crypto';

export const metadata: Metadata = {
  title: 'Notícias | Anuário OVNIs 2025',
  description: 'Atualizações e matérias selecionadas.',
};

export const dynamic = 'force-dynamic';

type NewsItem = {
  id: string;
  date: string;            // YYYY-MM-DD ou ISO
  title?: string;
  title_ai?: string;
  url: string;             // link externo
  image?: string;
  summary?: string;
  summary_ai?: string;
  tags?: string[];         // opcional (IA)
  relevance_note?: string; // opcional (IA)
  relevance_score?: number;// opcional (IA)
  source?: string;         // opcional (robô)
};

// ------- helpers -------
async function fetchJson<T>(url: string) {
  const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'nocache=' + Date.now(), {
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()) as T;
}

function toYmd(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dt.getTime()) ? new Date().toISOString().slice(0, 10) : dt.toISOString().slice(0, 10);
}

// Carrega o índice oficial (promovido pelo admin)
async function loadOfficial(): Promise<NewsItem[]> {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find((b) => b.pathname === 'indexes/news.json');
    if (!it?.url) return [];
    const arr = await fetchJson<NewsItem[]>(it.url);
    if (!Array.isArray(arr)) return [];
    // normaliza id/data
    return arr
      .map((n) => ({
        ...n,
        id: n.id || crypto.randomUUID(),
        date: toYmd(n.date || new Date()),
      }))
      .filter((n) => !!n.url);
  } catch {
    return [];
  }
}

// Carrega o índice do robô (IA)
async function loadRobot(limitItems = 24): Promise<NewsItem[]> {
  try {
    const L = await list({ prefix: 'news/uap/' });
    const idx = (L.blobs as any[]).find((b) => b.pathname === 'news/uap/index.json');
    if (!idx?.url) return [];

    const payload = await fetchJson<{ items?: { url: string }[] }>(idx.url);
    const urls = Array.isArray(payload.items) ? payload.items.map((i) => i.url) : [];
    const limited = urls.slice(0, limitItems);

    const out: NewsItem[] = [];
    for (const url of limited) {
      try {
        const obj = await fetchJson<any>(url);
        const title = obj.title_ai || obj.title || '(sem título)';
        const summary = obj.summary_ai || obj.summary || '';
        const date = toYmd(obj.published_at || obj.created_at || new Date());

        out.push({
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
        // ignora item com erro
      }
    }
    return out.filter((n) => !!n.url);
  } catch {
    return [];
  }
}

// Junta oficial + robô, dedup por URL, enriquecendo o oficial com IA
async function loadNews(): Promise<NewsItem[]> {
  const [official, robot] = await Promise.all([loadOfficial(), loadRobot()]);

  // índice por URL para dedupe
  const byUrl = new Map<string, NewsItem>();

  // 1) insere oficial primeiro
  for (const it of official) {
    byUrl.set(it.url, { ...it });
  }

  // 2) mistura IA: se já existir oficial, enriquece; senão adiciona como é
  for (const ai of robot) {
    if (byUrl.has(ai.url)) {
      const cur = byUrl.get(ai.url)!;
      byUrl.set(ai.url, {
        ...cur,
        // mantém dados oficiais e aproveita IA onde estiver faltando
        title_ai: cur.title_ai || ai.title_ai,
        summary_ai: cur.summary_ai || ai.summary_ai,
        tags: Array.isArray(cur.tags) && cur.tags.length ? cur.tags : ai.tags,
        relevance_note: cur.relevance_note || ai.relevance_note,
        relevance_score:
          typeof cur.relevance_score === 'number' ? cur.relevance_score : ai.relevance_score,
        // mantém imagem oficial se houver; senão usa a da IA
        image: cur.image || ai.image,
        // mantém date/title/summary originais, mas se faltarem usa os da IA
        title: cur.title || ai.title,
        summary: cur.summary || ai.summary,
      });
    } else {
      byUrl.set(ai.url, ai);
    }
  }

  // ordena por data desc (e id desc como desempate) e limita total
  const merged = Array.from(byUrl.values())
    .map((n) => ({ ...n, date: toYmd(n.date || new Date()) }))
    .sort((a, b) => {
      const ad = new Date(a.date).getTime();
      const bd = new Date(b.date).getTime();
      if (ad < bd) return 1;
      if (ad > bd) return -1;
      return (a.id || '').localeCompare(b.id || '') * -1;
    })
    .slice(0, 36);

  return merged;
}

// ------- UI -------
export default async function NewsPage() {
  const items = await loadNews();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0e1624] px-6 py-7 shadow-lg min-h-[150px] border border-white/10">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Notícias</h1>
            <p className="opacity-75">
              Atualizações automáticas e matérias selecionadas (priorizando resumos em PT-BR via IA).
            </p>
          </div>
          <div className="pointer-events-none w-40 md:w-56 opacity-70">
            <img src="/media/brknews.gif" alt="" className="w-full h-auto object-contain select-none" />
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

                {shownSummary && (
                  <p className="text-sm opacity-90 mt-3 whitespace-pre-wrap break-words">{shownSummary}</p>
                )}

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
