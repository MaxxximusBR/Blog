'use client';

import { useRef, useState } from 'react';
import NewsForm from '../../components/admin/NewsForm';
import NewsList from '../../components/admin/NewsList';

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

    const s = slug.trim();
    const t = title.trim();
    const sum = summary.trim();
    const g = global.trim();

    if (!/^\d{4}-\d{2}$/.test(s)) return setMsg('Slug inválido (use AAAA-MM).');
    if (!t) return setMsg('Informe o título.');
    if (!f) return setMsg('Selecione um PDF.');

    const fd = new FormData();
    fd.append('slug', s);
    fd.append('title', t);
    if (sum) fd.append('summary', sum);
    if (g) fd.append('global', g);
    fd.append('file', f);

    setBusy(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      setMsg((res.ok ? 'OK: ' : 'Erro: ') + (json.msg || res.status));
      if (json.file) setMsg((m) => m + `\nURL: ${json.file}`);

      if (res.ok) {
        // limpa campos
        setSlug(''); setTitle(''); setSummary(''); setGlobal('');
        if (fileRef.current) fileRef.current.value = '';
      }
    } catch (e: any) {
      setMsg('Falha de rede: ' + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  // --- Ferramentas ---
  const [toolMsg, setToolMsg] = useState('');
  const [toolBusy, setToolBusy] = useState(false);

  async function reindex() {
    setToolBusy(true);
    setToolMsg('Reindexando… (lendo PDFs no Blob e recriando o índice)');
    try {
      const r = await fetch('/api/admin/reindex', { method: 'POST' });
      const j = await r.json().catch(()=> ({}));
      setToolMsg((r.ok ? 'OK: ' : 'Erro: ') + (j.msg || `itens: ${j.count || 0}`));
    } catch (e:any) {
      setToolMsg('Falha: ' + (e?.message || String(e)));
    } finally {
      setToolBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-10">
      {/* --- Relatórios --- */}
      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h1 className="text-2xl font-semibold mb-4">Upload de Relatório (Vercel Blob)</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Slug (AAAA-MM)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="2025-10"
              className="w-full border rounded px-3 py-2 bg-black/10"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Relatório de Outubro de 2025"
              className="w-full border rounded px-3 py-2 bg-black/10"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Resumo (opcional)</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-black/10"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Global (opcional, nº de casos)</label>
            <input
              value={global}
              onChange={(e) => setGlobal(e.target.value)}
              inputMode="numeric"
              className="w-full border rounded px-3 py-2 bg-black/10"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Arquivo PDF</label>
            <input ref={fileRef} type="file" accept="application/pdf" />
            <p className="text-xs opacity-70 mt-1">Para este modo, use PDF ≤ ~4,5 MB.</p>
          </div>

          <button
            type="button"
            onClick={doUpload}
            disabled={busy}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            {busy ? 'Enviando…' : 'Enviar'}
          </button>

          <pre className="whitespace-pre-wrap text-sm mt-3">{msg}</pre>
        </div>
      </section>

      {/* --- Ferramentas (Reindexar) --- */}
      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold mb-4">Ferramentas</h2>
        <button
          onClick={reindex}
          disabled={toolBusy}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
        >
          {toolBusy ? 'Reindexando…' : 'Reindexar relatórios (reconstruir índice)'}
        </button>
        <div className="text-sm opacity-80 mt-3">{toolMsg}</div>
      </section>

      {/* --- Notícias (CRUD) --- */}
      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold mb-4">Notícias</h2>
        <NewsForm />
        <NewsList />
      </section>
    </div>
  );
}
