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
      <div className="grid grid
