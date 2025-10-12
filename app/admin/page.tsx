'use client';

import { useState } from 'react';

export default function Admin() {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [global, setGlobal] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!file) { setMsg('Selecione um PDF.'); return; }

    const fd = new FormData();
    fd.append('slug', slug.trim());            // AAAA-MM
    fd.append('title', title.trim());
    if (summary.trim()) fd.append('summary', summary.trim());
    if (global.trim())  fd.append('global', global.trim());
    fd.append('file', file);

    setBusy(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setMsg(`OK: ${json.msg || 'enviado'}`);
      else setMsg(`Erro: ${json.msg || res.status}`);
    } catch (err: any) {
      setMsg(`Falha de rede: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Upload de Relatório (Blob)</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Slug (AAAA-MM)</label>
          <input value={slug} onChange={e=>setSlug(e.target.value)} required placeholder="2025-10"
            className="w-full border rounded px-3 py-2 bg-black/10"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Título</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="Relatório de Outubro de 2025"
            className="w-full border rounded px-3 py-2 bg-black/10"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Resumo (opcional)</label>
          <input value={summary} onChange={e=>setSummary(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-black/10"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Global (opcional, nº de casos)</label>
          <input value={global} onChange={e=>setGlobal(e.target.value)} inputMode="numeric"
            className="w-full border rounded px-3 py-2 bg-black/10"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Arquivo PDF</label>
          <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} required />
          <p className="text-xs opacity-70 mt-1">Envie um PDF ≤ 4,5 MB para este modo. (Se precisar maior, eu habilito upload direto do navegador → Blob.)</p>
        </div>
        <button disabled={busy} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
          {busy ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}
