// components/AdsbPanel.tsx
'use client';

import { useMemo } from 'react';

type Props = {
  provider?: 'adsbdb' | 'adsbfi' | 'adsblol';
  zoom?: number;         // 2 a ~12 (depende do provider)
  lat?: number;          // opcional: se não passar, não fixa centro
  lon?: number;          // opcional
  height?: number;       // px
  hideUI?: boolean;      // esconde sidebar/botões
  resetView?: boolean;   // força ignorar preferências salvas do usuário
};

export default function AdsbPanel({
  provider = 'adsbdb',
  zoom = 3,
  lat,
  lon,
  height = 420,
  hideUI = true,
  resetView = true,
}: Props) {
  // 1) Base do viewer por provedor
  //    (Se o /globe não abrir no adsbdb, troque para adsblol ou adsbfi abaixo.)
  const base = useMemo(() => {
    switch (provider) {
      case 'adsbfi':  return 'https://globe.adsb.fi';   // tar1090
      case 'adsblol': return 'https://adsb.lol';        // tar1090
      default:        return 'https://www.adsbdb.com/globe'; // tar1090 do adsbdb
    }
  }, [provider]);

  // 2) Monta query string do tar1090
  const params = new URLSearchParams();
  if (hideUI) {
    params.set('hideSideBar', '1');
    params.set('hideButtons', '1');
  }
  if (typeof zoom === 'number') params.set('zoom', String(zoom));
  if (typeof lat === 'number' && typeof lon === 'number') {
    params.set('lat', String(lat));
    params.set('lon', String(lon));
  }
  if (resetView) params.set('reset', '1'); // limpa preferências salvas e aplica a URL

  // 3) URL final (sem lat/lon => provedor decide centro “global”)
  const url = `${base}?${params.toString()}`;

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div style={{ position: 'relative', height }}>
        <iframe
          title="Mapa ADS-B (tar1090)"
          src={url}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: '0' }}
          referrerPolicy="no-referrer"
          allow="fullscreen"
        />
      </div>
      <div className="flex items-center justify-end gap-2 p-2 text-xs opacity-75">
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
          Abrir em aba nova
        </a>
      </div>
    </div>
  );
}
