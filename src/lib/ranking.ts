import { MAIN_GENRES } from './config';
import { getSupabase } from './supabase';
import { getUsedGenres } from './tracks';

export type RankRow = {
  producer_id: string;
  display_name: string;
  points: number;
  new_tracks: number;
  auction_sales: number;
  commissions_done: number;
};

// Puntos por acción (los mismos que usa la base de datos).
export const POINTS_TABLE = [
  { label: 'Pista nueva publicada (máx. 3 al mes)', points: '+2', live: true },
  { label: 'Subasta vendida', points: '+10', live: true },
  { label: 'Encargo completado', points: '+25', live: true },
  { label: 'Venta de una pista', points: '+10', live: false },
  { label: 'Valoración de 5 estrellas', points: '+5', live: false },
  { label: 'Valoración de 1 o 2 estrellas', points: '−5', live: false },
];

// Mes actual en hora de España, como "2026-10".
export function currentMonth(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }).slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const text = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function getRanking(month: string, genre: string): Promise<RankRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('monthly_ranking', { p_month: `${month}-01`, p_genre: genre });
  if (error || !data) return [];
  return data as RankRow[];
}

// Géneros que muestra el ranking: los principales más los que tienen pistas (hasta 12).
export async function getRankingGenres(): Promise<string[]> {
  const used = await getUsedGenres(12);
  return Array.from(new Set([...MAIN_GENRES, ...used]));
}
