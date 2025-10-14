'use client';

type Props = {
  lat?: number;
  lon?: number;
  zoom?: number;
};

export default function AirTrafficSection({
  lat = -30.033,   // Porto Alegre
  lon = -51.228,
  zoom = 6,
}: Props) {
  const globeUrl =
    `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Tráfego aéreo em tempo real</h2>
          <p className="hint">Abra o mapa interativo em nova aba (fonte: ADSB.fi / tar1090).</p>
        </div>
        <a
          href={globeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
        >
          Abrir mapa
        </a>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        {/* Coluna de imagens */}
        <div className="grid grid-cols-2 gap-4">
          <figure className="relative aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-white/10">
            <img
              src="/media/airtraffic.jpg"
              alt="Radar"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </figure>
          <figure className="relative aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-white/10">
            <img
              src="/media/cockpit.jpg"
              alt="Cockpit à noite"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </figure>
          <figure className="col-span-2 relative aspect-[16/9] overflow-hidden rounded-xl ring-1 ring-white/10">
            <img
              src="/media/tower.jpg"
              alt="Torre de controle"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </figure>
        </div>

        {/* Painel ilustrativo + atalhos */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="mb-3 flex flex-wrap gap-3">
              <a
                href={globeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
              >
                ADSB.fi (mapa)
              </a>
              <a
                href="https://www.radarbox.com/region/brazil/south"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
              >
                Radarbox — BR Sul
              </a>
              <a
                href="https://www.flightradar24.com/-30.03,-51.23/7"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
              >
                FlightRadar24 — POA
              </a>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm opacity-80">
              Dica: use o botão <span className="font-semibold">Abrir mapa</span> para ver camadas, filtros e rótulos completos.
              O painel acima é apenas ilustrativo — o mapa real carrega na nova guia.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-b from-slate-900/40 to-black p-3 text-xs opacity-70">
            Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
          </div>
        </div>
      </div>
    </section>
  );
}
