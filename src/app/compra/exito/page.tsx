import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Pago completado', robots: { index: false, follow: false } };

export default function ExitoPage() {
  return (
    <div className="wrap page">
      <h1 className="title">¡Pago completado!</h1>
      <p className="lead">
        Gracias por tu compra. En unos segundos la verás en «Mis compras», donde podrás descargar el beat
        (si es un encargo, el productor te lo entregará por el chat).
      </p>
      <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Link href="/panel" className="btn btn-primary">Ir a mis compras</Link>
        <Link href="/catalogo" className="btn btn-ghost">Seguir explorando</Link>
      </div>
    </div>
  );
}
