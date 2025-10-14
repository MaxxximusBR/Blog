'use client';

import { useEffect, useState } from 'react';

const IFRAME_URL = 'https://www.adsbdb.com/';

export default function AdsbPanel() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'blocked'>('loading');

  useEffect(() => {
    // Se em 6s não disparar onLoad, assumimos que o iframe foi bloqueado
    const t = setTimeout(() => {
      setStatus((s) => (s === 'loading' ? 'blocked' : s));
    }, 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-lg font-semibold">Rastreamento de Voos (ADS-B)</h2>
          <p className="text-xs opacity-70">
            Fonte: <span className="underline">adsbdb.com</span>
          </p>
        </div>
        <a
          href={IFRAME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          Abrir em nova aba
        </a>
      </header>

      {/* Área do mapa */}
      <div className="relative">
        {/* Iframe (tenta embutir) */}
        <iframe
          title="ADS-B Live Map"
          src={IFRAME_URL}
          className="w-full h-[70vh] bg-black"
          loading="lazy"
          onLoad={() => setStatus('ok')}
        />

        {/* Fallback se o site impedir embed */}
        {status !== 'ok' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/70 to-black/40 backdrop-blur-sm">
            <div className="text-center px-6">
              <div className="text-sm opacity-80 mb-3">
                O provedor pode bloquear a incorporação em iframe.
              </div>
              <a
                href={IFRAME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm inline-block"
              >
                Abrir o mapa em nova aba
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
