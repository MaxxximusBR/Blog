// app/api/awx/notam/route.ts
import { NextResponse } from 'next/server';

// FIRs do Brasil (AWC/NOAA usa esses 4)
const FIR_BR = ['SBAZ', 'SBBS', 'SBRE', 'SBCW'];

/**
 * Endpoint do AWC (Data API). Você pode sobrescrever com env AWC_BASE se quiser
 * apontar para um proxy seu. O caminho /api/data/notam? ... é o padrão público.
 */
const AWC_BASE = process.env.AWC_BASE?.replace(/\/+$/, '') || 'https://aviationweather.gov';

type Notam = {
  id?: string;
  notam_id?: string;
  notam?: string;         // texto bruto
  text?: string;          // algumas respostas vêm como text
  icao?: string;
  fir?: string;
  start?: string | number;   // effective/valid from
  end?: string | number;     // valid to
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
  try {
    const url = new URL(req.url);
    // opcional: ?fir=SBAZ,SBBS...  (se não vier, usa os 4 do Brasil)
    const firParam = (url.searchParams.get('fir') || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    const firs = firParam.length ? firParam : FIR_BR;

    // chama todos em paralelo
    const results = await Promise.all(
      firs.map(async (fir) => {
        // endpoint público do AWC:
        // /api/data/notam?format=json&fir=SBAZ
        const endpoint = `${AWC_BASE}/api/data/notam?format=json&fir=${encodeURIComponent(fir)}`;
        const r = await fetch(endpoint, { cache: 'no-store' });
        if (!r.ok) throw new Error(`AWC ${fir} -> HTTP ${r.status}`);
        const j = await r.json();
        // respostas podem chegar com formatos levemente diferentes; normalizamos abaixo
        const list: Notam[] = Array.isArray(j?.features)
          ? j.features.map((f: any) => f?.properties ?? f).filter(Boolean)
          : Array.isArray(j) ? j
          : Array.isArray(j?.data) ? j.data
          : [];

        return list.map((n) => {
          const raw = (n.notam ?? n.text ?? '').toString();
          const id = (n.notam_id ?? n.id ?? `${fir}-${raw.slice(0, 24)}`).toString();
          const start =
            toISO(n.start ?? n.effective ?? n.time_start ?? n.validFrom ?? n.valid_from);
          const end =
            toISO(n.end ?? n.time_end ?? n.validTo ?? n.valid_to);
          const icao = (n.icao ?? n.location ?? n.airport ?? '').toString().toUpperCase();

          return {
            id,
            fir,
            icao,
            text: raw,
            start,
            end,
          };
        });
      })
    );

    // mescla + dedup por id
    const merged = uniq(results.flat(), (x) => x.id);

    return NextResponse.json({ ok: true, count: merged.length, firs, items: merged });
  } catch (e: any) {
    // log no server (aparece no “Functions / Logs” do Vercel)
    console.error('NOTAM route error:', e);
    return NextResponse.json({ ok: false, error: e.message || 'internal' }, { status: 500 });
  }
}
