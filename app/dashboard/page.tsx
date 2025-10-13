'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import CountryCodeLookup from '@/components/CountryCodeLookup';
import aggregates from '@/data/aggregates.json';
import { ComposableMap, Geographies, Geography, Graticule } from 'react-simple-maps';
import * as topojson from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { scaleQuantize } from 'd3-scale';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

type CountryData = { code: string; name: string; count: number };

const codeToName: Record<string, string> = {
  USA: 'Estados Unidos',
  BRA: 'Brasil',
  ARG: 'Argentina',
  CHL: 'Chile',
  COL: 'Colômbia',
  PER: 'Peru',
  DNK: 'Dinamarca',
  CAN: 'Canadá',
  AUS: 'Austrália',
  MEX: 'México',
  JPN: 'Japão',
};

const NUM_TO_ISO3: Record<number, string> = {
  840: 'USA',
  76: 'BRA',
  32: 'ARG',
  152: 'CHL',
  170: 'COL',
  604: 'PER',
  208: 'DNK',
  124: 'CAN',
  36: 'AUS',
  484: 'MEX',
  392: 'JPN',
};

const ALIASES: Record<string, string> = {
  UK: 'GBR',
  GB: 'GBR',
  ENGLAND: 'GBR',
  SCOTLAND: 'GBR',
  WALES: 'GBR',
  US: 'USA',
  UAE: 'ARE',
  BOLIVIA: 'BOL',
  RUSSIA: 'RUS',
  SOUTH_KOREA: 'KOR',
  NORTH_KOREA: 'PRK',
  IRAN: 'IRN',
  VIETNAM: 'VNM',
};

const COLOR_RAMP = ['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5'];

const normalizeMonth = (m: string) =>
  m.replace(/(\d{4})-(\d{1,2})/, (_, y, mm) => `${y}-${String(mm).padStart(2, '0')}`);

const normalizeCode = (raw: string) => {
  const t = String(raw || '').trim().toUpperCase();
  if (!t) return '';
  return ALIASES[t] || t;
};

function getISO3fromGeo(geo: any): string {
  const num = Number(geo.id);
  if (!Number.isNaN(num) && NUM_TO_ISO3[num]) return NUM_TO_ISO3[num];
  const a3 =
    geo.properties?.ISO_A3 ||
    geo.properties?.ISO_A3_EH ||
    geo.properties?.ADM0_A3 ||
    '';
  if (a3 && a3 !== '-99') return String(a3).toUpperCase();
  return '';
}

export default function Dashboard() {
  // ---------- dados base ----------
  const geo = useMemo(
    () => topojson.feature(worldData as any, (worldData as any).objects.countries) as any,
    []
  );

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

  // ---------- estado UI ----------
  const [month, setMonth] = useState<string>(normalizeMonth((aggregates as any).defaultMonth));
  const [selected, setSelected] = useState<string>('BRA');

  // ---------- derivados ----------
  const map = useMemo(() => ({ ...(byMonth[month] || {}) }), [byMonth, month]);
  const maxValue = useMemo(() => Math.max(1, ...Object.values(map), 1), [map]);
  const scale = useMemo(
    () => (scaleQuantize<number, string>() as any).domain([0, maxValue]).range(COLOR_RAMP),
    [maxValue]
  );

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

  const valueFor = (code: string) => Number(map[normalizeCode(code)] || 0);

  const seriesSelected = useMemo(
    () =>
      months.map((m) => ({
        month: m,
        count: Number((byMonth[m] || {})[normalizeCode(selected)] || 0),
      })),
    [months, byMonth, selected]
  );

  // ---------- UI ----------
  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      {/* HEADER — com GIF decorativo */}
      <section className="relative rounded-2xl bg-[#0e1624] px-6 py-5 shadow-lg overflow-hidden">
        <h1 className="text-2xl font-semibold">
          Consolidação Global — <span className="text-xs align-middle">Dashboard V9b (OFFLINE+secure)</span>
        </h1>
        <p className="hint">
          Passe o mouse para ver valores; clique para fixar um país. A busca de siglas está ao lado.
        </p>
        <div className="text-xs mt-2">
          Diag — mês: <code>{month}</code> | BRA:{' '}
          <span className="font-mono">{valueFor('BRA')}</span> | Selecionado:{' '}
          <code>{selected || '—'}</code> (valor:{' '}
          <span className="font-mono">{valueFor(selected)}</span>)
        </div>

        {/* GIF — isolado no header e sem interferir no mapa */}
        <div className="pointer-events-none absolute right-6 top-4 z-10 opacity-90 hidden md:block">
          <Image
            src="/media/earth-night-1918_128.gif"
            alt=""
            width={128}
            height={128}
            priority
            className="rounded-full ring-1 ring-white/10 shadow-lg"
          />
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        {/* MAPA */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center gap-3 mb-3">
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

            <input
              placeholder="Código do país (ex.: BRA)"
              className="bg-black/40 border border-gray-700 rounded px-3 py-1 w-56"
              value={selected}
              onChange={(e) => setSelected(normalizeCode(e.target.value))}
            />
            <button className="btn" onClick={() => setSelected('')}>
              Limpar
            </button>
          </div>

          <div className="relative">
            <div className="h-[520px] rounded-xl overflow-hidden border border-gray-700">
              <ComposableMap projectionConfig={{ scale: 145 }}>
                <Graticule stroke="#1f2937" strokeWidth={0.5} />
                <Geographies geography={geo as any}>
                  {({ geographies }) =>
                    geographies.map((g) => {
                      const code = getISO3fromGeo(g);
                      const value = valueFor(code);
                      const fill = value > 0 ? scale(value) : '#0f172a';
                      const isSelected = normalizeCode(selected) === code;
                      return (
                        <Geography
                          key={g.rsmKey}
                          geography={g}
                          onClick={() => code && setSelected(code)}
                          style={{
                            default: {
                              fill,
                              stroke: isSelected ? '#fbbf24' : '#f5c542',
                              strokeWidth: isSelected ? 1.6 : 0.6,
                              outline: 'none',
                              cursor: code ? 'pointer' : 'default',
                            },
                            hover: {
                              fill: code ? '#60a5fa' : fill,
                              stroke: '#f5c542',
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
          </div>

          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-1">
              Legenda — intensidade (0 → {maxValue})
            </div>
            <div className="flex items-center gap-2">
              {COLOR_RAMP.map((c, i) => (
                <div key={i} className="h-3 w-10 rounded" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        {/* PAINEL DIREITO */}
        <aside className="card">
          <h2 className="text-lg font-semibold mb-2">Detalhes do país</h2>

          <div className="space-y-3">
            <div className="text-xl font-semibold">
              {codeToName[normalizeCode(selected)] || selected || '—'}{' '}
              {selected && <span className="text-gray-500">({normalizeCode(selected)})</span>}
            </div>
            <div className="text-sm">
              Em <strong>{month}</strong>:{' '}
              <strong>{valueFor(selected)}</strong> casos
            </div>

            {/* Série temporal do país selecionado */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesSelected}>
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
          <div className="mb-4">
            <CountryCodeLookup onPick={(iso3: string) => setSelected(normalizeCode(iso3))} />
          </div>

          <h3 className="font-semibold mt-6 mb-2">Top Países — {month}</h3>
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
        </aside>
      </section>
    </main>
  );
}

/* 
  Estilos utilitários (reaproveitando classes do seu projeto):
  .card = rounded-2xl bg-[#0e1624] p-5 shadow-lg
  .btn  = px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm
  .hint = opacity-75
*/
