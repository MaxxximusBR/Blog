// app/api/awx/notam/route.ts
import { NextResponse } from 'next/server';

const FIR_BR = ['SBAZ', 'SBBS', 'SBRE', 'SBCW'];
const AWC_BASE =
  process.env.AWC_BASE?.replace(/\/+$/, '') || 'https://aviationweather.gov';

type NotamLike = {
  id?: string;
  notam_id?: string;
  notam?: string;
  text?: string;
  icao?: string;
  fir?: string;

  // tempos — variam conforme o backend
  start?: string | number;
  end?: string | number;
  effective?: string | number;
  validFrom?: string | number;
  valid_from?: string | number;
  validTo?: string | number;
  valid_to?: string | number;
  time_start?: string | number;
  time_end?: string | number;

  // localização
  location?: string;
  airport?: string;

  [k: string]: any;
};

function uniq<T>(arr: T[], by: (x: T) => string) {
  const m = new Map<string, T>();
  for (const it of arr) m.set(by(it), it);
  return [...m.values()];
}

function toISO(x: any): string | null {
  if (!x && x !== 0) return null;
  if (typeof x === 'number') {
    const ms = x < 1e12 ? x * 1000 : x;
    return new Date(ms).toISOString();
  }
  if (typeof x === 'string' && /^\d+$/.test(x)) {
    const n = parseInt(x, 10);
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms).toISOString();
  }
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeList(j: any): NotamLike[] {
  if (Array.isArray(j?.features)) {
    return j.features.map((f: any) => f?.properties ?? f).filter(Boolean);
  }
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j)) return j;
  return [];
}

async function fetchNotamForFir(
  fir: string,
  headers: Record<string, string>,
) {
  // Ordem de maior chance de sucesso nos espelhos do AWC
  const candidates = [
    `${AWC_BASE}/data/api/notam?format=json&fir=${encodeURIComponent(fir)}`,
    `${AWC_BASE}/data/api/notam?format=json&firName=${encodeURIComponent(fir)}`,
    `${AWC_BASE}/data/api/notam?format=json&locations=${encodeURIComponent(fir)}`,
  ];

  let lastErr: string | null = null;

  for (const url of candidates) {
    try {
      const r = await fetch(url, { cache: 'no-store', headers });
      if (!r.ok) {
        lastErr = `HTTP ${r.status}`;
        continue; // tenta o próximo candidato
      }
      const j = await r.json();
      const list = normalizeList(j);
      return { ok: true as const, list };
    } catch (e: any) {
      lastErr = e?.message || String(e);
      continue;
    }
  }

  return { ok: false as const, error: lastErr || 'sem dados para esta FIR' };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const errors: string[] = [];

  try {
    const url = new URL(req.url);
    const firParam = (url.searchParams.get('fir') || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const firs = firParam.length ? firParam : FIR_BR;

    const headers = {
      'User-Agent': 'OVNIs2025/1.0 (+https://github.com/)',
      Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
    };

    const results = await Promise.all(
      firs.map(async (fir) => {
        const { ok, list, error } = await fetchNotamForFir(fir, headers);
        if (!ok) {
          errors.push(`FIR ${fir}: ${error}`);
          return [];
        }

        return list.map((n: NotamLike) => {
          const raw = (n.notam ?? n.text ?? '').toString();
          const id = (n.notam_id ?? n.id ?? `${fir}-${raw.slice(0, 24)}`).toString();

          const start =
            toISO(
              n.start ??
                n.effective ??
                n.time_start ??
                n.validFrom ??
                (n as any)?.valid_from,
            ) || null;
          const end =
            toISO(
              n.end ??
                n.time_end ??
                n.validTo ??
                (n as any)?.valid_to,
            ) || null;

          const icao = (
            n.icao ??
            n.location ??
            n.airport ??
            ''
          )
            .toString()
            .toUpperCase();

          return { id, fir, icao, text: raw, start, end };
        });
      }),
    );

    const merged = uniq(results.flat(), (x) => x.id);

    // Sempre 200 — com ou sem erros parciais
    return NextResponse.json({
      ok: true,
      count: merged.length,
      firs,
      errors,
      items: merged,
    });
  } catch (e: any) {
    // Última linha de defesa: ainda retornamos 200 com erro descritivo
    return NextResponse.json({
      ok: false,
      error: e?.message || 'internal',
      errors: [String(e)],
      items: [],
    });
  }
}
