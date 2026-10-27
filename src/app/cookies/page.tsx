import type { Metadata } from 'next';
import LegalDoc from '@/components/LegalDoc';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = { title: 'Política de cookies' };

export default function CookiesPage() {
  return (
    <LegalDoc title="Política de cookies">
      <h2>Qué usamos</h2>
      <p>{APP_NAME} solo utiliza almacenamiento técnico imprescindible en tu navegador: guardar tu sesión para que sigas conectado y recordar preferencias básicas de la web. No usamos cookies de publicidad, de seguimiento ni de analítica.</p>
      <p>Las fuentes de la web se sirven desde nuestro propio servidor, sin conectarse a terceros.</p>

      <h2>Pagos</h2>
      <p>Cuando pagas, te llevamos a la página segura de Stripe, que puede usar sus propias cookies técnicas y antifraude. Se rigen por la política de Stripe.</p>

      <h2>Cómo borrarlas</h2>
      <p>Puedes borrar el almacenamiento del sitio desde los ajustes de tu navegador. Si lo haces, tendrás que volver a iniciar sesión.</p>

      <h2>Si en el futuro añadimos analítica o publicidad</h2>
      <p>Te pediremos tu consentimiento antes de activarlas y actualizaremos esta política.</p>
    </LegalDoc>
  );
}
