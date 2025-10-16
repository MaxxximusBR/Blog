'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

type ATCSite = {
  id: string;
  name: string;
  type: 'ACC' | 'APP' | 'TWR';
  icao?: string;
  city?: string;
  state?: string;
  lat: number;
  lon: number;
  vhf: string[]; // MHz
  uhf?: string[]; // MHz (quando houver)
  source?: string; // ex.: "AIP-BRASIL / AISWEB"
};

type CoveragePoly = {
  id: string;
  name: string;            // ex.: CINDACTA I — FIR Brasília
  cindacta: 'I' | 'II' | 'III' | 'IV';
  color: string;           // cor do stroke/fill
  coords: [number, number][]; // [lat, lon][]
};

// IMPORTAÇÃO DINÂMICA para evitar SSR do Leaflet
const ATCMap = dynamic(() => import('@/components/ATCMap'), { ssr: false });

export default function ATCFrequenciesPage() {
  // Dados de exemplo (preencha/expanda depois com base no AIP-BRASIL/AISWEB)
  const data: ATCSite[] = useMemo(
    () => [
      // ACC (CINDACTA)
      {
        id: 'acc-bsb',
        name: 'CINDACTA I — ACC Brasília',
        type: 'ACC',
        icao: 'SBBS FIR',
        city: 'Brasília',
        state: 'DF',
        lat: -15.86,
        lon: -47.91,
        vhf: ['134.00', '127.25', '126.15', '123.35', '126.80'],
        source: 'AIP-BRASIL / AISWEB',
      },
      {
        id: 'acc-ctba',
        name: 'CINDACTA II — ACC Curitiba',
        type: 'ACC',
        icao: 'SBCW FIR',
        city: 'Curitiba',
        state: 'PR',
        lat: -25.44,
        lon: -49.27,
        vhf: ['123.70', '124.40', '125.80', '126.50', '133.80'],
        source: 'AIP-BRASIL / AISWEB',
      },
      {
        id: 'acc-rec',
        name: 'CINDACTA III — ACC Recife',
        type: 'ACC',
        icao: 'SBRE FIR',
        city: 'Recife',
        state: 'PE',
        lat: -8.05,
        lon: -34.9,
        vhf: ['126.35', '133.50', '128.70', '134.80'],
        source: 'AIP-BRASIL / AISWEB',
      },
      {
        id: 'acc-amz',
        name: 'CINDACTA IV — ACC Amazônico',
        type: 'ACC',
        icao: 'SBAZ FIR',
        city: 'Manaus',
        state: 'AM',
        lat: -3.07,
        lon: -60.02,
        vhf: ['132.20', '133.90', '128.30'],
        source: 'AIP-BRASIL / AISWEB',
      },

      // APP (TMA)
      {
        id: 'app-sp',
        name: 'APP São Paulo — TMA SP',
        type: 'APP',
        icao: 'SBSP/SBGR',
        city: 'São Paulo',
        state: 'SP',
        lat: -23.55,
        lon: -46.63,
        vhf: ['119.05', '120.45', '121.35', '124.70', '134.90'],
        source: 'AIP-BRASIL / AISWEB',
      },
      {
        id: 'app-rj',
        name: 'APP Rio de Janeiro — TMA RJ',
        type: 'APP',
        icao: 'SBGL/SBRJ',
        city: 'Rio de Janeiro',
        state: 'RJ',
        lat: -22.90,
        lon: -43.20,
        vhf: ['119.35', '120.75', '124.95', '132.50', '134.40'],
        source: 'AIP-BRASIL / AISWEB',
      },
      {
        id: 'app-poa',
        name: 'APP Porto Alegre — TMA POA',
        type: 'APP',
        icao: 'SBPA',
        city: 'Porto Alegre',
        state: 'RS',
        lat: -30.03,
        lon: -51.22,
        vhf: ['119.00', '120.10', '128.90'],
        source: 'AIP-BRASIL / AISWEB',
      },

      // TWR (Torres)
      {
        id: 'twr-gru',
        name: 'Torre Guarulhos',
        type: 'TWR',
        icao: 'SBGR',
        city: 'Guarulhos',
        state: 'SP',
        lat: -23.43,
        lon: -46.47,
        vhf: ['118.40', '132.75'],
        source: 'AIP-BRASIL / AISWEB',
      },
      {
        id: 'twr-cgh',
        name: 'Torre Congonhas',
        type: 'TWR',
        icao: 'SBSP',
        city: 'São Paulo',
        state: 'SP',
        lat: -23.626,
        lon: -46.655,
        vhf: ['118.05', '118.35', '127.15'],
        source: 'AIP-BRASIL / AISWEB',
      },
      {
        id: 'twr-gig',
        name: 'Torre Galeão',
        type: 'TWR',
        icao: 'SBGL',
        city: 'Rio de Janeiro',
        state: 'RJ',
        lat: -22.809,
        lon: -43.25,
        vhf: ['118.00', '118.20'],
        source: 'AIP-BRASIL / AISWEB',
      },
    ],
    []
  );

  // Polígonos de cobertura (APROXIMADOS, didáticos; substitua por FIR oficial/GeoJSON)
  const coverage: CoveragePoly[] = useMemo(
    () => [
      {
        id: 'cov-iv',
        name: 'CINDACTA IV — FIR Amazônica (aprox.)',
        cindacta: 'IV',
        color: '#22c55e', // verde
        coords: [
          [5.0, -74.0],
          [5.0, -50.0],
          [-12.0, -50.0],
          [-12.0, -74.0],
        ],
      },
      {
        id: 'cov-i',
        name: 'CINDACTA I — FIR Brasília (aprox.)',
        cindacta: 'I',
        color: '#14b8a6', // teal
        coords: [
          [-5.0, -60.0],
          [-5.0, -45.0],
          [-24.0, -45.0],
          [-24.0, -60.0],
        ],
      },
      {
        id: 'cov-iii',
        name: 'CINDACTA III — FIR Recife (aprox.)',
        cindacta: 'III',
        color: '#f59e0b', // amber
        coords: [
          [-5.0, -46.0],
          [-5.0, -34.0],
          [-20.0, -34.0],
          [-20.0, -46.0],
        ],
      },
      {
        id: 'cov-ii',
        name: 'CINDACTA II — FIR Curitiba (aprox.)',
        cindacta: 'II',
        color: '#3b82f6', // azul
        coords: [
          [-24.0, -58.0],
          [-24.0, -43.0],
          [-34.0, -43.0],
          [-34.0, -58.0],
        ],
      },
    ],
    []
  );

  const [showACC, setShowACC] = useState(true);
  const [showAPP, setShowAPP] = useState(true);
  const [showTWR, setShowTWR] = useState(true);
  const [mode, setMode] = useState<'points' | 'coverage'>('points');

  const visibleTypes = useMemo(() => {
    const s = new Set<string>();
    if (showACC) s.add('ACC');
    if (showAPP) s.add('APP');
    if (showTWR) s.add('TWR');
    return s;
  }, [showACC, showAPP, showTWR]);

  return (
    <main className="relative min-h-screen">
      {/* BACKGROUND (super escuro) já configurado no commit anterior */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url('/media/cartaifr.jpg')` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/90 backdrop-blur-[1px]" aria-hidden />

      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:py-10">
        <header className="mb-6 md:mb-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Mapa ATC Brasil — Frequências Oficiais
              </h1>
              <p className="mt-2 text-sm opacity-80">
                Dados priorizados de fontes oficiais (DECEA / AIP-BRASIL / AISWEB). Clique nos marcadores para ver VHF/UHF.
              </p>
            </div>

            {/* Toggle de Modo */}
            <div className="shrink-0">
              <div className="inline-flex rounded-xl overflow-hidden border border-white/10">
                <button
                  onClick={() => setMode('points')}
                  className={`px-3 py-2 text-sm ${
                    mode === 'points' ? 'bg-white/10' : 'bg-black/30 hover:bg-white/5'
                  }`}
                  title="Mostrar pontos (ACC/APP/TWR)"
                >
                  Pontos
                </button>
                <button
                  onClick={() => setMode('coverage')}
                  className={`px-3 py-2 text-sm ${
                    mode === 'coverage' ? 'bg-white/10' : 'bg-black/30 hover:bg-white/5'
                  }`}
                  title="Mostrar áreas de cobertura dos CINDACTAs"
                >
                  Cobertura CINDACTA
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[1fr,320px]">
          {/* Mapa */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
            <ATCMap data={data} visibleTypes={visibleTypes} mode={mode} coverage={coverage} />
          </div>

          {/* Filtros + legenda */}
          <aside className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <h2 className="text-lg font-semibold mb-3">Filtros</h2>

            {/* Filtros só fazem sentido no modo "points" */}
            <fieldset className={`${mode === 'points' ? '' : 'opacity-50 pointer-events-none'}`}>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showACC}
                    onChange={(e) => setShowACC(e.target.checked)}
                    className="h-4 w-4 accent-white/80"
                  />
                  <span>ACC — Centros de Área (CINDACTA)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showAPP}
                    onChange={(e) => setShowAPP(e.target.checked)}
                    className="h-4 w-4 accent-white/80"
                  />
                  <span>APP — Controle de Aproximação (TMA)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showTWR}
                    onChange={(e) => setShowTWR(e.target.checked)}
                    className="h-4 w-4 accent-white/80"
                  />
                  <span>TWR — Torres de Controle</span>
                </label>
              </div>
            </fieldset>

            <div className="mt-6 text-xs opacity-80 space-y-2">
              <p>
                <span className="font-medium">Nota:</span> 121.500 MHz (emergência) é monitorada pelas unidades ATS.
              </p>
              <p>
                <span className="font-medium">Fontes:</span> AIP-BRASIL / AISWEB (DECEA).
              </p>
            </div>

            {/* Legenda das cores no modo cobertura */}
            <div className={`mt-6 text-xs ${mode === 'coverage' ? '' : 'hidden'}`}>
              <h3 className="font-semibold mb-2">Cores — Cobertura CINDACTA</h3>
              <ul className="space-y-1">
                <li><span className="inline-block w-3 h-3 rounded-sm align-middle mr-2" style={{background:'#14b8a6'}}/>CINDACTA I — Brasília</li>
                <li><span className="inline-block w-3 h-3 rounded-sm align-middle mr-2" style={{background:'#3b82f6'}}/>CINDACTA II — Curitiba</li>
                <li><span className="inline-block w-3 h-3 rounded-sm align-middle mr-2" style={{background:'#f59e0b'}}/>CINDACTA III — Recife</li>
                <li><span className="inline-block w-3 h-3 rounded-sm align-middle mr-2" style={{background:'#22c55e'}}/>CINDACTA IV — Amazônica</li>
              </ul>
              <p className="opacity-70 mt-2">
                * Limites aproximados para visualização. Podemos trocar por GeoJSON oficial da FIR (DECEA).
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
