import type { Metadata } from 'next';
import NewAuctionForm from '@/components/NewAuctionForm';

export const metadata: Metadata = { title: 'Subastar una pista' };

export default function NuevaSubastaPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Subastar una pista</h1>
      <p className="lead">Elige una de tus pistas, un precio de salida y cuánto dura la subasta.</p>
      <div style={{ marginTop: 32 }}>
        <NewAuctionForm />
      </div>
    </div>
  );
}
