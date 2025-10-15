'use client';

import { useState } from 'react';

type Props = {
  lat?: number;
  lon?: number;
  zoom?: number;
  showGif?: boolean;
  gifSize?: number; // px
};

export default function AdsbPanel({
  lat = -30.03,
  lon = -51.22,
  zoom = 6,
  showGif = true,
  gifSize = 96,
}: Props) {
  const adsbfi = `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`;
  const radarboxBrSul = `https://www.radarbox.com/@-30.2,-51.2,7z`;
  const fr24Poa = `https://www.flightradar24.com/-30.03,-51.22/8`;

  // bust de cache para forçar o CDN a pegar o arquivo novo
  const gifSrc = `/media/radar.gif?v=2`;

  const [gifOk, setGifOk] = useState(true);

  return (
    <section className="relative rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
      {/* GIF decorativo – fica no topo direito, sem offset negativo */}
      {showGif && (
        <>
          {gifOk ? (
            <img
              src={gifSrc}
              alt=""
              width={gifSize}
              height={gifSize}
              loading="eager"
              onError={() => setGifOk(false)}
              className="pointer-events-none absolute right-3 top-3 z-10 rounded-full ring-1 ring-white/10 shadow-lg opacity-90"
            />
          ) : (
            // Fallback: mostra um link direto para você testar se o arquivo existe no deploy
            <a
              href={gifSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-3 top-3 z-10 text-xs px-2 py-1 rounded bg-amber-500/20 border border-amber-500/30"
              title="Clique para testar se /media/radar.gif está disponível no deploy"
            >
              GIF não encontrado — testar
            </a>
          )}
        </>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xl font-semibold">Tráfego aéreo em tempo real</h3>
          <p className="hint">Abra o mapa interativo em nova aba (fonte: ADSB.fi / tar1090).</p>
        </div>
        <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn whitespace-nowrap">
          Abrir mapa
        </a>
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

      <div className="flex flex-wrap gap-2 mb-3">
        <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn">ADSB.fi (mapa)</a>
        <a href={radarboxBrSul} target="_blank" rel="noopener noreferrer" className="btn">Radarbox — BR Sul</a>
        <a href={fr24Poa} target="_blank" rel="noopener noreferrer" className="btn">FlightRadar24 — POA</a>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
          <span className="font-medium">Dica:</span> use o botão <span className="font-semibold">Abrir mapa</span> para ver
          camadas, filtros e rótulos completos. O painel acima é ilustrativo — o mapa real abre em nova guia.
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs opacity-80">
          Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
        </div>
      </div>

      {/* Alternativa: se quiser forçar via CSS background (caso <img> seja bloqueado), descomente o bloco abaixo
      <div
        aria-hidden
        className="pointer-events-none absolute right-3 top-3 z-10 w-24 h-24 rounded-full ring-1 ring-white/10 shadow-lg opacity-90"
        style={{
          backgroundImage: `url(${gifSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      /> */}
    </section>
  );
}
