'use client';
import { useState } from 'react';

export default function NewsForm() {
  const [date, setDate]   = useState<string>(new Date().toISOString().slice(0,10));
  const [title, setTitle] = useState('');
  const [url, setUrl]     = useState('');
  const [image, setImage] = useState('');
  const [msg, setMsg]     = useState('');
  const [busy, setBusy]   = useState(false);

  async function add() {
    setMsg('Adicionando…');
    setBusy(true);
    try {
      const r = await fetch('/api/admin/news/save', {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({ date, title, url, image }),
      });
      const json = await r.json();
      if (!r.ok || !json.ok) throw new Error(json?.msg || r.statusText);
      setMsg('OK: notícia adicionada.');
      setTitle(''); setUrl(''); setImage('');
      // dispara evento simples para a lista recarregar
      window.dispatchEvent(new CustomEvent('news:reload'));
    } catch (e:any) {
      setMsg('Erro: ' + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Data (AAAA-MM-DD)</label>
          <input value={date} onChange={e=>setDate(e.target.value)} placeholder="2025-10-12" className="w-full border rounded px-3 py-2 bg-black/10"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Título</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título da notícia" className="w-full border rounded px-3 py-2 bg-black/10"/>
        </div>
        <div>
          <label className="block text-sm mb-1">URL (link externo)</label>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" className="w-full border rounded px-3 py-2 bg-black/10"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Imagem (opcional)</label>
          <input value={image} onChange={e=>setImage(e.target.value)} placeholder="/images/…" className="w-full border rounded px-3 py-2 bg-black/10"/>
        </div>
      </div>

      <button type="button" disabled={busy} onClick={add} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
        {busy ? 'Salvando…' : 'Adicionar notícia'}
      </button>
      <div className="text-sm opacity-75">{msg}</div>
    </div>
  );
}
