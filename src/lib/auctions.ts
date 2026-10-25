import { getSupabase } from './supabase';

export type Auction = {
  id: string;
  track_id: string;
  seller_id: string;
  start_cents: number;
  min_increment_cents: number;
  current_cents: number;
  bid_count: number;
  leader_id: string | null;
  reserve_met: boolean;
  ends_at: string;
  status: 'active' | 'ended' | 'cancelled';
  result: 'won' | 'no_bids' | 'reserve_not_met' | null;
  winner_id: string | null;
  final_cents: number | null;
};

export const AUCTION_COLUMNS =
  'id,track_id,seller_id,start_cents,min_increment_cents,current_cents,bid_count,leader_id,reserve_met,ends_at,status,result,winner_id,final_cents';

// Precio que se muestra: la puja más alta, o el precio de salida si aún no hay pujas.
export function shownPrice(a: Auction): number {
  return a.bid_count > 0 ? a.current_cents : a.start_cents;
}

// Importe mínimo de la siguiente puja.
export function minNextBid(a: Auction): number {
  return a.bid_count === 0 ? a.start_cents : a.current_cents + a.min_increment_cents;
}

export function countdown(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return 'Terminada';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} d ${h} h ${m} min`;
  if (h > 0) return `${h} h ${m} min ${sec} s`;
  return `${m} min ${sec} s`;
}

export type AuctionListItem = Auction & { track_title: string; track_genre: string };

export async function getActiveAuctions(): Promise<AuctionListItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('auctions')
    .select(AUCTION_COLUMNS + ',tracks(title,genre)')
    .eq('status', 'active')
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: true })
    .limit(100);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => {
    const t = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks;
    return { ...row, track_title: t?.title ?? 'Pista', track_genre: t?.genre ?? '' } as AuctionListItem;
  });
}

export async function getAuction(id: string): Promise<Auction | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('auctions').select(AUCTION_COLUMNS).eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as Auction;
}
