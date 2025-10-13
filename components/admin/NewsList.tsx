'use client';
import { useEffect, useState } from 'react';
type News = { id:string; date:string; title:string; url:string; image?:string };

export default function NewsList() {
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/news/list', { cache: 'no-store' });
      const j = await r.json();
      if (j.ok) setItems(j.items || []);
      else setMsg(j.msg || 'Falha ao listar.');
    } catch (e:any) {
      setMsg('Falha: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const fn = () => load();
    window.addEventListener('news:changed', fn);
    return () => window.removeEventListener('news:changed', fn);
  }, []);

  async function removeItem(id: string) {
    if (!confirm('Excluir esta notícia?')) return;
    const fd = new FormData();
    fd.append('id', id);
    const r = await fetch('/api/admin/news/delete', { method: 'POST', body: fd });
    const j = await r.json().catch(()=> ({}));
    setMsg((r.ok ? 'OK: ' : 'Erro: ') + (j.msg || j.count || r.status));
    if (r.ok) load();
  }

  return (
    <div className="mt-6">
      <h3 className="font-medium mb-2">Cadastradas</h3>
      {loading ? <div>Carregando…</div> :
        (items.length === 0 ? <div className="opacity-70">Nenhuma notícia ainda.</div> :
          <ul className="space-y-2">
            {items.map(n => (
              <li key={n.id}
                  className="flex items-center justify-between rounded bg-black/20 px-3 py-2">
                <div className="text-sm">
                  <div className="opacity-70">{n.date}</div>
                  <div className="font-medium">{n.title}</div>
                  <div className="opacity-70 break-all">{n.url}</div>
                </div>
                <button onClick={() => removeItem(n.id)}
                        className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30">
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )
      }
      <div className="text-sm mt-2 opacity-80">{msg}</div>
    </div>
  );
}
