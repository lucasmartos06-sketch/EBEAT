import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseConfigured } from '@/lib/config';
import { getActiveAuctions, shownPrice } from '@/lib/auctions';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = { title: 'Subastas' };
export const dynamic = 'force-dynamic';

export default async function SubastasPage() {
  const auctions = await getActiveAuctions();

  return (
    <div className="wrap page">
      <h1 className="title">Subastas</h1>
      <p className="lead">
        Los productores sacan una pista a un precio de salida bajo y los compradores pujan hasta fijar el
        precio final. Quien puje último y no sea superado queda obligado a comprarla.
      </p>

      <div style={{ marginTop: 24 }}>
        <Link href="/subastas/nueva" className="btn btn-primary">Subastar una pista</Link>
      </div>

      <div style={{ marginTop: 28, maxWidth: 820 }}>
        {!supabaseConfigured ? (
          <div className="notice warn"><strong>Falta conectar Supabase.</strong> Las subastas no están disponibles todavía.</div>
        ) : auctions.length === 0 ? (
          <div className="notice">No hay subastas activas ahora mismo. ¡Lanza la primera!</div>
        ) : (
          <div className="list">
            {auctions.map((a) => (
              <Link key={a.id} href={`/subastas/${a.id}`} className="list-item">
                <div style={{ minWidth: 0 }}>
                  <div className="tags" style={{ marginBottom: 8 }}>
                    {a.track_genre && <span className="tag">{a.track_genre}</span>}
                    <span className="badge open">{a.bid_count === 1 ? '1 puja' : `${a.bid_count} pujas`}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 18 }}>{a.track_title}</div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div className="faint" style={{ fontSize: 12 }}>{a.bid_count > 0 ? 'Puja actual' : 'Sale desde'}</div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{formatPrice(shownPrice(a))}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
