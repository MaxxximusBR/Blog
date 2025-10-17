// app/api/awx/notam/route.ts
import { NextResponse } from 'next/server';

const AWC_BASE = (process.env.AWC_BASE || 'https://aviationweather.gov').replace(/\/+$/, '');

// Aeroportos BR de fallback (pode ajustar)
const BR_AIRPORTS_FALLBACK = [
  'SBGR','SBSP','SBKP',
  'SBRJ','SBGL',
  'SBCT','SBPA','SBFL',
  'SBBR','SBCF','SBBH',
  'SBEG','SBRF','SBSV','SBMO',
  'SBBE','SBSL','SBFZ','SBNT',
];

// FIRs BR (best-effort)
const FIR_BR = ['SBAZ','SBBS','SBRE','SBCW'];

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

async function fetchVariant(url: string, headers: Record<string,string>) {
  const res = await fetch(url, { cache: 'no-store', headers });
  const ok = res.ok;
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok, status: res.status, data };
}

async function tryMany(
  buildUrls: () => string[],
  headers: Record<string,string>,
  debugTrials?: any[],
) {
  for (const u of buildUrls()) {
    const r = await fetchVariant(u, headers);
    debugTrials?.push({ url: u, status: r.status });
    if (r.ok) {
      const list = normalizeList(r.data);
      if (Array.isArray(list)) return list;
    }
  }
  return [];
}

async function fetchByLocations(locations: string[], headers: Record<string,string>, debugTrials?: any[]) {
  // Dois caminhos base
  const bases = [`${AWC_BASE}/data/api/notam`, `${AWC_BASE}/api/data/notam`];

  // Variações com “mais chance”:
  // - format=geojson e json
  // - notamType=icao
  // - hours=120 (janela maior ajuda muito a evitar 404)
  const buildForGroup = (base: string, group: string[]) => {
    const joined = encodeURIComponent(group.join(','));
    return [
      `${base}?format=geojson&notamType=icao&locations=${joined}&hours=120`,
      `${base}?format=json&notamType=icao&locations=${joined}&hours=120`,
      `${base}?format=geojson&locations=${joined}&hours=120`,
      `${base}?format=json&locations=${joined}&hours=120`,
    ];
  };

  let items: NotamLike[] = [];

  for (const base of bases) {
    for (const group of chunk(locations, 60)) {
      const list = await tryMany(() => buildForGroup(base, group), headers, debugTrials);
      items = items.concat(list);
    }
    if (items.length) break; // já deu certo por este base
  }

  return items;
}

async function fetchByFIRs(firs: string[], headers: Record<string,string>, debugTrials?: any[]) {
  const bases = [`${AWC_BASE}/data/api/notam`, `${AWC_BASE}/api/data/notam`];

  const buildForFIR = (base: string, fir: string) => {
    const f = encodeURIComponent(fir);
    return [
      `${base}?format=geojson&fir=${f}&hours=120`,
      `${base}?format=json&fir=${f}&hours=120`,
      `${base}?format=geojson&firName=${f}&hours=120`,
      `${base}?format=json&firName=${f}&hours=120`,
      `${base}?format=geojson&locations=${f}&hours=120`, // alguns servidores aceitam FIR como "location"
      `${base}?format=json&locations=${f}&hours=120`,
    ];
  };

  let items: NotamLike[] = [];
  for (const base of bases) {
    for (const fir of firs) {
      const list = await tryMany(() => buildForFIR(base, fir), headers, debugTrials);
      if (list.length) items = items.concat(list.map(x => ({ ...x, fir })));
    }
  }
  return items;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1';

  // ?locations=SBGR,SBSP ou usa fallback
  const locParam = (url.searchParams.get('locations') || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  // ?fir=SBAZ,SBBS ou usa FIR_BR
  const firParam = (url.searchParams.get('fir') || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  const locations = locParam.length ? locParam : BR_AIRPORTS_FALLBACK;
  const firs = firParam.length ? firParam : FIR_BR;

  const headers = {
    'User-Agent': 'OVNIs2025/1.0 (+https://github.com/)',
    'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://aviationweather.gov/',
  };

  const trials: Array<{url:string; status:number}> = [];

  try {
    // 1) locations primeiro (mais estável)
    const byLoc = await fetchByLocations(locations, headers, trials);

    // 2) FIRs como complemento
    const byFir = await fetchByFIRs(firs, headers, trials);

    const raw = [...byLoc, ...byFir];

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

    // Erros ficam inferidos pelos trials (mostrar no front se quiser)
    const errors: string[] = [];
    for (const t of trials) {
      if (t.status >= 400) errors.push(`${t.url.includes('locations=') ? 'LOC' : t.url.includes('fir') ? 'FIR' : 'REQ'}: HTTP ${t.status}`);
    }

    const payload: any = {
      ok: true,
      count: items.length,
      firs,
      locations,
      errors,
      items,
    };

    if (debug) payload.trials = trials;

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || 'internal',
      items: [],
      trials,
    });
  }
}
