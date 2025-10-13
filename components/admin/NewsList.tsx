'use client';
import { useEffect, useState } from 'react';

type NewsItem = { id:string; date:string; title:string; url:string; image?:string };

export default function NewsList() {
  const [items, setItems] = useState<NewsItem[]|null>(null);
  const [msg, setMsg] = useState('');

  async function load() {
    setItems(null);
    try {
      const r = await fetch('/api/admin/news/list', { cache: 'no-store' });
      const json = await r.json();
      setItems(Array.isArray(json) ? json : []);
    } catch { setItems([]); }
  }

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener('news:reload', h as any);
    return () => window.removeEventListener('news:reload', h as any);
  }, []);

  async function del(id: string) {
    if (!confirm('Remover esta notícia?')) return;
    setMsg('Removendo…');
    try {
      const r = await fetch('/api/admin/news/delete', {
        method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ id })
      });
      const json = await r.json();
      if (!r.ok || !json.ok) throw new Error(json?.msg || r.statusText);
      setMsg('OK: removida.');
      load();
    } catch (e:any) {
      setMsg('Erro: ' + (e?.message || String(e)));
    }
  }

  if (items === null) return <div className="opacity-70">Carregando…</div>;
  if (!items.length)   return <div className="opacity-70">Nenhuma notícia ainda.</div>;

  return (
    <div className="mt-4">
      <div className="text-sm opacity-70 mb-2">Cadastradas</div>
      <ul className="divide-y divide-white/10">
        {items.map(n => (
          <li key={n.id} className="py-3 flex items-center gap-3">
            <div className="w-28 shrink-0 text-xs opacity-70">{n.date}</div>
            <a href={n.url} target="_blank" className="flex-1 hover:underline">{n.title}</a>
            {n.image && <code className="text-xs opacity-70 hidden md:block">{n.image}</code>}
            <button onClick={()=>del(n.id)} className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm">Excluir</button>
          </li>
        ))}
      </ul>
      <div className="text-sm opacity-70 mt-2">{msg}</div>
    </div>
  );
}
