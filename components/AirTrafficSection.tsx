'use client';

import { useMemo } from 'react';

type Props = {
  lat?: number;
  lon?: number;
  zoom?: number;
  // Live ATC (só use se for stream que você tem direito de retransmitir)
  atcStreamUrl?: string;           // ex.: process.env.NEXT_PUBLIC_ATC_STREAM_URL
  atcTitle?: string;               // ex.: "Exemplo: KBOS Tower (oficial do seu stream)"
};

export default function AdsbPanel({
  lat = -30.03,
  lon = -51.22,
  zoom = 6,
  atcStreamUrl = process.env.NEXT_PUBLIC_ATC_STREAM_URL,
  atcTitle = 'Live ATC (opcional)',
}: Props) {
  const adsbfi = useMemo(
    () => `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`,
    [lat, lon, zoom]
  );
  const radarboxBrSul = `https://www.radarbox.com/@-30.2,-51.2,7z`;
  const fr24Poa = `https://www.flightradar24.com/-30.03,-51.22/8`;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
      {/* Cabeçalho: título + botão abrir mapa */}
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

      {/* Painel ilustrativo com imagens (com vídeo no hover para cockpit/tower) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* cartão simples */}
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
          <img src="/media/airtraffic.jpg" alt="Radar" className="w-full h-44 md:h-48 object-cover" loading="lazy" />
        </div>

        {/* C O C K P I T  → vídeo no hover + link p/ METAR */}
        <a
          href="/metar"
          className="group relative block rounded-xl overflow-hidden border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Abrir página METAR"
        >
          {/* imagem base */}
          <img
            src="/media/cockpit.jpg"
            alt="Cockpit à noite"
            className="w-full h-44 md:h-48 object-cover transition-opacity duration-300 group-hover:opacity-0"
            loading="lazy"
          />
          {/* vídeo que aparece no hover */}
          <video
            className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src="/media/cockpit.mp4" type="video/mp4" />
          </video>
          {/* sutil overlay para legibilidade */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="pointer-events-none absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded bg-black/50 border border-white/10">METAR</span>
        </a>

        {/* T O W E R  → vídeo no hover + link p/ Frequências ATC */}
        <a
          href="/frequencias-atc"
          className="group col-span-2 relative block rounded-xl overflow-hidden border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Abrir página Frequências ATC"
        >
          {/* imagem base */}
          <img
            src="/media/tower.jpg"
            alt="Torre de controle"
            className="w-full h-64 md:h-80 object-cover transition-opacity duration-300 group-hover:opacity-0"
            loading="lazy"
          />
          {/* vídeo que aparece no hover */}
          <video
            className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src="/media/towelive.mp4" type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="pointer-events-none absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded bg-black/50 border border-white/10">Frequências ATC</span>
        </a>
      </div>

      {/* Ações rápidas (externo) */}
      <div className="flex flex-wrap gap-2 mb-3">
        <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn">ADSB.fi (mapa)</a>
        <a href={radarboxBrSul} target="_blank" rel="noopener noreferrer" className="btn">Radarbox — BR Sul</a>
        <a href={fr24Poa} target="_blank" rel="noopener noreferrer" className="btn">FlightRadar24 — POA</a>
      </div>

      {/* Aviso de dados */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
          <span className="font-medium">Dica:</span> use o botão <span className="font-semibold">Abrir mapa</span> para ver
          camadas, filtros e rótulos completos. O painel acima é ilustrativo — o mapa real carrega na nova guia.
        </div>

        {/* Card de aviso com banner animado acima do texto */}
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
          {/* Banner animado (elegante, horizontal) */}
          <div className="rounded-lg overflow-hidden border border-white/10 mb-2 bg-black/40">
            <video
              className="w-full h-20 md:h-24 object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Animação de radar de tráfego aéreo"
            >
              <source src="/media/atcradar.mp4" type="video/mp4" />
            </video>
          </div>

          <p className="opacity-80">
            Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
          </p>
        </div>
      </div>

      {/* Live ATC — só renderiza player se houver stream autorizado */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <h4 className="font-semibold mb-2">Live ATC</h4>

          {atcStreamUrl ? (
            <>
              <div className="text-sm mb-2 opacity-80">{atcTitle}</div>
              {/* Player nativo do navegador */}
              <audio
                controls
                preload="none"
                src={atcStreamUrl}
                className="w-full"
              />
              <p className="hint mt-2 text-xs">
                Use apenas streams que você tem direito de retransmitir. LiveATC.net proíbe uso dos streams em produtos de terceiros.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm opacity-80">
                Para ouvir ATC diretamente nesta página, informe um stream autorizado (ex.: Icecast/SHOUTcast seu).
                Sem stream próprio, use os atalhos externos ao lado.
              </p>
            </>
          )}
        </div>

        {/* Atalhos externos (não embute áudio do LiveATC) */}
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <h4 className="font-semibold mb-2">Atalhos externos</h4>
          <div className="flex flex-wrap gap-2">
            {/* Ajuste esses links conforme seus aeroportos de interesse */}
            <a className="btn" href="https://www.liveatc.net/search/?icao=SBPA" target="_blank" rel="noopener noreferrer">
              LiveATC — buscas SBPA
            </a>
            <a className="btn" href="https://www.liveatc.net" target="_blank" rel="noopener noreferrer">
              LiveATC — site
            </a>
            <a className="btn" href="https://live-atc.vercel.app" target="_blank" rel="noopener noreferrer">
              Live-ATC (app externo)
            </a>
          </div>
          <p className="hint mt-2 text-xs">
            Dica: em vários países (incl. Brasil) streams públicos podem ser indisponíveis por restrições locais.
          </p>
        </div>
      </div>
    </section>
  );
}
