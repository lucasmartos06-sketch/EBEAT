import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';
import AuthNav from '@/components/AuthNav';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Sube tus beats, fija tu precio y licencia tu música a quien la necesita.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="logo">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M4 12V16M10 6V22M16 10V18M22 3V25" stroke="#C6F135" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
              {APP_NAME}
            </Link>
            <nav className="nav">
              <Link href="/catalogo" className="nav-link">Catálogo</Link>
              <Link href="/encargos" className="nav-link">Encargos</Link>
              <Link href="/subastas" className="nav-link">Subastas</Link>
              <Link href="/ranking" className="nav-link">Ranking</Link>
              <Link href="/mensajes" className="nav-link">Mensajes</Link>
              <AuthNav />
              <Link href="/subir" className="btn btn-primary btn-sm">Subir pista</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <div>{APP_NAME} · Versión de pruebas</div>
            <nav>
              <Link href="/catalogo">Catálogo</Link>
              <Link href="/encargos">Encargos</Link>
              <Link href="/subastas">Subastas</Link>
              <Link href="/ranking">Ranking</Link>
              <Link href="/normas">Normas</Link>
              <Link href="/mensajes">Mensajes</Link>
              <Link href="/subir">Subir pista</Link>
              <Link href="/entrar">Entrar</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
