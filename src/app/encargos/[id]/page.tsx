import Link from 'next/link';
import { notFound } from 'next/navigation';
import CommissionPanel from '@/components/CommissionPanel';
import { COMMISSION_STATUS, getCommission } from '@/lib/commissions';
import { formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCommission(id);
  return { title: c ? c.title : 'Encargo' };
}

export default async function EncargoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commission = await getCommission(id);
  if (!commission) notFound();

  return (
    <div className="wrap page" style={{ paddingTop: 40 }}>
      <Link href="/encargos" className="muted" style={{ fontSize: 15, fontWeight: 500 }}>
        ← Volver a los encargos
      </Link>

      <div className="detail">
        <section className="left">
          <div className="tags">
            <span className="tag">{commission.genre}</span>
            <span className={`badge ${commission.status === 'open' ? 'open' : ''}`}>
              {COMMISSION_STATUS[commission.status]}
            </span>
          </div>
          <h1 style={{ marginTop: 14, fontSize: 'clamp(30px, 4.5vw, 44px)' }}>{commission.title}</h1>
          <div style={{ marginTop: 6, fontSize: 16, color: 'var(--accent)', fontWeight: 600 }}>
            Pide {commission.buyer_name}
          </div>
          <p className="muted" style={{ marginTop: 22, fontSize: 16, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {commission.description}
          </p>
          <div className="panel" style={{ marginTop: 24, display: 'inline-block' }}>
            <div className="faint" style={{ fontSize: 13 }}>Presupuesto</div>
            <div className="price-big">{formatPrice(commission.budget_cents)}</div>
          </div>
        </section>

        <aside className="right">
          <CommissionPanel commission={commission} />
        </aside>
      </div>
    </div>
  );
}
