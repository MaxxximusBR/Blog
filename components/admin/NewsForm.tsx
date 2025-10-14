'use client';

import { useEffect, useState } from 'react';

type NewsItem = {
  id: string;
  date: string;   // YYYY-MM-DD
  title: string;
  url: string;    // http(s)://
  image?: string;
  summary?: string; // até 1600
};

type Props = {
  editing?: NewsItem | null;              // item a editar (opcional)
  onSaved?: () => void;                    // callback após salvar
  onCancel?: () => void;                   // callback ao cancelar edição
};

export default function NewsForm({ editing = null, onSaved, onCancel }: Props) {
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // carrega dados quando entrar em modo edição
  useEffect(() => {
    if (editing) {
      setDate(editing.date || '');
      setTitle(editing.title || '');
      setUrl(editing.url || '');
      setImage(editing.image || '');
      setSummary(editing.summary || '');
      setMsg('Editando notícia existente.');
    } else {
      clearForm();
    }
  }, [editing]);

  function clearForm() {
    setDate('');
    setTitle('');
    setUrl('');
    setImage('');
    setSummary('');
    setMsg('');
  }

  async function handleSubmit() {
    setMsg('Validando…');

    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date.trim())) {
      setMsg('Data inválida. Use AAAA-MM-DD.');
      return;
    }
    if (!title.trim()) {
      setMsg('Informe o título.');
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      setMsg('URL inválida. Deve começar com http:// ou https://');
      return;
    }
    if (summary && summary.length > 1600) {
      setMsg(`Resumo muito longo (${summary.length}). Máximo permitido: 1600 caracteres.`);
      return;
    }

    setBusy(true);
    try {
      const payload: any = {
        date: date.trim(),
        title: title.trim(),
        url: url.trim(),
        image: image.trim() || undefined,
        summary: summary.trim() || undefined,
      };
      // se estiver editando, envia o id para atualizar
      if (editing?.id) payload.id = editing.id;

      const r = await fetch('/api/admin/news/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({} as any));
      if (!r.ok || !json?.ok) {
        throw new Error(json?.msg || `HTTP ${r.status}`);
      }

      setMsg('OK: Notícia salva com sucesso.');
      // dispara evento para listas recarregarem
      window.dispatchEvent(new CustomEvent('news:refresh'));
      // se tiver callback de sucesso, chama
      onSaved?.();
      // limpa o form se for criação; se for edição, mantém preenchido
      if (!editing) clearForm();
    } catch (e: any) {
      setMsg('Erro ao salvar: ' + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
      <h3 className="font-semibold">{editing ? 'Editar notícia' : 'Nova notícia'}</h3>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Data (AAAA-MM-DD)</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="2025-10-13"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da notícia"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">URL da notícia</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com/materia"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Imagem (opcional)</label>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm mb-1">Resumo (opcional, até 1600)</label>
            <span className="text-xs opacity-60">{summary.length}/1600</span>
          </div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value.slice(0, 1600))}
            placeholder="Escreva um resumo curto da notícia…"
            rows={5}
            className="w-full border rounded px-3 py-2 bg-black/10"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          onClick={handleSubmit}
          disabled={busy}
        >
          {busy ? 'Salvando…' : (editing ? 'Salvar alterações' : 'Publicar notícia')}
        </button>

        {editing && (
          <button
            type="button"
            className="px-4 py-2 rounded bg-white/5 hover:bg-white/10"
            onClick={() => {
              clearForm();
              onCancel?.();
            }}
            disabled={busy}
          >
            Cancelar edição
          </button>
        )}
      </div>

      {!!msg && <div className="text-sm opacity-80">{msg}</div>}
    </div>
  );
}
