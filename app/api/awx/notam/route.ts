// app/api/awx/notam/route.ts
import { NextResponse } from 'next/server';

const AWC = 'https://aviationweather.gov';
const ADDS = 'https://aviationweather.gov/adds/dataserver_current/httpparam';

// FIRs do Brasil (usadas quando fir= não é passado)
const FIR_BR = ['SBAZ', 'SBBS', 'SBRE', 'SBCW'];

// --- utils ---------------------------------------------------------------
function toISO(x: any): string | null {
  if (x == null) return null;
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

type NotamItem = {
  id: string;
  icao?: string;
  fir?: string;
  text: string;
  start?: string | null;
  end?: string | null;
};

function uniq<T>(arr: T[], by: (x: T) => string) {
  const m = new Map<string, T>();
  for (const it of arr) m.set(by(it), it);
  return [...m.values()];
}

// Converte NOTAMs vindos do AWC (geojson) para nosso formato
function mapFromAwcFeature(f: any): NotamItem | null {
  const p = f?.properties ?? f;
  if (!p) return null;
  const text = (p.notam ?? p.text ?? p.rawtext ?? '').toString();
  if (!text) return null;
  const id = (p.notam_id ?? p.id ?? text.slice(0, 40)).toString();
  return {
    id,
    icao: (p.icao ?? p.location ?? p.airport ?? '').toString().toUpperCase() || undefined,
    fir: (p.fir ?? p.firname ?? '').toString().toUpperCase() || undefined,
    text,
    start: toISO(p.start ?? p.effective ?? p.time_start ?? p.validFrom ?? p.valid_from),
    end: toISO(p.end ?? p.time_end ?? p.validTo ?? p.valid_to),
  };
}

// Converte XML (ADDS) pegando os <rawtext>
function mapFromAddsXml(xml: string, loc: string): NotamItem[] {
  const out: NotamItem[] = [];
  const re = /<rawtext>([\s\S]*?)<\/rawtext>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const text = m[1].trim();
    if (!text) continue;
    // tenta extrair um id (QXXXX/…) ou usa hash leve
    const idMatch = text.match(/\b(Q[A-Z0-9/.-]{5,})\b/);
    const id = `${loc}-${(idMatch?.[1] || text.slice(0, 40)).replace(/\s+/g, '')}`;
    out.push({ id, icao: loc, text, start: null, end: null });
  }
  return out;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// --- handler -------------------------------------------------------------
export async function GET(req: Request) {
  const url = new URL(req.url);

  const hours = Math.max(1, Math.min(72, Number(url.searchParams.get('hours') || 24))); // 1..72
  const firParam = (url.searchParams.get('fir') || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  const locParam = (url.searchParams.get('locations') || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  const firs = firParam.length ? firParam : [];
  const locs = locParam.length ? locParam : [];

  // Se nada foi passado, use FIR do Brasil por padrão
  const useFirs = firs.length ? firs : FIR_BR;

  const errors: string[] = [];
  const collected: NotamItem[] = [];

  const headers = {
    'User-Agent': 'OVNIs2025/1.0 (+https://github.com/)',
    'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
  };

  // --------------------- 1) Tenta AWC (geojson) -------------------------
  // a) se vieram locations, tenta 1 request com todas
  if (locs.length) {
    const api = `${AWC}/api/data/notam?format=geojson&locations=${encodeURIComponent(locs.join(','))}&hours=${hours}`;
    try {
      const r = await fetch(api, { cache: 'no-store', headers });
      if (r.ok) {
        const j = await r.json();
        const features = Array.isArray(j?.features) ? j.features : [];
        for (const f of features) {
          const m = mapFromAwcFeature(f);
          if (m) collected.push(m);
        }
      } else {
        errors.push(`AWC LOC: HTTP ${r.status}`);
      }
    } catch (e: any) {
      errors.push(`AWC LOC: ${e?.message || e}`);
    }
  }

  // b) se vieram FIRs (ou padrão do Brasil), tente 1 request por FIR
  for (const fir of useFirs) {
    const api = `${AWC}/api/data/notam?format=geojson&fir=${encodeURIComponent(fir)}&hours=${hours}`;
    try {
      const r = await fetch(api, { cache: 'no-store', headers });
      if (r.ok) {
        const j = await r.json();
        const features = Array.isArray(j?.features) ? j.features : [];
        for (const f of features) {
          const m = mapFromAwcFeature(f);
          if (m) collected.push(m);
        }
      } else {
        errors.push(`AWC FIR ${fir}: HTTP ${r.status}`);
      }
    } catch (e: any) {
      errors.push(`AWC FIR ${fir}: ${e?.message || e}`);
    }
  }

  // ------------------- 2) Fallback ADDS (locations) ---------------------
  // Se não conseguimos nada do AWC e temos "locations", tenta ADDS
  if (collected.length === 0 && locs.length) {
    for (const loc of locs) {
      const q = `${ADDS}?requestType=retrieve&dataSource=notams&format=xml&location=${encodeURIComponent(loc)}&hoursBeforeNow=${hours}`;
      try {
        const r = await fetch(q, { cache: 'no-store', headers: { 'User-Agent': headers['User-Agent'] } });
        if (r.ok) {
          const xml = await r.text();
          const items = mapFromAddsXml(xml, loc);
          if (items.length === 0) {
            errors.push(`ADDS ${loc}: vazio`);
          } else {
            collected.push(...items);
          }
        } else {
          errors.push(`ADDS ${loc}: HTTP ${r.status}`);
        }
      } catch (e: any) {
        errors.push(`ADDS ${loc}: ${e?.message || e}`);
      }
    }
  }

  // dedup & ordena (quando há start)
  const items = uniq(collected, x => x.id).sort((a, b) => {
    const ta = a.start ? Date.parse(a.start) : 0;
    const tb = b.start ? Date.parse(b.start) : 0;
    return tb - ta;
  });

  // resposta sempre 200, com erros compactos
  return NextResponse.json({
    ok: true,
    count: items.length,
    fir: useFirs,
    locations: locs,
    hours,
    // Mostramos até 6 erros para não “poluir” a UI
    errors: errors.slice(0, 6),
    items,
  });
}
