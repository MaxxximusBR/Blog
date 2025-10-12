import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Entry = { slug: string; title: string; summary?: string; file: string; meta?: { global?: number } };
const INDEX_PATH = "indexes/reports.json";

function slugFromPath(p: string) {
  // reports/2025-03-xxxx.pdf → 2025-03
  const m = p.match(/reports\/(\d{4}-\d{2})-/);
  return m?.[1] || null;
}

export async function POST() {
  try {
    const existing = await list({ prefix: "indexes/" });
    const idx = existing.blobs.find((b: any) => b.pathname === INDEX_PATH);
    let current: Entry[] = [];
    if (idx?.url) {
      try {
        const r = await fetch(idx.url, { cache: "no-store" });
        if (r.ok) current = await r.json();
      } catch {}
    }
    const bySlug = new Map(current.map((e) => [e.slug, e]));

    const files = await list({ prefix: "reports/" });
    const nextIndex: Entry[] = [];
    for (const b of files.blobs as any[]) {
      if (!b.pathname.endsWith(".pdf")) continue;
      const slug = slugFromPath(b.pathname);
      if (!slug) continue;
      const prev = bySlug.get(slug);
      nextIndex.push({
        slug,
        title: prev?.title || `Relatório ${slug}`,
        summary: prev?.summary,
        file: b.url,
        meta: prev?.meta,
      });
    }
    nextIndex.sort((a, b) => a.slug.localeCompare(b.slug));

    const saved = await put(INDEX_PATH, JSON.stringify(nextIndex, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });

    return NextResponse.json({ ok: true, count: nextIndex.length, indexURL: saved.url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, msg: e?.message || "Falha ao reindexar." }, { status: 500 });
  }
}
