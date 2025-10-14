'use client';

import { useEffect, useRef, useState } from 'react';
import NewsForm from './NewsForm';

type NewsItem = {
  id: string;
  date: string;   // YYYY-MM-DD
  title: string;
  url: string;
  image?: string;
  summary?: string; // até 1600
};

export default function NewsList() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/news/list', { cache: 'no-store' });
      const json = await r.json();
      if (json?.ok) {
        setItems(Array.isArray(json.items) ? json.items : []);
        setMsg('');
      } else {
        setMsg(json?.msg || 'Falha ao listar.');
      }
    } catch (e: any) {
      setMsg(e?.message || 'Falha ao listar.');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Apagar esta notícia?')) return;
    try {
      const r = await fetch('/api/admin/news/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.msg || `HTTP ${r.status}`);
      setItems(prev => prev.filter(x => x.id !== id));
      setMsg('Notícia removida.');
    } catch (e: any) {
      setMsg('Erro ao remover: ' + (e?.message || String(e)));
    }
  }

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('news:refresh', onRefresh);
    return () => window.removeEventListener('news:refresh', onRefresh);
  }, []);

  useEffect(() => {
    if (editing && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editing]);

  return (
    <div className="space-y-6">
      {/* Formulário com modo edição */}
      <div ref={formRef}>
        <NewsForm
          editing={editing}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onCancel={() => setEditing(null)}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Notícias cadastradas</h3>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Atualizando…' : 'Recarregar'}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-sm opacity-70">Nenhuma notícia.</div>
        ) : (
          <ul className="divide-y divide-white/10">
            {items.map((n) => (
              <li key={n.id} className="py-3 flex gap-3 items-start">
                <div className="flex-1">
                  <div className="text-xs opacity-70">{n.date}</div>
                  <div className="font-medium">{n.title}</div>

                  {n.summary && (
                    <div
                      className="text-sm opacity-80 mt-1"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2 as any,
                        WebkitBoxOrient: 'vertical' as any,
                        overflow: 'hidden',
                      }}
                      title={n.summary}
                    >
                      {n.summary}
                    </div>
                  )}

                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline opacity-80 break-all"
                  >
                    {n.url}
                  </a>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
                    onClick={() => setEditing(n)}
                  >
                    Editar
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-sm"
                    onClick={() => remove(n.id)}
                  >
                    Apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!!msg && <div className="text-sm mt-3 opacity-80">{msg}</div>}
      </div>
    </div>
  );
}
