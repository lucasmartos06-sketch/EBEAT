import Link from 'next/link';
import type { Metadata } from 'next';
import TrackCard from '@/components/TrackCard';
import { GENRES } from '@/lib/config';
import { getTracks } from '@/lib/tracks';

export const metadata: Metadata = { title: 'Catálogo' };
export const dynamic = 'force-dynamic';

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ genero?: string }>;
}) {
  const { genero } = await searchParams;
  const genre = genero && GENRES.includes(genero) ? genero : undefined;
  const { tracks, demo } = await getTracks(genre);

  return (
    <div className="wrap page">
      <h1 className="title">Catálogo</h1>
      <p className="lead">
        Escucha cada beat completo y elige el que encaja con tu proyecto. La descarga se activa al comprarlo.
        {demo ? ' Estas pistas son de ejemplo.' : ''}
      </p>

      <div className="pills" style={{ marginTop: 28 }}>
        <Link href="/catalogo" className={`pill ${!genre ? 'pill-active' : ''}`}>Todos</Link>
        {GENRES.map((g) => (
          <Link
            key={g}
            href={`/catalogo?genero=${encodeURIComponent(g)}`}
            className={`pill ${genre === g ? 'pill-active' : ''}`}
          >
            {g}
          </Link>
        ))}
      </div>

      <div className="faint" style={{ marginTop: 16, fontSize: 14 }}>
        {tracks.length === 1 ? '1 pista' : `${tracks.length} pistas`}
      </div>

      <div style={{ marginTop: 20 }}>
        {tracks.length === 0 ? (
          <div className="notice">No hay pistas en esta categoría todavía.</div>
        ) : (
          <div className="grid-cards">
            {tracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
