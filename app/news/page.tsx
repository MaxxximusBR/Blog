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
  date: string;        // YYYY-MM-DD (ou ISO conv.)
  title: string;
  url: string;         // link externo
  image?: string;      // opcional
  summary?: string;    // opcional
  _auto?: boolean;     // marca se veio do robô (não persiste no blob do admin)
};

/** Util: normaliza data para YYYY-MM-DD (pt-BR safe) */
function toYmd(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return new Date().toISOString().slice(0,10);
  return dt.toISOString().slice(0,10);
}

/** Carrega índice do ADMIN (seu formato atual) em indexes/news.json */
async function loadAdminNews(): Promise<NewsItem[]> {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (!it?.url) return [];
    const r = await fetch(it.url, { cache: 'no-store' });
    if (!r.ok) return [];
    const items = (await r.json()) as NewsItem[];
    return items.map(n => ({
      ...n,
      date: toYmd(n.date),
      _auto: false,
    }));
  } catch {
    return [];
  }
}

/** Carrega índice do ROBÔ (UAP) e transforma para NewsItem */
async function loadBotNews(): Promise<NewsItem[]> {
  try {
    // acha o index do robô (news/uap/index.json)
    const LI = await list({ prefix: 'news/uap/' });
    const idx = (LI.blobs as any[]).find(b => b.pathname.endsWith('news/uap/index.json'));
    if (!idx?.url) return [];

    const res = await fetch(idx.url, { cache: 'no-store' });
    if (!res.ok) return [];
    const j = await res.json();
    const items: { url: string }[] = Array.isArray(j?.items) ? j.items : [];

    // baixa cada item JSON e converte
    const cards = await Promise.all(items.slice(0, 40).map(async (it) => {
      try {
        const r = await fetch(it.url, { cache: 'no-store' });
        if (!r.ok) return null;
        const obj = await r.json();
        // o robô grava payload com estes campos:
        // { id, url, source, published_at, title, summary, title_ai, summary_ai, image_url, author, topics, ... }
        const title = obj.title_ai || obj.title || 'Sem título';
        const summary = obj.summary_ai || obj.summary || '';
        const image = obj.image_url || undefined;
        const date = toYmd(obj.published_at || obj.created_at || new Date());
        const id = obj.id || `${Date.now()}-${Math.random()}`;
        return { id, date, title, url: obj.url, image, summary, _auto: true } as NewsItem;
      } catch {
        return null;
      }
    }));

    return cards.filter(Boolean) as NewsItem[];
  } catch {
    return [];
  }
}

/** Mescla, deduplica por URL, ordena por data desc (depois id desc) */
function mergeNews(a: NewsItem[], b: NewsItem[]): NewsItem[] {
  const map = new Map<string, NewsItem>(); // chave = url
  for (const it of [...a, ...b]) {
    if (!it?.url) continue;
    if (!map.has(it.url)) map.set(it.url, it);
  }
  const all = Array.from(map.values());
  all.sort((x, y) => {
    if (x.date < y.date) return 1;
    if (x.date > y.date) return -1;
    return (x.id < y.id) ? 1 : -1;
  });
  return all;
}

export default async function NewsPage() {
  const [adminItems, botItems] = await Promise.all([loadAdminNews(), loadBotNews()]);
  const items = mergeNews(adminItems, botItems).slice(0, 36);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      {/* HERO: metade esquerda texto, metade direita GIF */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0e1624] px-6 py-7 shadow-lg min-h-[150px]">
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold">Notícias</h1>
          <p className="opacity-75">Atualizações e matérias selecionadas. (OVNI / UAP)</p>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2">
          <img
            src="/media/brknews.gif"
            alt=""
            className="w-full h-full object-contain object-right opacity-70 select-none"
          />
        </div>
      </section>

      {items.length === 0 ? (
        <div className="opacity-70">Nenhuma notícia publicada.</div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <article key={n.id} className="rounded-2xl bg-[#0e1624] p-5 shadow-lg flex flex-col border border-white/10">
              <div className="flex items-start gap-2 mb-2">
                <img
                  src="/media/brknews.gif"
                  alt="Breaking News"
                  width={32}
                  height={32}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <Link
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold leading-snug hover:underline"
                  >
                    {n.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="text-xs opacity-70">
                      {new Date(n.date).toLocaleDateString('pt-BR')}
                    </div>
                    {n._auto && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-300">
                        OVNI / UAP (auto)
                      </span>
                    )}
                  </div>
                </div>
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
              {n.summary && (
                <p className="text-sm opacity-90 mt-3 whitespace-pre-wrap break-words">
                  {n.summary}
                </p>
              )}

              <div className="mt-auto pt-4">
                <Link href={n.url} target="_blank" rel="noopener noreferrer" className="btn">
                  Ler na fonte
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
