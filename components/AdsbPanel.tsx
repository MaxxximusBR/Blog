// components/AdsbPanel.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

const IFRAME_URL = 'https://www.adsbdb.com/';

export default function AdsbPanel() {
  const [state, setState] = useState<'loading'|'ok'|'blocked'>('loading');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Se o onLoad não disparar, consideramos bloqueado após 5s
    timer.current = window.setTimeout(() => setState('blocked'), 5000);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-lg font-semibold">Rastreamento de Voos (ADS-B)</h2>
          <p className="text-xs opacity-70">Fonte: adsbdb.com</p>
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

      <div className="relative h-[70vh]">
        <iframe
          title="ADS-B Live Map"
          src={IFRAME_URL}
          className="absolute inset-0 w-full h-full bg-black"
          loading="lazy"
          onLoad={() => setState('ok')}
        />
        {state !== 'ok' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="text-sm opacity-80">Carregando…</div>
              <a
                href={IFRAME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm inline-block"
              >
                Abrir o mapa em nova aba
              </a>
              {state === 'blocked' && (
                <div className="text-xs opacity-70 max-w-sm mx-auto">
                  O provedor não permite exibição em iframe (política X-Frame-Options/CSP). Use o botão acima.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
