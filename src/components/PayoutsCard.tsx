'use client';

import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/api';
import { useUserId } from '@/lib/useUserId';

type Status = { payments: boolean; connected?: boolean; charges_enabled?: boolean; payouts_enabled?: boolean };

export default function PayoutsCard() {
  const userId = useUserId();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    authedFetch('/api/connect/status', { method: 'GET' }).then(({ ok, data }) => {
      if (ok) setStatus(data as unknown as Status);
      else setStatus({ payments: false });
    });
  }, [userId]);

  if (!userId || !status) return null;

  async function activate() {
    setBusy(true);
    setError(null);
    const { ok, data } = await authedFetch('/api/connect/onboard');
    if (ok && typeof data.url === 'string') {
      window.location.href = data.url;
      return;
    }
    setBusy(false);
    setError(typeof data.error === 'string' ? data.error : 'No se pudo abrir Stripe.');
  }

  let body;
  if (!status.payments) {
    body = <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>Los cobros todavía no están activados en eBeat. En cuanto lo estén, podrás conectar tu cuenta aquí.</p>;
  } else if (status.charges_enabled) {
    body = (
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--accent)' }}>Cobros activados.</strong>{' '}
        {status.payouts_enabled
          ? 'Tus ventas se ingresan en tu cuenta bancaria a través de Stripe.'
          : 'Falta completar algún dato en Stripe para recibir los ingresos en tu banco.'}
      </p>
    );
  } else {
    body = (
      <>
        <p className="muted" style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.55 }}>
          {status.connected
            ? 'Tu cuenta de cobro está creada pero falta completar tus datos en Stripe.'
            : 'Para vender necesitas conectar una cuenta de cobro. Stripe te pedirá tus datos y tu cuenta bancaria; eBeat no los guarda.'}
        </p>
        <button type="button" className="btn btn-primary btn-sm" onClick={activate} disabled={busy}>
          {busy ? 'Abriendo Stripe…' : status.connected ? 'Completar datos en Stripe' : 'Activar cobros'}
        </button>
      </>
    );
  }

  return (
    <div className="panel" style={{ marginBottom: 32, maxWidth: 720 }}>
      <strong>Cobros</strong>
      <div style={{ marginTop: 10 }}>{body}</div>
      {error && <div className="msg error">{error}</div>}
    </div>
  );
}
