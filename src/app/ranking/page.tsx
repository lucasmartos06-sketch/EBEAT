import Link from 'next/link';
import type { Metadata } from 'next';
import { GENRES, supabaseConfigured } from '@/lib/config';
import {
  POINTS_TABLE,
  currentMonth,
  getRanking,
  monthLabel,
  shiftMonth,
  type RankRow,
} from '@/lib/ranking';

export const metadata: Metadata = { title: 'Ranking' };
export const dynamic = 'force-dynamic';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function Row({ row, rank }: { row: RankRow; rank: number }) {
  return (
    <div className="list-item" style={rank === 1 ? { borderColor: 'var(--accent)' } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <div
          style={{
            flex: 'none',
            width: 40,
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 24,
            color: rank === 1 ? 'var(--accent)' : 'var(--text)',
          }}
        >
          {rank}º
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{row.display_name}</div>
          <div className="faint" style={{ fontSize: 13, marginTop: 2 }}>
            {row.new_tracks} pistas nuevas · {row.auction_sales} subastas · {row.commissions_done} encargos
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <div style={{ fontWeight: 700, fontSize: 22 }}>{row.points}</div>
        <div className="faint" style={{ fontSize: 12 }}>puntos</div>
      </div>
    </div>
  );
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ genero?: string; mes?: string }>;
}) {
  const { genero, mes } = await searchParams;
  const now = currentMonth();
  const genre = genero && GENRES.includes(genero) ? genero : GENRES[0];
  const month = mes && MONTH_RE.test(mes) && mes <= now ? mes : now;
  const isCurrent = month === now;

  const months = [0, 1, 2, 3, 4, 5].map((i) => shiftMonth(now, -i));
  const previous = shiftMonth(now, -1);

  const [rows, winners] = await Promise.all([
    getRanking(month, genre),
    Promise.all(GENRES.map(async (g) => ({ genre: g, top: (await getRanking(previous, g))[0] ?? null }))),
  ]);

  const href = (g: string, m: string) => `/ranking?genero=${encodeURIComponent(g)}&mes=${m}`;

  return (
    <div className="wrap page">
      <h1 className="title">Ranking mensual</h1>
      <p className="lead">
        Los mejores productores de cada género. El ranking se reinicia el día 1 de cada mes, así que todos
        empiezan de cero.
      </p>

      <div className="pills" style={{ marginTop: 28 }}>
        {months.map((m) => (
          <Link key={m} href={href(genre, m)} className={`pill ${m === month ? 'pill-active' : ''}`}>
            {monthLabel(m)}
          </Link>
        ))}
      </div>
      <div className="pills" style={{ marginTop: 12 }}>
        {GENRES.map((g) => (
          <Link key={g} href={href(g, month)} className={`pill ${g === genre ? 'pill-active' : ''}`}>
            {g}
          </Link>
        ))}
      </div>

      <h2 className="section" style={{ marginTop: 40, fontSize: 28 }}>
        Top productores de {genre} · {monthLabel(month)}
      </h2>
      {isCurrent && <div className="faint" style={{ marginTop: 6, fontSize: 14 }}>Mes en curso: se reinicia el 1 del mes que viene.</div>}

      <div style={{ marginTop: 20, maxWidth: 820 }}>
        {!supabaseConfigured ? (
          <div className="notice warn"><strong>Falta conectar Supabase.</strong> El ranking no está disponible todavía.</div>
        ) : rows.length === 0 ? (
          <div className="notice">Aún no hay puntos en {genre} este mes. Publica una pista y sé el primero del ranking.</div>
        ) : (
          <div className="list">
            {rows.map((r, i) => (
              <Row key={r.producer_id} row={r} rank={i + 1} />
            ))}
          </div>
        )}
      </div>

      <div className="detail" style={{ marginTop: 56 }}>
        <section className="left">
          <h2 className="section" style={{ fontSize: 28 }}>Cómo se calculan los puntos</h2>
          <p className="muted" style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55 }}>
            Solo cuentan acciones reales. Las ventas y las valoraciones se sumarán cuando se activen los pagos.
          </p>
          <div className="panel" style={{ marginTop: 20 }}>
            {POINTS_TABLE.map((p, i) => (
              <div key={p.label} className="row" style={i === 0 ? { borderTop: 'none', marginTop: 0, paddingTop: 0 } : undefined}>
                <span style={{ color: p.live ? 'var(--soft)' : 'var(--faint)' }}>
                  {p.label}{p.live ? '' : ' (próximamente)'}
                </span>
                <span style={{ fontWeight: 700 }}>{p.points}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="right">
          <h2 className="section" style={{ fontSize: 28 }}>Premio del mes</h2>
          <p className="muted" style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55 }}>
            El número uno de cada género recibe tres premios:
          </p>
          <div className="panel" style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600 }}>Insignia permanente</div>
            <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Se queda en su perfil: «1º en Trap · {monthLabel(previous)}».</div>
            <div style={{ fontWeight: 600, marginTop: 16 }}>Portada del mes</div>
            <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Su perfil y su mejor pista destacan en el inicio durante un mes.</div>
            <div style={{ fontWeight: 600, marginTop: 16 }}>Comisión reducida</div>
            <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>El mes siguiente paga menos comisión por cada venta.</div>
            <div className="faint" style={{ fontSize: 13, marginTop: 16 }}>
              Quien haga trampas pierde el premio (<Link href="/normas" style={{ color: 'var(--accent)' }}>ver normas y fraude</Link>). Los premios se activarán junto con los pagos.
            </div>
          </div>
        </aside>
      </div>

      {supabaseConfigured && (
        <div style={{ marginTop: 56 }}>
          <h2 className="section" style={{ fontSize: 28 }}>Ganadores de {monthLabel(previous)}</h2>
          <div className="steps">
            {winners.map((w) => (
              <div key={w.genre} className="box" style={{ padding: 22 }}>
                <div className="num">{w.genre}</div>
                <h3 style={{ fontSize: 22 }}>{w.top ? w.top.display_name : 'Sin ganador'}</h3>
                <p style={{ fontSize: 14 }}>{w.top ? `${w.top.points} puntos` : 'Nadie sumó puntos ese mes.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
