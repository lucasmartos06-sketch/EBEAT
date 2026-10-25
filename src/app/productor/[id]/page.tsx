import Link from 'next/link';
import { notFound } from 'next/navigation';
import TrackCard from '@/components/TrackCard';
import OwnProfileLink from '@/components/OwnProfileLink';
import { LICENSES } from '@/lib/config';
import { getActiveAuctions, shownPrice } from '@/lib/auctions';
import { formatPrice, initial } from '@/lib/format';
import { getBadges, getProducer } from '@/lib/producers';
import { monthLabel } from '@/lib/ranking';
import { getProducerTracks } from '@/lib/tracks';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProducer(id);
  return { title: p ? p.display_name : 'Productor' };
}

export default async function ProductorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const producer = await getProducer(id);
  if (!producer) notFound();

  const [tracks, badges, auctions] = await Promise.all([
    getProducerTracks(id),
    getBadges(id),
    getActiveAuctions(id),
  ]);

  const since = new Date(producer.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="wrap page" style={{ paddingTop: 40 }}>
      <Link href="/productores" className="muted" style={{ fontSize: 15, fontWeight: 500 }}>
        ← Todos los productores
      </Link>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24, marginTop: 28 }}>
        <div className="cover" style={{ width: 96, height: 96, borderRadius: 999, fontSize: 40, background: 'var(--accent)' }}>
          {initial(producer.display_name)}
        </div>
        <div style={{ minWidth: 0, flex: '1 1 300px' }}>
          <div className="faint" style={{ fontSize: 13 }}>Productor</div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)' }}>{producer.display_name}</h1>
          <div className="faint" style={{ fontSize: 14, marginTop: 4 }}>
            Miembro desde {since} · {tracks.length === 1 ? '1 pista' : `${tracks.length} pistas`}
          </div>
          {badges.length > 0 && (
            <div className="tags" style={{ marginTop: 12 }}>
              {badges.map((b) => (
                <span key={b.badge_month + b.badge_genre} className="badge open">
                  🏆 1º en {b.badge_genre} · {monthLabel(b.badge_month)}
                </span>
              ))}
            </div>
          )}
        </div>
        <OwnProfileLink producerId={producer.id} />
      </div>

      <p className="muted" style={{ marginTop: 24, fontSize: 16, lineHeight: 1.65, maxWidth: 720, whiteSpace: 'pre-wrap' }}>
        {producer.bio || 'Este productor todavía no ha escrito su biografía.'}
      </p>

      {auctions.length > 0 && (
        <>
          <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Subastas activas</h2>
          <div className="list" style={{ marginTop: 16, maxWidth: 820 }}>
            {auctions.map((a) => (
              <Link key={a.id} href={`/subastas/${a.id}`} className="list-item">
                <div style={{ fontWeight: 600, fontSize: 18 }}>{a.track_title}</div>
                <div style={{ textAlign: 'right' }}>
                  <div className="faint" style={{ fontSize: 12 }}>{a.bid_count > 0 ? 'Puja actual' : 'Sale desde'}</div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{formatPrice(shownPrice(a))}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Sus pistas</h2>
      <div style={{ marginTop: 20 }}>
        {tracks.length === 0 ? (
          <div className="notice">Todavía no ha publicado pistas.</div>
        ) : (
          <div className="grid-cards">
            {tracks.map((t) => <TrackCard key={t.id} track={t} />)}
          </div>
        )}
      </div>

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Licencias disponibles</h2>
      <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>Cada pista indica qué licencia ofrece el productor.</p>
      <div className="steps">
        {Object.values(LICENSES).map((l) => (
          <div key={l.name} className="box" style={{ padding: 22 }}>
            <h3 style={{ marginTop: 0, fontSize: 20 }}>{l.name}</h3>
            <p style={{ fontSize: 14 }}>{l.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
