import Link from 'next/link';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import AdsbPanel from '@/components/AdsbPanel';

export default function Landing() {
  return (
    <div className="space-y-12">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-gradient-to-b from-indigo-950/40 to-black p-6 md:p-10">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <div className="badge mb-3">Luzes do Abismo • Luzes POA 2022</div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Anuário de Avistamentos de OVNIs 2025</h1>
            <p className="mt-3 text-lg text-gray-300">
              Relatórios mensais, gráficos de tendência e dashboard mundial offline com mapa interativo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/reports" className="btn">📄 Ver relatórios</Link>
              <Link href="/dashboard" className="btn">📊 Consolidação</Link>
              <a href="https://www.youtube.com/@LuzesAbismo" target="_blank" rel="noopener noreferrer" className="btn">▶ YouTube</a>
            </div>
          </div>
          <div>
            <div className="max-w-md ml-auto">
              <YouTubeEmbed id="CJEKzSll76g" />
            </div>
            <p className="hint mt-2 text-right">Vídeo de apresentação (abre também no YouTube)</p>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl" />
      </section>

      {/* MOSAICO */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Destaques Visuais</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/reports" className="tile group h-36 md:h-40 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <span className="shine" />
            <img src="/images/jal1628capanormal.jpeg" alt="Relatórios" />
            <div className="overlay">Relatórios</div>
          </Link>
          <Link href="/dashboard" className="tile group h-36 md:h-40 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <span className="shine" />
            <img src="/images/FenomenosUAPHARDCOVER.jpeg" alt="Consolidação" />
            <div className="overlay">Consolidação</div>
          </Link>
          <Link href="/news" className="tile group h-36 md:h-40 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <span className="shine" />
            <img src="/images/capaebookuapfé.jpeg" alt="Notícias" />
            <div className="overlay">Notícias</div>
          </Link>
          <a
            href="https://www.youtube.com/@LuzesAbismo"
            target="_blank"
            rel="noopener noreferrer"
            className="tile group h-36 md:h-40"
          >
            <span className="shine" />
            <img src="/images/uapsovinisemar2024cover.jpeg" alt="Canal no YouTube" />
            <div className="overlay">YouTube</div>
          </a>
        </div>
      </section>

      {/* ADS-B (se for bloqueado por iframe, aparece o fallback com botão) */}
      <section className="mt-8">
        <AdsbPanel />
      </section>
    </div>
  );
}
