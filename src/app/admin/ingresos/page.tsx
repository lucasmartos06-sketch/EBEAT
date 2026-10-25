import type { Metadata } from 'next';
import IncomeDashboard from '@/components/IncomeDashboard';

export const metadata: Metadata = { title: 'Ingresos de la plataforma', robots: { index: false, follow: false } };

export default function IngresosPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Ingresos de la plataforma</h1>
      <p className="lead">Lo que gana eBeat con las comisiones. Solo lo ven los administradores.</p>
      <div style={{ marginTop: 32 }}>
        <IncomeDashboard />
      </div>
    </div>
  );
}
