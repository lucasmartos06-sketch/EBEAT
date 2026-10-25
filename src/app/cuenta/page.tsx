import type { Metadata } from 'next';
import EditProfileForm from '@/components/EditProfileForm';

export const metadata: Metadata = { title: 'Mi perfil' };

export default function CuentaPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Mi perfil</h1>
      <p className="lead">Así te verán los compradores y otros productores.</p>
      <div style={{ marginTop: 32 }}>
        <EditProfileForm />
      </div>
    </div>
  );
}
