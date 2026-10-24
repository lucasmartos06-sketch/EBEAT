import type { Metadata } from 'next';
import NewCommissionForm from '@/components/NewCommissionForm';

export const metadata: Metadata = { title: 'Pedir un beat' };

export default function NuevoEncargoPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Pedir un beat</h1>
      <p className="lead">Cuéntanos qué necesitas. Los productores te enviarán propuestas y tú eliges la que más te guste.</p>
      <div style={{ marginTop: 32 }}>
        <NewCommissionForm />
      </div>
    </div>
  );
}
