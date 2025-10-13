'use client';

import { useMemo, useState } from 'react';

type Props = {
  onPick: (iso3: string) => void;
  className?: string; // <- NOVO
};

// Lista ISO-3 básica (pode ampliar à vontade)
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'AFG', name: 'Afeganistão' },
  { code: 'AGO', name: 'Angola' },
  { code: 'ALB', name: 'Albânia' },
  { code: 'DEU', name: 'Alemanha' },
  { code: 'AND', name: 'Andorra' },
  { code: 'ARE', name: 'Emirados Árabes Unidos' },
  { code: 'ARG', name: 'Argentina' },
  { code: 'AUS', name: 'Austrália' },
  { code: 'BRA', name: 'Brasil' },
  { code: 'CAN', name: 'Canadá' },
  { code: 'CHL', name: 'Chile' },
  { code: 'CHN', name: 'China' },
  { code: 'COL', name: 'Colômbia' },
  { code: 'DNK', name: 'Dinamarca' },
  { code: 'ESP', name: 'Espanha' },
  { code: 'FRA', name: 'França' },
  { code: 'GBR', name: 'Reino Unido' },
  { code: 'ITA', name: 'Itália' },
  { code: 'JPN', name: 'Japão' },
  { code: 'MEX', name: 'México' },
  { code: 'PER', name: 'Peru' },
  { code: 'PRT', name: 'Portugal' },
  { code: 'RUS', name: 'Rússia' },
  { code: 'USA', name: 'Estados Unidos' },
  // ...adicione mais conforme precisar
];

export default function CountryCodeLookup({ onPick, className }: Props) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.code.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term)
    );
  }, [q]);

  function choose(code: string) {
    onPick(code.toUpperCase());
    setQ('');
  }

  return (
    <div className={className}>
      <label className="text-sm block mb-2">Buscar sigla de país (ISO-3)</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar país ou sigla (ex.: BRA, Brasil)"
        className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 mb-2"
      />

      <div className="max-h-64 overflow-auto rounded border border-gray-800 divide-y divide-gray-800">
        {filtered.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => choose(c.code)}
            className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between"
          >
            <span>{c.name}</span>
            <span className="text-xs text-gray-400">{c.code}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">Nada encontrado.</div>
        )}
      </div>
    </div>
  );
}
