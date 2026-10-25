'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import { useUserId } from '@/lib/useUserId';

type Purchase = {
  id: string;
  title: string | null;
  source: 'purchase' | 'auction' | 'commission';
  amount_cents: number;
  status: 'pending' | 'paid' | 'refunded';
  original_path: string | null;
  created_at: string;
};

export default function PurchasesList() {
  const userId = useUserId();
  const [rows, setRows] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;
    sb.from('orders')
      .select('id,title,source,amount_cents,status,original_path,created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setRows((data ?? []) as Purchase[]));
  }, [userId]);

  if (!userId || rows === null) return null;

  async function download(p: Purchase) {
    const sb = getSupabase();
    if (!sb || !p.original_path) return;
    setError(null);
    const { data, error: e } = await sb.storage.from('originals').createSignedUrl(p.original_path, 120, { download: true });
    if (e || !data) return setError('No se pudo preparar la descarga: ' + (e?.message ?? 'error desconocido'));
    window.location.href = data.signedUrl;
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <h2 className="section" style={{ fontSize: 28 }}>Mis compras</h2>
      {rows.length === 0 ? (
        <div className="notice" style={{ marginTop: 16, maxWidth: 720 }}>
          Todavía no has comprado nada. <Link href="/catalogo" style={{ color: 'var(--accent)', fontWeight: 600 }}>Explora el catálogo</Link>.
        </div>
      ) : (
        <div className="list" style={{ marginTop: 16, maxWidth: 820 }}>
          {rows.map((p) => (
            <div key={p.id} className="list-item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.title ?? 'Compra'}</div>
                <div className="faint" style={{ fontSize: 13 }}>
                  {new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' · '}{formatPrice(p.amount_cents)}
                  {p.status === 'refunded' ? ' · Devuelta' : ''}
                </div>
              </div>
              {p.status === 'paid' && p.original_path && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => download(p)}>Descargar</button>
              )}
              {p.status === 'paid' && !p.original_path && p.source === 'commission' && (
                <span className="faint" style={{ fontSize: 13 }}>El productor te entrega el beat por el chat</span>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <div className="msg error">{error}</div>}
    </div>
  );
}
