// app/api/awx/notam/route.ts
import { NextResponse } from 'next/server';

const AWC_BASE = (process.env.AWC_BASE || 'https://aviationweather.gov').replace(/\/+$/, '');

type Notam = {
  id: string;
  icao?: string;
  fir?: string;
  text: string;
  start?: string | null;
  end?: string | null;
};

function toISO(x: any): string | null {
  if (x == null) return null;
  if (typeof x === 'number') return new Date(x < 1e12 ? x * 1000 : x).toISOString();
  if (typeof x === 'string' && /^\d+$/.test(x)) {
    const n = parseInt(x, 10);
    return new Date(n < 1e12 ? n * 1000 : n).toISOString();
  }
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function dedup<T>(arr: T[], key: (t: T) => string) {
  const m = new Map<string, T>();
  for (const it of arr) m.set(key(it), it);
  return [...m.values()];
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Entrada: ?locations=SBGR,SBSP,SBRJ  |  ?fir=SBAZ,SBBS,SBRE,SBCW  |  ?hours=24  |  ?debug=1
  const locs = (url.searchParams.get('locations') || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  const firs = (url.searchParams.get('fir') || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  const hours = Math.max(1, Math.min(120, parseInt(url.searchParams.get('hours') || '24', 10) || 24));
  const debug = url.searchParams.has('debug');

  const headers: Record<string, string> = {
    'User-Agent': 'OVNIs2025/1.0 (notam fetch)',
    'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  const tried: Array<{ url: string; status?: number }> = [];
  const errors: string[] = [];
  let items: Notam[] = [];

  async function tryAWC(u: string) {
    try {
      const r = await fetch(u, { cache: 'no-store', headers });
      tried.push({ url: u, status: r.status });
      if (!r.ok) {
        errors.push(`${u} -> HTTP ${r.status}`);
        return [];
      }
      const j = await r.json();

      // normalizações – o AWC pode vir como {features:[{properties:{}}]} ou array direto
      const list: any[] = Array.isArray(j?.features)
        ? j.features.map((f: any) => f?.properties ?? f).filter(Boolean)
        : Array.isArray(j)
        ? j
        : Array.isArray(j?.data)
        ? j.data
        : [];

      const mapped: Notam[] = list
        .map((n: any) => {
          const raw = (n.notam ?? n.text ?? '').toString().trim();
          if (!raw) return null;
          const id =
            (n.notam_id ??
              n.id ??
              `${(n.icao || n.location || '').toString().toUpperCase()}-${raw.slice(0, 24)}`) + '';
          const start = toISO(n.start ?? n.effective ?? n.time_start ?? n.validFrom ?? n.valid_from);
          const end = toISO(n.end ?? n.time_end ?? n.validTo ?? n.valid_to);
          const icao = (n.icao ?? n.location ?? n.airport ?? '').toString().toUpperCase();
          const fir = (n.fir ?? n.firname ?? n.firName ?? '').toString().toUpperCase();
          return { id, icao, fir, text: raw, start, end };
        })
        .filter(Boolean);

      return mapped;
    } catch (e: any) {
      errors.push(`${u} -> ${e?.message || e}`);
      return [];
    }
  }

  // 1) AWC por ICAO – tentar loc= e locations=
  if (locs.length) {
    const joined = locs.join(',');
    const urls = [
      `${AWC_BASE}/api/data/notam?format=geojson&loc=${encodeURIComponent(joined)}&hours=${hours}`,
      `${AWC_BASE}/api/data/notam?format=geojson&locations=${encodeURIComponent(joined)}&hours=${hours}`,
      // algumas instalações aceitam notamType=icao
      `${AWC_BASE}/api/data/notam?format=geojson&notamType=icao&loc=${encodeURIComponent(joined)}&hours=${hours}`,
      `${AWC_BASE}/api/data/notam?format=geojson&notamType=icao&locations=${encodeURIComponent(joined)}&hours=${hours}`,
    ];
    for (const u of urls) {
      const got = await tryAWC(u);
      items = items.concat(got);
    }
  }

  // 2) AWC por FIR – tentar firName= e fir=
  if (firs.length) {
    for (const fir of firs) {
      const urls = [
        `${AWC_BASE}/api/data/notam?format=geojson&firName=${encodeURIComponent(fir)}&hours=${hours}`,
        `${AWC_BASE}/api/data/notam?format=geojson&fir=${encodeURIComponent(fir)}&hours=${hours}`,
      ];
      for (const u of urls) {
        const got = await tryAWC(u);
        items = items.concat(got);
      }
    }
  }

  // 3) (opcional) ADDS XML – muitas vezes 403 fora dos EUA; deixo comentado.
  // Se quiser tentar, descomente e trate o parse:

  // if (!items.length && locs.length) {
  //   const joined = locs.join(',');
  //   const adds = `https://aviationweather.gov/adds/dataserver_current/httpparam?requestType=retrieve&dataSource=notams&format=XML&location=${encodeURIComponent(joined)}&hoursBeforeNow=${hours}`;
  //   tried.push({ url: adds });
  //   try {
  //     const r = await fetch(adds, { cache: 'no-store', headers });
  //     tried[tried.length - 1].status = r.status;
  //     if (!r.ok) {
  //       errors.push(`${adds} -> HTTP ${r.status}`);
  //     } else {
  //       const xml = await r.text();
  //       // parse do XML se necessário
  //     }
  //   } catch (e: any) {
  //     errors.push(`${adds} -> ${e?.message || e}`);
  //   }
  // }

  items = dedup(items, (x) => x.id);

  const body: any = {
    ok: true,
    count: items.length,
    locations: locs,
    firs,
    hours,
    items,
    errors,
  };
  if (debug) body.tried = tried;

  return NextResponse.json(body);
}
