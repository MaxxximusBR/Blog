'use client';

import { useState } from 'react';

type NewsPayload = {
  date: string;      // 'YYYY-MM-DD'
  title: string;
  url: string;       // link externo
  image?: string;    // opcional (/images/… ou http…)
  summary?: string;  // opcional (NOVO)
};

export default function NewsForm() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [title, setTitle] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [image, setImage] = useState<string>('');
  const [summary, setSummary] = useState<string>(''); // NOVO
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  function validate(): string | null {
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date.trim())) return 'Data inválida (use AAAA-MM-DD).';
    if (!title.trim()) return 'Informe o título.';
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return 'URL inválida (deve começar com http:// ou https://).';
    if (summary.length > 600) return 'Resumo muito longo (máx. 600 caracteres).';
    return null;
  }

  async function onSave() {
    const err = validate();
    if (err) { setMsg(err); return; }

    const payload: NewsPayload = {
      date: date.trim(),
      title: title.trim(),
      url: url.trim(),
      image: image.trim() || undefined,
      summary: summary.trim() || undefined, // NOVO
    };

    setBusy(true); setMsg('Enviando…');
    try {
      const res = await fetch('/api/admin/news/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.msg || `HTTP ${res.status}`);

      setMsg('OK: notícia salva.');
      // limpa campos
      setTitle(''); setUrl(''); setImage(''); setSummary('');
      // notifica lista (seu NewsList pode escutar esse evento)
      window.dispatchEvent(new CustomEvent('news:refresh'));
    } catch (e: any) {
      setMsg('Erro ao salvar: ' + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Data (AAAA-MM-DD)</label>
          <input
            value={date}
            onChange={e=>setDate(e.target.value)}
            placeholder="2025-10-12"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Título</label>
          <input
            value={title}
            onChange={e=>setTitle(e.target.value)}
            placeholder="Título da notícia"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">URL (link externo)</label>
          <input
            value={url}
            onChange={e=>setUrl(e.target.value)}
            placeholder="https://…"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Imagem (opcional)</label>
          <input
            value={image}
            onChange={e=>setImage(e.target.value)}
            placeholder="/images/…  ou  https://…"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>

        {/* NOVO — Resumo opcional */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Resumo (opcional)</label>
          <textarea
            value={summary}
            onChange={e=>setSummary(e.target.value)}
            placeholder="Breve resumo para aparecer na listagem de notícias… (até ~600 caracteres)"
            rows={3}
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
          <div className="text-xs opacity-60 mt-1">{summary.length}/600</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
      >
        {busy ? 'Salvando…' : 'Adicionar notícia'}
      </button>

      {!!msg && <div className="text-sm mt-2 opacity-80 whitespace-pre-wrap">{msg}</div>}
    </div>
  );
}
