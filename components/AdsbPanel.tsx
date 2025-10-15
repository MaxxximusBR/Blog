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

      {/* === BLOCO DIAGNÓSTICO (mostra se os arquivos realmente estão públicos no Vercel) === */}
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="text-xs font-medium mb-2">Diagnóstico de assets (deveriam aparecer 3 miniaturas):</div>
        <div className="flex items-center gap-12 flex-wrap">
          <div>
            <div className="text-xs opacity-80 mb-1">GIF conhecido (já usado no dashboard)</div>
            <img
              src="/media/earth-night-1918_128.gif?v=1"
              alt="teste earth"
              style={{ width: 128, height: 128, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,.12)' }}
            />
          </div>

          <div>
            <div className="text-xs opacity-80 mb-1">radar.webm</div>
            <video
              autoPlay muted loop playsInline preload="metadata"
              style={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,.12)' }}
            >
              <source src="/media/radar.webm?v=2" type="video/webm" />
            </video>
            <div className="text-[11px] mt-1">
              <a className="underline" href="/media/radar.webm?v=2" target="_blank" rel="noopener noreferrer">abrir</a>
            </div>
          </div>

          <div>
            <div className="text-xs opacity-80 mb-1">radar.gif</div>
            <img
              src="/media/radar.gif?v=2"
              alt="teste radar gif"
              style={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,.12)' }}
            />
            <div className="text-[11px] mt-1">
              <a className="underline" href="/media/radar.gif?v=2" target="_blank" rel="noopener noreferrer">abrir</a>
            </div>
          </div>
        </div>
        <div className="text-[11px] opacity-70 mt-2">
          Dica: se a miniatura quebrar, clique no link “abrir”. Se abrir 404, o arquivo não está no deploy.
        </div>
      </div>
      {/* === FIM DIAGNÓSTICO === */}
    </section>
  );
}
