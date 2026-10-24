'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { useUserId } from '@/lib/useUserId';

export default function NegotiateButton({
  trackId,
  producerId,
  demo,
}: {
  trackId: string;
  producerId?: string;
  demo?: boolean;
}) {
  const router = useRouter();
  const userId = useUserId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (demo) {
    return (
      <div className="faint" style={{ marginTop: 12, fontSize: 13 }}>
        Las pistas de ejemplo no admiten negociación.
      </div>
    );
  }
  if (userId === undefined) return null;
  if (userId && userId === producerId) {
    return (
      <div className="faint" style={{ marginTop: 12, fontSize: 13 }}>
        Es tu pista. Las ofertas de los compradores llegarán a tus{' '}
        <Link href="/mensajes" style={{ color: 'var(--accent)' }}>mensajes</Link>.
      </div>
    );
  }
  if (userId === null) {
    return (
      <Link href="/entrar" className="btn btn-ghost btn-block" style={{ marginTop: 12 }}>
        Entra para negociar el precio
      </Link>
    );
  }

  async function start() {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await sb.rpc('start_track_conversation', { p_track: trackId });
    setBusy(false);
    if (rpcError || !data) {
      setError(rpcError?.message ?? 'No se pudo abrir el chat.');
      return;
    }
    router.push(`/mensajes/${data}`);
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={start} disabled={busy}>
        {busy ? 'Abriendo chat…' : 'Negociar con el productor'}
      </button>
      {error && <div className="msg error">{error}</div>}
    </>
  );
}
