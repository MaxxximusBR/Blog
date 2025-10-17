import { NextResponse } from 'next/server';

const AWC_BASE = process.env.AWC_BASE?.replace(/\/+$/, '') || 'https://aviationweather.gov';

// ICAOs BR “maiores” para fallback ADDS quando só vem FIR
const DEFAULT_BR_ICAOS = [
  'SBGR','SBSP','SBRJ','SBGL','SBBR','SBCF','SBPA','SBFL','SBCT','SBRF',
  'SBSV','SBEG','SBMO','SBBE','SBBH','SBSG','SBFZ','SBRP','SBCG','SBSJ',
];

type NotamOut = {
  id: string;
  fir?: string;
  icao?: string;
  text: string;
  start?: string | null;
  end?: string | null;
  source: 'AWC' | 'ADDS';
};

function toISO(x: any): string | null {
  if (x == null || x === '') return null;
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

function uniq<T>(arr: T[], key: (x: T) => string): T[] {
  const m = new Map<string, T>();
  for (const it of arr) m.set(key(it), it);
  return [...m.values()];
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);

  const fir = (url.searchParams.get('fir') || '')
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  const locations = (url.searchParams.get('locations') || url.searchParams.get('loc') || '')
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  const hours = Math.max(1, Math.min(120, parseInt(url.searchParams.get('hours') || '24', 10)));
  const debug = url.searchParams.get('debug') === '1';

  const headers = {
    'User-Agent': 'OVNIs2025/1.0 (+https://github.com/MaxxximusBR/Blog)',
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  };

  const tried: Array<{ url: string; status: number | 'ERR'; from: 'AWC' | 'ADDS' }> = [];
  const errors: string[] = [];
  let items: NotamOut[] = [];

  async function awcByLocations(locs: string[]) {
    if (!locs.length) return;
    const endpoint = `${AWC_BASE}/api/data/notam?format=geojson&locations=${encodeURIComponent(locs.join(','))}&hours=${hours}`;
    try {
      const r = await fetch(endpoint, { cache: 'no-store', headers });
      tried.push({ url: endpoint, status: r.status, from: 'AWC' });
      if (!r.ok) { errors.push(`LOC: HTTP ${r.status}`); return; }
      const json = await r.json();
      const feats = Array.isArray(json?.features) ? json.features : [];
      for (const f of feats) {
        const p = f?.properties ?? f;
        const txt = (p?.notam ?? p?.text ?? p?.raw_text ?? '').toString();
        if (!txt) continue;
        items.push({
          id: (p?.notam_id ?? p?.id ?? `LOC-${txt.slice(0, 32)}`).toString(),
          fir: (p?.fir ?? p?.firname ?? '').toString().toUpperCase() || undefined,
          icao: (p?.icao ?? p?.location ?? p?.airport ?? '').toString().toUpperCase() || undefined,
          text: txt,
          start: toISO(p?.start ?? p?.effective ?? p?.time_start ?? p?.validFrom ?? p?.valid_from),
          end: toISO(p?.end ?? p?.time_end ?? p?.validTo ?? p?.valid_to),
          source: 'AWC',
        });
      }
    } catch (e: any) {
      tried.push({ url: endpoint, status: 'ERR', from: 'AWC' });
      errors.push(`LOC: ${e?.message || 'fetch error'}`);
    }
  }

  async function awcByFir(firList: string[]) {
    for (const f of firList) {
      const endpoint = `${AWC_BASE}/api/data/notam?format=geojson&firName=${encodeURIComponent(f)}&hours=${hours}`;
      try {
        const r = await fetch(endpoint, { cache: 'no-store', headers });
        tried.push({ url: endpoint, status: r.status, from: 'AWC' });
        if (!r.ok) { errors.push(`FIR ${f}: HTTP ${r.status}`); continue; }
        const json = await r.json();
        const feats = Array.isArray(json?.features) ? json.features : [];
        for (const ft of feats) {
          const p = ft?.properties ?? ft;
          const txt = (p?.notam ?? p?.text ?? p?.raw_text ?? '').toString();
          if (!txt) continue;
          items.push({
            id: (p?.notam_id ?? p?.id ?? `${f}-${txt.slice(0, 32)}`).toString(),
            fir: f,
            icao: (p?.icao ?? p?.location ?? p?.airport ?? '').toString().toUpperCase() || undefined,
            text: txt,
            start: toISO(p?.start ?? p?.effective ?? p?.time_start ?? p?.validFrom ?? p?.valid_from),
            end: toISO(p?.end ?? p?.time_end ?? p?.validTo ?? p?.valid_to),
            source: 'AWC',
          });
        }
      } catch (e: any) {
        tried.push({ url: endpoint, status: 'ERR', from: 'AWC' });
        errors.push(`FIR ${f}: ${e?.message || 'fetch error'}`);
      }
    }
  }

  async function addsByLocations(locs: string[]) {
    if (!locs.length) return;
    const endpoint =
      'https://aviationweather.gov/adds/dataserver_current/httpparam' +
      `?datasource=notams&requestType=retrieve&format=JSON&stationString=${encodeURIComponent(locs.join(','))}` +
      `&mostRecentForEachStation=true&hoursBeforeNow=${hours}`;
    try {
      const r = await fetch(endpoint, { cache: 'no-store', headers });
      tried.push({ url: endpoint, status: r.status, from: 'ADDS' });
      if (!r.ok) { errors.push(`ADDS LOC: HTTP ${r.status}`); return; }
      const j = await r.json();
      const list = j?.data?.NOTAM || j?.data?.notam || [];
      for (const n of list) {
        const txt =
          n?.rawtext ?? n?.raw_text ?? n?.text ?? n?.notam_text ?? n?.message ?? n?.remarks ?? '';
        if (!txt) continue;
        items.push({
          id: n?.id?.toString() || n?.notam_id?.toString() || `ADDS-${(n?.location ?? n?.station_id ?? '??')}-${txt.slice(0, 32)}`,
          fir: (n?.fir ?? n?.firname ?? '').toString().toUpperCase() || undefined,
          icao: (n?.location ?? n?.station_id ?? '').toString().toUpperCase() || undefined,
          text: txt.toString(),
          start: toISO(n?.effective_time ?? n?.issue_date ?? n?.starttime ?? n?.start_time),
          end: toISO(n?.expire_time ?? n?.endtime ?? n?.end_time),
          source: 'ADDS',
        });
      }
    } catch (e: any) {
      tried.push({ url: endpoint, status: 'ERR', from: 'ADDS' });
      errors.push(`ADDS LOC: ${e?.message || 'fetch error'}`);
    }
  }

  // Fluxo
  if (locations.length) await awcByLocations(locations);
  if (fir.length)        await awcByFir(fir);

  // Fallback ADDS:
  //  a) se veio locations e ainda não temos itens
  //  b) se veio só FIR e AWC não entregou nada -> usar default BR
  if (!items.length) {
    if (locations.length) {
      await addsByLocations(locations);
    } else if (fir.length) {
      await addsByLocations(DEFAULT_BR_ICAOS);
      // só para transparência do que aconteceu
      errors.push('AWC/FIR indisponível — fallback ADDS com ICAOs padrão BR');
    }
  }

  // Dedup e ordenação
  items = uniq(items, x => x.id);
  items.sort((a, b) => {
    const ta = a.start ? Date.parse(a.start) : 0;
    const tb = b.start ? Date.parse(b.start) : 0;
    return tb - ta;
  });

  if (debug) {
    return NextResponse.json({ ok: true, count: items.length, fir, locations, hours, items, tried, errors });
  }
  return NextResponse.json({ ok: true, count: items.length, fir, locations, hours, items, errors: errors.slice(0,3) });
}
