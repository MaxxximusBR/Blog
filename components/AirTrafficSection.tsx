'use client';

type Props = {
  /** Centro do mapa (default: Porto Alegre) */
  lat?: number;
  lon?: number;
  zoom?: number;
};

export default function AirTrafficSection({
  lat = -30.033, // Porto Alegre
  lon = -51.228,
  zoom = 6,
}: Props) {
  const adsbUrl = `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`;

  const quick = [
    { label: 'ADSB.fi (mapa)', href: adsbUrl },
    { label: 'Radarbox — BR Sul', href: 'https://www.radarbox.com/@-30.03,-51.23,7z' },
    { label: 'FlightRadar24 — POA', href: 'https://www.flightradar24.com/-30.03,-51.23/7' },
  ];

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-black/30 overflow-hidden">
      {/* faixa superior: collage + CTA */}
      <div className="grid md:grid-cols-2">
        {/* Collage à esquerda */}
        <div className="grid grid-cols-2 md:h-[360px]">
          <figure className="relative col-span-1 row-span-2 overflow-hidden">
            <img src="/media/air-traffic-scope.jpg" alt="Radar" className="w-full h-full object-cover scale-105 transition-transform duration-500 hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          </figure>
          <figure className="relative overflow-hidden">
            <img src="/media/cockpit-night.jpg" alt="Cockpit à noite" className="w-full h-full object-cover brightness-95" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
          </figure>
          <figure className="relative overflow-hidden">
            <img src="/media/atc-tower.jpg" alt="Torre de controle" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </figure>
        </div>

        {/* Conteúdo/CTA à direita */}
        <div className="p-6 md:p-8 flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Tráfego aéreo em tempo real</h2>
              <p className="hint mt-1">Abra o mapa interativo em nova aba (fonte: ADSB.fi / tar1090).</p>
            </div>
            <a href={adsbUrl} target="_blank" rel="noopener noreferrer" className="btn whitespace-nowrap">
              Abrir mapa
            </a>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {quick.map((q) => (
              <a
                key={q.href}
                href={q.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition-colors text-center"
              >
                {q.label}
              </a>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm opacity-80">
              Dica: use o botão <span className="font-medium">Abrir mapa</span> para ver camadas, filtros e rótulos completos.
              O painel acima é apenas ilustrativo – o mapa real carrega na nova guia.
            </p>
          </div>
        </div>
      </div>

      {/* faixa inferior — legenda/nota */}
      <div className="px-6 py-4 border-t border-white/10 text-xs opacity-70">
        Dados de posição presumem recepção ADS-B comunitária; podem existir atrasos, lacunas e aeronaves não exibidas.
      </div>
    </section>
  );
}
