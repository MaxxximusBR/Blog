import type { Metadata } from 'next';
import Link from 'next/link';
import { list } from '@vercel/blob';

export const metadata: Metadata = {
  title: 'Notícias | Anuário OVNIs 2025',
  description: 'Atualizações e matérias selecionadas.',
};

// garantir sempre o índice mais recente
export const dynamic = 'force-dynamic';

type NewsItem = {
  id: string;
  date: string;     // AAAA-MM-DD
  title: string;
  url: string;
  image?: string;
  summary?: string; // opcional
};

async function loadNews(): Promise<NewsItem[]> {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (!it?.url) return [];
    const r = await fetch(it.url, { cache: 'no-store' });
    if (!r.ok) return [];
    const items = (await r.json()) as NewsItem[];
    // ordena mais recentes primeiro
    return items
      .filter(n => n && n.id && n.title && n.url)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
  } catch {
    return [];
  }
}

function fmtDate(iso: string) {
  // tenta AAAA-MM-DD; cai fora se vier diferente
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function NoticiasPage() {
  const news = await loadNews();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">

      {/* HERO dividido: esquerda cor sólida, direita GIF com fade */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 shadow-lg min-h-32">
        {/* camada de fundo em duas colunas */}
        <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-2">
          {/* metade esquerda mantém a cor do site */}
          <div className="bg-[#0e1624]" />
          {/* metade direita com GIF + gradiente para a esquerda */}
          <div className="relative">
            <div className="absolute inset-0 bg-[url('/media/brknews.gif')] bg-right bg-no-repeat bg-cover" />
            <div className="absolute inset-0 bg-gradient-to-l from-[#0e1624]/85 to-transparent" />
          </div>
        </div>

        {/* conteúdo (texto) */}
        <div className="relative z-10 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Notícias</h1>
          <p className="opacity-75">Atualizações e matérias selecionadas.</p>
        </div>
      </section>

      {news.length === 0 ? (
        <section className="rounded-2xl bg-[#0e1624] px-6 py-5 shadow-lg">
          <p className="opacity-70">Nenhuma notícia publicada ainda.</p>
        </section>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {news.map(item => (
            <article
              key={item.id}
              className="rounded-2xl bg-[#0e1624] p-5 shadow-lg flex flex-col"
            >
              <div className="text-xs opacity-70 mb-2">{fmtDate(item.date)}</div>

              <div className="flex items-start gap-2">
                {/* LOGO “breaking news” — 24px (~30% maior que 18px) */}
                <img
                  src="/media/brknews.gif"
                  alt="Notícia"
                  width={45}
                  height={24}
                  className="h-[24px] w-[24px] mt-0.5 rounded-sm ring-1 ring-white/10 shadow-sm"
                  loading="lazy"
                />
                <h2 className="font-semibold leading-snug">{item.title}</h2>
              </div>

              {/* resumo opcional */}
              {item.summary && (
                <p className="text-sm opacity-80 mt-3"
                   style={{ display: '-webkit-box', WebkitLineClamp: 3 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                  {item.summary}
                </p>
              )}

              {/* imagem opcional enviada no admin */}
              {item.image && (
                <div className="mt-3 rounded-lg overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  Ler matéria
                </a>
                <Link href="/admin" className="btn bg-white/5 hover:bg-white/10">Admin</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
