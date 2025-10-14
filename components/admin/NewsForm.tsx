'use client';

import { useEffect, useState } from 'react';

type NewsItem = {
  id?: string;
  date: string;
  title: string;
  url: string;
  image?: string;
  summary?: string;
};

export default function NewsForm({ editing }: { editing?: NewsItem | null }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [title, setTitle] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [image, setImage] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    if (editing) {
      setDate(editing.date || new Date().toISOString().slice(0,10));
      setTitle(editing.title || '');
      setUrl(editing.url || '');
      setImage(editing.image || '');
      setSummary(editing.summary || '');
      setMsg(`Editando ${editing.id}`);
    } else {
      setDate(new Date().toISOString().slice(0,10));
      setTitle(''); setUrl(''); setImage(''); setSummary(''); setMsg('');
    }
  }, [editing]);

  function validate(): string | null {
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date.trim())) return 'Data inválida (AAAA-MM-DD).';
    if (!title.trim()) return 'Informe o título.';
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return 'URL inválida (deve começar com http:// ou https://).';
    if (summary.length > 600) return 'Resumo muito longo (máx. 600 caracteres).';
    return null;
  }

  async function onSave() {
    const err = validate();
    if (err) { setMsg(err); return; }

    const payload: NewsItem = {
      id: editing?.id, // se houver, edita
      date: date.trim(),
      title: title.trim(),
      url: url.trim(),
      image: image.trim() || undefined,
      summary: summary.trim() || undefined,
    };

    setBusy(true); setMsg(editing?.id ? 'Atualizando…' : 'Enviando…');
    try {
      const res = await fetch('/api/admin/news/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.msg || `HTTP ${res.status}`);

      setMsg(editing?.id ? 'OK: notícia atualizada.' : 'OK: notícia salva.');
      // avisa a lista
      window.dispatchEvent(new CustomEvent('news:refresh'));
      // se criou nova, limpa; se editou, mantém preenchido
      if (!editing?.id) { setTitle(''); setUrl(''); setImage(''); setSummary(''); }
    } catch (e: any) {
      setMsg('Erro: ' + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Data (AAAA-MM-DD)</label>
          <input value={date} onChange={e=>setDate(e.target.value)} className="w-full border rounded px-3 py-2 bg-black/10" />
        </div>
        <div>
          <label className="block text-sm mb-1">Título</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full border rounded px-3 py-2 bg-black/10" />
        </div>
        <div>
          <label className="block text-sm mb-1">URL</label>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" className="w-full border rounded px-3 py-2 bg-black/10" />
        </div>
        <div>
          <label className="block text-sm mb-1">Imagem (opcional)</label>
          <input value={image} onChange={e=>setImage(e.target.value)} placeholder="/images/… ou https://…" className="w-full border rounded px-3 py-2 bg-black/10" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Resumo (opcional)</label>
          <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 bg-black/10" />
          <div className="text-xs opacity-60 mt-1">{summary.length}/600</div>
        </div>
      </div>

      <button type="button" onClick={onSave} disabled={busy} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
        {busy ? (editing?.id ? 'Atualizando…' : 'Salvando…') : (editing?.id ? 'Atualizar notícia' : 'Adicionar notícia')}
      </button>

      {!!msg && <div className="text-sm mt-2 opacity-80 whitespace-pre-wrap">{msg}</div>}
    </div>
  );
}
