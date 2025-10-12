import { list } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  // localizar o índice
  let items: any[] = [];
  try {
    const L = await list({ prefix: "indexes/" });
    const idx = (L.blobs as any[]).find((b) => b.pathname === "indexes/reports.json");
    if (idx?.url) {
      const r = await fetch(idx.url, { cache: "no-store" });
      if (r.ok) items = await r.json();
    }
  } catch {}

  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
      <title>Anuário OVNIs 2025 – Relatórios</title>
      <link>${base}/relatorios</link>
      <description>Novos relatórios publicados</description>
      <lastBuildDate>${now}</lastBuildDate>
      ${items
        .slice()
        .reverse()
        .map((e) => {
          const pub = new Date(`${e.slug}-01T00:00:00Z`).toUTCString();
          const title = (e.title || `Relatório ${e.slug}`).replace(/&/g, "&amp;");
          const desc = (e.summary || "").replace(/&/g, "&amp;");
          return `<item>
            <title>${title}</title>
            <link>${e.file}</link>
            <guid isPermaLink="false">${e.slug}</guid>
            <pubDate>${pub}</pubDate>
            <description>${desc}</description>
          </item>`;
        })
        .join("\n")}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
