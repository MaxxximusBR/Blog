import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Entry = { slug: string; title: string; summary?: string; file: string; meta?: { global?: number } };
const INDEX_PATH = "indexes/reports.json";

function monthLabel(slug: string) {
  const [y, m] = slug.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Tenta vários padrões de AAAA-MM no pathname
function slugFromPath(pathname: string): string | null {
  // padrão ideal: reports/2025-09-xxxx.pdf
  let m = pathname.match(/reports\/(\d{4})-(\d{2})-/);
  if (m) return `${m[1]}-${m[2]}`;

  // fallback: qualquer 4 dígitos + separador + 1-2 dígitos (e mês válido)
  m = pathname.match(/(\d{4})[^0-9]?(\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mm = Math.max(1, Math.min(12, Number(m[2])));
    const pad = String(mm).padStart(2, "0");
    // exige que seja de reports/ (evita pegar coisas de indexes/)
    if (/^reports\//.test(pathname)) return `${y}-${pad}`;
  }
  return null;
}

export async function POST() {
  try {
    // lê índice atual (para preservar títulos/resumos)
    let current: Entry[] = [];
    try {
      const L = await list({ prefix: "indexes/" });
      const idx = (L.blobs as any[]).find((b) => b.pathname === INDEX_PATH);
      if (idx?.url) {
        const r = await fetch(idx.url, { cache: "no-store" });
        if (r.ok) current = await r.json();
      }
    } catch {}

    const bySlug = new Map(current.map((e) => [e.slug, e]));

    // varre todos os PDFs em reports/
    const files = await list({ prefix: "reports/" });
    const nextIndex: Entry[] = [];

    for (const b of files.blobs as any[]) {
      if (!b.pathname.endsWith(".pdf")) continue;
      const slug = slugFromPath(b.pathname);
      if (!slug) continue;

      const prev = bySlug.get(slug);
      nextIndex.push({
        slug,
        title: prev?.title || `Relatório ${monthLabel(slug)}`,
        summary: prev?.summary,
        file: b.url,
        meta: prev?.meta,
      });
    }

    // elimina duplicados por slug, mantendo o mais recente (ultimo varrido)
    const dedup = new Map<string, Entry>();
    for (const e of nextIndex) dedup.set(e.slug, e);
    const final = Array.from(dedup.values()).sort((a, b) => (a.slug < b.slug ? 1 : -1));

    const saved = await put(INDEX_PATH, JSON.stringify(final, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });

    return NextResponse.json({ ok: true, count: final.length, indexURL: saved.url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, msg: e?.message || "Falha ao reindexar." }, { status: 500 });
  }
}
