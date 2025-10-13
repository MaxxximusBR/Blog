'use client';

import { useRef, useState } from 'react';
import ReportsList from '@/components/admin/ReportsList';
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
    const slugOk = /^\d{4}-(0[1-9]|1[0-2])$/.test(slug.trim());
    if (!slugOk) { setMsg('Slug inválido. Use o formato AAAA-MM (ex.: 2025-07).'); return; }

    if (!title.trim()) { setMsg('Informe o título.'); return; }

    if (!f) { setMsg('Selecione um arquivo PDF.'); return; }

    // validações de arquivo
    const maxBytes = Math.floor(4.5 * 1024 * 1024); // ~4,5MB
    const nameLower = f.name.toLowerCase();
    const isPdfByName = nameLower.endsWith('.pdf');
    const isPdfByMime = f.type === 'application/pdf';

    if (!(isPdfByMime || isPdfByName)) {
      setMsg('Arquivo inválido: somente PDF é aceito.');
      return;
    }
    if (f.size > maxBytes) {
      setMsg(`Arquivo muito grande (${(f.size/1024/1024).toFixed(2)} MB). Máximo: 4,5 MB.`);
      return;
    }

    // monta payload
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
      const ok = res.ok;

      setMsg((ok ? 'OK: ' : 'Erro: ') + (json.msg || res.status));
      if (ok && json.file) {
        setMsg(m => `${m}\nURL: ${json.file}`);
        // limpa campos após sucesso
        setTitle('');
        setSummary('');
        setGlobal('');
        if (fileRef.current) fileRef.current.value = '';
        // avisa listas para atualizarem (seus componentes podem ignorar; não quebra)
        window.dispatchEvent(new CustomEvent('reports:refresh'));
      }
    } catch (e: any) {
      setMsg('Falha de rede: ' + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      {/* --- Upload de Relatórios --- */}
      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h1 className="text-2xl font-semibold mb-4">Admin — Relatórios</h1>

        <div className="grid md:grid-cols-2 gap-4">
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
              placeholder="Breve resumo do relatório…"
              className="w-full border rounded px-3 py-2 bg-black/10"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Global (opcional, nº de casos)</label>
            <input
              value={global}
              onChange={(e) => setGlobal(e.target.value)}
              inputMode="numeric"
              placeholder="Ex.: 42"
              className="w-full border rounded px-3 py-2 bg-black/10"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Arquivo PDF</label>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" />
            <p className="text-xs opacity-70 mt-1">Somente PDF — tamanho ≤ ~4,5 MB.</p>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={doUpload}
            disabled={busy}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            {busy ? 'Enviando…' : 'Enviar'}
          </button>
        </div>

        <pre className="whitespace-pre-wrap text-sm mt-3">{msg}</pre>

        {/* Lista de relatórios com opção de deletar (dentro do próprio componente) */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Relatórios cadastrados</h2>
          <p className="text-sm opacity-70 mb-3">
            Dica: use o botão de apagar para remover um relatório do índice. Isso também remove o arquivo no Blob.
          </p>
          <ReportsList />
        </div>
      </section>

      {/* --- Notícias --- */}
      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold mb-4">Admin — Notícias</h2>

        {/* Formulário de criação/edição */}
        <NewsForm />

        {/* Lista com remoção/edição */}
        <div className="mt-6">
          <NewsList />
        </div>
      </section>
    </div>
  );
}
