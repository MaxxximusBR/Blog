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

type CoveragePoly = {
  id: string;
  name: string;
  cindacta: 'I' | 'II' | 'III' | 'IV';
  color: string;
  coords: [number, number][]; // [lat, lon]
};

type Props = {
  data: ATCSite[];
  visibleTypes: Set<string>;
  mode: 'points' | 'coverage';
  coverage: CoveragePoly[];
};

export default function ATCMap({ data, visibleTypes, mode, coverage }: Props) {
  const mapElRef = useRef<HTMLDivElement | null>(null);

  // refs para instâncias
  const LRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const overlayRef = useRef<any>(null); // LayerGroup para marcadores/polígonos

  // 1) Cria o mapa UMA vez
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');

      // Corrige paths dos ícones no Next
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

      if (cancelled) return;

      LRef.current = L;

      mapRef.current = L.map(mapElRef.current!, {
        center: [-14.235, -51.925], // centro Brasil
        zoom: 4,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);

      overlayRef.current = L.layerGroup().addTo(mapRef.current);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        LRef.current = null;
        overlayRef.current = null;
      }
    };
  }, []);

  // 2) Atualiza camadas quando props mudam (sem recriar o mapa)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!L || !map || !overlay) return;

    // limpa overlay anterior
    overlay.clearLayers();

    const bounds = L.latLngBounds([]);

    if (mode === 'points') {
      const filtered = data.filter((d) => visibleTypes.has(d.type));

      filtered.forEach((d) => {
        const popupHtml = `
          <div style="min-width:220px">
            <div style="font-weight:600;font-size:14px;margin-bottom:2px">${d.name}</div>
            <div style="font-size:12px;opacity:.85;margin-bottom:6px">
              <span>${d.type}</span> ${d.icao ? `• <span>${d.icao}</span>` : ''} ${d.city ? `• ${d.city}/${d.state ?? ''}` : ''}
            </div>
            <div style="font-size:12px;line-height:1.3">
              <div><strong>VHF:</strong> ${d.vhf.join(', ')} MHz</div>
              ${d.uhf && d.uhf.length ? `<div><strong>UHF:</strong> ${d.uhf.join(', ')} MHz</div>` : ''}
              ${d.source ? `<div style="opacity:.7;margin-top:6px">Fonte: ${d.source}</div>` : ''}
            </div>
          </div>
        `;
        const m = L.marker([d.lat, d.lon]).bindPopup(popupHtml);
        m.addTo(overlay);
        bounds.extend([d.lat, d.lon]);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.15));
      }
    } else {
      // cobertura CINDACTA
      coverage.forEach((p) => {
        const poly = L.polygon(p.coords, {
          color: p.color,
          weight: 2,
          opacity: 0.9,
          fillColor: p.color,
          fillOpacity: 0.15,
        }).bindTooltip(p.name, { sticky: true });

        poly.addTo(overlay);
        p.coords.forEach(([lat, lon]) => bounds.extend([lat, lon]));
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1));
      }
    }
  }, [data, visibleTypes, mode, coverage]);

  return (
    <div
      ref={mapElRef}
      className="h-[60vh] w-full rounded-xl overflow-hidden"
      style={{ outline: '1px solid rgba(255,255,255,.08)' }}
    />
  );
}
