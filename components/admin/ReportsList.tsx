'use client';
import { useEffect, useMemo, useState } from 'react';

type Entry = { slug:string; title:string; summary?:string; file:string; meta?:{global?:number} };

function monthLabel(slug: string) {
  const [y, m] = slug.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function ReportsList() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/reports', { cache: 'no-store' });
      const j = await r.json();
      const data: Entry[] = Array.isArray(j) ? j : [];
      setItems(
        data
          .filter(e => e && e.slug && e.file)
          .sort((a,b)=> (a.slug < b.slug ? 1 : -1))
      );
      setMsg('');
    } catch (e:any) {
      setMsg('Falha ao carregar: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const fn = () => load();
    window.addEventListener('reports:changed', fn);
    return () => window.removeEventListener('reports:changed', fn);
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter(e =>
      e.slug.includes(t) ||
      (e.title||'').toLowerCase().includes(t)
    );
  }, [items, q]);

  async function remove(slug: string) {
    if (!confirm(`Apagar relatório ${slug}?`)) return;
    const fd = new FormData();
    fd.append('slug', slug);
    const r = await fetch('/api/admin/delete', { method:'POST', body: fd });
    const j = await r.json().catch(()=> ({}));
    setMsg((r.ok ? 'OK: ' : 'Erro: ') + (j.msg || r.status));
    if (r.ok) load();
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-3">
        <input
          placeholder="Filtrar por mês/título…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          className="w-full px-3 py-2 rounded bg-black/10 border"
        />
        <button onClick={load} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Atualizar</button>
      </div>

      {loading ? <div>Carregando…</div> : (
        filtered.length === 0 ? <div className="opacity-70">Nenhum relatório.</div> : (
          <ul className="divide-y divide-white/10 rounded overflow-hidden border border-white/10">
            {filtered.map(e => (
              <li key={e.slug} className="flex items-center justify-between gap-4 bg-black/10 px-3 py-2">
                <div className="text-sm">
                  <div className="opacity-70">{monthLabel(e.slug)} — <span className="font-mono">{e.slug}</span></div>
                  <div className="font-medium">{e.title || `Relatório ${e.slug}`}</div>
                </div>
                <div className="flex gap-2">
                  <a href={e.file} target="_blank" rel="noopener noreferrer"
                     className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-sm">Ver</a>
                  <button onClick={()=>remove(e.slug)}
                          className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-sm">Apagar</button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      <div className="text-sm opacity-80 mt-2">{msg}</div>
    </div>
  );
}
