'use client';

import { useEffect, useRef } from 'react';

type ATCSite = {
  id: string;
  name: string;
  type: 'ACC' | 'APP' | 'TWR';
  icao?: string;
  city?: string;
  state?: string;
  lat: number;
  lon: number;
  vhf: string[];
  uhf?: string[];
  source?: string;
};

type Props = {
  data: ATCSite[];
  visibleTypes: Set<string>;
};

export default function ATCMap({ data, visibleTypes }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any;
    let markers: any[] = [];

    (async () => {
      const L = await import('leaflet');
      // Corrige ícones do Leaflet no Next (path dos assets)
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Cria mapa
      map = L.map(mapRef.current!, {
        center: [-14.235, -51.925], // centro do Brasil
        zoom: 4,
        zoomControl: true,
      });

      // Tile escuro legível
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© OpenStreetMap contributors',
      }).addTo(map);

      // Adiciona marcadores filtrados
      const filtered = data.filter((d) => visibleTypes.has(d.type));
      const bounds = L.latLngBounds([]);

      filtered.forEach((d) => {
        const popupHtml = `
          <div style="min-width:220px">
            <div style="font-weight:600;font-size:14px;margin-bottom:2px">${d.name}</div>
            <div style="font-size:12px;opacity:.85;margin-bottom:6px">
              <span>${d.type}</span> ${d.icao ? `• <span>${d.icao}</span>` : ''} ${d.city ? `• ${d.city}/${d.state ?? ''}` : ''}
            </div>
            <div style="font-size:12px;line-height:1.3">
              <div><strong>VHF:</strong> ${d.vhf.join(', ')} MHz</div>
              ${
                d.uhf && d.uhf.length
                  ? `<div><strong>UHF:</strong> ${d.uhf.join(', ')} MHz</div>`
                  : ''
              }
              ${
                d.source
                  ? `<div style="opacity:.7;margin-top:6px">Fonte: ${d.source}</div>`
                  : ''
              }
            </div>
          </div>
        `;

        const marker = L.marker([d.lat, d.lon]).addTo(map).bindPopup(popupHtml);
        markers.push(marker);
        bounds.extend([d.lat, d.lon]);
      });

      if (filtered.length > 0) {
        map.fitBounds(bounds.pad(0.15));
      }

      // cleanup
      return () => {
        markers.forEach((m) => m.remove());
        map.remove();
      };
    })();

    // cleanup quando o componente desmonta
    return () => {
      // no-op; a IIFE já retorna um cleanup quando resolve
    };
  }, [data, visibleTypes]);

  return (
    <div
      ref={mapRef}
      className="h-[60vh] w-full rounded-xl overflow-hidden"
      // estiliza um leve contorno para destacar no fundo escuro
      style={{ outline: '1px solid rgba(255,255,255,.08)' }}
    />
  );
}
