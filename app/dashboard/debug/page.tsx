
'use client';
import { useMemo, useState } from 'react';
import aggregates from '@/data/aggregates.json';

const normalizeMonth = (m:string) => m.replace(/(\d{4})-(\d{1,2})/, (_,y,mm)=>`${y}-${String(mm).padStart(2,'0')}`);

export default function Debug() {
  const months = (aggregates as any).global.map((g:any)=> normalizeMonth(g.month));
  const [month,setMonth] = useState<string>(normalizeMonth((aggregates as any).defaultMonth));
  const map = useMemo(()=>{
    const raw = ((aggregates as any).byMonth as any)[month] || {};
    const o:any = {}; for (const [k,v] of Object.entries(raw)) o[String(k).toUpperCase()] = Number(v)||0;
    return o;
  },[month]);
  const rows = Object.entries(map).sort((a:any,b:any)=> Number(b[1])-Number(a[1]));
  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-semibold">Debug do Dataset ({month})</h1>
        <select className="mt-2 bg-black/40 border border-gray-700 rounded px-3 py-1" value={month} onChange={(e)=>setMonth(normalizeMonth(e.target.value))}>
          {months.map(m=> <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="card">
        <div className="grid grid-cols-3 gap-2 text-sm">
          {rows.map(([code, val])=> (
            <div key={code} className="flex items-center justify-between border-b border-gray-800 py-1">
              <span>{code}</span>
              <span className="font-mono">{val as number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
