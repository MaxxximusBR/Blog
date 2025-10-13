import type { Metadata } from 'next';
import Link from 'next/link';
import { list } from '@vercel/blob';

export const metadata: Metadata = {
  title: 'Relatórios | Anuário OVNIs 2025',
  description: 'Lista de relatórios mensais (PDF).',
};

export const dynamic = 'force-dynamic';

type Entry = {
  slug: string;            // 'YYYY-MM'
  title: string;
  summary?: string;
  file: string;
  meta?: { global?: number };
};

function labelFromSlug(slug: string) {
  const [y, m] = slug.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

async function loadIndex(): Promise<Entry[]> {
  try {
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === 'indexes/reports.json');
    if (it?.url) {
      const r = await fetch(it.url, { cache: 'no-store' });
      if (r.ok) return (await r.json()) as Entry[];
    }
  } catch {}
  return [];
}

function clamp3(text?: string) {
  if (!text) return 'Sem resumo disponível.';
  if (text.length <= 240) return text;
  return text.slice(0, 237) + '…';
}

export default async function ReportsPage() {
  const items = await loadIndex();

  const ordered = (items || [])
    .filter(e => e && e.slug && e.file)
    .slice()
    .sort((a, b) => (a.slug < b.slug ? 1 : -1));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <section className="rounded-2xl bg-[#0e1624] px-6 py-5 shadow-lg">
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="opacity-75">Mensais, disponíveis para leitura e download.</p>
      </section>

      {ordered.length === 0 ? (
        <div className="opacity-70">Nenhum relatório disponível ainda.</div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((e) => (
            <article key={e.slug} className="rounded-2xl bg-[#0e1624] p-5 shadow-lg flex flex-col">
              <div className="text-xs opacity-70 mb-1">{labelFromSlug(e.slug)}</div>
              <h2 className="font-semibold mb-2 min-h-[3rem]">{e.title || `Relatório ${e.slug}`}</h2>

              <p className="text-sm opacity-80 mb-4" style={{
                display: '-webkit-box',
                WebkitLineClamp: 3 as any,
                WebkitBoxOrient: 'vertical' as any,
                overflow: 'hidden'
              }}>
                {clamp3(e.summary)}
              </p>

              <div className="mt-auto flex gap-2">
                <Link
                  href={`/report/${e.slug}`}
                  className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
                >
                  Ler online
                </Link>
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
      )}
    </main>
  );
}
