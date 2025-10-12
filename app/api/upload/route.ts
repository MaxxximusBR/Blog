import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IndexItem = {
  slug: string;            // AAAA-MM
  title: string;
  summary?: string;
  file: string;            // URL pública no Blob
  meta?: { global?: number };
};

const INDEX_PATH = 'indexes/reports.json';

function ensureBlobEnv() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN ausente no projeto Vercel (Storage → Blob → Create).');
  }
}

async function getIndexURL(): Promise<string | null> {
  const res = await list({ prefix: 'indexes/' });
  // @ts-ignore
  const item = res.blobs.find(b => b.pathname === INDEX_PATH || b.pathname.endsWith('/reports.json'));
  // @ts-ignore
  return item?.url ?? null;
}

function parseSlug(s: unknown) {
  const v = String(s ?? '').trim();
  if (!/^\d{4}-\d{2}$/.test(v)) throw new Error('Slug inválido (use AAAA-MM).');
  return v;
}

export async function POST(req: Request) {
  try {
    ensureBlobEnv();

    const contentType = req.headers.get('content-type') || '';
    let slug = '';
    let title = '';
    let summary = '';
    let global: number | undefined;
    let bytes: Uint8Array | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      slug = parseSlug(form.get('slug'));
      title = String(form.get('title') ?? '').trim();
      summary = String(form.get('summary') ?? '').trim();
      const g = Number(form.get('global') ?? 0);
      global = isNaN(g) || g <= 0 ? undefined : g;

      const file = form.get('file') as File | null;
      if (!title || !file) throw new Error('Preencha título e selecione um PDF.');
      if (file.type !== 'application/pdf') throw new Error('Apenas PDF.');
      const ab = await file.arrayBuffer();
      bytes = new Uint8Array(ab);
    } else {
      // JSON: { slug, title, summary?, global?, fileBase64: "data:application/pdf;base64,..." }
      const body = await req.json().catch(() => ({} as any));
      slug = parseSlug(body.slug);
      title = String(body.title ?? '').trim();
      summary = String(body.summary ?? '').trim();
      const g = Number(body.global ?? 0);
      global = isNaN(g) || g <= 0 ? undefined : g;
      const fileBase64 = String(body.fileBase64 ?? '');
      if (!title || !fileBase64) throw new Error('JSON inválido: informe title e fileBase64.');
      const comma = fileBase64.indexOf(',');
      const b64 = comma >= 0 ? fileBase64.slice(comma + 1) : fileBase64;
      const bin = Buffer.from(b64, 'base64');
      bytes = new Uint8Array(bin);
    }

    if (!bytes || bytes.byteLength === 0) throw new Error('Arquivo vazio.');
    if (bytes.byteLength > 4.5 * 1024 * 1024) {
      throw new Error('PDF acima de ~4.5MB nesta rota. Posso habilitar upload direto do navegador→Blob para arquivos maiores.');
    }

    // 1) Sobe PDF
    const key = `reports/${slug}-${Math.random().toString(36).slice(2, 8)}.pdf`;
    const uploaded = await put(key, bytes, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/pdf'
    });

    // 2) Lê índice atual (se existir)
    let index: IndexItem[] = [];
    const indexURL = await getIndexURL();
    if (indexURL) {
      try {
        const r = await fetch(indexURL, { cache: 'no-store' });
        if (r.ok) index = await r.json();
      } catch {}
    }

    // 3) Atualiza/adiciona item
    const entry: IndexItem = { slug, title, summary: summary || undefined, file: uploaded.url, meta: global ? { global } : undefined };
    const i = index.findIndex(x => x.slug === slug);
    if (i >= 0) index[i] = entry; else index.push(entry);
    index.sort((a, b) => a.slug.localeCompare(b.slug));

    // 4) Grava índice
    const saved = await put(INDEX_PATH, JSON.stringify(index, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });

    return NextResponse.json({ ok: true, msg: 'Upload concluído.', file: uploaded.url, indexURL: saved.url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, msg: e?.message || 'Falha no upload.' }, { status: 400 });
  }
}
