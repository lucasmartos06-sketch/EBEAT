import Link from 'next/link';
import type { Track } from '@/lib/tracks';
import { coverClass, formatPrice, initial } from '@/lib/format';

export default function TrackCard({ track }: { track: Track }) {
  return (
    <Link href={`/pista/${track.id}`} className="track-card">
      <div className={`cover sq ${coverClass(track.title)}`}>{initial(track.title)}</div>
      <h3>{track.title}</h3>
      <div className="by">
        {track.producer_name} · {track.genre}
        {track.bpm ? ` · ${track.bpm} BPM` : ''}
      </div>
      <div className="price">{formatPrice(track.price_cents)}</div>
    </Link>
  );
}
