
'use client';
import { useEffect, useState } from 'react';
type News = { id:string; date:string; title:string; link:string; image?:string; highlight?:boolean };
export default function NewsPage(){
  const [items,setItems]=useState<News[]>([]);
  useEffect(()=>{ fetch('/api/news').then(r=>r.json()).then(setItems).catch(()=>{}); },[]);
  return (
    <div className="space-y-6">
      <div className="card"><h1 className="text-2xl font-semibold">Notícias</h1><p className="hint">Destaques e links externos.</p></div>
      <div className="grid md:grid-cols-3 gap-6">
        {items.map(n => (
          <a key={n.id} href={n.link} target="_blank" className="card hover:shadow-glow transition">
            {n.image && <img src={n.image} alt="" className="rounded-xl mb-3 border border-[color:var(--border)]" />}
            <div className="text-xs text-gray-400">{new Date(n.date).toLocaleDateString()}</div>
            <h3 className="font-semibold">{n.title}</h3>
          </a>
        ))}
      </div>
    </div>
  );
}
