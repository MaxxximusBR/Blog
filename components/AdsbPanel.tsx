'use client';
import {useState} from 'react';

type Props = {
  lat?: number;
  lon?: number;
  zoom?: number;
  gifSizePx?: number;
};

export default function AdsbPanel({
  lat = -30.03,
  lon = -51.22,
  zoom = 6,
  gifSizePx = 56,
}: Props) {
  const adsbfi = `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`;
  const radarboxBrSul = `https://www.radarbox.com/@-30.2,-51.2,7z`;
  const fr24Poa = `https://www.flightradar24.com/-30.03,-51.22/8`;

  // versões com query para bustar cache do Vercel/CDN
  const WEBM = `/media/radar.webm?v=6`;
  const GIF  = `/media/radar.gif?v=6`;

  // mostra GIF até o vídeo “dar play”; se o vídeo errar, mantém o GIF
  const [showFallback, setShowFallback] = useState(true);
  const [videoErro, setVideoErro] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
      {/* Cabeçalho: título | botão */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">Tráfego aéreo em tempo real</h3>
          <p className="hint">Abra o mapa interativo em nova aba (fonte: ADSB.fi / tar1090).</p>
        </div>
        <div className="shrink-0">
          <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn whitespace-nowrap">Abrir mapa</a>
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
          <span className="font-medium">Dica:</span> use o botão <span className="font-semibold">Abrir mapa</span> para ver camadas, filtros e rótulos completos. O painel acima é ilustrativo — o mapa real carrega na nova guia.
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs opacity-80">
          Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
        </div>
      </div>

      {/* === VÍDEO/GIF — colocado ABAIXO do aviso, como pedido === */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="relative w-full max-w-[720px] aspect-[16/9] mx-auto">
          {/* Fallback GIF por baixo */}
          <img
            src={GIF}
            alt="Radar animado (fallback)"
            className={`absolute inset-0 h-full w-full object-cover ${showFallback ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            loading="eager"
          />
          {/* Vídeo por cima; quando pode tocar, escondemos o GIF */}
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onCanPlay={() => { setShowFallback(false); setVideoErro(null); }}
            onError={(e) => { setShowFallback(true); setVideoErro('Erro ao carregar o vídeo'); }}
            poster="/media/airtraffic.jpg"
          >
            <source src={WEBM} type="video/webm" />
            {/* fallback SEM JS — se o browser não suportar video/webm */}
            <img src={GIF} alt="Radar animado" />
          </video>
        </div>

        {/* Linha de diagnóstico (aparece só se o vídeo falhar) */}
        {videoErro && (
          <div className="px-3 py-2 text-xs opacity-70">
            {videoErro}. Teste os arquivos:{" "}
            <a className="underline" href={WEBM} target="_blank" rel="noopener noreferrer">/media/radar.webm</a>{" "}
            ou{" "}
            <a className="underline" href={GIF} target="_blank" rel="noopener noreferrer">/media/radar.gif</a>.
            Se abrir 404, confirme que os nomes (inclusive maiúsculas/minúsculas) batem exatamente com os arquivos em <code>public/media</code>.
          </div>
        )}
      </div>
    </section>
  );
}
