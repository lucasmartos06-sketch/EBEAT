'use client';

import { useState } from 'react';
import { authedFetch } from '@/lib/api';

export default function BuyButton({
  kind,
  id,
  label = 'Comprar',
  small = false,
}: {
  kind: 'track' | 'offer' | 'auction' | 'proposal';
  id: string;
  label?: string;
  small?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    const { ok, data } = await authedFetch('/api/checkout', { body: { kind, id } });
    if (ok && typeof data.url === 'string') {
      window.location.href = data.url;
      return;
    }
    setBusy(false);
    setError(typeof data.error === 'string' ? data.error : 'No se pudo iniciar el pago.');
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-primary ${small ? 'btn-sm' : 'btn-block'}`}
        style={small ? undefined : { marginTop: 22 }}
        onClick={pay}
        disabled={busy}
      >
        {busy ? 'Abriendo el pago…' : label}
      </button>
      {error && <div className="msg error">{error}</div>}
    </>
  );
}
