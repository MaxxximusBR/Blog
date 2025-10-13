import type { Metadata } from 'next';
import Link from 'next/link';
import { list } from '@vercel/blob';
import PdfViewer from '@/components/PdfViewer';

export const metadata: Metadata = {
  title: 'Relatório | Anuário OVNIs 2025',
  description: 'Leitura do relatório mensal (PDF).',
};

// garante que sempre pegue o índice mais recente no deploy
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

export default async function ReportPage({ params }: { params: { slug: string } }) {
  const items = await loadIndex();
  const report = items.find(e => e.slug === params.slug);

  if (!report) {
    return (
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <section className="card">
          <h1 className="text-2xl font-semibold">Relatório não encontrado</h1>
          <p className="hint">Verifique o endereço ou volte à lista de relatórios.</p>
          <div className="mt-4">
            <Link href="/reports" className="btn">← Voltar aos relatórios</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <section className="card">
        <div className="text-xs opacity-70 mb-1">{labelFromSlug(report.slug)}</div>
        <h1 className="text-2xl font-semibold">{report.title || `Relatório ${report.slug}`}</h1>
        {report.summary && <p className="opacity-80 mt-2">{report.summary}</p>}
        {typeof report.meta?.global === 'number' && (
          <div className="text-xs opacity-70 mt-2">Casos globais: {report.meta.global}</div>
        )}

        {/* VISOR DO PDF — prop correta é `url` */}
        <div className="mt-5 border border-white/10 rounded-2xl overflow-hidden">
          <PdfViewer url={report.file} />
        </div>

        {/* Ações (sem exibir a URL bruta) */}
        <div className="mt-4 flex gap-2">
          <a href={report.file} target="_blank" rel="noopener noreferrer" className="btn">
            Abrir em nova aba
          </a>
          <a href={report.file} download className="btn">
            Baixar PDF
          </a>
          <Link href="/reports" className="btn">← Voltar</Link>
        </div>
      </section>
    </main>
  );
}
