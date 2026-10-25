import { getSupabase } from './supabase';
import { cleanQuery } from './tracks';

export type ProducerCard = {
  id: string;
  display_name: string;
  bio: string | null;
  track_count: number;
  genres: string[];
};

export type Producer = {
  id: string;
  display_name: string;
  bio: string | null;
  created_at: string;
};

export type Badge = { badge_month: string; badge_genre: string };

export async function listProducers(q?: string): Promise<ProducerCard[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('list_producers', { p_q: cleanQuery(q) || null });
  if (error || !data) return [];
  return data as ProducerCard[];
}

export async function getProducer(id: string): Promise<Producer | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('id,display_name,bio,created_at').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as Producer;
}

export async function getBadges(id: string): Promise<Badge[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('producer_badges', { p_producer: id });
  if (error || !data) return [];
  return data as Badge[];
}
