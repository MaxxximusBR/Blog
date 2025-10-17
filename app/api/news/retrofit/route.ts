// app/api/news/retrofit/route.ts
import { NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';
import { summarizePT } from '@/lib/cfai';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROOT = 'news/uap/items/';
const MAX_FILES = 60; // qtde de arquivos recentes a revisar

export async function GET() {
  const touched: string[] = [];
  let ia_calls = 0;

  try {
    // pega os blobs (arquivos) mais recentes do robô
    const L = await list({ prefix: ROOT, limit: 500 });
    const files = [...L.blobs]
      .filter(b => b.pathname.endsWith('.json'))
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
      .slice(0, MAX_FILES);

    for (const f of files) {
      const res = await fetch(f.url, { cache: 'no-store' });
      if (!res.ok) continue;

      const item = await res.json();

      // já tem IA? pula
      if (item?.title_ai && item?.summary_ai) continue;

      const title   = (item?.title ?? '').toString();
      const summary = (item?.summary ?? item?.description ?? '').toString();
      const content = (item?.content ?? '').toString();
      const base = (content || summary || title).slice(0, 8000);
      if (!base) continue;

      try {
        const s = await summarizePT(base, 90);
        if (s.ok) {
          ia_calls++;
          if (!item.title_ai)   item.title_ai   = s.title   || title;
          if (!item.summary_ai) item.summary_ai = s.summary || summary;

          await put(f.pathname, JSON.stringify(item, null, 2), {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
          });

          touched.push(f.pathname);
        }
      } catch {
        // se a IA falhar neste item, segue o fluxo
      }
    }

    return NextResponse.json({ ok: true, retrofitted: touched.length, ia_calls });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'fail' },
      { status: 500 }
    );
  }
}
