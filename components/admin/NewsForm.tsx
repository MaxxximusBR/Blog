'use client';

import { useState } from 'react';

export default function NewsForm() {
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const MAX_SUM = 1600;

  async function onSubmit() {
    setMsg('Validando...');
    const dOk = /^\d{4}-\d{2}-\d{2}$/.test(date.trim());
    if (!dOk) return setMsg('Data inválida. Use AAAA-MM-DD.');
    if (!title.trim()) return setMsg('Informe o título.');
    if (!/^https?:\/\//i.test(url.trim())) return setMsg('URL externa inválida (deve começar com http/https).');
    if (summary && summary.length > MAX_SUM) return setMsg(`Resumo muito longo (máx. ${MAX_SUM} caracteres).`);

    setBusy(true);
    try {
      const res = await fetch('/api/admin/news/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date: date.trim(),
          title: title.trim(),
          url: url.trim(),
          image: image.trim() || undefined,
          summary: summary.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.msg || `Erro ${res.status}`);
        return;
      }

      setMsg('OK: notícia publicada.');
      // limpa campos
      setTitle('');
      setUrl('');
      setImage('');
      setSummary('');
      // avisa a lista para recarregar (se existir listener)
      window.dispatchEvent(new CustomEvent('news:refresh'));
    } catch (e: any) {
      setMsg('Falha de rede: ' + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Data (AAAA-MM-DD)</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="2025-10-14"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">URL da matéria</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com/materia"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da notícia"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Imagem (opcional)</label>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
          <p className="text-xs opacity-70 mt-1">Se não tiver, deixe em branco.</p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Resumo (opcional) — até {MAX_SUM} caracteres</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={MAX_SUM}
            rows={6}
            placeholder="Escreva um resumo da notícia (aparece na listagem)."
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
          <div className="text-right text-xs opacity-70 mt-1">
            {summary.length}/{MAX_SUM}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
      >
        {busy ? 'Publicando…' : 'Publicar notícia'}
      </button>

      {msg && <p className="text-sm mt-2">{msg}</p>}
    </div>
  );
}
