'use client';

import { useMemo, useState } from 'react';
import CountryCodeLookup from '@/components/CountryCodeLookup';
import aggregates from '@/data/aggregates.json';

import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar
} from 'recharts';

import { ComposableMap, Geographies, Geography, Graticule } from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import * as topojson from 'topojson-client';

// TopoJSON do world-atlas (ids numéricos M49)
import worldData from 'world-atlas/countries-110m.json' assert { type: 'json' };

// i18n-iso-countries para conversões ISO
import countries from 'i18n-iso-countries';
import pt from 'i18n-iso-countries/langs/pt.json';
import en from 'i18n-iso-countries/langs/en.json';
countries.registerLocale(pt);
countries.registerLocale(en);

type CountryData = { code: string; name: string; count: number };

// alguns nomes em PT para deixar tooltip amigável
const codeToName: Record<string, string> = {
  USA:'Estados Unidos', BRA:'Brasil', ARG:'Argentina', CHL:'Chile', COL:'Colômbia',
  PER:'Peru', DNK:'Dinamarca', CAN:'Canadá', AUS:'Austrália', MEX:'México', JPN:'Japão',
};

// apelidos/ajustes pontuais
const ALIASES: Record<string,string> = {
  UK: 'GBR',
  UKE: 'GBR',
  U.S.A: 'USA',
  UNITED_STATES: 'USA',
  RUSSIA: 'RUS',
  BOLIVIA: 'BOL',
  VENEZUELA: 'VEN',
  KOSOVO: 'XKX', // não-ISO mas aparece em coleções
};

const normalizeMonth = (m: string) =>
  m.replace(/(\d{4})-(\d{1,2})/, (_, y, mm) => `${y}-${String(mm).padStart(2,'0')}`);

// --- helpers de código de país ------------------------------------------------
function toISO3Loose(input: string): string {
  let c = String(input || '').trim();

  if (!c) return '';

  // normalizações simples
  c = c.replace(/\s+/g, ' ').toUpperCase();
  if (ALIASES[c]) return ALIASES[c];

  // numérico (M49)
  if (/^\d{1,3}$/.test(c)) {
    const a3 = countries.numericToAlpha3(c.padStart(3,'0'));
    return (a3 || c).toUpperCase();
  }
  if (/^\d{3}$/.test(c)) {
    const a3 = countries.numericToAlpha3(c);
    return (a3 || c).toUpperCase();
  }

  // ISO-2 -> ISO-3
  if (/^[A-Z]{2}$/.test(c)) {
    const a3 = countries.alpha2ToAlpha3(c);
    return (a3 || c).toUpperCase();
  }

  // já é ISO-3?
  if (/^[A-Z]{3}$/.test(c)) return c;

  // tentar por nome (PT e EN)
  const byPt = countries.getAlpha3Code(c, 'pt');
  if (byPt) return byPt.toUpperCase();

  const byEn = countries.getAlpha3Code(c, 'en');
  if (byEn) return byEn.toUpperCase();

  return c; // fallback (melhor ter algo do que nada)
}

export default function Dashboard() {
  // GeoJSON a partir do TopoJSON
  const geo = useMemo(() => {
    return topojson.feature(
      worldData as any,
      (worldData as any).objects.countries
    ) as any;
  }, []);

  // normaliza agregados: qualquer chave vira ISO-3
  const byMonth = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    Object.entries((aggregates as any).byMonth).forEach(([m, obj]: any) => {
      const mm = normalizeMonth(m);
      const bucket: Record<string, number> = {};
      Object.entries(obj || {}).forEach(([key, val]) => {
        const a3 = toISO3Loose(String(key));
        if (!a3) return;
        const n = Number(val) || 0;
        bucket[a3] = (bucket[a3] || 0) + n;
      });
      out[mm] = bucket;
    });
    return out;
  }, []);

  const months = useMemo(()=> (aggregates as any).global.map((g:any)=> normalizeMonth(g.month)), []);
  const [month, setMonth] = useState<string>(normalizeMonth((aggregates as any).defaultMonth));
  const [selected, setSelected] = useState<string>('');
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  const map = useMemo(()=> ({ ...(byMonth[month] || {}) }), [byMonth, month]);

  const monthData: CountryData[] = useMemo(()=> (
    Object.entries(map)
      .map(([code, count]) => ({
        code,
        name: codeToName[code] || code,
        count: Number(count)
      }))
      .sort((a,b)=>b.count-a.count)
  ), [map]);

  const maxValue = useMemo(()=> Math.max(1, ...Object.values(map).map(Number)), [map]);

  const scale = useMemo(()=> (scaleQuantize<number, string>() as any)
    .domain([0, maxValue])
    .range(['#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5']), [maxValue]);

  const valueFor = (code: string) => Number(map[code] || 0);

  // ID numérico (M49) -> ISO-3 para as geometrias
  function iso3FromGeo(geo: any): string {
    const num = String(geo.id ?? '').padStart(3,'0');      // ex.: 840 -> "840"
    const a3 =
      countries.numericToAlpha3(num) ||
      geo.properties?.ISO_A3 ||
      geo.properties?.iso_a3 ||
      '';
    return String(a3 || '').toUpperCase();
  }

  const nameFor = (code: string) => codeToName[code] || code || '—';

  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="text-2xl font-semibold">
          Consolidação Global — <span className="text-xs align-middle">Dashboard V9b (OFFLINE+secure)</span>
        </h1>
        <p className="hint">Passe o mouse para ver valores; clique para fixar um país. A busca de siglas está ao lado.</p>
        <div className="text-xs mt-2">
          Diag — mês: <code>{month}</code> | BRA: <span className="font-mono">{valueFor('BRA')}</span> |
          {' '}Selecionado:<code> {selected || '—'}</code> (valor: <span className="font-mono">{valueFor(selected)}</span>)
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
                onChange={(e)=>setMonth(normalizeMonth(e.target.value))}
              >
                {months.map((m)=>(<option key={m} value={m}>{m}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                placeholder="Código do país (ex.: BRA)"
                className="bg-black/40 border border-gray-700 rounded px-3 py-1 w-56"
                value={selected}
                onChange={(e)=> setSelected(e.target.value.toUpperCase()) }
              />
              {selected && <button className="btn" onClick={()=>setSelected('')}>Limpar</button>}
            </div>
          </div>

          <div className="relative">
            <div className="h-[520px] rounded-xl overflow-hidden border border-gray-700">
              <ComposableMap
                projection="geoEqualEarth"
                projectionConfig={{ scale: 165, center: [0, 12] }}
                style={{ width: '100%', height: '100%' }}
              >
                <Graticule stroke="#1f2937" strokeWidth={0.5} />
                <Geographies geography={geo as any}>
                  {({geographies})=> geographies.map((g)=>{
                    const code = iso3FromGeo(g);
                    const value = valueFor(code);
                    const fill = value>0 ? scale(value) : '#0f172a';
                    const isSelected = selected === code;

                    return (
                      <Geography
                        key={g.rsmKey}
                        geography={g}
                        onMouseEnter={(e)=> setTip({ text: `${nameFor(code)} (${code || '—'}) — ${value} casos em ${month}`, x:e.clientX, y:e.clientY })}
                        onMouseMove={(e)=> setTip({ text: `${nameFor(code)} (${code || '—'}) — ${value} casos em ${month}`, x:e.clientX, y:e.clientY })}
                        onMouseLeave={()=> setTip(null)}
                        onClick={()=> code && setSelected(code)}
                        style={{
                          default:{
                            fill,
                            stroke: isSelected ? '#fbbf24' : '#334155',
                            strokeWidth: isSelected ? 1.6 : 0.6,
                            vectorEffect: 'non-scaling-stroke' as any,
                            outline:'none',
                            cursor: code ? 'pointer' : 'default'
                          },
                          hover:{
                            fill: code ? '#60a5fa' : fill,
                            stroke:'#334155',
                            outline:'none',
                            cursor: code ? 'pointer' : 'default'
                          },
                          pressed:{
                            fill: code ? '#2563eb' : fill,
                            outline:'none',
                            cursor: code ? 'pointer' : 'default'
                          }
                        }}
                      />
                    );
                  })}
                </Geographies>
              </ComposableMap>
            </div>

            {tip && (
              <div
                className="pointer-events-none fixed z-50 px-2 py-1 rounded bg-black/80 border border-gray-700 text-xs"
                style={{ left: tip.x+12, top: tip.y+12 }}
              >
                {tip.text}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-1">Legenda — intensidade (0 → {maxValue})</div>
            <div className="flex items-center gap-2">
              {['#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5'].map((c,i)=>
                <div key={i} className="h-3 w-10 rounded" style={{background:c}} />
              )}
            </div>
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Detalhes do país</h2>
          <div className="space-y-3">
            <div className="text-xl font-semibold">
              {(nameFor(selected) || '—')} {selected && <span className="text-gray-500">({selected})</span>}
            </div>
            <div className="text-sm">Em <strong>{month}</strong>: <strong>{valueFor(selected)}</strong> casos</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={months.map(m=>({ month:m, count: Number((byMonth[m]||{})[selected]||0) }))}>
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" allowDecimals={false as any} />
                  <Tooltip />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <Line type="monotone" dataKey="count" stroke="#60a5fa" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <h3 className="font-semibold mt-6 mb-2">Buscar sigla de país (ISO-3)</h3>
          <CountryCodeLookup onPick={(a3) => setSelected(a3.toUpperCase())} />
        </div>
      </section>

      {/* GRÁFICOS INFERIORES */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-2">Total Global por Mês</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(aggregates as any).global.map((g:any)=>({ month: normalizeMonth(g.month), total:g.total }))}>
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false as any} />
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
              <BarChart data={monthData.slice(0,8)}>
                <XAxis dataKey="code" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false as any} />
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
