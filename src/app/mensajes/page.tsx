import type { Metadata } from 'next';
import ConversationList from '@/components/ConversationList';

export const metadata: Metadata = { title: 'Mensajes' };

export default function MensajesPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Mensajes</h1>
      <p className="lead">Negocia el precio y los detalles directamente con compradores y productores.</p>
      <div style={{ marginTop: 32, maxWidth: 760 }}>
        <ConversationList />
      </div>
    </div>
  );
}
