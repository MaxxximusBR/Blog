import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { list, put } from '@vercel/blob';

const INDEX_PATH = 'indexes/news.json'; // índice oficial que a página /news lê
const ROOT_UAP_ITEMS = 'news/uap/items/'; // onde o robô grava os JSONs individuais
const MAX_INDEX = 500; // limite de itens no índice final

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* --------------------- helpers --------------------- */
function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 24);
}
function toYmd(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dt.getTime()) ? new Date().toISOString().slice(0,10) : dt.toISOString().slice(0,10);
}
function authOk(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const q = new URL(req.url).searchParams.get('key') || '';
  const want = process.env.NEWS_ADMIN_TOKEN || '';
  return want && (token === want || q === want);
}
async function readCurrentIndex(): Promise<any[]> {
  try {
    // tentamos localizar o blob atual do índice
    const L = await list({ prefix: 'indexes/' });
    const it = (L.blobs as any[]).find(b => b.pathname === INDEX_PATH);
    if (!it?.url) return [];
    const r = await fetch(it.url, { cache: 'no-store' });
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}
async function writeIndex(items: any[]) {
  await put(INDEX_PATH, JSON.stringify(items, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

/* --------------------- GET --------------------- */
/**
 * GET /api/news/promote
 * Reconstrói o índice oficial (indexes/news.json) a partir dos JSONs em news/uap/items/**.
 * Protegido por token: Authorization: Bearer <NEWS_ADMIN_TOKEN> (ou ?key=TOKEN)
 */
export async function GET(req: Request) {
  if (!authOk(req)) {
    return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  }

  // 1) lista todos os itens uap
  const all = await list({ prefix: ROOT_UAP_ITEMS, limit: 800 });
  // mais recentes primeiro
  const blobs = [...all.blobs].sort((a, b) =>
    +new Date(b.uploadedAt) - +new Date(a.uploadedAt)
  );

  const items: any[] = [];
  for (const b of blobs.slice(0, MAX_INDEX)) {
    try {
      const r = await fetch(b.url, { cache: 'no-store' });
      if (!r.ok) continue;
      const src: any = await r.json();

      // preferir campos da IA quando existirem
      const title   = src.title_ai ?? src.title ?? 'Sem título';
      const summary = src.summary_ai ?? src.summary ?? '';
      const link    = src.url ?? '';
      const date    = toYmd(src.published_at ?? src.created_at ?? new Date());
      const image   = src.image_url ?? undefined;

      if (!link) continue;

      // id estável
      const id = (typeof src.id === 'string' && src.id) ? src.id : sha1(`${link}-${date}`);

      items.push({ id, date, title, url: link, image, summary });
    } catch {
      // ignora item inválido
    }
  }

  // 2) ordena e corta
  const merged = items.sort((a: any, b: any) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return a.id < b.id ? 1 : -1;
  }).slice(0, MAX_INDEX);

  // 3) grava o índice
  await writeIndex(merged);

  return NextResponse.json({ ok:true, indexed: merged.length });
}

/* --------------------- POST (manual, 1 item) --------------------- */
/**
 * POST /api/news/promote
 * Promove um item único para o índice oficial.
 * Requer Authorization: Bearer <NEWS_ADMIN_TOKEN>.
 */
type PromoteBody = {
  sourceUrl?: string;     // URL pública do JSON do robô
  sourceObject?: any;     // alternativa: objeto direto

  // Overrides opcionais
  title?: string;
  summary?: string;
  image?: string;
  url?: string;
  date?: string;          // YYYY-MM-DD ou ISO
};

export async function POST(req: Request) {
  // auth por Bearer token
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token !== process.env.NEWS_ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: PromoteBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok:false, error:'bad json' }, { status: 400 }); }

  // 1) obter objeto-fonte
  let src: any = null;
  try {
    if (body.sourceObject) {
      src = body.sourceObject;
    } else if (body.sourceUrl) {
      const r = await fetch(body.sourceUrl, { cache: 'no-store' });
      if (!r.ok) throw new Error(`fetch ${r.status}`);
      src = await r.json();
    } else {
      return NextResponse.json({ ok:false, error:'source missing' }, { status: 400 });
    }
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:`source error: ${e.message || e}` }, { status: 400 });
  }

  // 2) mapear para o formato do índice oficial
  const title = body.title ?? src.title_ai ?? src.title ?? 'Sem título';
  const summary = body.summary ?? src.summary_ai ?? src.summary ?? '';
  const link = body.url ?? src.url ?? '';
  const image = body.image ?? src.image_url ?? undefined;
  const date = toYmd(body.date ?? src.published_at ?? src.created_at ?? new Date());

  if (!link) {
    return NextResponse.json({ ok:false, error:'missing link/url' }, { status: 400 });
  }
  const id = (src.id && typeof src.id === 'string') ? src.id : sha1(`${link}-${date}`);

  const promoted = { id, date, title, url: link, image, summary };

  // 3) ler índice atual, deduplicar por URL e gravar
  const current = await readCurrentIndex();
  const dedup = new Map<string, any>();
  for (const it of current) {
    if (it?.url) dedup.set(it.url, it);
  }
  dedup.set(promoted.url, promoted);

  const merged = Array.from(dedup.values()).sort((a:any, b:any) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return a.id < b.id ? 1 : -1;
  }).slice(0, MAX_INDEX);

  await writeIndex(merged);

  return NextResponse.json({ ok: true, added: promoted, total: merged.length });
}
