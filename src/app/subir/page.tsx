import type { Metadata } from 'next';
import UploadForm from '@/components/UploadForm';

export const metadata: Metadata = { title: 'Subir pista' };

export default function SubirPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Subir una pista</h1>
      <p className="lead">Rellena los datos, elige la licencia y publica. Los compradores podrán escuchar el beat completo.</p>
      <div style={{ marginTop: 32 }}>
        <UploadForm />
      </div>
    </div>
  );
}
