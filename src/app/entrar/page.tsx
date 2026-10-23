import type { Metadata } from 'next';
import AuthForm from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Entrar' };

export default function EntrarPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Tu cuenta</h1>
      <p className="lead">Entra o crea una cuenta de productor para subir tus pistas.</p>
      <div style={{ marginTop: 32 }}>
        <AuthForm />
      </div>
    </div>
  );
}
