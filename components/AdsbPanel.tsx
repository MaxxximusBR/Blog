'use client';

import Image from 'next/image';

type Props = {
  /** centro inicial do link externo (adsb.fi) */
  lat?: number;
  lon?: number;
  zoom?: number;
  /** mostra/oculta a GIF decorativa */
  showGif?: boolean;
};

export default function AdsbPanel({
  lat = -30.03, // Porto Alegre
  lon = -51.22,
  zoom = 6,
  showGif = true,
}: Props) {
  const adsbfi = `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`;
  const radarboxBrSul = `https://www.radarbox.com/@-30.2,-51.2,7z`;
  const fr24Poa = `https://www.flightradar24.com/-30.03,-51.22/8`;

  return (
    <section className="relative rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
      {/* GIF decorativa (não clicável) */}
      {showGif && (
        <div className="pointer-events-none absolute -top-3 -right-3 md:top-3 md:right-3 z-10">
          <Image
            src="/media/radar.gif"
            alt=""
            width={96}
            height={96}
            unoptimized
            priority
            className="rounded-full ring-1 ring-white/10 shadow-lg opacity-90"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xl font-semibold">Tráfego aéreo em tempo real</h3>
          <p className="hint">Abra o mapa interativo em nova aba (fonte: ADSB.fi / tar1090).</p>
        </div>
        <a
          href={adsbfi}
          target="_blank"
          rel="noopener noreferrer"
          className="btn whitespace-nowrap"
        >
          Abrir mapa
        </a>
      </div>

      {/* Painel ilustrativo com 3 imagens */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
          <img
            src="/media/airtraffic.jpg"
            alt="Radar"
            className="w-full h-44 md:h-48 object-cover"
            loading="lazy"
          />
        </div>
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
          <img
            src="/media/cockpit.jpg"
            alt="Cockpit à noite"
            className="w-full h-44 md:h-48 object-cover"
            loading="lazy"
          />
        </div>
        <div className="col-span-2 rounded-xl overflow-hidden border border-white/10 bg-black/30">
          <img
            src="/media/tower.jpg"
            alt="Torre de controle"
            className="w-full h-64 md:h-80 object-cover"
            loading="lazy"
          />
        </div>
      </div>

      {/* Botões de acesso rápido a provedores */}
      <div className="flex flex-wrap gap-2 mb-3">
        <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn">
          ADSB.fi (mapa)
        </a>
        <a href={radarboxBrSul} target="_blank" rel="noopener noreferrer" className="btn">
          Radarbox — BR Sul
        </a>
        <a href={fr24Poa} target="_blank" rel="noopener noreferrer" className="btn">
          FlightRadar24 — POA
        </a>
      </div>

      {/* Dica + aviso */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
          <span className="font-medium">Dica:</span> use o botão <span className="font-semibold">Abrir mapa</span>{' '}
          para ver camadas, filtros e rótulos completos. O painel acima é apenas ilustrativo — o mapa real carrega na
          nova guia.
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs opacity-80">
          Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
        </div>
      </div>
    </section>
  );
}
