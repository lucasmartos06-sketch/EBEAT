'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { COMMISSION_PERCENT, supabaseConfigured } from '@/lib/config';
import { formatPrice } from '@/lib/format';
import { monthLabel } from '@/lib/ranking';
import { useUserId } from '@/lib/useUserId';

type MonthRow = { month: string; orders: number; gross_cents: number; commission_cents: number };
type GenreRow = { genre: string; orders: number; gross_cents: number; commission_cents: number };
type OrderRow = {
  id: string;
  created_at: string;
  source: 'purchase' | 'auction' | 'commission';
  genre: string | null;
  amount_cents: number;
  commission_cents: number;
  status: 'pending' | 'paid' | 'refunded';
};
type Income = {
  totals: { orders: number; gross_cents: number; commission_cents: number };
  refunded_cents: number;
  by_month: MonthRow[];
  by_genre: GenreRow[];
  recent: OrderRow[];
  pending_auctions: { count: number; total_cents: number };
};

const SOURCE: Record<string, string> = { purchase: 'Compra', auction: 'Subasta', commission: 'Encargo' };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="box" style={{ padding: 22 }}>
      <div className="faint" style={{ fontSize: 13 }}>{label}</div>
      <div className="price-big" style={{ fontSize: 34, marginTop: 6 }}>{value}</div>
      {hint && <div className="faint" style={{ fontSize: 13, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default function IncomeDashboard() {
  const userId = useUserId();
  const [data, setData] = useState<Income | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;
    sb.rpc('admin_income').then(({ data: d, error: e }) => {
      if (e) setError(e.message);
      else setData(d as Income);
    });
  }, [userId]);

  if (!supabaseConfigured) {
    return <div className="notice warn"><strong>Falta conectar Supabase.</strong></div>;
  }
  if (userId === undefined) return <div className="muted">Comprobando sesión…</div>;
  if (userId === null) {
    return (
      <div className="notice">
        <strong>Entra con tu cuenta de administrador.</strong>{' '}
        <Link href="/entrar" style={{ color: 'var(--accent)', fontWeight: 600 }}>Entrar</Link>
      </div>
    );
  }
  if (error) {
    return (
      <div className="notice warn">
        {error.includes('administradores')
          ? 'Esta página es solo para administradores de eBeat.'
          : 'No se pudieron cargar los ingresos: ' + error}
      </div>
    );
  }
  if (!data) return <div className="muted">Cargando ingresos…</div>;

  const maxMonth = Math.max(1, ...data.by_month.map((m) => m.commission_cents));
  const pendingCommission =
    COMMISSION_PERCENT !== null
      ? Math.round((data.pending_auctions.total_cents * COMMISSION_PERCENT) / 100)
      : null;

  return (
    <div>
      <div className="steps" style={{ marginTop: 0 }}>
        <Stat
          label="Ingresos de la plataforma (comisiones)"
          value={formatPrice(data.totals.commission_cents)}
          hint={COMMISSION_PERCENT !== null ? `Comisión actual: ${COMMISSION_PERCENT} %` : 'Comisión por definir'}
        />
        <Stat label="Ventas totales" value={formatPrice(data.totals.gross_cents)} hint="Dinero que han pagado los compradores" />
        <Stat label="Nº de ventas" value={String(data.totals.orders)} />
        <Stat label="Devoluciones" value={formatPrice(data.refunded_cents)} />
      </div>

      <div className="notice" style={{ marginTop: 24 }}>
        <strong>Pendiente de cobro:</strong> {data.pending_auctions.count}{' '}
        {data.pending_auctions.count === 1 ? 'subasta ganada' : 'subastas ganadas'} por {formatPrice(data.pending_auctions.total_cents)}
        {pendingCommission !== null ? ` (comisión estimada: ${formatPrice(pendingCommission)}).` : '.'} Se contarán como
        ingreso cuando se cobren.
      </div>

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Por mes</h2>
      {data.by_month.length === 0 ? (
        <div className="notice" style={{ marginTop: 16 }}>
          Todavía no hay ventas registradas. Aparecerán aquí cuando se activen los pagos.
        </div>
      ) : (
        <div className="panel" style={{ marginTop: 16 }}>
          {data.by_month.map((m, i) => (
            <div key={m.month} className="row" style={{ display: 'block', ...(i === 0 ? { borderTop: 'none', marginTop: 0, paddingTop: 0 } : {}) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{monthLabel(m.month)}</span>
                <span style={{ fontWeight: 700 }}>{formatPrice(m.commission_cents)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--bg)', marginTop: 8 }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: 'var(--accent)',
                    width: `${Math.max(2, Math.round((m.commission_cents / maxMonth) * 100))}%`,
                  }}
                />
              </div>
              <div className="faint" style={{ fontSize: 13, marginTop: 6 }}>
                {m.orders} {m.orders === 1 ? 'venta' : 'ventas'} · {formatPrice(m.gross_cents)} vendidos
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Por género</h2>
      {data.by_genre.length === 0 ? (
        <div className="muted" style={{ marginTop: 12 }}>Sin datos todavía.</div>
      ) : (
        <div className="list" style={{ marginTop: 16, maxWidth: 820 }}>
          {data.by_genre.map((g) => (
            <div key={g.genre} className="list-item" style={{ cursor: 'default' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{g.genre}</div>
                <div className="faint" style={{ fontSize: 13 }}>{g.orders} ventas · {formatPrice(g.gross_cents)} vendidos</div>
              </div>
              <div style={{ fontWeight: 700 }}>{formatPrice(g.commission_cents)}</div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Últimos movimientos</h2>
      {data.recent.length === 0 ? (
        <div className="muted" style={{ marginTop: 12 }}>Sin movimientos todavía.</div>
      ) : (
        <div className="list" style={{ marginTop: 16, maxWidth: 820 }}>
          {data.recent.map((o) => (
            <div key={o.id} className="list-item" style={{ cursor: 'default' }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {SOURCE[o.source] ?? o.source}
                  {o.genre ? ` · ${o.genre}` : ''}
                </div>
                <div className="faint" style={{ fontSize: 13 }}>
                  {new Date(o.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {o.status === 'refunded' ? ' · Devuelto' : o.status === 'pending' ? ' · Pendiente' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{formatPrice(o.amount_cents)}</div>
                <div className="faint" style={{ fontSize: 12 }}>comisión {formatPrice(o.commission_cents)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
