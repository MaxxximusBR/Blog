'use client';

import { useEffect, useMemo, useState } from 'react';

type Country = { name: string; iso3: string };
type Props = {
  onPick?: (iso3: string) => void;
  className?: string;
  placeholder?: string;
};

export default function CountryCodeLookup({
  onPick,
  className = '',
  placeholder = 'Buscar país ou sigla (ex.: BRA, Brasil)',
}: Props) {
  const [all, setAll] = useState<Country[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // world-countries: tem campo name.common e cca3 (ISO-3)
        const url = 'https://cdn.jsdelivr.net/npm/world-countries@latest/countries.json';
        const r = await fetch(url, { cache: 'force-cache' });
        const json = await r.json();
        const parsed: Country[] = (json || []).map((c: any) => ({
          name: c?.name?.common || c?.name || c?.cca3 || '',
          iso3: (c?.cca3 || '').toUpperCase(),
        })).filter((x: Country) => x.iso3 && x.name);

        if (alive) setAll(parsed.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e: any) {
        if (!alive) return;
        setErr('Falha ao carregar lista completa; usando fallback reduzido.');
        // Fallback mínimo (caso CDN bloqueie)
        setAll([
          { name: 'Brazil', iso3: 'BRA' },
          { name: 'United States', iso3: 'USA' },
          { name: 'Argentina', iso3: 'ARG' },
          { name: 'Chile', iso3: 'CHL' },
          { name: 'Uruguay', iso3: 'URY' },
          { name: 'Paraguay', iso3: 'PRY' },
          { name: 'Canada', iso3: 'CAN' },
          { name: 'France', iso3: 'FRA' },
          { name: 'Germany', iso3: 'DEU' },
          { name: 'Japan', iso3: 'JPN' },
        ]);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return all.slice(0, 200); // limita render
    const s = q.trim().toLowerCase();
    return all.filter(c =>
      c.name.toLowerCase().includes(s) || c.iso3.toLowerCase().includes(s)
    );
  }, [q, all]);

  return (
    <div className={className}>
      <label className="block text-sm opacity-80 mb-2">Buscar sigla de país (ISO-3)</label>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded bg-black/20 border border-white/10 outline-none"
        inputMode="search"
      />

      {err && <div className="mt-2 text-xs opacity-70">{err}</div>}

      <div className="mt-3 max-h-72 overflow-auto rounded border border-white/10">
        <ul className="divide-y divide-white/10">
          {filtered.map((c) => (
            <li
              key={c.iso3}
              className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer"
              onClick={() => onPick?.(c.iso3)}
            >
              <span>{c.name}</span>
              <span className="text-xs opacity-70">{c.iso3}</span>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm opacity-70">Nenhum país encontrado.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
