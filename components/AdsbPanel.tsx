'use client';
type Props = { lat?: number; lon?: number; zoom?: number; title?: string };
function buildUrl({ lat = -30.03, lon = -51.22, zoom = 6 }: Props) {
  return `https://globe.adsb.fi/?hideSidebar=1&hideButtons=1&lat=${lat}&lon=${lon}&zoom=${zoom}`;
}
export default function AdsbPanel(props: Props) {
  const url = buildUrl(props);
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{props.title || 'Tráfego aéreo em tempo real'}</h3>
          <p className="text-sm opacity-70">Abre em nova aba (mapa interativo externo).</p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn">Abrir mapa</a>
      </div>
      {/* área visual apenas decorativa; não é iframe (evita bloqueio X-Frame-Options) */}
      <div className="mt-4 h-56 rounded-xl bg-gradient-to-br from-indigo-900/30 to-black/30 flex items-center justify-center text-sm opacity-60 select-none">
        globe.adsb.fi • tar1090
      </div>
    </div>
  );
}
