'use client';

import { useEffect, useMemo, useState } from 'react';

type Notam = {
  id: string;
  fir?: string;
  icao?: string;
  text: string;
  start?: string | null;
  end?: string | null;
};

function normalize(s: string) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export default function NotamPage() {
  const [items, setItems] = useState<Notam[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      // você pode trocar os FIRs aqui, se quiser filtrar menos
      const r = await fetch('/api/awx/notam?fir=SBAZ,SBBS,SBRE,SBCW', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const arr = Array.isArray(j?.items) ? j.items : [];
      setItems(arr);
    } catch (e: any) {
      setErr(e.message || 'Falha ao carregar');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return items;
    return items.filter(it => {
      const hay = [it.id, it.fir, it.icao, it.text].map(x => normalize(String(x ?? ''))).join(' ');
      return hay.includes(nq);
    });
  }, [items, q]);

  return (
    <main className="relative">
      {/* BG escurecido */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url('/media/weather.jpg')` }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/90 backdrop-blur-[1px]" />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        {/* Cabeçalho com o VÍDEO à direita */}
        <header className="mb-6 md:mb-8">
          <div className="flex items-start gap-4 md:gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                NOTAM — Brasil (ativos)
              </h1>
              <p className="mt-2 text-sm opacity-80">
                Fonte: <a className="underline" href="https://aviationweather.gov/data/api/" target="_blank">Aviation Weather Center / NOAA</a>. Exibindo registros vigentes (janela recente).
              </p>

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="buscar por FIR, aeródromo (SBxx), texto..."
                  className="w-full max-w-[440px] rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                  onClick={() => load()}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                >
                  Recarregar
                </button>
              </div>

              {err && <div className="mt-3 text-sm text-red-400">Erro: {err}</div>}
            </div>

            {/* VÍDEO à direita do título */}
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
                  {/* Você disse que enviou para /public/media — use o nome do seu arquivo */}
                  <source src="/media/landing.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </header>

        {/* Lista */}
        {loading ? (
          <div className="opacity-70">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="opacity-70">Nenhum NOTAM ativo encontrado.</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((n) => {
              const startTxt = n.start ? new Date(n.start).toLocaleString('pt-BR', { hour12: false }) : '';
              const endTxt   = n.end   ? new Date(n.end).toLocaleString('pt-BR', { hour12: false }) : '';
              return (
                <article key={n.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{n.icao ? `${n.icao} • ` : ''}{n.fir}</div>
                    <div className="text-xs opacity-70">{startTxt} {startTxt || endTxt ? '→' : ''} {endTxt}</div>
                  </div>
                  <p className="mt-2 text-sm opacity-90 whitespace-pre-wrap">{n.text}</p>
                </article>
              );
            })}
          </div>
        )}

        {/* Legenda rápida (NOTAM) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm opacity-80">Legenda rápida (NOTAM)</summary>
          <div className="mt-2 text-sm opacity-80 space-y-1">
            <p><b>RWY</b> = pista • <b>TWY</b> = taxiway • <b>ILS/LOC/GS</b> = auxílio de aproximação • <b>VOR/NDB</b> = rádio-ajudas</p>
            <p><b>ABT</b> = sobre • <b>CLSD</b> = fechado • <b>WIP</b> = obra • <b>U/S</b> = inoperante • <b>AVBL</b> = disponível</p>
            <p><b>EST</b> = estimado • <b>PERM</b> = permanente • <b>W.E.F.</b> = válido a partir • <b>TL</b> = até</p>
          </div>
        </details>

        <footer className="mt-8 text-xs opacity-70">
          Dados via <a className="underline" href="https://aviationweather.gov/data/api/" target="_blank">AviationWeather.gov Data API</a>.
        </footer>
      </section>
    </main>
  );
}
