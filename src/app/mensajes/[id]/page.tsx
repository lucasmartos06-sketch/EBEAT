import Link from 'next/link';
import ChatRoom from '@/components/ChatRoom';

export const metadata = { title: 'Conversación' };

export default async function ConversacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="wrap page" style={{ paddingTop: 40 }}>
      <Link href="/mensajes" className="muted" style={{ fontSize: 15, fontWeight: 500 }}>
        ← Todos los mensajes
      </Link>
      <div style={{ marginTop: 24, maxWidth: 760 }}>
        <ChatRoom id={id} />
      </div>
    </div>
  );
}
