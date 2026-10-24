import { getSupabase } from './supabase';
import { fetchNames } from './profiles';

export type Commission = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  title: string;
  description: string;
  genre: string;
  budget_cents: number;
  status: 'open' | 'in_progress' | 'closed';
  chosen_producer_id: string | null;
  created_at: string;
};

export const COMMISSION_STATUS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En curso',
  closed: 'Cerrado',
};

const COLUMNS =
  'id,buyer_id,title,description,genre,budget_cents,status,chosen_producer_id,created_at';

export async function getCommissions(genre?: string): Promise<Commission[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb
    .from('commissions')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(100);
  query = query.eq('status', 'open');
  if (genre) query = query.eq('genre', genre);
  const { data, error } = await query;
  if (error || !data) return [];
  const rows = data as Omit<Commission, 'buyer_name'>[];
  const names = await fetchNames(rows.map((r) => r.buyer_id));
  return rows.map((r) => ({ ...r, buyer_name: names[r.buyer_id] || 'Usuario' }));
}

export async function getCommission(id: string): Promise<Commission | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('commissions').select(COLUMNS).eq('id', id).maybeSingle();
  if (error || !data) return null;
  const row = data as Omit<Commission, 'buyer_name'>;
  const names = await fetchNames([row.buyer_id]);
  return { ...row, buyer_name: names[row.buyer_id] || 'Usuario' };
}
