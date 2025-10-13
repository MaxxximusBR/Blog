import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDEX = "indexes/news.json";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const id = String(form.get("id") || "").trim();
    if (!id) throw new Error("Envie 'id'.");

    let items: any[] = [];
    const L = await list({ prefix: "indexes/" });
    const it = (L.blobs as any[]).find(b => b.pathname === INDEX);
    if (it?.url) {
      const r = await fetch(it.url, { cache: "no-store" });
      if (r.ok) items = await r.json();
    }

    const next = items.filter((n:any)=> n.id !== id);

    const saved = await put(INDEX, JSON.stringify(next, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });

    return NextResponse.json({ ok:true, indexURL: saved.url, count: next.length });
  } catch (e:any) {
    return NextResponse.json({ ok:false, msg: e?.message || "Falha ao excluir" }, { status: 400 });
  }
}
