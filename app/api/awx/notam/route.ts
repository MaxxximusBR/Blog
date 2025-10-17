// app/api/awx/notam/route.ts
import { NextResponse } from 'next/server';

const FIR_BR = ['SBAZ', 'SBBS', 'SBRE', 'SBCW'];
const AWC_BASE = process.env.AWC_BASE?.replace(/\/+$/, '') || 'https://aviationweather.gov';

type Notam = {
  id?: string;
  notam_id?: string;
  notam?: string;
  text?: string;
  icao?: string;
  fir?: string;
  start?: string | number;
  end?: string | number;
  time_start?: string | number;
  time_end?: string | number;
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const errors: string[] = [];

  try {
    const url = new URL(req.url);
    const firParam = (url.searchParams.get('fir') || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    const firs = firParam.length ? firParam : FIR_BR;

    const headers = {
      'User-Agent': 'OVNIs2025/1.0 (+https://github.com/)',
      'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
    };

    const results = await Promise.all(
      firs.map(async (fir) => {
        try {
          // endpoint público do AWC
          const endpoint = `${AWC_BASE}/api/data/notam?format=json&fir=${encodeURIComponent(fir)}`;
          const r = await fetch(endpoint, { cache: 'no-store', headers });
          if (!r.ok) {
            errors.push(`FIR ${fir}: HTTP ${r.status}`);
            return [];
          }
          const j = await r.json();

          const list: Notam[] = Array.isArray(j?.features)
            ? j.features.map((f: any) => f?.properties ?? f).filter(Boolean)
            : Array.isArray(j) ? j
            : Array.isArray(j?.data) ? j.data
            : [];

          return list.map((n) => {
            const raw = (n.notam ?? n.text ?? '').toString();
            const id = (n.notam_id ?? n.id ?? `${fir}-${raw.slice(0, 24)}`).toString();
            const start = toISO(n.start ?? n.effective ?? n.time_start ?? n.validFrom ?? n.valid_from);
            const end   = toISO(n.end   ?? n.time_end   ?? n.validTo   ?? n.valid_to);
            const icao  = (n.icao ?? n.location ?? n.airport ?? '').toString().toUpperCase();

            return { id, fir, icao, text: raw, start, end };
          });
        } catch (e: any) {
          errors.push(`FIR ${fir}: ${e?.message || e}`);
          return [];
        }
      })
    );

    const merged = uniq(results.flat(), (x) => x.id);

    // Sempre 200 — com ou sem erros parciais
    return NextResponse.json({ ok: true, count: merged.length, firs, errors, items: merged });
  } catch (e: any) {
    // Última linha de defesa: ainda return 200 com erro descritivo
    return NextResponse.json({ ok: false, error: e.message || 'internal', errors: [String(e)] , items: [] });
  }
}
