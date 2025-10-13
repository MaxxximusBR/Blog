'use client';

import { useEffect, useMemo, useState } from 'react';
import countries from 'i18n-iso-countries';
import pt from 'i18n-iso-countries/langs/pt.json';

countries.registerLocale(pt);

type Item = { code: string; name: string };

export default function CountryCodeLookup() {
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Mapeia ISO3 -> ISO2, depois pega nome em PT
  const all: Item[] = useMemo(() => {
    const alpha3to2 = countries.getAlpha3Codes() as Record<string, string>; // ex: { BRA: 'BR', USA: 'US', ... }
    const list: Item[] = Object.entries(alpha3to2).map(([a3, a2]) => ({
      code: a3,
      name: countries.getName(a2, 'pt') || a3,
    }));
    // ordena por nome
    return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, []);

  // filtro por nome ou código
  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((i) =>
      i.code.toLowerCase().includes(t) || i.name.toLowerCase().includes(t)
    );
  }, [q, all]);

  async function pick(code: string) {
    // copia a sigla
    try {
      await navigator.clipboard?.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    }
    // dispara evento opcional para o seu mapa “ouvir” e focar o país
    try {
      window.dispatchEvent(new CustomEvent('ufo:selectCountry', { detail: { code } }));
    } catch {}
  }

  // acessibilidade: Enter seleciona o item focado
  function onKey(e: React.KeyboardEvent<HTMLButtonElement>, code: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(code);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-lg font-semibold mb-3">Pesquisar siglas (ISO-3)</h3>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ex.: BRA, USA, Argentina…"
        className="w-full px-3 py-2 rounded bg-black/10 border mb-3"
        aria-label="Pesquisar país por nome ou sigla"
      />

      <div className="max-h-80 overflow-auto pr-1">
        <ul className="space-y-1">
          {items.map((i) => (
            <li key={i.code}>
              <button
                onClick={() => pick(i.code)}
                onKeyDown={(e) => onKey(e, i.code)}
                className="w-full text-left px-3 py-2 rounded hover:bg-white/10 focus:bg-white/10 flex items-center justify-between"
                aria-label={`Selecionar ${i.name}, sigla ${i.code}`}
              >
                <span className="truncate">{i.name}</span>
                <span className="font-mono text-xs opacity-80 ml-3">{i.code}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {copied && (
        <div className="text-xs mt-3 opacity-80">
          Copiado: <span className="font-mono">{copied}</span>
        </div>
      )}
    </div>
  );
}
