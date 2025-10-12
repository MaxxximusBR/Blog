import { NextResponse } from "next/server";
import { del, list, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDEX_PATH = "indexes/reports.json";

function slugFromFileUrl(u: string) {
  try {
    const m = u.match(/\/reports\/(\d{4}-\d{2})-/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const fileUrl = String(form.get("file") || "");
    const slugIn = String(form.get("slug") || "").trim();
    if (!fileUrl && !slugIn) throw new Error("Envie 'file' (URL completa) ou 'slug'.");

    // apaga blob(s)
    if (fileUrl) {
      await del(fileUrl);
    } else {
      // localizar qualquer arquivo do slug e apagar
      const files = await list({ prefix: "reports/" });
      for (const b of files.blobs as any[]) {
        if (b.pathname.startsWith(`reports/${slugIn}-`) && b.pathname.endsWith(".pdf")) {
          await del(b.url);
        }
      }
    }

    // atualiza índice
    let current: any[] = [];
    const idx = await list({ prefix: "indexes/" });
    const it = idx.blobs.find((b: any) => b.pathname === INDEX_PATH);
    if (it?.url) {
      try {
        const r = await fetch(it.url, { cache: "no-store" });
        if (r.ok) current = await r.json();
      } catch {}
    }

    const slug = slugIn || slugFromFileUrl(fileUrl) || "";
    const next = slug
      ? current.filter((e) => e.slug !== slug)
      : current.filter((e) => e.file !== fileUrl);

    const saved = await put(INDEX_PATH, JSON.stringify(next, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });

    return NextResponse.json({ ok: true, remaining: next.length, indexURL: saved.url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, msg: e?.message || "Falha ao excluir." }, { status: 400 });
  }
}
