import type { Metadata } from 'next';
import { list } from '@vercel/blob';

export const metadata: Metadata = {
  title: 'Notícias | Anuário OVNIs 2025',
  description: 'Atualizações e matérias selecionadas.',
};

// sempre buscar a versão mais recente do índice
export const dynamic = 'force-dynamic';

type NewsItem = {
  id: string;
  date: string;   // YYYY-MM-DD
  title: string;
  url: string;
  image?: string;
  summary?: string; // até 1600 chars
};

function fmtDate(d: string) {
  // espera "YYYY-MM-DD"
  const [y, m, day] = d.split('-').map(n => Number(n));
  const date = new Date(y, (m || 1) - 1, day || 1);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function loadIndex(): Promise<NewsItem[]> {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/news.json');
    if (it?.url) {
      const r = await fetch(it.url, { cache: 'no-store' });
      if (r.ok) {
        const arr = await r.json();
        if (Array.isArray(arr)) {
          return arr
            .filter((n: any) => n && n.id && n.title && n.url && n.date)
            .sort((a: any, b: any) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
        }
      }
    }
  } catch {}
  return [];
}

export default async function NoticiasPage() {
  const items = await loadIndex();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Hero com “breaking news” do lado direito */}
      <section
        className="rounded-2xl px-6 py-6 shadow-lg relative overflow-hidden"
        style={{
          background:
            'linear-gradient(90deg, rgba(14,22,36,1) 0%, rgba(14,22,36,0.85) 55%, rgba(14,22,36,0.0) 100%)',
        }}
      >
        {/* imagem no lado direito, sem repetir */}
        <div
          className="absolute inset-y-0 right-0 w-1/2 opacity-50 pointer-events-none"
          style={{
            backgroundImage: 'url(/media/brknews.gif)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center right',
            backgroundSize: 'contain',
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <h1 className="text-2xl font-semibold">Notícias</h1>
          <p className="opacity-75">Atualizações e matérias selecionadas.</p>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="opacity-70">Nenhuma notícia publicada ainda.</div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <article key={n.id} className="rounded-2xl bg-[#0e1624] p-5 shadow-lg flex flex-col">
              <div className="text-xs opacity-70 mb-1">{fmtDate(n.date)}</div>

              <div className="flex items-start gap-2 mb-2">
                {/* ícone animado (30% maior que 26px ≈ 34px) */}
                <img
                  src="/media/brknews.gif"
                  alt=""
                  width={34}
                  height={34}
                  className="shrink-0 mt-0.5 rounded-sm"
                />
                <h2 className="font-semibold leading-snug">
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {n.title}
                  </a>
                </h2>
              </div>

              {n.image && (
                <div className="mb-3">
                  <img
                    src={n.image}
                    alt=""
                    className="w-full h-40 object-cover rounded-lg border border-white/10"
                    loading="lazy"
                  />
                </div>
              )}

              {n.summary && (
                <p
                  className="text-sm opacity-85"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 4 as any,
                    WebkitBoxOrient: 'vertical' as any,
                    overflow: 'hidden',
                  }}
                  title={n.summary}
                >
                  {n.summary}
                </p>
              )}

              <div className="mt-auto pt-4">
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm inline-block"
                >
                  Ler notícia
                </a>
              </div>

              {/* ⚠️ Sem botões de admin/editar/apagar na página pública */}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
