// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IndexItem = { slug:string; title:string; summary?:string; file:string; meta?:{global?:number} };
const INDEX_PATH = 'indexes/reports.json';

function ensureBlobEnv() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN ausente no projeto Vercel.');
}
async function getIndexURL(): Promise<string|null> {
  const res = await list({ prefix: 'indexes/' });
  // @ts-ignore
  const item = res.blobs.find(b => b.pathname === INDEX_PATH || b.pathname.endsWith('/reports.json'));
  // @ts-ignore
  return item?.url ?? null;
}
function parseSlug(s:unknown){ const v=String(s??'').trim(); if(!/^\d{4}-\d{2}$/.test(v)) throw new Error('Slug inválido (use AAAA-MM).'); return v; }

export async function POST(req: Request) {
  try {
    ensureBlobEnv();
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) return NextResponse.json({ ok:false, msg:'Envie como multipart/form-data (FormData).' }, { status: 400 });

    const form = await req.formData();
    const slug = parseSlug(form.get('slug'));
    const title = String(form.get('title') ?? '').trim();
    const summary = String(form.get('summary') ?? '').trim();
    const g = Number(form.get('global') ?? 0);
    const global = isNaN(g) || g <= 0 ? undefined : g;
    const file = form.get('file') as File | null;

    if (!title || !file) throw new Error('Preencha título e selecione um PDF.');
    if (file.type !== 'application/pdf') throw new Error('Apenas PDF.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > 4.5 * 1024 * 1024) throw new Error('PDF acima de ~4,5 MB nesta rota.');

    const key = `reports/${slug}-${Math.random().toString(36).slice(2,8)}.pdf`;
    const uploaded = await put(key, bytes, { access:'public', addRandomSuffix:false, contentType:'application/pdf' });

    let index: IndexItem[] = [];
    const idxURL = await getIndexURL();
    if (idxURL) { try { const r = await fetch(idxURL, { cache:'no-store' }); if (r.ok) index = await r.json(); } catch {} }

    const entry: IndexItem = { slug, title, summary: summary || undefined, file: uploaded.url, meta: global ? { global } : undefined };
    const i = index.findIndex(x => x.slug === slug);
    if (i >= 0) index[i] = entry; else index.push(entry);
    index.sort((a,b)=>a.slug.localeCompare(b.slug));

    const saved = await put(INDEX_PATH, JSON.stringify(index,null,2), { access:'public', addRandomSuffix:false, contentType:'application/json' });

    return NextResponse.json({ ok:true, msg:'Upload concluído.', file: uploaded.url, indexURL: saved.url });
  } catch (e:any) {
    return NextResponse.json({ ok:false, msg: e?.message || 'Falha no upload.' }, { status: 400 });
  }
}
