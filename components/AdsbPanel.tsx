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

  // se trocar os arquivos, mude o sufixo v= para forçar o CDN do Vercel
  const webmSrc = '/media/radar.webm?v=4';
  const gifSrc  = '/media/radar.gif?v=4';

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">Tráfego aéreo em tempo real</h3>
          <p className="hint">Abra o mapa interativo em nova aba (fonte: ADSB.fi / tar1090).</p>
        </div>
        <div className="shrink-0">
          <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn whitespace-nowrap">
            Abrir mapa
          </a>
        </div>
      </div>

      {/* Painel ilustrativo */}
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

      {/* Aviso */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm mb-3">
        <span className="font-medium">Dica:</span> use o botão <span className="font-semibold">Abrir mapa</span> para ver
        camadas, filtros e rótulos completos. O painel acima é ilustrativo — o mapa real carrega na nova guia.
      </div>

      {/* Radar animado — bloco COM altura fixa + fallback */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center gap-4">
        <div className="shrink-0 w-40 h-40 rounded-lg overflow-hidden border border-white/10">
          {/* o vídeo tenta rodar; se não carregar, o poster + img ao lado garantem algo visível */}
          <video
            className="w-full h-full object-cover block"
            src={webmSrc}
            poster={gifSrc}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
          />
        </div>
        {/* fallback visível sempre (assim você enxerga mesmo se o <video> falhar) */}
        <img
          src={gifSrc}
          alt="Radar animado (fallback)"
          width={160}
          height={160}
          className="rounded-lg border border-white/10 object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="text-xs opacity-75">
          Animação decorativa de radar. Se você não vê movimento, o navegador pode ter
          bloqueado autoplay — o GIF ao lado é o fallback.
        </div>
      </div>

      {/* Rodapé de dados */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs opacity-80 mt-3">
        Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
      </div>
    </section>
  );
}
