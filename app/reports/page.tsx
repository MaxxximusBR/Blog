import type { Metadata } from 'next';
import { list } from '@vercel/blob';

export const metadata: Metadata = {
  title: 'Relatórios | Anuário OVNIs 2025',
  description: 'Lista de relatórios mensais (PDF).',
};

type Entry = {
  slug: string;            // 'YYYY-MM'
  title: string;
  summary?: string;
  file: string;            // URL do PDF no Blob
  meta?: { global?: number };
};

function labelFromSlug(slug: string) {
  const [y, m] = slug.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default async function RelatoriosPage() {
  // Carrega o índice do Blob (indexes/reports.json)
  let items: Entry[] = [];
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/reports.json');
    if (it?.url) {
      const r = await fetch(it.url, { cache: 'no-store' });
      if (r.ok) items = await r.json();
    }
  } catch {}

  const ordered = items
    .slice()
    .sort((a, b) => (a.slug < b.slug ? 1 : -1)); // mais recentes primeiro

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <section className="rounded-2xl bg-[#0e1624] px-6 py-5 shadow-lg">
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="opacity-75">Mensais, disponíveis para leitura e download.</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ordered.map((e) => (
          <article key={e.slug} className="rounded-2xl bg-[#0e1624] p-5 shadow-lg">
            <div className="text-xs opacity-70 mb-1">{labelFromSlug(e.slug)}</div>
            <h2 className="font-semibold mb-2">{e.title || `Relatório ${e.slug}`}</h2>
            {e.summary && <p className="text-sm opacity-80 mb-3">{e.summary}</p>}

            <div className="flex gap-2 mt-2">
              <a
                href={e.file}
                target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
              >
                Ver online
              </a>
              <a
                href={e.file}
                download
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
              >
                Baixar PDF
              </a>
            </div>

            {e.meta?.global ? (
              <div className="text-xs opacity-70 mt-3">Casos globais: {e.meta.global}</div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
