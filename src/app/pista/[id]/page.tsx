import Link from 'next/link';
import { notFound } from 'next/navigation';
import AudioPlayer from '@/components/AudioPlayer';
import { COMMISSION_PERCENT, LICENSES } from '@/lib/config';
import { coverClass, formatPrice, initial } from '@/lib/format';
import { getTrack } from '@/lib/tracks';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = await getTrack(id);
  return { title: track ? track.title : 'Pista' };
}

export default async function PistaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = await getTrack(id);
  if (!track) notFound();

  const license = LICENSES[track.license] ?? LICENSES.comercial;

  return (
    <div className="wrap page" style={{ paddingTop: 40 }}>
      <Link href="/catalogo" className="muted" style={{ fontSize: 15, fontWeight: 500 }}>
        ← Volver al catálogo
      </Link>

      <div className="detail">
        <section className="left">
          <div className={`cover ${coverClass(track.title)}`}>{initial(track.title)}</div>

          <div className="tags" style={{ marginTop: 24 }}>
            <span className="tag">{track.genre}</span>
            {track.bpm ? <span className="tag">{track.bpm} BPM</span> : null}
            <span className="tag">{license.name}</span>
          </div>
          <h1 style={{ marginTop: 14, fontSize: 'clamp(32px, 4.5vw, 46px)' }}>{track.title}</h1>
          <div style={{ marginTop: 6, fontSize: 16, color: 'var(--accent)', fontWeight: 600 }}>
            {track.producer_name}
          </div>

          <AudioPlayer src={track.audio_url} title={track.title} />
          <div className="faint" style={{ marginTop: 10, fontSize: 13 }}>
            Escucha el beat completo. La descarga se activa al comprarlo.
          </div>

          {track.description && (
            <p className="muted" style={{ marginTop: 22, fontSize: 16, lineHeight: 1.6 }}>{track.description}</p>
          )}
        </section>

        <aside className="right">
          <div className="panel">
            <div className="faint" style={{ fontSize: 13 }}>Precio</div>
            <div className="price-big">{formatPrice(track.price_cents)}</div>
            <div className="row">
              <span>Licencia</span>
              <span style={{ fontWeight: 600 }}>{license.name}</span>
            </div>
            <p className="muted" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.55 }}>{license.desc}</p>
            {COMMISSION_PERCENT !== null && (
              <div className="faint" style={{ marginTop: 12, fontSize: 13 }}>
                Incluye la comisión de la plataforma.
              </div>
            )}
            <button type="button" className="btn btn-primary btn-block btn-disabled" style={{ marginTop: 22 }} disabled>
              Comprar (próximamente)
            </button>
            <div className="faint" style={{ marginTop: 10, fontSize: 13 }}>
              Los pagos se activarán en la siguiente fase.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
