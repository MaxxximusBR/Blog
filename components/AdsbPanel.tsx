'use client';

type Props = {
  lat?: number;
  lon?: number;
  zoom?: number;
  /** Tamanho do vídeo/ícone animado no cabeçalho (px) */
  gifSizePx?: number;
};

export default function AdsbPanel({
  lat = -30.03,
  lon = -51.22,
  zoom = 6,
  gifSizePx = 56, // ~30% maior que um ícone/avatazinho
}: Props) {
  const adsbfi = `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`;
  const radarboxBrSul = `https://www.radarbox.com/@-30.2,-51.2,7z`;
  const fr24Poa = `https://www.flightradar24.com/-30.03,-51.22/8`;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
      {/* Cabeçalho: título | vídeo animado | botão */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">Tráfego aéreo em tempo real</h3>
          <p className="hint">Abra o mapa interativo em nova aba (fonte: ADSB.fi / tar1090).</p>
        </div>

        {/* Animação: usa .webm (leve); se falhar, cai para um GIF (opcional) */}
        <div className="shrink-0">
          <video
            width={gifSizePx}
            height={gifSizePx}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="rounded-full ring-1 ring-white/10 shadow-lg opacity-95 object-cover"
            aria-label="Radar animado"
            poster="/media/airtraffic.jpg"
            style={{ width: gifSizePx, height: gifSizePx }}
          >
            <source src="/media/radar.webm?v=1" type="video/webm" />
            {/* fallback (opcional): se tiver um GIF menor otimizado */}
            <img
              src="/media/radar.gif?v=3"
              alt="Radar animado"
              width={gifSizePx}
              height={gifSizePx}
              loading="eager"
            />
          </video>
        </div>

        <div className="shrink-0">
          <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn whitespace-nowrap">
            Abrir mapa
          </a>
        </div>
      </div>

      {/* Painel ilustrativo com imagens */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
          <img src="/media/airtraffic.jpg" alt="Radar" className="w-full h-44 md:h-48 object-cover" loading="lazy" />
        </div>
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
          <img src="/media/cockpit.jpg" alt="Cockpit à noite" className="w-full h-44 md:h-48 object-cover" loading="lazy" />
        </div>
        <div className="col-span-2 rounded-xl overflow-hidden border border-white/10 bg-black/30">
          <img src="/media/tower.jpg" alt="Torre de controle" className="w-full h-64 md:h-80 object-cover" loading="lazy" />
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2 mb-3">
        <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn">ADSB.fi (mapa)</a>
        <a href={radarboxBrSul} target="_blank" rel="noopener noreferrer" className="btn">Radarbox — BR Sul</a>
        <a href={fr24Poa} target="_blank" rel="noopener noreferrer" className="btn">FlightRadar24 — POA</a>
      </div>

      {/* Avisos */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
          <span className="font-medium">Dica:</span> use o botão <span className="font-semibold">Abrir mapa</span> para ver
          camadas, filtros e rótulos completos. O painel acima é ilustrativo — o mapa real abre em nova guia.
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs opacity-80">
          Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
        </div>
      </div>
    </section>
  );
}
