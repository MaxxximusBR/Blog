'use client';

type Props = {
  lat?: number;
  lon?: number;
  zoom?: number;
};

export default function AdsbPanel({
  lat = -30.03,
  lon = -51.22,
  zoom = 6,
}: Props) {
  const adsbfi = `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`;
  const radarboxBrSul = `https://www.radarbox.com/@-30.2,-51.2,7z`;
  const fr24Poa = `https://www.flightradar24.com/-30.03,-51.22/8`;

  // mídias renomeadas
  const webm = '/media/traffic-radar.webm?v=1';
  const gif  = '/media/traffic-radar.gif?v=1';

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
      {/* cabeçalho */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">Tráfego aéreo em tempo real</h3>
          <p className="hint">Abra o mapa interativo em nova aba (fonte: ADSB.fi / tar1090).</p>
        </div>
        <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn whitespace-nowrap">
          Abrir mapa
        </a>
      </div>

      {/* mosaico ilustrativo */}
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

      {/* botões */}
      <div className="flex flex-wrap gap-2 mb-3">
        <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn">ADSB.fi (mapa)</a>
        <a href={radarboxBrSul} target="_blank" rel="noopener noreferrer" className="btn">Radarbox — BR Sul</a>
        <a href={fr24Poa} target="_blank" rel="noopener noreferrer" className="btn">FlightRadar24 — POA</a>
      </div>

      {/* dica */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm mb-3">
        <span className="font-medium">Dica:</span> use o botão <span className="font-semibold">Abrir mapa</span> para ver
        camadas, filtros e rótulos completos. O painel acima é ilustrativo — o mapa real carrega na nova guia.
      </div>

      {/* ====== RADAR (VIDEO + FALLBACK) ====== */}
      <div className="rounded-xl border-2 border-emerald-500/60 bg-black/30 p-3 mb-3">
        <div className="text-xs mb-2 opacity-80">RADAR-DEBUG v1 — bloco de teste</div>

        <div className="flex items-center gap-4">
          {/* vídeo com altura/largura explícitas para não “sumir” */}
          <div className="shrink-0 w-40 h-40 rounded-lg overflow-hidden border border-white/10">
            <video
              className="w-full h-full object-cover block"
              src={webm}
              poster={gif}
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
            />
          </div>

          {/* fallback sempre visível */}
          <img
            src={gif}
            alt="Radar (fallback)"
            width={160}
            height={160}
            className="rounded-lg border border-white/10 object-cover"
            loading="eager"
            decoding="async"
          />

          <div className="text-xs opacity-75">
            Se você não vê o vídeo animado à esquerda, o GIF à direita garante que algo apareça.
          </div>
        </div>
      </div>

      {/* aviso final */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs opacity-80">
        Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
      </div>
    </section>
  );
}
