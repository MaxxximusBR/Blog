// app/admin/news/promote/page.tsx
import { revalidatePath } from 'next/cache';

async function promoteAction(formData: FormData) {
  'use server';
  const sourceUrl = formData.get('sourceUrl')?.toString() || '';
  const title     = formData.get('title')?.toString() || '';
  const summary   = formData.get('summary')?.toString() || '';
  const image     = formData.get('image')?.toString() || '';
  const url       = formData.get('url')?.toString() || '';
  const date      = formData.get('date')?.toString() || '';

  if (!sourceUrl) {
    return { ok: false, error: 'Informe o sourceUrl' };
  }

  const body: any = { sourceUrl };
  if (title)   body.title = title;
  if (summary) body.summary = summary;
  if (image)   body.image = image;
  if (url)     body.url = url;
  if (date)    body.date = date;

  const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/news/promote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // usa o token do servidor; não vaza para o cliente
      'Authorization': `Bearer ${process.env.NEWS_ADMIN_TOKEN ?? ''}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: json?.error || `HTTP ${r.status}` };

  // opcional: revalidar a página de notícias
  revalidatePath('/news');
  return { ok: true, data: json };
}

export default function AdminPromotePage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Promover notícia (robô → índice oficial)</h1>
      <form action={promoteAction} className="grid gap-3 bg-black/20 border border-white/10 rounded-xl p-4">
        <label className="grid gap-1">
          <span className="text-sm opacity-80">sourceUrl (JSON do robô)</span>
          <input name="sourceUrl" required placeholder="https://.../news/uap/items/YYYY-MM-DD/ID.json" className="input" />
        </label>

        <details>
          <summary className="cursor-pointer text-sm opacity-80">Edições (opcional)</summary>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <input name="title" placeholder="Título (override)" className="input" />
            <input name="image" placeholder="Imagem (URL)" className="input" />
            <input name="url"   placeholder="Link de leitura (URL)" className="input" />
            <input name="date"  placeholder="Data YYYY-MM-DD" className="input" />
          </div>
          <textarea name="summary" placeholder="Resumo (override)" className="input mt-3 min-h-[90px]" />
        </details>

        <button className="btn w-fit">Promover</button>
      </form>

      <p className="hint text-xs">
        Dica: o <code>sourceUrl</code> está em <code>news/uap/index.json</code> no Blob (campo <code>items[].url</code>).
      </p>
    </main>
  );
}
