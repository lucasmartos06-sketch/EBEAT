import type { Metadata } from 'next';
import LegalDoc from '@/components/LegalDoc';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = { title: 'Aviso legal' };

export default function AvisoLegalPage() {
  return (
    <LegalDoc title="Aviso legal">
      <h2>Titular del sitio web</h2>
      <p>En cumplimiento de la Ley 34/2002 de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), se informa de que {APP_NAME} es un sitio web titularidad de:</p>
      <ul>
        <li>Nombre o razón social: <code>[COMPLETAR]</code></li>
        <li>NIF/CIF: <code>[COMPLETAR]</code></li>
        <li>Domicilio: <code>[COMPLETAR]</code></li>
        <li>Correo de contacto: <code>[COMPLETAR]</code></li>
        <li>Datos de inscripción en el Registro Mercantil, si procede: <code>[COMPLETAR]</code></li>
      </ul>

      <h2>Objeto</h2>
      <p>{APP_NAME} es una plataforma en la que productores musicales publican pistas y las licencian a compradores, y en la que los usuarios pueden negociar precios, encargar beats y participar en subastas. {APP_NAME} actúa como intermediario: las pistas son obra de los productores, que son responsables de su contenido y de tener los derechos para venderlas.</p>

      <h2>Propiedad intelectual</h2>
      <p>El diseño, el código y los elementos propios de la web son de su titular. Las pistas pertenecen a sus autores. Si crees que una pista infringe tus derechos, escríbenos a <code>[COMPLETAR correo]</code> indicando la pista y tu titularidad, y la retiraremos de forma cautelar mientras se aclara.</p>

      <h2>Responsabilidad</h2>
      <p>El titular no se hace responsable de los contenidos publicados por los usuarios, aunque retirará aquellos que tenga conocimiento de que son ilícitos. La web puede sufrir interrupciones por mantenimiento o causas ajenas.</p>

      <h2>Legislación aplicable</h2>
      <p>Este aviso se rige por la legislación española. Para cualquier controversia, y si el usuario es consumidor, serán competentes los juzgados de su domicilio. <code>[COMPLETAR según asesoramiento]</code></p>
    </LegalDoc>
  );
}
