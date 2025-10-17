// app/api/news/ingest/route.ts
import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import crypto from 'node:crypto';
import { put, list } from '@vercel/blob';
import { cfClassifyUAP, cfSummarizePtBR } from '@/lib/cfai';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------- CONFIG ----------
const SOURCES = [
  {
    name: 'GoogleNews-PT',
    url: 'https://news.google.com/rss/search?q=OVNI+OR+OVNIS+OR+UAP+OR+%22objeto+n%C3%A3o+identificado%22+OR+%22luz+no+ceu%22+OR+%22drone+n%C3%A3o+identificado%22&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  },
  {
    name: 'GoogleNews-EN',
    url: 'https://news.google.com/rss/search?q=UFO+OR+UAP+OR+%22unidentified+drone%22+OR+%22unidentified+object%22+OR+%22mystery+lights%22&hl=en-US&gl=US&ceid=US:en',
  },
];

const KEYWORDS = [
  'ovni','ovnis','uap','uaps','fenômeno aéreo não identificado','objeto não identificado',
  'objeto voador não identificado','luz no céu','luzes no céu','esfera luminosa','disco voador',
  'drone não identificado','drone misterioso','fenômeno luminoso','aparição no céu',
  'ufo','ufos','unidentified aerial phenomenon','unidentified object',
  'unidentified flying object','mystery light','mysterious lights','orbs in the sky',
  'unidentified drone','unknown drone','drone swarm unknown','strange lights'
];

const BLACKLIST = [
  'review de drone','corrida de drones','racing drone','drone militar identificado',
  'drone da polícia','drone comercial','entrega por drone','filmagem com drone'
];

const ROOT = 'news/uap';               // namespace do robô
const PUBLIC_INDEX = 'indexes/news.json'; // índice que a sua página lê
// ----------------------------

const parser = new Parser({ timeout: 10000 });

function looksUAP(title: string, snippet: string) {
  const t = `${title} — ${snippet}`.toLowerCase();
  if (!KEYWORDS.some(k => t.includes(k))) return false;
  if (BLACKLIST.some(k => t.includes(k))) return false;
  return true;
}
function idFromUrl(url: string) {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 24);
}
function daySlug(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || '';
  const mustCheck = process.env.NODE_ENV === 'production' && !!process.env.NEWS_ADMIN_TOKEN;

  // Bloqueia público em produção
  if (mustCheck && secret !== process.env.NEWS_ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let created = 0;
  let usedIA = 0;
  const errors: string[] = [];

  try {
    for (const src of SOURCES) {
      let feed;
      try {
        feed = await parser.parseURL(src.url);
      } catch (e: any) {
        errors.push(`feed ${src.name}: ${e?.message || e}`);
        continue;
      }

      for (const item of (feed.items ?? [])) {
        try {
          const url = item.link || item.id;
          if (!url) continue;

          const title = (item.title || '').trim();
          const snippet = (item.contentSnippet || item.content || item.summary || '')
            .replace(/\s+/g, ' ')
            .trim();

          // filtro gratuito
          if (!looksUAP(title, snippet)) continue;

          const id = idFromUrl(url);
          const pub = item.isoDate || item.pubDate || new Date().toISOString();
          const day = daySlug(pub);
          const path = `${ROOT}/items/${day}/${id}.json`;

          // -------- IA: classificação --------
          let ok = true;
          let why = 'rule-only';
          let score = 1;
          try {
            const cls = await cfClassifyUAP(title, snippet);
            ok = !!cls.ok;
            why = (cls as any).why || why;
            score = typeof (cls as any).score === 'number' ? (cls as any).score : 0.7;
            usedIA++;
          } catch {
            // se falhar IA, segue com ok=true (passa no filtro básico)
          }
          if (!ok) continue;

          // -------- IA: resumo PT-BR --------
          let title_ai = title;
          let summary_ai = snippet;
          let topics: string[] = ['ufo'];
          try {
            const sum = await cfSummarizePtBR(title, snippet);
            title_ai = (sum as any).titulo || title_ai;
            summary_ai = (sum as any).resumo || summary_ai;
            if (Array.isArray((sum as any).topicos) && (sum as any).topicos.length) {
              topics = (sum as any).topicos;
            }
            usedIA++;
          } catch {
            // mantém snippet
          }

          const payload = {
            id,
            url,
            source: src.name,
            published_at: pub,
            title,
            summary: snippet,
            title_ai,
            summary_ai,
            topics,
            relevance_note: why,
            relevance_score: score,
            image_url: item.enclosure?.url || (item as any).itunes?.image || null,
            author: (item as any).creator || (item as any).author || null,
            approved: true,
            created_at: new Date().toISOString(),
          };

          await put(path, JSON.stringify(payload, null, 2), {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
          });
          created++;
        } catch (e: any) {
          errors.push(`item err: ${e?.message || e}`);
        }
      }
    }

    // ---- Monta índices ----
    const all = await list({ prefix: `${ROOT}/items/`, limit: 400 });
    const latest = [...all.blobs]
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
      .slice(0, 120); // base para construir ambos os índices

    // 1) índice do robô (urls)
    await put(
      `${ROOT}/index.json`,
      JSON.stringify({ items: latest.map(b => ({ url: b.url })) }, null, 2),
      { access: 'public', contentType: 'application/json', addRandomSuffix: false },
    );

    // 2) índice público no formato da página (id,date,title,url,image,summary)
    const publicItems: {
      id: string;
      date: string;
      title: string;
      url: string;
      image?: string;
      summary?: string;
    }[] = [];

    // puxa os primeiros 60 e extrai campos para o card
    for (const b of latest.slice(0, 60)) {
      try {
        const r = await fetch(b.url, { cache: 'no-store' });
        if (!r.ok) continue;
        const j = await r.json();

        publicItems.push({
          id: j.id || idFromUrl(j.url || b.url),
          date: (j.published_at || j.created_at || new Date().toISOString()).slice(0, 10),
          title: j.title_ai || j.title || '(sem título)',
          url: j.url || b.url,
          image: j.image_url || undefined,
          summary: j.summary_ai || j.summary || undefined,
        });
      } catch {
        // ignora item ruim
      }
    }

    await put(PUBLIC_INDEX, JSON.stringify(publicItems, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return NextResponse.json({
      ok: true,
      created,
      ia_calls: usedIA,
      indexed: publicItems.length,
      errors,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'unexpected', created, ia_calls: usedIA, errors },
      { status: 200 }, // não derruba com 500, para o cron não “quebrar”
    );
  }
}
