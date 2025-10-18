'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  lat?: number;
  lon?: number;
  zoom?: number;
  // Live ATC (só use se for stream que você tem direito de retransmitir)
  atcStreamUrl?: string;           // ex.: process.env.NEXT_PUBLIC_ATC_STREAM_URL
  atcTitle?: string;               // ex.: "Exemplo: KBOS Tower (oficial do seu stream)"
  // Para testar o badge 7700 sem depender de voo real:
  demo7700?: boolean;
};

/** Converte zoom aproximado em “raio” em graus (heurística simples) */
function zoomToRadiusDeg(z: number) {
  // quanto maior o zoom, menor o raio. z=6 → ~5°, z=8 → ~2°, z=10 → ~0.8°
  return Math.max(0.3, 12 / Math.max(1, z));
}

/* --------------------- hook: emergência 7700 (com BBOX + demo) --------------------- */
function useEmergency7700(
  bbox: { lamin: number; lomin: number; lamax: number; lomax: number },
  demo = false
) {
  const [count, setCount] = useState<number>(0);
  const [flights, setFlights] = useState<{ hex: string; flight: string }[]>([]);

  const qs = useMemo(() => {
    const p = new URLSearchParams({
      lamin: String(bbox.lamin),
      lomin: String(bbox.lomin),
      lamax: String(bbox.lamax),
      lomax: String(bbox.lomax),
    });
    if (demo) p.set('demo', '1');
    return p.toString();
  }, [bbox.lamin, bbox.lomin, bbox.lamax, bbox.lomax, demo]);

  async function tick(signal?: AbortSignal) {
    try {
      const r = await fetch(`/api/adsb/emergencies?${qs}`, { cache: 'no-store', signal });
      const j = await r.json();
      if (j?.ok) {
        setCount(j.count || 0);
        setFlights(Array.isArray(j.flights) ? j.flights : []);
      } else if (demo) {
        // fallback de demo se o upstream falhar
        setCount(1);
        setFlights([{ hex: 'demo7700', flight: 'DEMO7700' }]);
      }
    } catch {
      if (demo) {
        setCount(1);
        setFlights([{ hex: 'demo7700', flight: 'DEMO7700' }]);
      }
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    tick(ctrl.signal);
    const id = setInterval(() => tick(ctrl.signal), 60_000);
    return () => { ctrl.abort(); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  return { count, flights };
}

/* --------------------- componente principal --------------------- */
export default function AdsbPanel({
  lat = -30.03,
  lon = -51.22,
  zoom = 6,
  atcStreamUrl = process.env.NEXT_PUBLIC_ATC_STREAM_URL,
  atcTitle = 'Live ATC (opcional)',
  demo7700 = false,
}: Props) {
  const adsbfi = useMemo(
    () =>
      `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&hideAircraftLabels=1&lat=${lat}&lon=${lon}&zoom=${zoom}`,
    [lat, lon, zoom]
  );
  const radarboxBrSul = `https://www.radarbox.com/@-30.2,-51.2,7z`;
  const fr24Poa = `https://www.flightradar24.com/-30.03,-51.22/8`;

  // BBOX a partir do centro+zoom
  const r = zoomToRadiusDeg(zoom);
  const bbox = useMemo(() => ({
    lamin: lat - r,
    lomin: lon - r,
    lamax: lat + r,
    lomax: lon + r,
  }), [lat, lon, r]);

  // hook de alerta 7700
  const { count, flights } = useEmergency7700(bbox, demo7700);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
      {/* Cabeçalho: título + alerta 7700 + botão abrir mapa */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">Tráfego aéreo em tempo real</h3>
          <p className="hint">Abra o mapa interativo em nova aba (fonte: ADSB.fi / tar1090).</p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {/* Alerta 7700 (se houver) */}
          {count > 0 && (
            <details className="group">
              <summary className="list-none cursor-pointer">
                <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 border border-red-500/40 px-2 py-1 text-xs">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Alerta 7700: {count}
                </span>
              </summary>
              <div className="mt-2 p-2 text-xs rounded-md bg-black/70 border border-white/10 shadow-lg">
                {flights.map((f, i) => (
                  <div key={i} className="opacity-90">
                    • {f.flight || '(sem callsign)'} — {f.hex}
                  </div>
                ))}
                <div className="opacity-60 mt-1">Fonte: agregador ADS-B</div>
              </div>
            </details>
          )}

          <a href={adsbfi} target="_blank" rel="noopener noreferrer" className="btn whitespace-nowrap">
            Abrir mapa
          </a>
        </div>
      </div>

      {/* Painel ilustrativo com imagens (com vídeo no hover para radar/cockpit/tower) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* R A D A R  → vídeo no hover + link p/ NOTAM */}
        <a
          href="/notam"
          className="group relative block rounded-xl overflow-hidden border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Abrir página NOTAM"
        >
          <img
            src="/media/airtraffic.jpg"
            alt="Radar"
            className="w-full h-44 md:h-48 object-cover transition-opacity duration-300 group-hover:opacity-0"
            loading="lazy"
          />
          <video
            className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src="/media/atradar.mp4" type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="pointer-events-none absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded bg-black/50 border border-white/10">
            NOTAM
          </span>
        </a>

        {/* C O C K P I T  → vídeo no hover + link p/ METAR */}
        <a
          href="/metar"
          className="group relative block rounded-xl overflow-hidden border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Abrir página METAR"
        >
          <img
            src="/media/cockpit.jpg"
            alt="Cockpit à noite"
            className="w-full h-44 md:h-48 object-cover transition-opacity duration-300 group-hover:opacity-0"
            loading="lazy"
          />
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
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="pointer-events-none absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded bg-black/50 border border-white/10">
            METAR
          </span>
        </a>

        {/* T O W E R  → vídeo no hover + link p/ Frequências ATC */}
        <a
          href="/frequencias-atc"
          className="group col-span-2 relative block rounded-xl overflow-hidden border border-white/10 bg-black/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Abrir página Frequências ATC"
        >
          <img
            src="/media/tower.jpg"
            alt="Torre de controle"
            className="w-full h-64 md:h-80 object-cover transition-opacity duration-300 group-hover:opacity-0"
            loading="lazy"
          />
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
          <span className="pointer-events-none absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded bg-black/50 border border-white/10">
            Frequências ATC
          </span>
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
              <audio controls preload="none" src={atcStreamUrl} className="w-full" />
              <p className="hint mt-2 text-xs">
                Use apenas streams que você tem direito de retransmitir. LiveATC.net proíbe uso dos streams em produtos de terceiros.
              </p>
            </>
          ) : (
            <p className="text-sm opacity-80">
              Para ouvir ATC diretamente nesta página, informe um stream autorizado (ex.: Icecast/SHOUTcast seu).
              Sem stream próprio, use os atalhos externos ao lado.
            </p>
          )}
        </div>

        {/* Atalhos externos */}
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <h4 className="font-semibold mb-2">Atalhos externos</h4>
          <div className="flex flex-wrap gap-2">
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
