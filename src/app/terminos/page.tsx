import Link from 'next/link';
import type { Metadata } from 'next';
import LegalDoc from '@/components/LegalDoc';
import { APP_NAME, COMMISSION_PERCENT } from '@/lib/config';

export const metadata: Metadata = { title: 'Términos de uso' };

export default function TerminosPage() {
  return (
    <LegalDoc title="Términos de uso">
      <h2>1. Qué es {APP_NAME}</h2>
      <p>{APP_NAME} es una plataforma que pone en contacto a productores de música con compradores. Los productores publican pistas y fijan su precio; los compradores las licencian. {APP_NAME} no es la autora de las pistas ni parte de la licencia entre productor y comprador, aunque gestiona el cobro.</p>

      <h2>2. Cuentas</h2>
      <p>Para subir, comprar, pujar, negociar o encargar necesitas una cuenta. Debes dar datos verdaderos, mantener segura tu contraseña y ser mayor de edad o tener la edad mínima legal para contratar. <code>[COMPLETAR según asesoramiento]</code></p>

      <h2>3. Contenido de los productores</h2>
      <p>Al subir una pista declaras que eres su autor o que tienes todos los derechos para venderla, y que no infringe derechos de terceros (samples sin licencia incluidos). Respondes frente a {APP_NAME} y frente a terceros por cualquier reclamación. {APP_NAME} puede retirar una pista de forma cautelar si recibe una reclamación fundada.</p>

      <h2>4. Licencias</h2>
      <p>Cada pista indica su licencia: uso personal, uso comercial o exclusiva. La licencia concede al comprador los usos descritos en ella y no transmite la autoría. En la licencia exclusiva, la pista se retira del catálogo tras venderse.</p>

      <h2>5. Precios, comisión y pagos</h2>
      <p>Los precios son los fijados por el productor, en euros. {APP_NAME} cobra una comisión sobre cada venta{COMMISSION_PERCENT !== null ? `, actualmente del ${COMMISSION_PERCENT} %` : ' (porcentaje por definir)'}. Los pagos se procesan a través de Stripe y el productor recibe el importe menos la comisión. Impuestos aplicables: <code>[COMPLETAR según asesoramiento fiscal]</code>.</p>

      <h2>6. Descarga y derecho de desistimiento</h2>
      <p>La pista se entrega como contenido digital descargable. Al pagar, el comprador solicita la entrega inmediata y reconoce que, una vez comenzada la descarga, pierde el derecho de desistimiento. <code>[COMPLETAR según asesoramiento]</code></p>

      <h2>7. Negociación, encargos y subastas</h2>
      <ul>
        <li>Las ofertas aceptadas en el chat se pagan desde la propia conversación.</li>
        <li>En un encargo, el productor se compromete a entregar lo acordado por el chat y el comprador a pagar la propuesta aceptada.</li>
        <li>En las subastas, la puja más alta al cierre es vinculante: quien la haga queda obligado a comprar la pista. Las pujas de los últimos 2 minutos alargan la subasta 2 minutos.</li>
      </ul>

      <h2>8. Fraude y sanciones</h2>
      <p>Las conductas fraudulentas y sus consecuencias (aviso, suspensión, anulación y expulsión) se describen en las <Link href="/normas">normas y fraude</Link>, que forman parte de estos términos.</p>

      <h2>9. Devoluciones y reclamaciones</h2>
      <p>Para cualquier incidencia con una compra, escribe a <code>[COMPLETAR correo]</code>. Las devoluciones se tramitan a través de Stripe. <code>[COMPLETAR política de devoluciones]</code></p>

      <h2>10. Cambios y ley aplicable</h2>
      <p>Podemos actualizar estos términos y avisaremos de los cambios importantes. Se rigen por la ley española. <code>[COMPLETAR jurisdicción según asesoramiento]</code></p>
    </LegalDoc>
  );
}
