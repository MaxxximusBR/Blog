import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { list, put } from '@vercel/blob';

const INDEX_PATH = 'indexes/news.json'; // índice oficial já usado pela sua página
const MAX_INDEX = 500;                  // tamanho máximo do índice

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 24);
}
function toYmd(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dt.getTime()) ? new Date().toISOString().slice(0,10) : dt.toISOString().slice(0,10);
}

async function readIndex(): Promise<any[]> {
  const L = await list({ prefix: 'indexes/' });
  const it = (L.blobs as any[]).find(b => b.pathname === INDEX_PATH);
  if (!it?.url) return [];
  const r = await fetch(it.url, { cache: 'no-store' });
  if (!r.ok) return [];
  try { return await r.json(); } catch { return []; }
}

async function writeIndex(items: any[]) {
  await put(INDEX_PATH, JSON.stringify(items, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  // --- auth por Bearer token
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token !== process.env.NEWS_ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: PromoteBody;
  try { body = await req.json(); } catch { return NextResponse.json({ ok:false, error:'bad json' }, { status: 400 }); }

  // 1) Obter objeto-fonte
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

  // 2) Mapear para o formato do índice oficial
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

  // 3) Ler índice atual, deduplicar por URL e gravar
  const current = await readIndex();
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
