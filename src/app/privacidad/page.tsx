import type { Metadata } from 'next';
import LegalDoc from '@/components/LegalDoc';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = { title: 'Política de privacidad' };

export default function PrivacidadPage() {
  return (
    <LegalDoc title="Política de privacidad">
      <h2>Responsable del tratamiento</h2>
      <p>El responsable de tus datos es el titular de {APP_NAME} indicado en el <a href="/aviso-legal">aviso legal</a>. Contacto para temas de privacidad: <code>[COMPLETAR correo]</code>.</p>

      <h2>Qué datos tratamos</h2>
      <ul>
        <li><strong>Cuenta:</strong> correo electrónico, contraseña (almacenada cifrada) y nombre de productor.</li>
        <li><strong>Contenido que publicas:</strong> pistas de audio, títulos, descripciones, biografía, encargos y pujas.</li>
        <li><strong>Comunicaciones:</strong> mensajes y ofertas del chat de negociación.</li>
        <li><strong>Compras y cobros:</strong> importes, fechas y pistas compradas o vendidas. Los datos de tarjeta y de cuenta bancaria los trata directamente Stripe; {APP_NAME} no los almacena.</li>
        <li><strong>Seguridad:</strong> avisos y sanciones por fraude aplicados a tu cuenta.</li>
      </ul>

      <h2>Para qué y con qué base legal</h2>
      <ul>
        <li>Prestarte el servicio (crear tu cuenta, publicar y vender pistas, chat, subastas, encargos, pagos): ejecución del contrato.</li>
        <li>Prevenir el fraude y mantener la seguridad de la plataforma: interés legítimo.</li>
        <li>Cumplir obligaciones fiscales y contables: obligación legal.</li>
        <li>Comunicaciones comerciales, solo si las aceptas: consentimiento.</li>
      </ul>

      <h2>Con quién compartimos datos</h2>
      <ul>
        <li><strong>Supabase</strong> (base de datos, autenticación y almacenamiento). Región del proyecto: <code>[COMPLETAR]</code>.</li>
        <li><strong>Vercel</strong> (alojamiento de la web).</li>
        <li><strong>Stripe</strong> (pagos y verificación de los productores que cobran).</li>
        <li>Autoridades, cuando una ley lo exija.</li>
      </ul>
      <p>Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo, con las garantías previstas por el RGPD (por ejemplo, cláusulas contractuales tipo). <code>[COMPLETAR tras revisar los contratos de cada proveedor]</code></p>

      <h2>Cuánto tiempo conservamos los datos</h2>
      <p>Mientras tengas la cuenta. Si la borras desde Ajustes de cuenta, se eliminan tu perfil, pistas, mensajes y encargos. Conservaremos durante el plazo legal los datos de operaciones económicas que la ley exija. <code>[COMPLETAR plazos]</code></p>

      <h2>Tus derechos</h2>
      <p>Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a <code>[COMPLETAR correo]</code>. Parte de ellos (cambiar tus datos y borrar tu cuenta) puedes hacerlo tú mismo en <a href="/cuenta">Ajustes de cuenta</a>. Si crees que no tratamos bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" rel="noopener noreferrer">aepd.es</a>).</p>

      <h2>Menores</h2>
      <p>{APP_NAME} no está dirigida a menores de 14 años ni permite que se registren. <code>[COMPLETAR edad mínima según asesoramiento]</code></p>
    </LegalDoc>
  );
}
