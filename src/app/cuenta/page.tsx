import type { Metadata } from 'next';
import DeleteAccount from '@/components/DeleteAccount';
import EditProfileForm from '@/components/EditProfileForm';
import MyTracks from '@/components/MyTracks';
import SecurityForm from '@/components/SecurityForm';

export const metadata: Metadata = { title: 'Ajustes de cuenta', robots: { index: false, follow: false } };

export default function CuentaPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Ajustes de cuenta</h1>
      <p className="lead">Gestiona tu perfil, tus pistas, tu correo y tu contraseña.</p>

      <h2 className="section" style={{ marginTop: 40, fontSize: 28 }}>Perfil</h2>
      <div style={{ marginTop: 16 }}>
        <EditProfileForm />
      </div>

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Mis pistas</h2>
      <div style={{ marginTop: 16 }}>
        <MyTracks />
      </div>

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Acceso y seguridad</h2>
      <div style={{ marginTop: 16 }}>
        <SecurityForm />
      </div>

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Zona peligrosa</h2>
      <div style={{ marginTop: 16 }}>
        <DeleteAccount />
      </div>
    </div>
  );
}
