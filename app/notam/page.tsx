'use client';

import { useEffect, useMemo, useState } from 'react';

type NotamItem = {
  id: string;
  icao?: string;
  fir?: string;
  text: string;
  start?: string | null;
  end?: string | null;
};

type ApiResp = {
  ok: boolean;
  count: number;
  hours: number;
  errors?: string[];
  items: NotamItem[];
  locations?: string[];
  fir?: string[];
};

// Alguns principais aeroportos (atalhos)
const POPULARES = [
  'SBGR', 'SBSP', 'SBRJ', 'SBGL', 'SBBR', 'SBPA', 'SBKP', 'SBCT',
  'SBFZ', 'SBRF', 'SBSV', 'SBCF', 'SBBH', 'SBFL', 'SBMO', 'SBEG',
];

// Prefixos de ICAO usados no Brasil
const BRAZIL_ICAO_PREFIX = /^(SB|SD|SI|SJ|SN|SS|SW|SZ)[A-Z]{2}$/i;

// Extrai ICAOs válidos de um texto
function extractLocations(s: string): string[] {
  const out = new Set<string>();
  const tokens = s.toUpperCase().match(/[A-Z]{4}/g) || [];
  for (const t of tokens) {
    if (BRAZIL_ICAO_PREFIX.test(t)) out.add(t);
  }
  return Array.from(out);
}

export default function NotamPage() {
  const [query, setQuery] = useState('');
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<ApiResp | null>(null);

  // Lista carregável de ICAOs (arquivo opcional /data/br-airports.json)
  const [airports, setAirports] = useState<string[]>([]);

  // ICAOs digitados na barra de busca
  const locs = useMemo(() => extractLocations(query), [query]);

  // Carrega lista completa (se existir)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/data/br-airports.json', { cache: 'force-cache' });
        if (r.ok) {
          const js = await r.json();
          const list = (Array.isArray(js) ? js : js?.airports || [])
            .map((x: any) => (typeof x === 'string' ? x : (x?.icao || x?.code || '')))
            .filter((c: string) => BRAZIL_ICAO_PREFIX.test(c))
            .sort();
          if (list.length) setAirports(list);
        }
      } catch {
        // OK ficar sem arquivo – seguimos só com os “populares”
      }
    })();
  }, []);

  // Fallback: populares + os do arquivo (sem duplicatas)
  const allAirports = useMemo(() => {
    const s = new Set<string>([...POPULARES, ...airports]);
    return Array.from(s).sort();
  }, [airports]);

  async function load() {
    setBusy(true);
    try {
      const hasLocs = locs.length > 0;
      const url = hasLocs
        ? `/api/awx/notam?locations=${encodeURIComponent(locs.join(','))}&hours=${hours}`
        : `/api/awx/notam?hours=${hours}`;

      const r = await fetch(url, { cache: 'no-store' });
      const js = (await r.json()) as ApiResp;
      setResp(js);
    } catch (e) {
      setResp({ ok: false, count: 0, hours, errors: [String(e)], items: [] });
    } finally {
      setBusy(false);
    }
  }

  // Carrega ao abrir
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const items = resp?.items || [];
  const errors = resp?.errors || [];

  // Inserir um código com clique
  function addIcao(code: string) {
    const set = new Set(extractLocations(query));
    set.add(code);
    setQuery(Array.from(set).join(' '));
  }

  return (
    <main className="relative">
      {/* Fundo com sua imagem */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url('/media/Sarajevo_airport_runway.jpg')` }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/80" />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        {/* Cabeçalho + vídeo */}
        <header className="mb-6 md:mb-8">
          <div className="flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                NOTAM — Brasil (ativos)
              </h1>
              <p className="mt-2 text-sm opacity-80">
                Fonte:{' '}
                <a
                  className="underline"
                  href="https://aviationweather.gov/data/api/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Aviation Weather Center / NOAA
                </a>
                . Exibindo registros vigentes (janela recente).
              </p>

              {/* Barra de busca */}
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="buscar por FIR, aeródromo (SBxx), texto…  ex.: SBGR SBSP SBRJ"
                  className="w-full md:w-[520px] rounded-md bg-white/5 border border-white/10 px-3 py-2 outline-none"
                />
                <select
                  className="rounded-md bg-white/5 border border-white/10 px-2 py-2"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                >
                  {[6, 12, 24, 36, 48, 72].map((h) => (
                    <option key={h} value={h}>
                      {h}h
                    </option>
                  ))}
                </select>
                <button
                  onClick={load}
                  disabled={busy}
                  className="rounded-md bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-2 text-sm"
                >
                  {busy ? 'Carregando…' : 'Recarregar'}
                </button>
              </div>

              {/* Erros (se houver) */}
              {errors.length > 0 && (
                <div className="mt-3 text-xs opacity-75 space-y-1">
                  {errors.slice(0, 6).map((e, i) => (
                    <div key={i}>• {e}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Vídeo decorativo */}
            <div className="hidden md:block shrink-0">
              <div className="w-[340px] h-[140px] rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-lg">
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                >
                  <source src="/media/landing.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </header>

        {/* Atalhos */}
        <div className="mb-4 text-sm">
          <span className="opacity-70 mr-2">Atalhos:</span>
          {POPULARES.map((c) => (
            <button
              key={c}
              onClick={() => addIcao(c)}
              className="mr-2 mb-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 hover:bg-white/10"
              title={`Adicionar ${c}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Resultados */}
        {items.length === 0 ? (
          <div className="opacity-80 text-sm">Nenhum NOTAM ativo encontrado.</div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <article
                key={n.id}
                className="rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="text-xs opacity-70 mb-1">
                  {n.icao ? <b>{n.icao}</b> : n.fir ? <b>{n.fir}</b> : null}
                  {n.start && (
                    <>
                      {' '}
                      • início:{' '}
                      {new Date(n.start).toLocaleString('pt-BR', { hour12: false })}
                    </>
                  )}
                  {n.end && (
                    <>
                      {' '}
                      • fim:{' '}
                      {new Date(n.end).toLocaleString('pt-BR', { hour12: false })}
                    </>
                  )}
                </div>
                <pre className="whitespace-pre-wrap break-words text-sm">{n.text}</pre>
              </article>
            ))}
          </div>
        )}

        {/* Lista pesquisável de ICAOs */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm opacity-80">
            Lista rápida de códigos (aeroportos do Brasil)
          </summary>
          <AirportPicker allAirports={allAirports} onPick={addIcao} />
        </details>

        <footer className="mt-8 text-xs opacity-70">
          Dados via{' '}
          <a
            className="underline"
            href="https://aviationweather.gov/data/api/"
            target="_blank"
            rel="noreferrer"
          >
            AviationWeather.gov Data API
          </a>
          . Fallback para ADDS (XML) ao consultar por “locations”.
        </footer>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------ */
/* Sub-componente: lista pesquisável                            */
/* ------------------------------------------------------------ */
function AirportPicker({
  allAirports,
  onPick,
}: {
  allAirports: string[];
  onPick: (code: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const list = useMemo(() => {
    const f = filter.trim().toUpperCase();
    return allAirports.filter((c) => c.includes(f)).slice(0, 400);
  }, [allAirports, filter]);

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filtrar… ex.: SB, RJ, POA"
          className="w-[260px] rounded-md bg-white/5 border border-white/10 px-3 py-2 outline-none text-sm"
        />
        <div className="text-xs opacity-60">
          Clique em um código para adicionar no campo de busca
        </div>
      </div>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {list.map((code) => (
          <button
            key={code}
            onClick={() => onPick(code)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm hover:bg-white/10 text-left"
            title={`Adicionar ${code}`}
          >
            {code}
          </button>
        ))}
        {list.length === 0 && (
          <div className="opacity-60 text-sm">Nada encontrado…</div>
        )}
      </div>
    </div>
  );
}
