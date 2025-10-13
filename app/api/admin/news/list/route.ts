import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDEX = "indexes/news.json";

export async function GET() {
  try {
    const L = await list({ prefix: "indexes/" });
    const it = (L.blobs as any[]).find(b => b.pathname === INDEX);
    if (!it?.url) return NextResponse.json({ ok: true, items: [] });
    const r = await fetch(it.url, { cache: "no-store" });
    const items = r.ok ? await r.json() : [];
    return NextResponse.json({ ok: true, items });
  } catch (e:any) {
    return NextResponse.json({ ok:false, msg: e?.message || "Falha ao listar" }, { status: 500 });
  }
}
