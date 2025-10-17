'use client';

import { useEffect, useMemo, useState } from 'react';

type Notam = {
  id: string;
  icao?: string;
  aerodrome?: string;
  fir?: string;
  type?: string;
  text?: string;
  valid_from?: string | null;
  valid_to?: string | null;
  active?: boolean;
};

function fmt(dt?: string | null) {
  if (!dt) return '';
  try { return new Date(dt).toLocaleString('pt-BR', { hour12: false }); } catch { return ''; }
}

export default function NotamPage() {
  const [items, setItems] = useState<Notam[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const r = await fetch('/api/awx/notam?hours=72', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setItems(Array.isArray(j?.items) ? j.items : []);
    } catch (e: any) {
      setErr(e?.message || 'erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const t = q.trim().toLowerCase();
    return items.filter(n =>
      (n.icao || '').toLowerCase().includes(t) ||
      (n.aerodrome || '').toLowerCase().includes(t) ||
      (n.fir || '').toLowerCase().includes(t) ||
      (n.type || '').toLowerCase().includes(t) ||
      (n.text || '').toLowerCase().includes(t)
    );
  }, [items, q]);

  // agrupar: FIR -> Aerodrome
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Notam[]>>();
    for (const n of filtered) {
      const fir = n.fir || '—';
      const ad = n.aerodrome || n.icao || '—';
      if (!map.has(fir)) map.set(fir, new Map());
      const g = map.get(fir)!;
      if (!g.has(ad)) g.set(ad, []);
      g.get(ad)!.push(n);
    }
    // ordenar internamente por início desc
    for (const g of map.values()) {
      for (const [k, arr] of g) {
        arr.sort((a, b) =>
          +(b.valid_from ? new Date(b.valid_from) : 0) -
          +(a.valid_from ? new Date(a.valid_from) : 0)
        );
      }
    }
    return map;
  }, [filtered]);

  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-center bg-cover" style={{ backgroundImage: `url('/media/weather.jpg')` }} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/90 backdrop-blur-[1px]" />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">NOTAM — Brasil (ativos)</h1>
          <p className="mt-2 text-sm opacity-80">
            Fonte: <a className="underline" href="https://aviationweather.gov/data/api/" target="_blank">Aviation Weather Center / NOAA</a>. Exibindo registros vigentes (janela recente).
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="buscar por FIR, aeródromo (SBxx), texto..."
              className="w-full max-w-md rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            />
            <button onClick={load} className="btn btn-sm">Recarregar</button>
          </div>
          {loading && <div className="mt-2 text-sm opacity-70">Carregando…</div>}
          {err && <div className="mt-2 text-sm text-red-300">Erro: {err}</div>}
        </header>

        {/* LISTA */}
        {grouped.size === 0 ? (
          <div className="opacity-70">Nenhum NOTAM ativo encontrado.</div>
        ) : (
          <div className="space-y-5">
            {[...grouped.entries()].map(([fir, byAd]) => (
              <div key={fir} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">FIR {fir}</h2>
                  <div className="text-xs opacity-70">Aeródromos: {[...byAd.keys()].join(', ')}</div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {[...byAd.entries()].map(([ad, rows]) => (
                    <div key={ad} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-semibold">{ad}</div>
                        <span className="text-[11px] rounded px-2 py-0.5 bg-green-500/15 border border-green-500/30 text-green-300">ATIVO</span>
                      </div>

                      <div className="space-y-2">
                        {rows.map(n => (
                          <article key={n.id} className="rounded border border-white/10 p-2 text-sm">
                            <div className="flex items-center gap-2 text-xs opacity-70">
                              {n.type && <span className="rounded bg-white/10 px-2 py-0.5">{n.type}</span>}
                              <span>{fmt(n.valid_from)} → {fmt(n.valid_to)}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap">{n.text}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legenda NOTAM (resumida) */}
        <details className="mt-6">
          <summary className="text-xs cursor-pointer opacity-80">Legenda rápida (NOTAM)</summary>
          <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs opacity-85">
            <div className="rounded border border-white/10 p-2">
              <div><b>A:</b> aeródromo ao qual se aplica</div>
              <div><b>B/C:</b> início / término de validade</div>
              <div><b>Q:</b> classificação do assunto (assunto/condição/nível)</div>
              <div><b>FIR:</b> Região de Informação de Voo</div>
            </div>
            <div className="rounded border border-white/10 p-2">
              <div><b>RWY/TWY/APRON</b>: pista/táxi/pátio</div>
              <div><b>WIP</b>: obras</div>
              <div><b>U/S</b>: inoperante</div>
              <div><b>AVBL/UNAVBL</b>: disponível/indisponível</div>
            </div>
          </div>
        </details>

        <footer className="mt-8 text-xs opacity-70">
          Dica: use a busca para filtrar por “SBGR”, “SBRJ”, “ILS”, “RWY”, etc.
        </footer>
      </section>
    </main>
  );
}
