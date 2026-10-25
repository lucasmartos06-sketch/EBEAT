'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { fetchNames } from '@/lib/profiles';
import { formatPrice } from '@/lib/format';
import { useUserId } from '@/lib/useUserId';
import { AUCTION_COLUMNS, countdown, minNextBid, shownPrice, type Auction } from '@/lib/auctions';

type Bid = { id: string; bidder_id: string; amount_cents: number; created_at: string };

const POLL_MS = 5000;

export default function AuctionPanel({ initial }: { initial: Auction }) {
  const router = useRouter();
  const userId = useUserId();
  const [auction, setAuction] = useState<Auction>(initial);
  const [bids, setBids] = useState<Bid[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [now, setNow] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finalizing = useRef(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [{ data: a }, { data: b }] = await Promise.all([
      sb.from('auctions').select(AUCTION_COLUMNS).eq('id', initial.id).maybeSingle(),
      sb
        .from('auction_bids')
        .select('id,bidder_id,amount_cents,created_at')
        .eq('auction_id', initial.id)
        .order('amount_cents', { ascending: false })
        .limit(20),
    ]);
    if (a) setAuction(a as Auction);
    const list = (b ?? []) as Bid[];
    setBids(list);
    const ids = list.map((x) => x.bidder_id);
    ids.push(initial.seller_id);
    if (a) {
      const row = a as Auction;
      if (row.winner_id) ids.push(row.winner_id);
    }
    setNames(await fetchNames(ids));
  }, [initial.id, initial.seller_id]);

  useEffect(() => {
    setNow(Date.now());
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const ended = auction.status !== 'active' || (now !== null && new Date(auction.ends_at).getTime() <= now);

  // Cuando se acaba el tiempo, cualquier usuario con sesión cierra la subasta.
  useEffect(() => {
    if (!ended || auction.status !== 'active' || !userId || finalizing.current) return;
    const sb = getSupabase();
    if (!sb) return;
    finalizing.current = true;
    sb.rpc('finalize_auction', { p_auction: auction.id }).then(() => {
      load();
    });
  }, [ended, auction.status, auction.id, userId, load]);

  const isSeller = userId === auction.seller_id;
  const minBid = minNextBid(auction);

  async function bid(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb) return;
    const euros = Number(amount.replace(',', '.').trim());
    if (amount.trim() === '' || Number.isNaN(euros) || euros < 0) return setError('Indica un importe válido en euros.');
    setBusy(true);
    const { error: rpcError } = await sb.rpc('place_bid', {
      p_auction: auction.id,
      p_amount: Math.round(euros * 100),
    });
    setBusy(false);
    if (rpcError) setError(rpcError.message);
    else setAmount('');
    await load();
  }

  async function cancel() {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    const { error: rpcError } = await sb.rpc('cancel_auction', { p_auction: auction.id });
    if (rpcError) return setError(rpcError.message);
    router.push('/subastas');
  }

  const winnerName = auction.winner_id ? names[auction.winner_id] || 'Usuario' : '';

  return (
    <div className="panel">
      <div className="faint" style={{ fontSize: 13 }}>{auction.bid_count > 0 ? 'Puja actual' : 'Precio de salida'}</div>
      <div className="price-big">{formatPrice(shownPrice(auction))}</div>

      <div className="row">
        <span>Pujas</span>
        <span style={{ fontWeight: 600 }}>{auction.bid_count}</span>
      </div>
      <div className="row">
        <span>Tiempo restante</span>
        <span style={{ fontWeight: 600 }}>{auction.status === 'cancelled' ? 'Cancelada' : now === null ? '…' : countdown(auction.ends_at, now)}</span>
      </div>
      <div className="row">
        <span>Precio de reserva</span>
        <span style={{ fontWeight: 600 }}>{auction.reserve_met ? 'Alcanzado' : 'No alcanzado'}</span>
      </div>

      {/* Resultado */}
      {auction.status === 'cancelled' && <div className="notice" style={{ marginTop: 20 }}>El vendedor canceló esta subasta.</div>}
      {auction.status === 'ended' && auction.result === 'won' && (
        <div className="notice" style={{ marginTop: 20 }}>
          <strong>Subasta ganada por {winnerName} con {formatPrice(auction.final_cents ?? 0)}.</strong>{' '}
          {userId === auction.winner_id
            ? 'Eres el ganador y tienes la obligación de comprar la pista. El pago se activará en una fase posterior.'
            : 'El ganador está obligado a comprar la pista.'}
        </div>
      )}
      {auction.status === 'ended' && auction.result === 'no_bids' && (
        <div className="notice" style={{ marginTop: 20 }}>La subasta terminó sin pujas.</div>
      )}
      {auction.status === 'ended' && auction.result === 'reserve_not_met' && (
        <div className="notice" style={{ marginTop: 20 }}>La subasta terminó sin alcanzar el precio de reserva, así que no hay venta.</div>
      )}
      {ended && auction.status === 'active' && <div className="muted" style={{ marginTop: 20 }}>Cerrando subasta…</div>}

      {/* Pujar */}
      {!ended && userId === null && (
        <Link href="/entrar" className="btn btn-primary btn-block" style={{ marginTop: 22 }}>Entra para pujar</Link>
      )}
      {!ended && userId && !isSeller && (
        <form onSubmit={bid} style={{ marginTop: 22 }}>
          <label htmlFor="bid" className="label">Tu puja (mínimo {formatPrice(minBid)})</label>
          <input
            id="bid"
            className="field"
            inputMode="decimal"
            placeholder={String(minBid / 100).replace('.', ',')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={busy}>
            {busy ? 'Pujando…' : 'Pujar'}
          </button>
          <div className="faint" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>
            Si nadie supera tu puja, tienes la obligación de comprar la pista. Pujar es un compromiso. En los
            últimos 2 minutos, cada puja alarga la subasta 2 minutos más.
          </div>
        </form>
      )}
      {!ended && isSeller && (
        <div style={{ marginTop: 22 }}>
          <div className="faint" style={{ fontSize: 13 }}>Es tu subasta. No puedes pujar en ella.</div>
          {auction.bid_count === 0 && (
            <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={cancel}>
              Cancelar subasta
            </button>
          )}
        </div>
      )}
      {error && <div className="msg error">{error}</div>}

      {/* Historial */}
      {bids.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <strong style={{ fontSize: 15 }}>Pujas</strong>
          {bids.map((b, i) => (
            <div key={b.id} className="row" style={{ marginTop: 10, paddingTop: 10 }}>
              <span>{i === 0 ? '👑 ' : ''}{names[b.bidder_id] || 'Usuario'}</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatPrice(b.amount_cents)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
