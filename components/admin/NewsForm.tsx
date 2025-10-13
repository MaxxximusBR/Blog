'use client';
import { useState } from 'react';

export default function NewsForm() {
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setMsg('Salvando…');
    if (!date || !title || !url) return setMsg('Preencha data, título e URL.');

    const fd = new FormData();
    fd.append('date', date);
    fd.append('title', title);
    fd.append('url', url);
    if (image.trim()) fd.append('image', image.trim());

    setBusy(true);
    try {
      const r = await fetch('/api/admin/news/save', { method: 'POST', body: fd });
      const j = await r.json().catch(()=> ({}));
      setMsg((r.ok ? 'OK: ' : 'Erro: ') + (j.msg || j.count || r.status));
      if (r.ok) { setTitle(''); setUrl(''); setImage(''); }
      window.dispatchEvent(new CustomEvent('news:changed'));
    } catch (e:any) {
      setMsg('Falha: ' + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm block mb-1">Data (AAAA-MM-DD)</label>
          <input className="w-full px-3 py-2 rounded bg-black/10 border"
                 value={date} onChange={e=>setDate(e.target.value)} placeholder="2025-10-12" />
        </div>
        <div>
          <label className="text-sm block mb-1">Título</label>
          <input className="w-full px-3 py-2 rounded bg-black/10 border"
                 value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título da notícia" />
        </div>
        <div>
          <label className="text-sm block mb-1">URL (link externo)</label>
          <input className="w-full px-3 py-2 rounded bg-black/10 border"
                 value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="text-sm block mb-1">Imagem (opcional)</label>
          <input className="w-full px-3 py-2 rounded bg-black/10 border"
                 value={image} onChange={e=>setImage(e.target.value)} placeholder="/images/..." />
        </div>
      </div>

      <button disabled={busy} onClick={save}
              className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
        {busy ? 'Salvando…' : 'Adicionar notícia'}
      </button>

      <div className="text-sm opacity-80">{msg}</div>
    </div>
  );
}
