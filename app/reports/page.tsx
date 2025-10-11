
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Report = { slug:string; title:string; file:string; summary?:string; meta?:{ global?:number } };
export default function ReportsPage(){
  const [items,setItems] = useState<Report[]>([]);
  useEffect(()=>{ fetch('/api/reports').then(r=>r.json()).then(setItems).catch(()=>{}); },[]);
  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-semibold">Relatórios Mensais</h1>
        <p className="hint">Clique em qualquer mês para abrir o PDF dentro do blog.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {items.map((r)=> (
          <article key={r.slug} className="card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{r.title}</h2>
              <Link href={`/report/${r.slug}`} className="btn">Abrir</Link>
            </div>
            {r.summary && <p className="text-sm text-gray-300">{r.summary}</p>}
            <div className="text-xs text-gray-400">
              Arquivo: <code className="text-gray-300">{r.file}</code> {r.meta?.global && <span> • Total global: <strong>{r.meta.global}</strong></span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
