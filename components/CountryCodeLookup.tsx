'use client';
import { useMemo, useState } from 'react';
import countries from 'i18n-iso-countries';
import pt from 'i18n-iso-countries/langs/pt.json';

// registra nomes em PT
countries.registerLocale(pt as any);

type Props = { onPick: (code3: string) => void };

export default function CountryCodeLookup({ onPick }: Props) {
  const all = useMemo(() => {
    const names2 = countries.getNames('pt', { select: 'official' }) as Record<string, string>;
    return Object.entries(names2)
      .map(([a2, name]) => {
        const a3 = countries.alpha2ToAlpha3(a2);
        return a3 ? { code: a3, name } : null;
      })
      .filter(Boolean) as { code: string; name: string }[];
  }, []);

  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(i => i.code.toLowerCase().includes(term) || i.name.toLowerCase().includes(term));
  }, [all, q]);

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar país ou sigla (ex.: BRA, Brasil)"
        className="w-full bg-black/40 border border-gray-700 rounded px-3 py-1"
      />
      <ul className="max-h-64 overflow-auto text-sm divide-y divide-gray-800">
        {list.map(i => (
          <li key={i.code} className="py-1 flex items-center justify-between">
            <button className="hover:underline text-left" onClick={() => onPick(i.code)}>
              {i.name} <span className="text-gray-500">({i.code})</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
