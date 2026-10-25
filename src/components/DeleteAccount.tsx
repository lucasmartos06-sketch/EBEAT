'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { useUserId } from '@/lib/useUserId';

export default function DeleteAccount() {
  const router = useRouter();
  const userId = useUserId();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) return null;

  async function remove() {
    const sb = getSupabase();
    if (!sb || !userId) return;
    setError(null);
    setBusy(true);

    // Primero se borran los archivos de audio de la cuenta.
    const { data: files } = await sb.storage.from('previews').list(userId, { limit: 1000 });
    if (files && files.length > 0) {
      await sb.storage.from('previews').remove(files.map((f) => `${userId}/${f.name}`));
    }

    const { error: rpcError } = await sb.rpc('delete_my_account');
    if (rpcError) {
      setBusy(false);
      return setError(rpcError.message);
    }
    await sb.auth.signOut();
    router.push('/');
  }

  return (
    <div className="form" style={{ maxWidth: 720, borderColor: 'var(--danger)' }}>
      <h2 style={{ fontSize: 22, marginBottom: 10 }}>Borrar mi cuenta</h2>
      <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, margin: '0 0 16px' }}>
        Se borrarán tu perfil, tus pistas, tus mensajes y tus encargos. No se puede deshacer. No podrás borrarla si
        tienes subastas activas, una subasta ganada sin cobrar o un encargo en curso.
      </p>
      <div className="field-group">
        <label htmlFor="del" className="label">Escribe BORRAR para confirmar</label>
        <input id="del" className="field" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      </div>
      <button type="button" className="btn btn-ghost" disabled={busy || text.trim() !== 'BORRAR'} onClick={remove}>
        {busy ? 'Borrando…' : 'Borrar mi cuenta definitivamente'}
      </button>
      {error && <div className="msg error">{error}</div>}
    </div>
  );
}
