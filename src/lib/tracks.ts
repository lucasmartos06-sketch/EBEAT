import { getSupabase } from './supabase';

export type Track = {
  id: string;
  title: string;
  genre: string;
  bpm: number | null;
  price_cents: number;
  license: string;
  description: string | null;
  audio_url: string | null;
  producer_name: string;
  producer_id?: string;
  demo?: boolean;
};

// Pistas de ejemplo: se muestran mientras Supabase no está configurado.
export const DEMO_TRACKS: Track[] = [
  { id: 'demo-1', title: 'Neon Bajo', genre: 'Trap', bpm: 140, price_cents: 2900, license: 'comercial', description: 'Trap oscuro con 808 profundos. Pista de ejemplo.', audio_url: null, producer_name: 'Kuro Beats', demo: true },
  { id: 'demo-2', title: 'Calle 24', genre: 'Hip hop', bpm: 92, price_cents: 2400, license: 'comercial', description: 'Boom bap con swing. Pista de ejemplo.', audio_url: null, producer_name: 'Marea Sonora', demo: true },
  { id: 'demo-3', title: 'Lluvia de verano', genre: 'Lo-fi', bpm: 78, price_cents: 1500, license: 'personal', description: 'Lo-fi relajado. Pista de ejemplo.', audio_url: null, producer_name: 'Lumen', demo: true },
  { id: 'demo-4', title: 'Pulso', genre: 'Electrónica', bpm: 124, price_cents: 3500, license: 'comercial', description: 'House con bajo marcado. Pista de ejemplo.', audio_url: null, producer_name: 'Dani Ruiz', demo: true },
  { id: 'demo-5', title: 'Frío de noche', genre: 'Drill', bpm: 142, price_cents: 2500, license: 'comercial', description: 'Drill melódico. Pista de ejemplo.', audio_url: null, producer_name: 'Frío Norte', demo: true },
  { id: 'demo-6', title: 'Estribillo fácil', genre: 'Pop', bpm: 108, price_cents: 3000, license: 'personal', description: 'Pop veraniego. Pista de ejemplo.', audio_url: null, producer_name: 'Dulce Fuego', demo: true },
];

const COLUMNS =
  'id,producer_id,title,genre,bpm,price_cents,license,description,audio_path,profiles(display_name)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTrack(row: any, publicUrl: (path: string) => string): Track {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    title: row.title,
    genre: row.genre,
    bpm: row.bpm,
    price_cents: row.price_cents,
    license: row.license,
    description: row.description,
    audio_url: row.audio_path ? publicUrl(row.audio_path) : null,
    producer_name: profile?.display_name || 'Productor',
    producer_id: row.producer_id,
  };
}

export async function getTracks(
  genre?: string,
  limit?: number,
): Promise<{ tracks: Track[]; demo: boolean }> {
  const sb = getSupabase();
  if (!sb) {
    const list = DEMO_TRACKS.filter((t) => !genre || t.genre === genre);
    return { tracks: limit ? list.slice(0, limit) : list, demo: true };
  }

  let query = sb
    .from('tracks')
    .select(COLUMNS)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (genre) query = query.eq('genre', genre);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error || !data) return { tracks: [], demo: false };

  const publicUrl = (path: string) => sb.storage.from('previews').getPublicUrl(path).data.publicUrl;
  return { tracks: data.map((row) => toTrack(row, publicUrl)), demo: false };
}

export async function getTrack(id: string): Promise<Track | null> {
  const sb = getSupabase();
  if (!sb) return DEMO_TRACKS.find((t) => t.id === id) ?? null;

  const { data, error } = await sb
    .from('tracks')
    .select(COLUMNS)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data) return null;

  const publicUrl = (path: string) => sb.storage.from('previews').getPublicUrl(path).data.publicUrl;
  return toTrack(data, publicUrl);
}

export type SearchParams = {
  q?: string;
  genre?: string;
  license?: string;
  maxPrice?: number; // en euros
  bpmMin?: number;
  bpmMax?: number;
  sort?: 'nuevo' | 'precio_asc' | 'precio_desc';
};

// Quita los caracteres que tienen significado especial en los filtros de la base de datos.
export function cleanQuery(raw: string | undefined): string {
  return (raw ?? '').replace(/[%,()*\\"'`:;]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

export async function searchTracks(p: SearchParams): Promise<Track[]> {
  const q = cleanQuery(p.q);
  const sb = getSupabase();
  if (!sb) {
    const needle = q.toLowerCase();
    return DEMO_TRACKS.filter(
      (t) =>
        (!needle ||
          t.title.toLowerCase().includes(needle) ||
          t.producer_name.toLowerCase().includes(needle) ||
          (t.description ?? '').toLowerCase().includes(needle)) &&
        (!p.genre || t.genre === p.genre) &&
        (!p.license || t.license === p.license) &&
        (p.maxPrice === undefined || t.price_cents <= p.maxPrice * 100) &&
        (p.bpmMin === undefined || (t.bpm ?? 0) >= p.bpmMin) &&
        (p.bpmMax === undefined || (t.bpm ?? 9999) <= p.bpmMax),
    );
  }

  let query = sb.from('tracks').select(COLUMNS).eq('status', 'published');

  if (q) {
    // También busca por el nombre del productor.
    const { data: people } = await sb.from('profiles').select('id').ilike('display_name', `%${q}%`).limit(50);
    const ids = ((people ?? []) as { id: string }[]).map((x) => x.id);
    const parts = [`title.ilike.%${q}%`, `description.ilike.%${q}%`];
    if (ids.length > 0) parts.push(`producer_id.in.(${ids.join(',')})`);
    query = query.or(parts.join(','));
  }
  if (p.genre) query = query.eq('genre', p.genre);
  if (p.license) query = query.eq('license', p.license);
  if (p.maxPrice !== undefined) query = query.lte('price_cents', Math.round(p.maxPrice * 100));
  if (p.bpmMin !== undefined) query = query.gte('bpm', p.bpmMin);
  if (p.bpmMax !== undefined) query = query.lte('bpm', p.bpmMax);

  if (p.sort === 'precio_asc') query = query.order('price_cents', { ascending: true });
  else if (p.sort === 'precio_desc') query = query.order('price_cents', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query.limit(60);
  if (error || !data) return [];
  const publicUrl = (path: string) => sb.storage.from('previews').getPublicUrl(path).data.publicUrl;
  return data.map((row) => toTrack(row, publicUrl));
}

export async function getProducerTracks(producerId: string): Promise<Track[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('tracks')
    .select(COLUMNS)
    .eq('producer_id', producerId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error || !data) return [];
  const publicUrl = (path: string) => sb.storage.from('previews').getPublicUrl(path).data.publicUrl;
  return data.map((row) => toTrack(row, publicUrl));
}

// Ordena géneros por número de pistas (de más a menos) y devuelve los primeros.
export function topGenres(genres: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const g of genres) if (g) counts.set(g, (counts.get(g) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([g]) => g);
}

// Géneros que tienen pistas publicadas ahora mismo (incluye los escritos con «Otro»).
export async function getUsedGenres(limit = 16): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return topGenres(DEMO_TRACKS.map((t) => t.genre), limit);
  const { data } = await sb.from('tracks').select('genre').eq('status', 'published').limit(2000);
  return topGenres(((data ?? []) as { genre: string }[]).map((r) => r.genre), limit);
}
