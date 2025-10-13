'use client';

import { useRef, useState } from 'react';
import NewsForm from '@/components/admin/NewsForm';
import NewsList from '@/components/admin/NewsList';

export default function AdminPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [global, setGlobal] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function doUpload() {
    setMsg('Clicou… validando campos...');
    const f = fileRef.current?.files?.[0] || null;
    if (!/^\d{4}-\d{2}$/.test(slug.trim())) { setMsg('Slug inválido (use AAAA-MM).'); return; }
    if (!title.trim()) { setMsg('Informe o título.'); return; }
    if (!f) { setMsg('Selecione um PDF.'); return; }

    const fd = new FormData();
    fd.append('slug', slug.trim());
    fd.append('title', title.trim());
    if (summary.trim()) fd.append('summary', summary.trim());
    if (global.trim())  fd.append('global', global.trim());
    fd.append('file', f);

    setBusy(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      setMsg((res.ok ? 'OK: ' : 'Erro: ') + (json.msg || res.status));
      if (json.file) setMsg(m => m + `\nURL: ${json.file}`);
    } catch (e:any) {
      setMsg('Falha de rede: ' + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Upload de Relatório (Vercel Blob)</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Slug (AAAA-MM)</label>
          <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="2025-10"
                 className="w-full border rounded px-3 py-2 bg-black/10"/>
        </div>
        <div>
          <label className="block text-sm mb-1">Título</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Relatório de Outubro de 2025"
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
          <input ref={fileRef} type="file" accept="application/pdf"/>
          <p className="text-xs opacity-70 mt-1">Para este modo, use PDF ≤ ~4,5 MB.</p>
        </div>

        <button type="button" onClick={doUpload} disabled={busy}
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
          {busy ? 'Enviando…' : 'Enviar'}
        </button>

        <pre className="whitespace-pre-wrap text-sm mt-3">{msg}</pre>
      </div>

      <div className="mt-12 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold mb-4">Notícias</h2>
        <NewsForm />
        <div className="mt-6">
          <NewsList />
        </div>
      </div>
    </div>
  );
}
