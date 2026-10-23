import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap page">
      <h1 className="title">No encontramos esa página</h1>
      <p className="lead">Puede que la pista ya no esté disponible o que el enlace sea incorrecto.</p>
      <div style={{ marginTop: 28 }}>
        <Link href="/catalogo" className="btn btn-primary">Ir al catálogo</Link>
      </div>
    </div>
  );
}
