import Link from 'next/link';
import { notFound } from 'next/navigation';
import AudioPlayer from '@/components/AudioPlayer';
import AuctionPanel from '@/components/AuctionPanel';
import { getAuction } from '@/lib/auctions';
import { coverClass, initial } from '@/lib/format';
import { getTrack } from '@/lib/tracks';

export const dynamic = 'force-dynamic';

export default async function SubastaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auction = await getAuction(id);
  if (!auction) notFound();
  const track = await getTrack(auction.track_id);

  return (
    <div className="wrap page" style={{ paddingTop: 40 }}>
      <Link href="/subastas" className="muted" style={{ fontSize: 15, fontWeight: 500 }}>
        ← Volver a las subastas
      </Link>

      <div className="detail">
        <section className="left">
          <div className={`cover ${coverClass(track?.title ?? 'Pista')}`}>{initial(track?.title ?? 'Pista')}</div>
          <div className="tags" style={{ marginTop: 24 }}>
            {track && <span className="tag">{track.genre}</span>}
            {track?.bpm ? <span className="tag">{track.bpm} BPM</span> : null}
          </div>
          <h1 style={{ marginTop: 14, fontSize: 'clamp(32px, 4.5vw, 46px)' }}>{track?.title ?? 'Pista'}</h1>
          {track && (
            <div style={{ marginTop: 6, fontSize: 16, color: 'var(--accent)', fontWeight: 600 }}>{track.producer_name}</div>
          )}
          {track && <AudioPlayer src={track.audio_url} title={track.title} />}
          {track?.description && (
            <p className="muted" style={{ marginTop: 22, fontSize: 16, lineHeight: 1.6 }}>{track.description}</p>
          )}
        </section>

        <aside className="right">
          <AuctionPanel initial={auction} />
        </aside>
      </div>
    </div>
  );
}
