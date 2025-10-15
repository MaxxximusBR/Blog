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
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs opacity-80">
          Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
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
