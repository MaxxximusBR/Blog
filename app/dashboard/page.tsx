'use client';

import { useMemo, useState } from 'react';
import CountryCodeLookup from '@/components/CountryCodeLookup';
import aggregates from '@/data/aggregates.json';

import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

import { ComposableMap, Geographies, Geography, Graticule } from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import * as topojson from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';

// --- Tipos auxiliares
type CountryData = { code: string; name: string; count: number };

// Nome “legível” para alguns códigos comuns (fallback para exibir no tooltip/sidepanel)
const codeToName: Record<string, string> = {
  BRA: 'Brasil', ARG: 'Argentina', CHL: 'Chile', COL: 'Colômbia', PER: 'Peru',
  USA: 'Estados Unidos', CAN: 'Canadá', MEX: 'México', AUS: 'Austrália', JPN: 'Japão',
};

// Mapa de ID numérico do topojson → ISO3 (apenas onde o 110m usa numérico)
const NUM_TO_ISO3: Record<number, string> = {
  840: 'USA', 76: 'BRA', 32: 'ARG', 152: 'CHL', 170: 'COL', 604: 'PER',
  124: 'CAN', 484: 'MEX', 36: 'AUS', 392: 'JPN',
};

// Aliases comuns digitados pelo usuário (precisam de aspas quando há ponto!)
const ALIASES: Record<string, string> = {
  UK: 'GBR',
  UKE: 'GBR',
  'U.S.A': 'USA',
  UNITED_STATES: 'USA',
  RUSSIA: 'RUS',
  BOLIVIA: 'BOL',
  VENEZUELA: 'VEN',
};

// Normaliza “YYYY-M” → “YYYY-MM”
const normalizeMonth = (m: string) =>
  m.replace(/(\d{4})-(\d{1,2})/, (_, y, mm) => `${y}-${String(mm).padStart(2, '0')}`);

// --- Componente principal
export default function Dashboard() {
  // GeoJSON a partir do topojson
  const geo = useMemo(
    () =>
      topojson.feature(
        worldData as any,
        (worldData as any).objects.countries
      ) as any,
    []
  );

  // Indexa os dados por mês e código ISO3 (em MAIÚSCULAS)
  const byMonth = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    Object.entries((aggregates as any).byMonth).forEach(([m, obj]: any) => {
      const mm = normalizeMonth(m);
      out[mm] = {};
      Object.entries(obj).forEach(([c, v]: any) => {
        out[mm][String(c).toUpperCase()] = Number(v) || 0;
      });
    });
    return out;
  }, []);

  const months = useMemo(
    () => (aggregates as any).global.map((g: any) => normalizeMonth(g.month)),
    []
  );

  // Estado
  const defaultMonth = normalizeMonth((aggregates as any).defaultMonth);
  const [month, setMonth] = useState<string>(defaultMonth);
  const [selected, setSelected] = useState<string>(''); // deixe vazio para não “grudar” S.A. por padrão
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Dados do mês corrente
  const map = useMemo(() => ({ ...(byMonth[month] || {}) }), [byMonth, month]);
  const monthData: CountryData[] = useMemo(
    () =>
      Object.entries(map)
        .map(([code, count]) => ({
          code,
          name: codeToName[code] || code,
          count: Number(count),
        }))
        .sort((a, b) => b.count - a.count),
    [map]
  );

  // Escala de cor
  const maxValue = useMemo(() => Math.max(1, ...Object.values(map), 1), [map]);
  const scale = useMemo(
    () =>
      (scaleQuantize<number, string>() as any)
        .domain([0, maxValue])
        .range(['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5']),
    [maxValue]
  );

  const valueFor = (code?: string) => Number(code ? map[code] || 0 : 0);

  // Extrai ISO3 do feature do mapa
  function getISO3fromGeo(g: any): string {
    // 1) id numérico → tabela
    const num = Number(g.id);
    if (!Number.isNaN(num) && NUM_TO_ISO3[num]) return NUM_TO_ISO3[num];
    // 2) propriedades com ISO A3
    const a3 =
      g.properties?.ISO_A3 ||
      g.properties?.ISO_A3_EH ||
      g.properties?.ADM0_A3 ||
      g.properties?.isocode ||
      '';
    if (a3 && a3 !== '-99') return String(a3).toUpperCase();
    return '';
  }

  // Normaliza entrada digitada ou vinda do seletor
  function normalizeCode(input: string) {
    if (!input) return '';
    const raw = input.trim().toUpperCase().replace(/\s+/g, '_');
    if (ALIASES[raw]) return ALIASES[raw];
    if (/^[A-Z]{3}$/.test(raw)) return raw; // já é ISO3
    // ISO2 muito comum: tenta via dados do mês (se houver país com esse nome/código como chave)
    // Caso queira algo mais robusto, mantenha a busca pelo CountryCodeLookup (abaixo) como fonte principal.
    return raw;
  }

  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="text-2xl font-semibold">
          Consolidação Global — <span className="text-xs align-middle">Dashboard V9b (OFFLINE+secure)</span>
        </h1>
        <p className="hint">
          Passe o mouse para ver valores; clique para fixar um país. A busca de siglas está ao lado.
        </p>
        <div className="text-xs mt-2">
          Diag — mês: <code>{month}</code> | BRA:{' '}
          <span className="font-mono">{valueFor('BRA')}</span> | Selecionado:
          <code> {selected || '—'}</code> (valor:{' '}
          <span className="font-mono">{valueFor(selected)}</span>)
        </div>
      </section>

      <section className="grid xl:grid-cols-3 gap-6">
        {/* MAPA */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-3 gap-4">
            <div className="flex items-center gap-2">
              <label className="hint">Mês:</label>
              <select
                className="bg-black/40 border border-gray-700 rounded px-3 py-1"
                value={month}
                onChange={(e) => setMonth(normalizeMonth(e.target.value))}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                placeholder="Código do país (ex.: BRA)"
                className="bg-black/40 border border-gray-700 rounded px-3 py-1 w-56"
                value={selected}
                onChange={(e) => setSelected(normalizeCode(e.target.value))}
              />
              {selected && (
                <button className="btn" onClick={() => setSelected('')}>
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="h-[520px] rounded-xl overflow-hidden border border-gray-700">
              <ComposableMap projectionConfig={{ scale: 145 }}>
                {/* grade / lat-long */}
                <Graticule stroke="#1f2937" strokeWidth={0.5} />
                <Geographies geography={geo as any}>
                  {({ geographies }) =>
                    geographies.map((g) => {
                      const code = getISO3fromGeo(g);
                      const value = valueFor(code);
                      const fill = value > 0 ? scale(value) : '#0f172a';
                      const isSelected = selected === code;

                      const text = `${codeToName[code] || code || '—'} (${code || '?'}) — ${value} caso(s) em ${month}`;

                      return (
                        <Geography
                          key={g.rsmKey}
                          geography={g}
                          onMouseEnter={(e) => setTip({ text, x: e.clientX, y: e.clientY })}
                          onMouseMove={(e) => setTip({ text, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setTip(null)}
                          onClick={() => code && setSelected(code)}
                          style={{
                            default: {
                              fill,
                              stroke: isSelected ? '#fbbf24' : '#F59E0B', // contorno mais visível
                              strokeWidth: isSelected ? 1.5 : 0.6,
                              outline: 'none',
                              cursor: code ? 'pointer' : 'default',
                            },
                            hover: {
                              fill: code ? '#60a5fa' : fill,
                              stroke: '#F59E0B',
                              outline: 'none',
                              cursor: code ? 'pointer' : 'default',
                            },
                            pressed: {
                              fill: code ? '#2563eb' : fill,
                              outline: 'none',
                              cursor: code ? 'pointer' : 'default',
                            },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>

            {tip && (
              <div
                className="pointer-events-none fixed z-50 px-2 py-1 rounded bg-black/80 border border-gray-700 text-xs"
                style={{ left: tip.x + 12, top: tip.y + 12 }}
              >
                {tip.text}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-1">
              Legenda — intensidade (0 → {maxValue})
            </div>
            <div className="flex items-center gap-2">
              {['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5'].map((c, i) => (
                <div key={i} className="h-3 w-10 rounded" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        {/* PAINEL LATERAL */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Detalhes do país</h2>

          <div className="space-y-3">
            <div className="text-xl font-semibold">
              {codeToName[selected] || selected || '—'}{' '}
              {selected && <span className="text-gray-500">({selected})</span>}
            </div>
            <div className="text-sm">
              Em <strong>{month}</strong>: <strong>{valueFor(selected)}</strong> casos
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={months.map((m) => ({
                    month: m,
                    count: Number((byMonth[m] || {})[selected] || 0),
                  }))}
                >
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <Line type="monotone" dataKey="count" stroke="#60a5fa" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <h3 className="font-semibold mt-6 mb-2">Buscar sigla de país (ISO-3)</h3>

          {/* Busca com lista (usa o componente que você já tem) */}
          <CountryCodeLookup
            onPick={(iso3: string) => setSelected(normalizeCode(iso3))}
            className="mb-4"
          />

          <h3 className="font-semibold mt-4 mb-2">Selecione pela lista (fallback)</h3>
          <ul className="text-sm max-h-60 overflow-auto divide-y divide-gray-800">
            {monthData.map((row) => (
              <li
                key={row.code}
                className={`flex items-center justify-between py-1 ${
                  selected === row.code ? 'text-indigo-300' : ''
                }`}
              >
                <button
                  className="text-left hover:underline"
                  onClick={() => setSelected(row.code)}
                >
                  {row.name} <span className="text-gray-500">({row.code})</span>
                </button>
                <span className="font-mono">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* GRÁFICOS RESUMO */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-2">Total Global por Mês</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(aggregates as any).global.map((g: any) => ({
                  month: normalizeMonth(g.month),
                  total: g.total,
                }))}
              >
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <Line type="monotone" dataKey="total" stroke="#93c5fd" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Top Países — {month}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData.slice(0, 8)}>
                <XAxis dataKey="code" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <Bar dataKey="count" fill="#93c5fd" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
