import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Normas y fraude' };

const FRAUDS = [
  { title: 'Subir música ajena como propia', desc: 'Pistas copiadas, con samples sin licencia o creadas por otra persona.' },
  { title: 'Ventas entre cuentas propias', desc: 'Comprarte a ti mismo, o mediante cuentas conectadas, para subir en el ranking.' },
  { title: 'Valoraciones falsas', desc: 'Reseñas compradas, intercambiadas o escritas por cuentas del propio productor.' },
  { title: 'Reproducciones infladas', desc: 'Bots o programas que escuchan pistas de forma automática.' },
  { title: 'Sacar el trato de la plataforma', desc: 'Cerrar ventas o encargos fuera de eBeat para evitar la comisión.' },
  { title: 'Incumplir un encargo aceptado', desc: 'Cobrar y no entregar, o entregar algo distinto a lo acordado.' },
  { title: 'Pujas falsas en una subasta', desc: 'Pujar en tu propia pista, o con cuentas conectadas, para subir el precio.' },
  { title: 'No pagar una subasta ganada', desc: 'Ganar con la puja más alta y no pagar en el plazo. La puja es un compromiso.' },
];

const LEVELS = [
  { n: 'Nivel 1', title: 'Aviso', desc: 'Primera falta leve o dudosa. Recibes una advertencia por escrito explicando qué se ha detectado.' },
  { n: 'Nivel 2', title: 'Suspensión temporal', desc: 'Se suspende la cuenta y se retienen los pagos pendientes mientras se investiga. Puedes explicarte.' },
  { n: 'Nivel 3', title: 'Anulación', desc: 'Se anulan los puntos, ventas y valoraciones conseguidos con trampa, y se devuelve el dinero a los compradores afectados.' },
  { n: 'Nivel 4', title: 'Expulsión', desc: 'Casos graves o reincidentes. La cuenta se cierra y se retienen las ganancias ligadas al fraude.' },
];

export default function NormasPage() {
  return (
    <div className="wrap page">
      <h1 className="title">Normas y fraude</h1>
      <p className="lead">
        En eBeat compites por tu talento, no por trampas. Estas son las reglas y lo que ocurre si alguien las rompe.
      </p>

      <div className="notice warn" style={{ marginTop: 28, maxWidth: 760 }}>
        <strong>Borrador.</strong> Este texto es un borrador de trabajo. Debe revisarlo un abogado antes de
        publicarse como condiciones oficiales.
      </div>

      <h2 className="section" style={{ marginTop: 56 }}>Qué se considera fraude</h2>
      <div className="steps">
        {FRAUDS.map((f) => (
          <div key={f.title} className="box" style={{ padding: 22 }}>
            <h3 style={{ marginTop: 0, fontSize: 20 }}>{f.title}</h3>
            <p style={{ fontSize: 15 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="section" style={{ marginTop: 56 }}>Qué ocurre si se detecta</h2>
      <p className="lead">Las consecuencias son progresivas y proporcionales a la gravedad.</p>
      <div className="steps">
        {LEVELS.map((l) => (
          <div key={l.n} className="box" style={{ padding: 22 }}>
            <div className="num">{l.n}</div>
            <h3 style={{ fontSize: 22 }}>{l.title}</h3>
            <p style={{ fontSize: 15 }}>{l.desc}</p>
          </div>
        ))}
      </div>

      <div className="detail" style={{ marginTop: 56 }}>
        <section className="left">
          <h2 className="section" style={{ fontSize: 28 }}>Cómo protegemos los pagos</h2>
          <p className="muted" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.65 }}>
            Tus ganancias se liberan unos días después de cada venta (plazo por definir). Durante ese plazo, si
            hay una reclamación o una sospecha, el dinero queda retenido hasta resolverlo.
          </p>
          <p className="muted" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.65 }}>
            Quien cometa fraude y tenga ganancias pendientes o cobradas ligadas a él queda en deuda con eBeat por
            ese importe.
          </p>
        </section>
        <section className="right">
          <h2 className="section" style={{ fontSize: 28 }}>Derecho a apelar</h2>
          <p className="muted" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.65 }}>
            Si crees que se ha cometido un error, podrás apelar en un plazo por definir. Revisaremos tu caso y te
            responderemos por escrito.
          </p>
        </section>
      </div>

      <h2 className="section" style={{ marginTop: 40, fontSize: 28 }}>Derechos de autor</h2>
      <p className="muted" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.65, maxWidth: 760 }}>
        Al subir una pista declaras que es tuya y que tienes derecho a venderla. Si alguien reclama derechos,
        retiramos la pista de forma cautelar mientras se aclara (procedimiento por definir).
      </p>
    </div>
  );
}
