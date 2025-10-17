// app/api/awx/notam/route.ts
import { NextResponse } from 'next/server';

function toISO(x: any): string | null {
  if (!x) return null;
  if (typeof x === 'number') {
    const ms = x < 1e12 ? x * 1000 : x;
    return new Date(ms).toISOString();
  }
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Esta rota consulta a API do AviationWeather.gov para NOTAMs.
 * Obs: os formatos variam (JSON/GeoJSON). Mantive parsing tolerante.
 * Ajuste a URL se preferir outro provedor.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hours = Number(searchParams.get('hours') ?? '48'); // último(s) X horas
  // BR = NOTAMs do Brasil
  // AWC: https://aviationweather.gov/data/api/#notam (varia com deployments)
  const urlCandidates = [
    // formato JSON (novo)
    `https://aviationweather.gov/api/data/notam?format=application/json&search=country:BR&hours=${hours}`,
    // formato GeoJSON (fallback)
    `https://aviationweather.gov/api/data/notam?format=geojson&search=country:BR&hours=${hours}`,
  ];

  let payload: any = null;
  let lastErr: any = null;

  for (const u of urlCandidates) {
    try {
      const r = await fetch(u, { headers: { 'Accept': 'application/json' } , cache: 'no-store' });
      if (!r.ok) { lastErr = `AWC ${r.status}`; continue; }
      payload = await r.json();
      break;
    } catch (e: any) {
      lastErr = e?.message || e;
    }
  }

  if (!payload) {
    return NextResponse.json({ ok: false, error: `failed: ${lastErr}` }, { status: 500 });
  }

  // normalizar array de NOTAMs
  const rows: any[] =
    Array.isArray(payload) ? payload :
    Array.isArray(payload?.notams) ? payload.notams :
    Array.isArray(payload?.features) ? payload.features.map((f: any) => f?.properties ?? f).filter(Boolean) :
    [];

  const now = Date.now();

  const normalized = rows.map((n: any) => {
    // campos comuns no AWC:
    // id, icaoId / location / station, fir, type, text, startTime / b, endTime / c
    const id = n?.id ?? n?.notam_id ?? n?.nid ?? crypto.randomUUID();

    const icao = (n?.icaoId ?? n?.icao ?? n?.location ?? n?.station ?? '').toString().toUpperCase();
    const fir  = (n?.fir ?? n?.firId ?? n?.firname ?? '').toString().toUpperCase();
    const raw  = (n?.raw_text ?? n?.text ?? n?.message ?? '').toString();

    // datas (B e C) — começo e fim de validade
    const bISO = toISO(n?.startTime ?? n?.b ?? n?.valid_time_from ?? n?.validFrom);
    const cISO = toISO(n?.endTime   ?? n?.c ?? n?.valid_time_to   ?? n?.validTo);

    // assunto/categoria (se existir)
    const type = (n?.type ?? n?.code ?? n?.subject ?? '').toString().toUpperCase();

    // “aeródromo aplicável” (linha A do NOTAM) — quando disponível
    const aerodrome = (n?.location ?? n?.aerodrome ?? n?.a ?? icao).toString().toUpperCase();

    // ativo agora?
    const bT = bISO ? new Date(bISO).getTime() : -Infinity;
    const cT = cISO ? new Date(cISO).getTime() : +Infinity;
    const active = now >= bT && now <= cT;

    return { id, icao, aerodrome, fir, type, text: raw, valid_from: bISO, valid_to: cISO, active };
  });

  // só ativos
  const active = normalized.filter(n => n.active);

  // ordenar: por FIR > aeródromo > início desc
  active.sort((a, b) => {
    const f = (a.fir || '').localeCompare(b.fir || '');
    if (f !== 0) return f;
    const g = (a.aerodrome || '').localeCompare(b.aerodrome || '');
    if (g !== 0) return g;
    const ta = a.valid_from ? +new Date(a.valid_from) : 0;
    const tb = b.valid_from ? +new Date(b.valid_from) : 0;
    return tb - ta;
  });

  return NextResponse.json({ ok: true, count: active.length, items: active }, { headers: { 'Cache-Control': 'no-store' } });
}
