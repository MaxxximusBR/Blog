// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { assertCsrfOK, getIp, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IndexItem = {
  slug: string;            // AAAA-MM
  title: string;           // Título amigável
  summary?: string;        // opcional
  file: string;            // URL pública do PDF no Blob
  meta?: { global?: number };
};

const INDEX_PATH = 'indexes/reports.json';

async function readIndexURL(): Promise<string | null> {
  // tenta localizar o arquivo de índice e recuperar sua URL pública
  const res = await list({ prefix: 'indexes/' });
  const item = res.blobs.find(b => b.pathname === INDEX_PATH || b.pathname.endsWith('/reports.json'));
  // Em blobs públicos, normalmente a API já traz a URL
  // Caso não venha, manteremos null e criaremos abaixo
  // @ts-ignore
  return (item && (item.url as string | undefined)) || null;
}

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!rateLimit('upload', ip, 8, 60_000)) {
    return NextResponse.json({ ok:false, msg:'Muitas requisições, tente em instantes.' }, { status: 429 });
  }
  if (!(await assertCsrfOK(req))) {
    return NextResponse.json({ ok:false, msg:'CSRF inválido.' }, { status: 403 });
  }

  const form = await req.formData();
  const slug = String(form.get('slug') ?? '').trim();           // AAAA-MM
  const title = String(form.get('title') ?? '').trim();
  const summary = String(form.get('summary') ?? '').trim();
  const global = Number(form.get('global') ?? 0) || undefined;
  const file = form.get('file') as File | null;

  if (!/^\d{4}-\d{2}$/.test(slug)) {
    return NextResponse.json({ ok:false, msg:'Slug inválido (use AAAA-MM).' }, { status: 400 });
  }
  if (!title || !file) {
    return NextResponse.json({ ok:false, msg:'Preencha título e selecione um PDF.' }, { status: 400 });
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ ok:false, msg:'Apenas PDF.' }, { status: 415 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ ok:false, msg:'PDF acima de 25MB. (Posso habilitar upload direto do navegador para arquivos maiores.)' }, { status: 413 });
  }

  // 1) Sobe o PDF para o Blob (público)
  const uploaded = await put(`reports/${slug}-${Math.random().toString(36).slice(2,8)}.pdf`, file, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/pdf',
  });

  // 2) Lê o índice atual (se existir)
  let index: IndexItem[] = [];
  let indexURL = await readIndexURL();
  if (indexURL) {
    try {
      const r = await fetch(indexURL, { cache: 'no-store' });
      if (r.ok) index = (await r.json()) as IndexItem[];
    } catch {}
  }

  // 3) Atualiza/adiciona o item
  const entry: IndexItem = { slug, title, file: uploaded.url, summary: summary || undefined, meta: global ? { global } : undefined };
  const i = index.findIndex(x => x.slug === slug);
  if (i >= 0) index[i] = entry; else index.push(entry);
  index.sort((a, b) => a.slug.localeCompare(b.slug));

  // 4) Grava o índice de volta (público e nome fixo, sem sufixo aleatório)
  await put(INDEX_PATH, JSON.stringify(index, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });

  return NextResponse.json({ ok:true, msg:'Upload concluído.' });
}
