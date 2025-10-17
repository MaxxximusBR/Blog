// app/api/adsb/emergencies/route.ts
export const dynamic = 'force-dynamic';

type Flight = { hex: string; flight?: string };

function ok(res: any) {
  return new Response(JSON.stringify(res), { headers: { 'content-type': 'application/json' } });
}
function fail(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: { 'content-type': 'application/json' } });
}

export async function GET(req: Request) {
  const u = new URL(req.url);

  // DEMO curto e grosso (sempre funciona)
  if (u.searchParams.get('demo') === '1') {
    return ok({
      ok: true,
      count: 1,
      flights: [{ hex: 'abc123', flight: 'TEST7700' }],
      source: 'demo',
      ts: Date.now(),
    });
  }

  // 1) Tenta ADSB JSON (proxy interno) — por padrão /api/adsb/upstream
  const ADSB_JSON = process.env.ADSB_JSON || '/api/adsb/upstream';
  const adsbUrl = ADSB_JSON.startsWith('http') ? ADSB_JSON : `${u.origin}${ADSB_JSON}`;

  try {
    const r = await fetch(adsbUrl, { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      const ac = Array.isArray(j?.aircraft) ? j.aircraft : [];
      const emerg = ac.filter(
        (a: any) =>
          a?.squawk === '7700' ||
          a?.squawk === 7700 ||
          (typeof a?.emergency === 'string' && /7700|emergency/i.test(a.emergency))
      );

      if (emerg.length > 0) {
        const flights: Flight[] = emerg.map((a: any) => ({
          hex: String(a.hex || a.icao || a.icao24 || '').trim(),
          flight: String(a.flight || a.callsign || '').trim(),
        }));
        return ok({ ok: true, count: flights.length, flights, source: 'adsb-json', ts: Date.now() });
      }
      // Se não achou 7700 no ADSB, continua no fallback…
    } else {
      // 403 etc: ignora e cai para fallback
    }
  } catch {
    // erro no ADSB; cai para fallback
  }

  // 2) Fallback: rota do OpenSky interna (usa squawk do passo 1)
  try {
    // opcional: aceitar lat/lon/r na query pra customizar área
    const lat = Number(u.searchParams.get('lat') ?? -30.03);
    const lon = Number(u.searchParams.get('lon') ?? -51.22);
    const r = Number(u.searchParams.get('r') ?? 5);

    const osUrl = `${u.origin}/api/opensky?lat=${lat}&lon=${lon}&r=${r}`;
    const r2 = await fetch(osUrl, { cache: 'no-store' });
    if (r2.ok) {
      const j2 = await r2.json().catch(() => ({}));
      const items = Array.isArray(j2?.items) ? j2.items : [];
      const emerg2 = items.filter((a: any) => String(a?.squawk || '').trim() === '7700');

      if (emerg2.length > 0) {
        const flights: Flight[] = emerg2.map((a: any) => ({
          hex: String(a.hex || '').trim(),
          flight: String(a.callsign || '').trim(),
        }));
        return ok({ ok: true, count: flights.length, flights, source: 'opensky', ts: Date.now() });
      }

      // nenhum 7700 na área consultada
      return ok({ ok: true, count: 0, flights: [], source: 'opensky', ts: Date.now() });
    }
  } catch {
    // ignore
  }

  // Se chegou aqui, nada deu certo
  return fail(200, 'No data (all sources unavailable)');
}
