'use client';

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import('react-leaflet').then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import('react-leaflet').then(m => m.Marker),       { ssr: false });
const Popup        = dynamic(() => import('react-leaflet').then(m => m.Popup),        { ssr: false });

type Plane = {
  hex: string; callsign: string; country: string;
  lat: number; lon: number; altitude?: number; speed?: number; heading?: number; last?: number;
};

export default function AdsbLiveMap({
  center = [-30.03, -51.22],
  radiusDeg = 4,
  height = 420,
}: { center?: [number, number]; radiusDeg?: number; height?: number }) {

  const [planes, setPlanes] = useState<Plane[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  const query = useMemo(() => {
    const [lat, lon] = center;
    return `/api/opensky?lat=${lat}&lon=${lon}&r=${radiusDeg}`;
  }, [center, radiusDeg]);

  useEffect(() => {
    let timer: any;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(query, { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.msg || `HTTP ${r.status}`);
        setPlanes(j.items || []);
        setErr('');
      } catch (e:any) {
        setErr(e?.message || 'Falha');
      } finally {
        setLoading(false);
        timer = setTimeout(load, 15000); // atualiza a cada 15s
      }
    }
    load();
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div style={{ height }}>
        <MapContainer center={center as any} zoom={8} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {planes.map(p => (
            <Marker key={p.hex} position={[p.lat, p.lon] as any}>
              <Popup>
                <div className="text-sm">
                  <div><strong>{p.callsign || p.hex}</strong></div>
                  <div>País: {p.country}</div>
                  {p.altitude != null && <div>Alt: {Math.round(p.altitude)} m</div>}
                  {p.speed != null && <div>Vel: {Math.round(p.speed)} m/s</div>}
                  {p.heading != null && <div>Rumo: {Math.round(p.heading)}°</div>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="p-2 text-xs opacity-70">
        {loading ? 'Atualizando… ' : ''}{err ? `Erro: ${err}` : `${planes.length} aeronaves`}
      </div>
    </div>
  );
}
