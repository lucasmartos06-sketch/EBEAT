import type { Metadata } from 'next';
import SanctionsAdmin from '@/components/SanctionsAdmin';

export const metadata: Metadata = { title: 'Sanciones', robots: { index: false, follow: false } };

export default function SancionesPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Sanciones por fraude</h1>
      <p className="lead">Aplica avisos, suspensiones, anulaciones y expulsiones según las normas. Solo para administradores.</p>
      <div style={{ marginTop: 32 }}>
        <SanctionsAdmin />
      </div>
    </div>
  );
}
