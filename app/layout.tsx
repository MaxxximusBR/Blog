// app/layout.tsx
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Anuário OVNIs 2025 / Luzes POA 2022 — Blog',
  description: 'Relatórios mensais, dashboards e mapa mundial.',
  openGraph: { title: 'Anuário OVNIs 2025 / Luzes POA 2022', images: ['/og.png'] },
  icons: { icon: '/favicon.ico' }
};

export default function RootLayout({ children }:{ children:React.ReactNode }){
  return (
    <html lang="pt-br">
      <body>
        <header className="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-[color:var(--border)]">
          <div className="container-narrow flex items-center justify-between py-3">
            <Link href="/" className="font-semibold tracking-wide">
              Anuário OVNIs 2025 / Luzes POA 2022
            </Link>

            <nav className="flex gap-4 text-sm">
              <Link href="/reports" className="hover:underline">Relatórios</Link>
              <Link href="/dashboard" className="hover:underline">Consolidação</Link>
              <Link href="/news" className="hover:underline">Notícias</Link>
              <Link href="/atc-frequencias" className="hover:underline">Frequências ATC</Link>
              <Link href="/metar" className="hover:underline">METAR</Link>
              {/* novo item do menu */}
              <Link href="/notam" className="hover:underline">NOTAM</Link>
              <a
                href="https://www.youtube.com/@LuzesAbismo"
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                YouTube
              </a>
              <Link href="/login" className="hover:underline">Admin</Link>
            </nav>
          </div>
        </header>

        <main className="container-narrow py-8">{children}</main>

        <footer className="container-narrow py-12 text-sm text-gray-400">
          © 2025 — Projeto Luzes do Abismo + Luzes POA 2022
        </footer>
      </body>
    </html>
  );
}
