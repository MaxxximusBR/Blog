'use client';

type Props = {
  lat?: number;   // centro
  lon?: number;
  zoom?: number;  // 3–8 recomendados
};

export default function AdsbPanel({ lat = -30.03, lon = -51.22, zoom = 6 }: Props) {
  // tar1090 (globe.adsb.fi) — abrimos em nova aba com UI mínima
  const url =
    `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold">Tráfego aéreo em tempo real</h3>
          <p className="hint">Abrirá em nova aba (mapa interativo externo).</p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn">Abrir mapa</a>
      </div>

      {/* Teaser clicável (sem iframe) */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group relative h-[420px] rounded-xl overflow-hidden"
        aria-label="Abrir mapa de tráfego aéreo em nova aba"
      >
        {/* Poster: use uma imagem sua em /public/images/adsb-poster.jpg (ou mantenha só o gradiente) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 400px at 20% 100%, rgba(60,80,180,.25), transparent), radial-gradient(1000px 500px at 80% 0%, rgba(30,160,220,.18), transparent), linear-gradient(180deg, rgba(10,15,25,.8), rgba(5,8,14,.95)) , url('/images/adsb-poster.jpg') center/cover no-repeat",
          }}
        />
        {/* linhas decorativas */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 0, transparent 96%, rgba(255,255,255,.07) 96.2%)' }} />
        {/* Info/CTA */}
        <div className="absolute left-4 right-4 bottom-4">
          <div className="text-xs opacity-70">globe.adsb.fi • tar1090</div>
          <div className="text-lg font-semibold">Clique para abrir o mapa interativo</div>
        </div>
        {/* hover */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
      </a>
    </div>
  );
}
