import type { Metadata } from 'next';
import PayoutsCard from '@/components/PayoutsCard';
import ProducerPanel from '@/components/ProducerPanel';
import PurchasesList from '@/components/PurchasesList';

export const metadata: Metadata = { title: 'Mi panel', robots: { index: false, follow: false } };

export default function PanelPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Mi panel</h1>
      <p className="lead">Tus ventas, ganancias, compras, subastas, propuestas y posición en el ranking.</p>
      <div style={{ marginTop: 32 }}>
        <PayoutsCard />
        <PurchasesList />
        <ProducerPanel />
      </div>
    </div>
  );
}
