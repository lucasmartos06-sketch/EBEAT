import Link from 'next/link';
import type { Metadata } from 'next';
import TrackCard from '@/components/TrackCard';
import { GENRES, LICENSES } from '@/lib/config';
import { searchCommissions } from '@/lib/commissions';
import { formatPrice } from '@/lib/format';
import { cleanQuery, getUsedGenres, searchTracks, type SearchParams } from '@/lib/tracks';

export const metadata: Metadata = { title: 'Buscar' };
export const dynamic = 'force-dynamic';

type Raw = { q?: string; genero?: string; licencia?: string; max?: string; bpm_min?: string; bpm_max?: string; orden?: string };

function num(v: string | undefined): number | undefined {
  if (v === undefined || v.trim() === '') return undefined;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function BuscarPage({ searchParams }: { searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const q = cleanQuery(raw.q);
  const params: SearchParams = {
    q,
    genre: cleanQuery(raw.genero) || undefined,
    license: raw.licencia && raw.licencia in LICENSES ? raw.licencia : undefined,
    maxPrice: num(raw.max),
    bpmMin: num(raw.bpm_min),
    bpmMax: num(raw.bpm_max),
    sort: raw.orden === 'precio_asc' || raw.orden === 'precio_desc' ? raw.orden : 'nuevo',
  };

  const [tracks, commissions, used] = await Promise.all([searchTracks(params), searchCommissions(q), getUsedGenres(60)]);
  const genreOptions = Array.from(new Set([...GENRES, ...used, ...(params.genre ? [params.genre] : [])]));
  const filtering = Boolean(params.genre || params.license || params.maxPrice !== undefined || params.bpmMin !== undefined || params.bpmMax !== undefined);

  return (
    <div className="wrap page">
      <h1 className="title">{q ? `Resultados para «${q}»` : 'Buscar'}</h1>
      <p className="lead">Busca por título, productor o descripción, y filtra por género, licencia, precio y BPM.</p>

      <form action="/buscar" method="get" className="form" style={{ marginTop: 28, maxWidth: 920 }}>
        <div className="field-group">
          <label htmlFor="q" className="label">Buscar</label>
          <input id="q" name="q" type="search" className="field" defaultValue={q} maxLength={60} placeholder="Trap oscuro, Kuro Beats, melódico…" />
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="genero" className="label">Género</label>
            <select id="genero" name="genero" className="field" defaultValue={params.genre ?? ''}>
              <option value="">Todos</option>
              {genreOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="licencia" className="label">Licencia</label>
            <select id="licencia" name="licencia" className="field" defaultValue={params.license ?? ''}>
              <option value="">Todas</option>
              {Object.entries(LICENSES).map(([k, l]) => <option key={k} value={k}>{l.name}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="orden" className="label">Ordenar por</label>
            <select id="orden" name="orden" className="field" defaultValue={params.sort}>
              <option value="nuevo">Más recientes</option>
              <option value="precio_asc">Precio: de menor a mayor</option>
              <option value="precio_desc">Precio: de mayor a menor</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="max" className="label">Precio máximo (€)</label>
            <input id="max" name="max" type="text" inputMode="decimal" className="field" defaultValue={raw.max ?? ''} />
          </div>
          <div className="field-group">
            <label htmlFor="bpm_min" className="label">BPM mínimo</label>
            <input id="bpm_min" name="bpm_min" type="number" min={40} max={300} className="field" defaultValue={raw.bpm_min ?? ''} />
          </div>
          <div className="field-group">
            <label htmlFor="bpm_max" className="label">BPM máximo</label>
            <input id="bpm_max" name="bpm_max" type="number" min={40} max={300} className="field" defaultValue={raw.bpm_max ?? ''} />
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button type="submit" className="btn btn-primary">Buscar</button>
          {(q || filtering) && <Link href="/buscar" className="btn btn-ghost">Borrar filtros</Link>}
        </div>
      </form>

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Pistas</h2>
      <div className="faint" style={{ marginTop: 6, fontSize: 14 }}>
        {tracks.length === 1 ? '1 resultado' : `${tracks.length} resultados`}
        {params.maxPrice !== undefined ? ` · hasta ${formatPrice(Math.round(params.maxPrice * 100))}` : ''}
      </div>
      <div style={{ marginTop: 20 }}>
        {tracks.length === 0 ? (
          <div className="notice">No hay pistas que coincidan. Prueba con otras palabras o quita algún filtro.</div>
        ) : (
          <div className="grid-cards">
            {tracks.map((t) => <TrackCard key={t.id} track={t} />)}
          </div>
        )}
      </div>

      {q && (
        <>
          <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Encargos abiertos</h2>
          <div style={{ marginTop: 20, maxWidth: 820 }}>
            {commissions.length === 0 ? (
              <div className="notice">No hay encargos abiertos con esas palabras.</div>
            ) : (
              <div className="list">
                {commissions.map((c) => (
                  <Link key={c.id} href={`/encargos/${c.id}`} className="list-item">
                    <div style={{ minWidth: 0 }}>
                      <div className="tags" style={{ marginBottom: 8 }}><span className="tag">{c.genre}</span></div>
                      <div style={{ fontWeight: 600, fontSize: 18 }}>{c.title}</div>
                      <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>Pide {c.buyer_name}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 20, flex: 'none' }}>{formatPrice(c.budget_cents)}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
