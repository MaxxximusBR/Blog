import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import crypto from 'node:crypto';
import { put, list } from '@vercel/blob';

// ===== CONFIG =====
const SOURCES = [
  { name: 'GoogleNews-PT', url: 'https://news.google.com/rss/search?q=OVNI+OR+OVNIS+OR+UAP+OR+%22objeto+n%C3%A3o+identificado%22+OR+%22luz+no+ceu%22+OR+%22drone+n%C3%A3o+identificado%22&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
  { name: 'GoogleNews-EN', url: 'https://news.google.com/rss/search?q=UFO+OR+UAP+OR+%22unidentified+drone%22+OR+%22unidentified+object%22+OR+%22mystery+lights%22&hl=en-US&gl=US&ceid=US:en' },
  // adicione feeds especializados com RSS quando quiser
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

const ROOT = 'news/uap'; // namespace dos arquivos no Blob
// ===================

function looksUAP(title: string, snippet: string) {
  const t = `${title} — ${snippet}`.toLowerCase();
  if (!KEYWORDS.some(k => t.includes(k))) return false;
  if (BLACKLIST.some(k => t.includes(k))) return false;
  return true;
}

function idFromUrl(url: string) {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0,24);
}

function todaySlug(d = new Date()) {
  return d.toISOString().slice(0,10); // YYYY-MM-DD
}

const parser = new Parser({ timeout: 10000 });

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const created: string[] = [];

  for (const src of SOURCES) {
    try {
      const feed = await parser.parseURL(src.url);
      for (const item of (feed.items ?? [])) {
        const url = item.link || item.id;
        if (!url) continue;

        const title = (item.title || '').trim();
        const snippet = (item.contentSnippet || item.content || item.summary || '').replace(/\s+/g,' ').trim();

        if (!looksUAP(title, snippet)) continue;

        const id = idFromUrl(url);
        const pub = item.isoDate || item.pubDate || new Date().toISOString();
        const day = todaySlug(pub ? new Date(pub) : new Date());
        const path = `${ROOT}/items/${day}/${id}.json`;

        const payload = {
          id, url,
          source: src.name,
          published_at: pub,
          title,
          summary: snippet,
          // campos compatíveis com sua página/admin:
          title_ai: title,
          summary_ai: snippet,
          image_url: item.enclosure?.url || item.itunes?.image || null,
          author: item.creator || item.author || null,
          topics: ['ufo','uap'],
          approved: true,
          created_at: new Date().toISOString()
        };

        await put(path, JSON.stringify(payload, null, 2), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
        });

        created.push(path);
      }
    } catch (e) {
      console.error('feed fail', src.name, e);
    }
  }

  // Atualiza um índice curto com os mais recentes
  const all = await list({ prefix: `${ROOT}/items/`, limit: 300 });
  const latest = [...all.blobs]
    .sort((a,b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
    .slice(0, 80)
    .map(b => ({ url: b.url }));

  await put(`${ROOT}/index.json`, JSON.stringify({ items: latest }, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  return NextResponse.json({ ok: true, created: created.length, indexed: latest.length });
}
