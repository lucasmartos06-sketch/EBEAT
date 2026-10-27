import Link from 'next/link';
import type { Metadata } from 'next';
import { MAIN_GENRES, supabaseConfigured } from '@/lib/config';
import { getCommissionGenres, getCommissions } from '@/lib/commissions';
import { cleanQuery } from '@/lib/tracks';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = { title: 'Encargos' };
export const dynamic = 'force-dynamic';

export default async function EncargosPage({
  searchParams,
}: {
  searchParams: Promise<{ genero?: string }>;
}) {
  const { genero } = await searchParams;
  const genre = cleanQuery(genero) || undefined;
  const used = await getCommissionGenres(16);
  const genres = Array.from(new Set([...(used.length > 0 ? used : MAIN_GENRES), ...(genre ? [genre] : [])]));
  const commissions = await getCommissions(genre);

  return (
    <div className="wrap page">
      <h1 className="title">Encargos</h1>
      <p className="lead">
        Describe el beat que necesitas y los productores te envían su propuesta y precio. Si eres productor,
        elige un encargo y gana dinero haciendo música a medida.
      </p>

      <div style={{ marginTop: 24 }}>
        <Link href="/encargos/nuevo" className="btn btn-primary">Pedir un beat</Link>
      </div>

      <div className="pills" style={{ marginTop: 28 }}>
        <Link href="/encargos" className={`pill ${!genre ? 'pill-active' : ''}`}>Todos</Link>
        {genres.map((g) => (
          <Link
            key={g}
            href={`/encargos?genero=${encodeURIComponent(g)}`}
            className={`pill ${genre === g ? 'pill-active' : ''}`}
          >
            {g}
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 24, maxWidth: 820 }}>
        {!supabaseConfigured ? (
          <div className="notice warn"><strong>Falta conectar Supabase.</strong> Los encargos no están disponibles todavía.</div>
        ) : commissions.length === 0 ? (
          <div className="notice">No hay encargos abiertos en esta categoría. ¡Sé el primero en pedir un beat!</div>
        ) : (
          <div className="list">
            {commissions.map((c) => (
              <Link key={c.id} href={`/encargos/${c.id}`} className="list-item">
                <div style={{ minWidth: 0 }}>
                  <div className="tags" style={{ marginBottom: 8 }}>
                    <span className="tag">{c.genre}</span>
                    <span className="badge open">Abierto</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 18 }}>{c.title}</div>
                  <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>Pide {c.buyer_name}</div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div className="faint" style={{ fontSize: 12 }}>Presupuesto</div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{formatPrice(c.budget_cents)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
