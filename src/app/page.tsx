import Link from 'next/link';
import TrackCard from '@/components/TrackCard';
import { APP_NAME } from '@/lib/config';
import { getTracks } from '@/lib/tracks';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { tracks, demo } = await getTracks(undefined, 4);

  return (
    <>
      <section className="wrap hero">
        <div>
          <h1>
            Sube tu música. <span>Cobra por ella.</span>
          </h1>
          <p>
            {APP_NAME} es la plataforma donde los productores publican sus pistas, fijan su precio y licencian su
            trabajo a quien lo necesita.
          </p>
          <div className="hero-actions">
            <Link href="/subir" className="btn btn-primary">Subir mi primera pista</Link>
            <Link href="/catalogo" className="btn btn-ghost">Explorar el catálogo</Link>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="section">Cómo funciona</h2>
        <div className="steps">
          <div className="box">
            <div className="num">01</div>
            <h3>Sube tu pista</h3>
            <p>Sube tu beat completo con título, género y precio. Tarda un par de minutos.</p>
          </div>
          <div className="box">
            <div className="num">02</div>
            <h3>Fija precio y licencia</h3>
            <p>Tú decides cuánto cuesta y qué derechos recibe el comprador.</p>
          </div>
          <div className="box">
            <div className="num">03</div>
            <h3>Cobra tus ventas</h3>
            <p>Cada venta se suma a tu panel y podrás retirar tus ganancias.</p>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <h2 className="section">Pistas destacadas</h2>
          <Link href="/catalogo" style={{ color: 'var(--accent)', fontWeight: 600 }}>Ver todo el catálogo</Link>
        </div>
        {demo && (
          <p className="faint" style={{ marginTop: 8, fontSize: 14 }}>
            Estas pistas son de ejemplo hasta que se conecte la base de datos.
          </p>
        )}
        <div style={{ marginTop: 28 }}>
          {tracks.length === 0 ? (
            <div className="notice">Todavía no hay pistas publicadas. ¡Sé el primero en subir una!</div>
          ) : (
            <div className="grid-cards">
              {tracks.map((t) => (
                <TrackCard key={t.id} track={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 72 }}>
        <div className="cta">
          <h2>¿Listo para publicar tu primera pista?</h2>
          <Link href="/entrar" className="btn">Crear mi cuenta de productor</Link>
        </div>
      </section>
    </>
  );
}
