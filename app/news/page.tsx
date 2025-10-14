import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { list } from '@vercel/blob';

export const metadata: Metadata = {
  title: 'Notícias | Anuário OVNIs 2025',
  description: 'Atualizações e matérias selecionadas.',
};

// forçar leitura do índice sempre que carregar
export const dynamic = 'force-dynamic';

type NewsItem = {
  id: string;
  date: string;   // YYYY-MM-DD
  title: string;
  url: string;    // link externo
  image?: string; // opcional
  summary?: string; // opcional (até 1600 chars)
};

async function loadNews(): Promise<NewsItem[]> {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (!it?.url) return [];
    const r = await fetch(it.url, { cache: 'no-store' });
    if (!r.ok) return [];
    const items = (await r.json()) as NewsItem[];
    // ordenar: data desc + id desc
    return items.slice().sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1
    );
  } catch {
    return [];
  }
}

export default async function NewsPage() {
  const items = await loadNews();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Hero com metade direita usando o GIF de breaking news */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0e1624] px-6 py-7 shadow-lg">
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold">Notícias</h1>
          <p className="opacity-75">Atualizações e matérias selecionadas.</p>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-60">
          <Image
            src="/media/brknews.gif"
            alt=""
            fill
            className="object-contain object-right"
            unoptimized
            priority
          />
        </div>
      </section>

      {items.length === 0 ? (
        <div className="opacity-70">Nenhuma notícia publicada.</div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <article key={n.id} className="rounded-2xl bg-[#0e1624] p-5 shadow-lg flex flex-col">
              <div className="flex items-start gap-2 mb-2">
                {/* logotipo “breaking news” ~30% maior */}
                <Image
                  src="/media/brknews.gif"
                  alt="Breaking News"
                  width={32}
                  height={32}
                  className="mt-0.5 shrink-0"
                  unoptimized
                />
                <Link
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold leading-snug hover:underline"
                >
                  {n.title}
                </Link>
              </div>

              <div className="text-xs opacity-70">
                {new Date(n.date).toLocaleDateString('pt-BR')}
              </div>

              {n.image && (
                <img
                  src={n.image}
                  alt=""
                  className="rounded-lg mt-3 border border-white/10"
                  loading="lazy"
                />
              )}

              {/* RESUMO COMPLETO — sem line-clamp */}
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
