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
        vhf: ['134.00', '127.25', '126.15', '123.35', '126.80'], // amostras
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
        vhf: ['123.70', '124.40', '125.80', '126.50', '133.80'], // amostras
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
        vhf: ['126.35', '133.50', '128.70', '134.80'], // amostras
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
        vhf: ['132.20', '133.90', '128.30'], // amostras
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
        vhf: ['119.05', '120.45', '121.35', '124.70', '134.90'], // amostras
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
        vhf: ['119.35', '120.75', '124.95', '132.50', '134.40'], // amostras
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
        vhf: ['119.00', '120.10', '128.90'], // amostras
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
        vhf: ['118.40', '132.75'], // amostras
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
        vhf: ['118.05', '118.35', '127.15'], // amostras
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
        lon: -43.250,
        vhf: ['118.00', '118.20'], // amostras
        source: 'AIP-BRASIL / AISWEB',
      },
    ],
    []
  );

  const [showACC, setShowACC] = useState(true);
  const [showAPP, setShowAPP] = useState(true);
  const [showTWR, setShowTWR] = useState(true);

  const visibleTypes = useMemo(() => {
    const s = new Set<string>();
    if (showACC) s.add('ACC');
    if (showAPP) s.add('APP');
    if (showTWR) s.add('TWR');
    return s;
  }, [showACC, showAPP, showTWR]);

  return (
    <main className="relative min-h-screen">
      {/* BACKGROUND com a imagem, super escuro */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url('/media/cartaifr.jpg')` }}
        aria-hidden
      />
      {/* camada de escurecimento forte + leve blur para realçar o conteúdo */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/90 backdrop-blur-[1px]" aria-hidden />

      {/* Conteúdo */}
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:py-10">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Mapa ATC Brasil — Frequências Oficiais
          </h1>
          <p className="mt-2 text-sm opacity-80">
            Dados priorizados de fontes oficiais (DECEA / AIP-BRASIL / AISWEB). Clique nos marcadores para ver VHF/UHF.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-[1fr,320px]">
          {/* Mapa */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
            <ATCMap data={data} visibleTypes={visibleTypes} />
          </div>

          {/* Filtros + legenda */}
          <aside className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <h2 className="text-lg font-semibold mb-3">Filtros</h2>
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

            <div className="mt-6 text-xs opacity-80 space-y-2">
              <p>
                <span className="font-medium">Nota:</span> 121.500 MHz (emergência) é monitorada pelas unidades ATS.
              </p>
              <p>
                <span className="font-medium">Fontes:</span> AIP-BRASIL / AISWEB (DECEA).
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
