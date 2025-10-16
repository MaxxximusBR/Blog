'use client';

import { useEffect, useMemo, useState } from 'react';

type StationDef = { city: string; icaos: string[] };

const STATIONS: StationDef[] = [
  { city: 'Porto Alegre',    icaos: ['SBPA'] },
  { city: 'Florianópolis',   icaos: ['SBFL'] },
  { city: 'Curitiba',        icaos: ['SBCT'] },
  { city: 'São Paulo',       icaos: ['SBGR','SBSP','SBKP'] },
  { city: 'Rio de Janeiro',  icaos: ['SBGL','SBRJ'] },
  { city: 'Belo Horizonte',  icaos: ['SBCF','SBBH'] },
  { city: 'Brasília',        icaos: ['SBBR'] },
  { city: 'Manaus',          icaos: ['SBEG'] },
  { city: 'Maceió',          icaos: ['SBMO'] },
  { city: 'Recife',          icaos: ['SBRF'] },
  { city: 'Salvador',        icaos: ['SBSV'] },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function pick<T = string>(obj: any, keys: string[], def?: T): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return def;
}

/** Converte tempo (ISO | epoch s | epoch ms | num-string) para ISO */
function normalizeTime(t: any): string | null {
  if (t == null) return null;
  if (typeof t === 'number') {
    const ms = t < 1e12 ? t * 1000 : t;
    return new Date(ms).toISOString();
  }
  if (typeof t === 'string') {
    if (/^\d+$/.test(t)) {
      const n = parseInt(t, 10);
      const ms = n < 1e12 ? n * 1000 : n;
      return new Date(ms).toISOString();
    }
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/** Formata Flight Level: aceita valor em FL (ex.: 480) ou em pés (ex.: 48000) */
function fmtFL(v: any): string | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return `FL${v}`;
  const fl = n > 2000 ? Math.round(n / 100) : Math.round(n);
  return `FL${fl}`;
}

/** Extrai um array de METAR de múltiplos formatos (AWC novo, ADDS antigo etc.) */
function extractMetars(j: any): any[] {
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.metars)) return j.metars;            // AWC novo
  if (Array.isArray(j?.METAR)) return j.METAR;              // variação
  if (Array.isArray(j?.data?.METAR)) return j.data.METAR;   // ADDS
  if (Array.isArray(j?.data?.metars)) return j.data.metars;
  if (Array.isArray(j?.features)) {
    return j.features.map((f: any) => f?.properties ?? f).filter(Boolean);
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* METAR decode                                                        */
/* ------------------------------------------------------------------ */

function decodeMetar(m: any) {
  const raw = m?.rawOb ?? m?.raw_text ?? m?.raw ?? m?.properties?.rawOb ?? '';

  const icao = (
    m?.icaoId ?? m?.station_id ?? m?.id ?? m?.station ?? '????'
  ).toUpperCase();

  const timeRaw =
    m?.obsTime ??
    m?.time ??
    m?.issueTime ??
    m?.observed ??
    m?.observation_time ??
    null;

  const timeISO = normalizeTime(timeRaw);

  // vento
  const windDir = m?.wind?.dir ?? m?.wind_dir_degrees ?? m?.wdir ?? m?.winddir ?? null;
  const windSpd = m?.wind?.spd_kts ?? m?.wind_speed_kt ?? m?.wspd ?? m?.windspd ?? null;
  const windGst = m?.wind?.gust_kts ?? m?.wind_gust_kt ?? m?.wgst ?? m?.windgst ?? null;

  // visibilidade
  const visSm = m?.visibility?.sm ?? m?.visibility_statute_mi ?? m?.vis ?? null;

  // tempo presente
  const wx = (m?.wx ?? m?.wx_string ?? m?.weather_string ?? m?.present_weather ?? '').toString();

  // nuvens
  const clouds = m?.clouds ?? m?.sky_condition ?? [];
  const cloudsTxt = Array.isArray(clouds)
    ? clouds.map((c: any) => {
        const cov = (c.cover ?? c.sky_cover ?? '').toString();
        const base = c.base ?? c.cloud_base_ft_agl ?? c.base_ft_agl ?? null;
        const mapCov: Record<string,string> = {
          SKC: 'céu limpo', CLR: 'céu limpo', FEW: 'poucas',
          SCT: 'esparsas', BKN: 'fragmentadas', OVC: 'encoberto', OVX: 'visib. vertical'
        };
        return `${mapCov[cov] ?? cov}${base ? ` a ${base} ft` : ''}`;
      }).join(' • ')
    : '';

  // temperatura/pressão
  const temp = m?.temp?.c ?? m?.temp_c ?? m?.temperature ?? null;
  const dew  = m?.dewpoint?.c ?? m?.dewpoint_c ?? m?.dewpoint ?? null;
  const alt  = m?.altim?.in ?? m?.altim_in_hg ?? m?.altimeter?.in ?? m?.altim ?? null;

  const vento = windDir != null && windSpd != null
    ? `${windDir}° @ ${windSpd} kt${windGst ? ` (raj ${windGst})` : ''}`
    : 'calmo';

  const vis = visSm != null ? `${visSm} SM (~${(Number(visSm)*1.609).toFixed(1)} km)` : '—';

  const wxPtBr = wx
    .replaceAll('RA', 'chuva')
    .replaceAll('DZ', 'garoa')
    .replaceAll('TS', 'trovoadas')
    .replaceAll('BR', 'névoa')
    .replaceAll('FG', 'nevoeiro')
    .replaceAll('HZ', 'névoa seca')
    .replaceAll('SQ', 'rajadas')
    .replaceAll('SH', 'pancadas')
    .replaceAll('+', 'forte ')
    .replaceAll('-', 'fraca ');

  return { icao, raw, timeISO, vento, vis, wx: wxPtBr.trim(), nublado: cloudsTxt, temp, dew, alt };
}

function useTicker(ms:number){
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t+1), ms); return () => clearInterval(id); }, [ms]);
  return tick;
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function MetarPage(){
  const allIds = useMemo(() => STATIONS.flatMap(s => s.icaos).join(','), []);
  const [metars, setMetars] = useState<any[]>([]);
  const [sigmet, setSigmet]   = useState<any|null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  useTicker(1000); // relógio

  async function loadAll(){
    try{
      setErr(null);
      const mRes = await fetch(`/api/awx/metar?ids=${encodeURIComponent(allIds)}&hours=12`, { cache: 'no-store' });
      if(!mRes.ok) throw new Error(`METAR ${mRes.status}`);
      const mJson = await mRes.json();
      const list = extractMetars(mJson);
      setMetars(Array.isArray(list) ? list : []);

      const sRes = await fetch(`/api/awx/isigmet`, { cache: 'no-store' });
      if(!sRes.ok) throw new Error(`SIGMET ${sRes.status}`);
      const sJson = await sRes.json(); // GeoJSON filtrado p/ FIR BR
      setSigmet(sJson);
    }catch(e:any){
      setErr(e.message || 'erro ao carregar');
    }finally{
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [allIds]);
  useEffect(() => { const id = setInterval(loadAll, 60000); return () => clearInterval(id); }, [allIds]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for(const r of metars){
      const icao = (r?.icaoId ?? r?.station_id ?? r?.id ?? r?.station ?? '').toUpperCase();
      if(!icao) continue;
      if(!map.has(icao)) map.set(icao, []);
      map.get(icao)!.push(r);
    }
    for(const [, arr] of map){
      const getT = (x:any) => {
        const iso = normalizeTime(x?.obsTime ?? x?.time ?? x?.issueTime ?? x?.observed ?? x?.observation_time ?? null);
        return iso ? new Date(iso).getTime() : 0;
      };
      arr.sort((a,b) => getT(b) - getT(a));
    }
    return map;
  }, [metars]);

  return (
    <main className="relative">
      {/* BG: /media/weather.jpg + overlay escuro */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-center bg-cover" style={{ backgroundImage: `url('/media/weather.jpg')` }} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/90 backdrop-blur-[1px]" />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        {/* Cabeçalho com vídeo decorativo à direita */}
        <header className="mb-6 md:mb-8">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                METAR &amp; SIGMET — Principais Aeroportos
              </h1>
              <p className="mt-2 text-sm opacity-80">
                Fonte: <a className="underline" href="https://aviationweather.gov/data/api/" target="_blank">Aviation Weather Center / NOAA</a>. Atualiza automaticamente a cada 60s.
              </p>
            </div>

            {/* vídeo decorativo — oculto em telas pequenas */}
            <div className="hidden md:block shrink-0">
              <div className="w-[320px] h-[120px] rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-lg">
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  role="presentation"
                >
                  <source src="/media/metarsigmet.mp4" type="video/mp4" />
                  {/* se quiser, adicione um .webm como fallback:
                  <source src="/media/metarsigmet.webm" type="video/webm" />
                  */}
                </video>
              </div>
            </div>
          </div>
        </header>

        {err && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm mb-4">Erro: {err}</div>}

        <div className="grid gap-4">
          {STATIONS.map(({ city, icaos }) => (
            <div key={city} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{city}</h2>
                <div className="text-xs opacity-70">Estações: {icaos.join(', ')}</div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {icaos.map(icao => {
                  const rows = grouped.get(icao) ?? [];
                  const latest = rows[0];
                  const d = latest ? decodeMetar(latest) : null;

                  return (
                    <div key={icao} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{icao}</div>
                        <div className="text-xs opacity-70">
                          {d?.timeISO ? new Date(d.timeISO).toLocaleString('pt-BR', { hour12: false }) : (loading ? 'carregando...' : '—')}
                        </div>
                      </div>

                      {d ? (
                        <>
                          <div className="mt-2 text-sm leading-relaxed">
                            <div><span className="opacity-70">Vento:</span> {d.vento}</div>
                            <div><span className="opacity-70">Visibilidade:</span> {d.vis}</div>
                            {d.wx && <div><span className="opacity-70">Tempo:</span> {d.wx}</div>}
                            {d.nublado && <div><span className="opacity-70">Nuvens:</span> {d.nublado}</div>}
                            <div className="mt-1 opacity-80 text-xs">
                              {d.temp!=null && <>Temp {d.temp}°C</>} {d.dew!=null && <> • Pto Orv {d.dew}°C</>}
                              {d.alt!=null && <> • Altímetro {d.alt} inHg</>}
                            </div>
                          </div>
                          <div className="mt-2 rounded bg-white/5 px-2 py-1 font-mono text-xs">{d.raw}</div>
                        </>
                      ) : (
                        <div className="mt-2 text-sm opacity-70">Sem METAR recente.</div>
                      )}

                      {rows.length>1 && (
                        <details className="mt-2">
                          <summary className="text-xs opacity-70 cursor-pointer">Histórico (últimas horas)</summary>
                          <div className="mt-2 space-y-1">
                            {rows.slice(1).map((r, idx) => {
                              const dd = decodeMetar(r);
                              return (
                                <div key={idx} className="rounded border border-white/10 px-2 py-1">
                                  <div className="text-[11px] opacity-70">{dd.timeISO ? new Date(dd.timeISO).toLocaleString('pt-BR', { hour12: false }) : ''}</div>
                                  <div className="font-mono text-xs">{dd.raw}</div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* SIGMETs válidos nos FIR do Brasil */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-lg font-semibold mb-2">SIGMET — FIR Brasil (ativos)</h2>
          <p className="text-xs opacity-70 mb-3">
            Exibindo SIGMET(s) internacionais com FIR: SBAZ (Amazônica), SBBS (Brasília), SBRE (Recife), SBCW (Curitiba). Fonte: AWC/NOAA.
          </p>

          {!sigmet || !Array.isArray(sigmet.features) || sigmet.features.length===0 ? (
            <div className="text-sm opacity-70">Nenhum SIGMET ativo no momento.</div>
          ) : (
            <div className="grid gap-2">
              {sigmet.features.map((f:any, i:number) => {
                const p = f?.properties ?? {};

                const fir   = pick<string>(p, ['fir','firId','firname','firName'], '')!;
                const haz   = (pick<string>(p, ['hazard','phenomenon','event'], '') || 'SIGMET').toString().toUpperCase();

                const fromISO = normalizeTime(
                  pick<string>(p, ['validTimeFrom','valid_time_from','validFrom','valid_from'], '')
                );
                const toISO   = normalizeTime(
                  pick<string>(p, ['validTimeTo','valid_time_to','validTo','valid_to'], '')
                );

                const text  = pick<string>(p, ['raw','raw_text','text','message'], '');

                const intensity = pick<string>(p, ['intensity','severity'], '');
                const obsFcst   = pick<string>(p, ['obsOrFcst','obs_fcst','reportType'], '');
                const minV      = pick<string | number>(p, ['min_fcst_flight_level','min_fl','bottom_fl','min_ft','base'], '');
                const maxV      = pick<string | number>(p, ['max_fcst_flight_level','max_fl','top_fl','max_ft','top'], '');
                const minFL     = fmtFL(minV);
                const maxFL     = fmtFL(maxV);
                const movement  = pick<string>(p, ['movement','movementDir','dir'], '');
                const speed     = pick<string | number>(p, ['movementSpeed','speed'], '');

                const levels =
                  minFL && maxFL ? `Níveis: ${minFL} a ${maxFL}` :
                  maxFL ? `Níveis: topo ${maxFL}` :
                  minFL ? `Níveis: base ${minFL}` : '';

                const fallbackDesc = [
                  obsFcst && `(${obsFcst})`,
                  intensity && `Intensidade: ${intensity}`,
                  levels,
                  (movement || speed) && `Movimento: ${movement}${speed ? ` ${speed} kt` : ''}`,
                ].filter(Boolean).join(' • ');

                return (
                  <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{haz} — {fir}</div>
                      <div className="text-xs opacity-70">
                        {fromISO ? new Date(fromISO).toLocaleString('pt-BR', { hour12:false }) : ''} {fromISO || toISO ? '→' : ''} {toISO ? new Date(toISO).toLocaleString('pt-BR', { hour12:false }) : ''}
                      </div>
                    </div>
                    <div className="mt-1 text-xs opacity-90 whitespace-pre-wrap">
                      {text || fallbackDesc || '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="mt-8 text-xs opacity-70">
          Dados via <a className="underline" href="https://aviationweather.gov/data/api/" target="_blank">AviationWeather.gov Data API</a>.
          Restrições: sem CORS (uso via rotas servidor) e rate limit (~100 req/min).
        </footer>
      </section>
    </main>
  );
}
