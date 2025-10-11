
'use client';
import { useEffect, useState } from 'react';
export default function CornerVideo(){
  const [visible,setVisible]=useState(true);
  useEffect(()=>{ if(localStorage.getItem('cornerVideoHidden')==='1') setVisible(false); },[]);
  if(!visible) return null;
  return (
    <aside className="fixed bottom-6 right-6 z-50 max-w-xs w-[320px]">
      <div className="rounded-2xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--card)] shadow-xl shadow-indigo-600/10">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[color:var(--border)]">
          <span className="text-sm font-medium">Luzes do Abismo — Apresentação</span>
          <button className="text-gray-400 hover:text-gray-200 text-sm"
            onClick={()=>{ localStorage.setItem('cornerVideoHidden','1'); setVisible(false); }}
            aria-label="Fechar">✕</button>
        </div>
        <a href="https://youtu.be/CJEKzSll76g" target="_blank" rel="noreferrer" className="block group">
          <div className="relative" style={{paddingTop:'56.25%'}}>
            <img src="/images/MiniaturaLUZESABISMO.jpg" alt="Abrir vídeo no YouTube" className="absolute inset-0 w-full h-full object-cover"/>
          </div>
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-sm text-gray-300">Assistir no YouTube</span>
            <span className="text-gray-400 group-hover:text-gray-200">▶</span>
          </div>
        </a>
      </div>
    </aside>
  );
}
