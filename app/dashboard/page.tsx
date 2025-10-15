'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import CountryCodeLookup from '@/components/CountryCodeLookup';
import aggregates from '@/data/aggregates.json';
import { ComposableMap, Geographies, Geography, Graticule } from 'react-simple-maps';
import * as topojson from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { scaleQuantize } from 'd3-scale';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from 'recharts';

// ---------- Tipos & constantes ----------
type CountryData = { code: string; name: string; count: number };

const codeToName: Record<string, string> = {
  USA:'Estados Unidos', BRA:'Brasil', ARG:'Argentina', CHL:'Chile', COL:'Colômbia',
  PER:'Peru', DNK:'Dinamarca', CAN:'Canadá', AUS:'Austrália', MEX:'México', JPN:'Japão',
};

const NUM_TO_ISO3: Record<number, string> = {
  840:'USA', 76:'BRA', 32:'ARG', 152:'CHL', 170:'COL', 604:'PER',
  208:'DNK', 124:'CAN', 36:'AUS', 484:'MEX', 392:'JPN',
};

const ALIASES: Record<string, string> = {
  UK:'GBR', GB:'GBR', ENGLAND:'GBR', WALES:'GBR', SCOTLAND:'GBR',
  US:'USA', UAE:'ARE', RUSSIA:'RUS', BOLIVIA:'BOL', IRAN:'IRN',
  VIETNAM:'VNM', SOUTH_KOREA:'KOR', NORTH_KOREA:'PRK'
};

const COLOR_RAMP = ['#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5'];
const MAP_OUTLINE = '#1c2a44';
const MAP_OUTLINE_HL = '#fbbf24';
const FILL_ZERO = '#112036';

// ---------- utils ----------
const normalizeMonth = (m: string) => m.replace(/(\d{4})-(\d{1,2})/, (_, y, mm) => `${y}-${String(mm).padStart(2,'0')}`);
const normalizeCode = (raw: string) => { const t = String(raw||'').trim().toUpperCase(); return t ? (ALIASES[t] || t) : ''; };

function getISO3fromGeo(geo:any):string{
  const num = Number(geo.id);
  if(!Number.isNaN(num) && NUM_TO_ISO3[num]) return NUM_TO_ISO3[num];
  const a3 = geo.properties?.ISO_A3 || geo.properties?.ISO_A3_EH || geo.properties?.ADM0_A3 || '';
  if(a3 && a3 !== '-99') return String(a3).toUpperCase();
  return '';
}
function prevOf(monthKey: string){
  const [y,m]=monthKey.split('-').map(Number);
  const d=new Date(y,(m||1)-2,1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// ---------- mini-cards do rodapé ----------
function MonthReports({ monthKey }: { monthKey: string }) {
  const [items, setItems] = React.useState<any[]>([]);
  React.useEffect(()=>{
    let ok = true;
    fetch('/api/reports', { cache:'no-store' })
      .then(r=>r.json())
      .then((all)=>{ if(ok) setItems(Array.isArray(all)?all:[]); })
      .catch(()=>{});
    return ()=>{ ok=false; };
  },[]);
  const list = items.filter((x)=> x?.slug === monthKey);
  if(list.length===0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 h-full">
      <h3 className="text-lg font-semibold mb-2">Relatório(s) do mês</h3>
      <ul className="space-y-2">
        {list.map((r:any)=>(
          <li key={r.slug} className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{r.title || `Relatório ${r.slug}`}</div>
              {r.summary && (
                <div className="text-sm opacity-80 max-h-14 overflow-hidden text-ellipsis">
                  {r.summary}
                </div>
              )}
            </div>
            <div className="shrink-0 ml-auto flex flex-wrap gap-2">
              <a href={`/report/${r.slug}`} className="btn">Abrir</a>
              <a href={r.file} target="_blank" rel="noopener" className="btn">PDF</a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RegionBreakdown({ cur }: { cur: Record<string, number> }) {
  const [regions, setRegions] = React.useState<Record<string,string>>({});
  React.useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const r=await fetch('https://cdn.jsdelivr.net/npm/world-countries@latest/countries.json',{cache:'force-cache'});
        const j=await r.json();
        const map: Record<string,string> = {};
        for(const c of j||[]){
          const iso3 = String(c?.cca3||'').toUpperCase();
          const reg  = c?.region || 'Outros';
          if(iso3) map[iso3]=reg;
        }
        if(alive) setRegions(map);
      }catch{}
    })();
    return ()=>{alive=false;};
  },[]);
  const totals: Record<string,number> = {};
  let sum=0;
  for(const [k,v] of Object.entries(cur||{})){
    const n=Number(v||0); if(!n) continue;
    const reg = regions[k] || 'Outros';
    totals[reg]=(totals[reg]||0)+n;
    sum+=n;
  }
  const rows = Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  if(rows.length===0) return null;
  const max = Math.max(1,...rows.map(([,v])=>v));

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 h-full">
      <h3 className="text-lg font-semibold mb-3">Participação por região</h3>
      <ul className="space-y-2">
        {rows.map(([reg,v])=>(
          <li key={reg} className="flex items-center gap-3">
            <div className="min-w-[7.5rem]">{reg}</div>
            <div className="flex-1 h-2 rounded bg-white/10 overflow-hidden">
              <div className="h-full bg-blue-400/70" style={{ width:`${(v/max)*100}%` }} />
            </div>
            <div className="w-28 text-right tabular-nums text-sm">
              {v} <span className="opacity-70">({sum?Math.round(v/sum*100):0}%)</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MonthDelta({
  cur, prev, nameOf, monthKey, prevKey,
}:{
  cur:Record<string,number>;
  prev:Record<string,number>;
  nameOf:(iso3:string)=>string;
  monthKey:string;
  prevKey:string;
}){
  const union=new Set<string>([...Object.keys(cur||{}),...Object.keys(prev||{})]);
  const diffs=Array.from(union).map(k=>({iso3:k,diff:(cur[k]||0)-(prev[k]||0),now:cur[k]||0}));
  const up   = diffs.filter(d=>d.diff>0).sort((a,b)=>b.diff-a.diff).slice(0,5);
  const down = diffs.filter(d=>d.diff<0).sort((a,b)=>a.diff-b.diff).slice(0,5);
  if(up.length===0 && down.length===0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 h-full">
      <h3 className="text-lg font-semibold mb-3">Variação vs mês anterior</h3>
      <div className="text-xs opacity-70 mb-2">{prevKey} → {monthKey}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="font-medium mb-1">Maiores altas</div>
          <ul className="space-y-1">
            {up.length===0 ? <li className="opacity-70 text-sm">—</li> : up.map(x=>(
              <li key={x.iso3} className="flex justify-between gap-4">
                <span className="truncate">{nameOf(x.iso3)}</span>
                <span className="tabular-nums text-emerald-400 shrink-0">+{x.diff} <span className="opacity-70">({x.now})</span></span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-medium mb-1">Maiores quedas</div>
          <ul className="space-y-1">
            {down.length===0 ? <li className="opacity-70 text-sm">—</li> : down.map(x=>(
              <li key={x.iso3} className="flex justify-between gap-4">
                <span className="truncate">{nameOf(x.iso3)}</span>
                <span className="tabular-nums text-rose-400 shrink-0">{x.diff} <span className="opacity-70">({x.now})</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function DashboardFooter({
  monthKey, cur, prev, nameOf,
}:{
  monthKey:string;
  cur:Record<string,number>;
  prev:Record<string,number>;
  nameOf:(iso3:string)=>string;
}){
  // Layout robusto: 1 col → 2 col em md → 3 col em 2xl; cards sempre com a mesma altura
  return (
    <div className="mt-6 -mx-2 flex flex-wrap items-stretch">
      <div className="w-full md:w-1/2 2xl:w-1/3 px-2 mb-4"><RegionBreakdown cur={cur}/></div>
      <div className="w-full md:w-1/2 2xl:w-1/3 px-2 mb-4"><MonthDelta cur={cur} prev={prev} nameOf={nameOf} monthKey={monthKey} prevKey={prevOf(monthKey)} /></div>
      <div className="w-full md:w-1/2 2xl:w-1/3 px-2 mb-4"><MonthReports monthKey={monthKey}/></div>
    </div>
  );
}

// ---------- Página ----------
export default function Dashboard(){
  const geo = useMemo(()=> topojson.feature(worldData as any, (worldData as any).objects.countries) as any, []);

  const byMonth = useMemo(()=>{
    const out: Record<string, Record<string, number>> = {};
    Object.entries((aggregates as any).byMonth).forEach(([m, obj]: any)=>{
      const mm = normalizeMonth(m); out[mm] = {};
      Object.entries(obj).forEach(([c, v]: any)=>{ out[mm][String(c).toUpperCase()] = Number(v)||0; });
    });
    return out;
  },[]);

  const months = useMemo(()=> (aggregates as any).global.map((g:any)=> normalizeMonth(g.month)), []);
  const [month, setMonth] = useState<string>(normalizeMonth((aggregates as any).defaultMonth));
  const [selected, setSelected] = useState<string>('');
  const [tip, setTip] = useState<{text:string; x:number; y:number} | null>(null);

  const map = useMemo(()=> ({ ...(byMonth[month] || {}) }), [byMonth, month]);
  const maxValue = useMemo(()=> Math.max(1, ...Object.values(map), 1), [map]);
  const scale = useMemo(()=> (scaleQuantize<number,string>() as any).domain([0,maxValue]).range(COLOR_RAMP), [maxValue]);
  const valueFor = (code:string)=> Number(map[normalizeCode(code)] || 0);

  const monthData: CountryData[] = useMemo(()=> Object.entries(map)
    .map(([code, count])=>({ code, name: codeToName[code] || code, count: Number(count) }))
    .sort((a,b)=> b.count - a.count), [map]);

  const seriesSelected = useMemo(()=> months.map(m=>({ month:m, count: Number((byMonth[m]||{})[normalizeCode(selected)] || 0) })), [months, byMonth, selected]);

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8">
      {/* header */}
      <section className="relative rounded-2xl bg-[#0e1624] px-6 py-5 shadow-lg overflow-hidden">
        <h1 className="text-2xl font-semibold">Consolidação Global — <span className="text-xs align-middle">Dashboard V9b (OFFLINE+secure)</span></h1>
        <p className="hint">Passe o mouse para ver valores; clique para fixar um país. A busca de siglas está ao lado.</p>
        <div className="text-xs mt-2">Diag — mês: <code>{month}</code> | BRA: <span className="font-mono">{valueFor('BRA')}</span> | Selecionado: <code>{selected || '—'}</code> (valor: <span className="font-mono">{valueFor(selected)}</span>)</div>
        <div className="pointer-events-none absolute right-6 top-4 z-10 opacity-90 hidden md:block">
          <Image src="/media/earth-night-1918_128.gif" alt="" width={128} height={128} priority className="rounded-full ring-1 ring-white/10 shadow-lg" />
        </div>
      </section>

      {/* grade principal */}
      <section className="grid lg:grid-cols-3 gap-6 items-start">
        {/* coluna esquerda */}
        <div className="lg:col-span-2 card min-w-0 overflow-x-hidden pb-5">
          <div className="flex items-center gap-3 mb-3">
            <label className="hint">Mês:</label>
            <select className="bg-black/40 border border-gray-700 rounded px-3 py-1" value={month} onChange={(e)=> setMonth(normalizeMonth(e.target.value))}>
              {months.map(m=> <option key={m} value={m}>{m}</option>)}
            </select>
            <input placeholder="Código do país (ex.: BRA)" className="bg-black/40 border border-gray-700 rounded px-3 py-1 w-56" value={selected} onChange={(e)=> setSelected(normalizeCode(e.target.value))} />
            <button className="btn" onClick={()=> setSelected('')}>Limpar</button>
          </div>

          <div className="relative">
            <div className="h-[520px] rounded-xl overflow-hidden border border-gray-700">
              <ComposableMap projectionConfig={{ scale: 145 }}>
                <Graticule stroke="#1f2937" strokeWidth={0.5} />
                <Geographies geography={geo as any}>
                  {({ geographies }) => geographies.map((g) => {
                    const code = getISO3fromGeo(g);
                    const val = valueFor(code);
                    const fill = val > 0 ? scale(val) : FILL_ZERO;
                    const isSel = normalizeCode(selected) === code;
                    const label = `${codeToName[code] || code || '—'} (${code||'?'}) — ${val} casos em ${month}`;
                    return (
                      <Geography
                        key={g.rsmKey}
                        geography={g}
                        onMouseEnter={(e)=> setTip({ text: label, x: e.clientX, y: e.clientY })}
                        onMouseMove={(e)=> setTip({ text: label, x: e.clientX, y: e.clientY })}
                        onMouseLeave={()=> setTip(null)}
                        onClick={()=> code && setSelected(code)}
                        style={{
                          default:{ fill, outline: isSel ? MAP_OUTLINE_HL : MAP_OUTLINE, cursor: code ? 'pointer' : 'default' },
                          hover:{   fill: code ? '#60a5fa' : fill, outline: MAP_OUTLINE, cursor: code ? 'pointer' : 'default' },
                          pressed:{ fill: code ? '#2563eb' : fill, outline: MAP_OUTLINE, cursor: code ? 'pointer' : 'default' }
                        }}
                      />
                    );
                  })}
                </Geographies>
              </ComposableMap>
            </div>

            {tip && (
              <div className="pointer-events-none fixed z-50 px-2 py-1 rounded bg-black/80 border border-gray-700 text-xs" style={{ left: tip.x + 12, top: tip.y + 12 }}>
                {tip.text}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-1">Legenda — intensidade (0 → {maxValue})</div>
            <div className="flex items-center gap-2">{COLOR_RAMP.map((c,i)=> <div key={i} className="h-3 w-10 rounded" style={{ background:c }} />)}</div>
          </div>

          {/* cards extras do rodapé */}
          <DashboardFooter
            monthKey={month}
            cur={(byMonth?.[month] as Record<string,number>) || {}}
            prev={(byMonth?.[prevOf(month)] as Record<string,number>) || {}}
            nameOf={(iso3)=>codeToName[iso3] || iso3}
          />
        </div>

        {/* coluna direita */}
        <aside className="card min-w-0">
          <h2 className="text-lg font-semibold mb-2">Detalhes do país</h2>
          <div className="space-y-3">
            <div className="text-xl font-semibold">
              {(codeToName[normalizeCode(selected)] || selected || '—')} {selected && <span className="text-gray-500">({normalizeCode(selected)})</span>}
            </div>
            <div className="text-sm">Em <strong>{month}</strong>: <strong>{valueFor(selected)}</strong> casos</div>
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
          <CountryCodeLookup onPick={(iso3)=> setSelected(normalizeCode(iso3))} className="mt-4" />

          <h3 className="font-semibold mt-6 mb-2">Top Países — {month}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData.slice(0,8)}>
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

/* utilitários esperados no CSS:
.card => rounded-2xl bg-[#0e1624] p-5 shadow-lg
.btn  => px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm
.hint => opacity-75
*/
