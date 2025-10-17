// app/api/awx/notam/route.ts
import { NextResponse } from 'next/server';

const AWC_BASE = (process.env.AWC_BASE || 'https://aviationweather.gov').replace(/\/+$/, '');

// Fallback de principais aeroportos BR (pode ajustar à vontade)
const BR_AIRPORTS_FALLBACK = [
  'SBGR','SBSP','SBKP',        // São Paulo
  'SBRJ','SBGL',               // Rio
  'SBCT','SBPA','SBFL',        // Sul
  'SBBR','SBCF','SBBH',        // Centro/Sudeste
  'SBEG','SBRF','SBSV','SBMO', // Norte/Nordeste
  'SBBE','SBSL','SBFZ','SBNT', // +Nordeste/Norte
];

// FIRs brasileiras (deixamos como “best effort”)
const FIR_BR = ['SBAZ', 'SBBS', 'SBRE', 'SBCW'];

type NotamLike = {
  id?: string;
  notam_id?: string;
  notam?: string;
  text?: string;
  icao?: string;
  location?: string;
  airport?: string;
  fir?: string;
  start?: string | number;
  end?: string | number;
  effective?: string | number;
  validFrom?: string | number;
  valid_from?: string | number;
  validTo?: string | number;
  valid_to?: string | number;
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

function normalizeList(j: any): NotamLike[] {
  if (Array.isArray(j?.features)) {
    return j.features.map((f: any) => f?.properties ?? f).filter(Boolean);
  }
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j)) return j;
  return [];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function tryFetch(url: string, headers: Record<string,string>) {
  const r = await fetch(url, { cache: 'no-store', headers });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return normalizeList(await r.json());
}

async function fetchByLocations(locations: string[], headers: Record<string,string>) {
  // Tenta as duas árvores
  const bases = [`${AWC_BASE}/data/api/notam`, `${AWC_BASE}/api/data/notam`];
  const errors: string[] = [];
  let items: NotamLike[] = [];

  // AWC costuma aceitar ~100–150 ICAOs por chamada. Vamos ser conservadores.
  for (const base of bases) {
    for (const group of chunk(locations, 80)) {
      const endpoint = `${base}?format=json&locations=${encodeURIComponent(group.join(','))}`;
      try {
        const list = await tryFetch(endpoint, headers);
        items = items.concat(list);
      } catch (e: any) {
        errors.push(`LOC ${group[0]}…: ${e?.message || e}`);
      }
    }
    if (items.length) break; // conseguiu por esta base
  }

  return { items, errors };
}

async function fetchByFIRs(firs: string[], headers: Record<string,string>) {
  const bases = [`${AWC_BASE}/data/api/notam`, `${AWC_BASE}/api/data/notam`];
  const params = [
    (b: string, fir: string) => `${b}?format=json&fir=${encodeURIComponent(fir)}`,
    (b: string, fir: string) => `${b}?format=json&firName=${encodeURIComponent(fir)}`,
    (b: string, fir: string) => `${b}?format=json&locations=${encodeURIComponent(fir)}`,
  ];

  const errors: string[] = [];
  let items: NotamLike[] = [];

  for (const fir of firs) {
    let okForThis = false;
    for (const b of bases) {
      for (const build of params) {
        const url = build(b, fir);
        try {
          const list = await tryFetch(url, headers);
          items = items.concat(list.map(x => ({ ...x, fir })));
          okForThis = true;
          break;
        } catch (e: any) {
          // tenta próxima variação
        }
      }
      if (okForThis) break;
    }
    if (!okForThis) errors.push(`FIR ${fir}: HTTP 404`);
  }

  return { items, errors };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const errors: string[] = [];
  try {
    const url = new URL(req.url);

    // Você pode passar ?locations=SBGR,SBSP,SBRJ ou ?fir=SBAZ,SBBS…
    const locParam = (url.searchParams.get('locations') || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    const firParam = (url.searchParams.get('fir') || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    // Se não passar nada, usamos lista de aeroportos (mais estável que FIR)
    const locations = locParam.length ? locParam : BR_AIRPORTS_FALLBACK;
    const firs = firParam.length ? firParam : FIR_BR;

    const headers = {
      'User-Agent': 'OVNIs2025/1.0 (+https://github.com/)',
      'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://aviationweather.gov/',
    };

    // 1) Tenta por LOCATIONS (principal)
    const byLoc = await fetchByLocations(locations, headers);
    errors.push(...byLoc.errors);

    // 2) Em paralelo, tenta FIR (best-effort)
    const byFir = await fetchByFIRs(firs, headers);
    errors.push(...byFir.errors);

    const raw = [...byLoc.items, ...byFir.items];

    const items = uniq(
      raw.map((n: NotamLike) => {
        const rawTxt = (n.notam ?? n.text ?? '').toString();
        const id = (n.notam_id ?? n.id ?? `${(n.fir || '')}-${rawTxt.slice(0, 24)}`).toString();

        const start =
          toISO(n.start ?? n.effective ?? n.time_start ?? n.validFrom ?? (n as any)?.valid_from) || null;
        const end =
          toISO(n.end ?? n.time_end ?? n.validTo ?? (n as any)?.valid_to) || null;

        const icao = (
          n.icao ??
          n.location ??
          n.airport ??
          ''
        ).toString().toUpperCase();

        const fir = (n.fir || '').toString().toUpperCase();

        return { id, fir, icao, text: rawTxt, start, end };
      }),
      x => x.id,
    );

    return NextResponse.json({
      ok: true,
      count: items.length,
      firs,
      locations,
      errors,
      items,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || 'internal',
      errors: [String(e)],
      items: [],
    });
  }
}
