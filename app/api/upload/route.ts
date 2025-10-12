// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { assertCsrfOK, getIp, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IndexItem = {
  slug: string;            // AAAA-MM
  title: string;
  summary?: string;
  file: string;            // URL pública do PDF no Blob
  meta?: { global?: number };
};

const INDEX_PATH = 'indexes/reports.json';

function ensureBlobEnv() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  if (!token) throw new Error('Config ausente: BLOB_READ_WRITE_TOKEN não definido no Vercel (Project → Storage → Blob → Create).');
}

async function resolveIndexURL(): Promise<string | null> {
  const res = await list({ prefix: 'indexes/' });
  // @ts-ignore
  const item = res.blobs.find(b => b.pathname === INDEX_PATH || b.pathname.endsWith('/reports.json'));
  // @ts-ignore
  return item?.url ?? null;
}

export async function POST(req: Request) {
  try {
    ensureBlobEnv();

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

    if (!/^\d{4}-\d{2}$/.test(slug)) return NextResponse.json({ ok:false, msg:'Slug inválido (use AAAA-MM).' }, { status: 400 });
    if (!title || !file)          return NextResponse.json({ ok:false, msg:'Preencha título e selecione um PDF.' }, { status: 400 });
    if (file.type !== 'application/pdf') return NextResponse.json({ ok:false, msg:'Apenas PDF.' }, { status: 415 });

    // Em Serverless, payloads grandes podem ser bloqueados. Teste com <4MB primeiro.
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > 4.5 * 1024 * 1024) {
      return NextResponse.json({ ok:false, msg:'PDF acima de ~4.5MB. Posso ativar upload direto do navegador (cliente→Blob) para suportar arquivos maiores.' }, { status: 413 });
    }

    // 1) Envia o PDF ao Blob (público)
    const pdfPath = `reports/${slug}-${Math.random().toString(36).slice(2,8)}.pdf`;
    const uploaded = await put(pdfPath, bytes, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/pdf',
    });

    // 2) Lê índice atual (se houver)
    let index: IndexItem[] = [];
    const indexURL = await resolveIndexURL();
    if (indexURL) {
      const r = await fetch(indexURL, { cache: 'no-store' });
      if (r.ok) index = await r.json();
    }

    // 3) Atualiza item do mês
    const entry: IndexItem = { slug, title, summary: summary || undefined, file: uploaded.url, meta: global ? { global } : undefined };
    const i = index.findIndex(x => x.slug === slug);
    if (i >= 0) index[i] = entry; else index.push(entry);
    index.sort((a, b) => a.slug.localeCompare(b.slug));

    // 4) Salva o índice
    const saved = await put(INDEX_PATH, JSON.stringify(index, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    return NextResponse.json({ ok:true, msg:'Upload concluído.', file: uploaded.url, indexURL: saved.url });
  } catch (e: any) {
    return NextResponse.json({ ok:false, msg: e?.message || 'Falha no upload.' }, { status: 500 });
  }
}
