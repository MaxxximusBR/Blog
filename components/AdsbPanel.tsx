'use client';

export default function AdsbPanel() {
  // Ajuste para o globe que preferir:
  const MAP_URL =
    'https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=-30.03&lon=-51.22&zoom=6';

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-black/30 p-4 md:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Tráfego aéreo em tempo real</h3>
          <p className="hint">Abrirá em nova aba (mapa interativo externo).</p>
        </div>
        <a
          href={MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
        >
          Abrir mapa
        </a>
      </div>

      {/* opcional: “card” visual de preview */}
      <a
        href={MAP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,#111,#0b1730)]"
      >
        <div className="relative aspect-[16/9]">
          <div className="absolute inset-0 grid place-items-center opacity-70">
            <span className="text-sm">globe.adsb.fi • tar1090</span>
          </div>
        </div>
      </a>
    </div>
  );
}
