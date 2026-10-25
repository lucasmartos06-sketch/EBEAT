import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseConfigured } from '@/lib/config';
import { cleanQuery } from '@/lib/tracks';
import { listProducers } from '@/lib/producers';
import { initial } from '@/lib/format';

export const metadata: Metadata = { title: 'Productores' };
export const dynamic = 'force-dynamic';

export default async function ProductoresPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = cleanQuery(q);
  const producers = await listProducers(query);

  return (
    <div className="wrap page">
      <h1 className="title">Productores</h1>
      <p className="lead">Descubre a los productores de eBeat, escucha sus pistas y encuentra el sonido que buscas.</p>

      <form action="/productores" method="get" style={{ marginTop: 24, maxWidth: 460 }}>
        <input name="q" type="search" className="field" defaultValue={query} placeholder="Buscar productor por nombre" aria-label="Buscar productor" maxLength={60} />
      </form>

      <div style={{ marginTop: 28 }}>
        {!supabaseConfigured ? (
          <div className="notice warn"><strong>Falta conectar Supabase.</strong> Los productores no están disponibles todavía.</div>
        ) : producers.length === 0 ? (
          <div className="notice">
            {query ? 'No hay productores con ese nombre.' : 'Todavía no hay productores con pistas publicadas.'}
          </div>
        ) : (
          <div className="steps" style={{ marginTop: 0 }}>
            {producers.map((p) => (
              <Link key={p.id} href={`/productor/${p.id}`} className="box" style={{ display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="cover" style={{ width: 52, height: 52, borderRadius: 999, fontSize: 22, background: 'var(--accent)' }}>
                    {initial(p.display_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 20 }}>{p.display_name}</div>
                    <div className="faint" style={{ fontSize: 13 }}>
                      {p.track_count === 1 ? '1 pista' : `${p.track_count} pistas`}
                    </div>
                  </div>
                </div>
                {p.bio && (
                  <p style={{ marginTop: 14, fontSize: 14 }}>{p.bio.length > 110 ? p.bio.slice(0, 110) + '…' : p.bio}</p>
                )}
                <div className="tags" style={{ marginTop: 14 }}>
                  {(p.genres ?? []).map((g) => <span key={g} className="tag">{g}</span>)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
