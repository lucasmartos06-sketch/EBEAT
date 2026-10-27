import Link from 'next/link';
import type { ReactNode } from 'react';

export default function LegalDoc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="wrap page">
      <h1 className="title">{title}</h1>
      <div className="notice warn" style={{ marginTop: 24, maxWidth: 760 }}>
        <strong>Borrador.</strong> Este texto es un borrador de trabajo y no es asesoramiento legal. Los datos entre
        corchetes <code>[COMPLETAR]</code> deben rellenarse y un abogado debe revisarlo antes de publicar la web al
        público.
      </div>
      <div className="legal">{children}</div>
      <nav className="tags" style={{ marginTop: 48 }}>
        <Link href="/aviso-legal" className="tag">Aviso legal</Link>
        <Link href="/privacidad" className="tag">Privacidad</Link>
        <Link href="/terminos" className="tag">Términos de uso</Link>
        <Link href="/cookies" className="tag">Cookies</Link>
        <Link href="/normas" className="tag">Normas y fraude</Link>
      </nav>
    </div>
  );
}
