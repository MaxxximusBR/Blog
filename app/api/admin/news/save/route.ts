import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDEX = "indexes/news.json";

type News = { id:string; date:string; title:string; url:string; image?:string };

function makeId(date: string, title: string) {
  const rand = Math.random().toString(36).slice(2,8);
  return `${date}-${rand}`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const id = String(form.get("id") || "");
    const date = String(form.get("date") || "").trim();   // YYYY-MM-DD
    const title = String(form.get("title") || "").trim();
    const url = String(form.get("url") || "").trim();
    const image = String(form.get("image") || "").trim() || undefined;
    if (!date || !title || !url) throw new Error("Campos obrigatórios: date, title, url.");

    // Carrega índice atual
    let items: News[] = [];
    const L = await list({ prefix: "indexes/" });
    const it = (L.blobs as any[]).find(b => b.pathname === INDEX);
    if (it?.url) {
      const r = await fetch(it.url, { cache: "no-store" });
      if (r.ok) items = await r.json();
    }

    if (id) {
      // update
      items = items.map(n => n.id === id ? { ...n, date, title, url, image } : n);
    } else {
      // create
      const newItem: News = { id: makeId(date, title), date, title, url, image };
      items.push(newItem);
    }

    items.sort((a,b)=> a.date < b.date ? 1 : -1);

    const saved = await put(INDEX, JSON.stringify(items, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });

    return NextResponse.json({ ok:true, indexURL: saved.url, count: items.length });
  } catch (e:any) {
    return NextResponse.json({ ok:false, msg: e?.message || "Falha ao salvar" }, { status: 400 });
  }
}
