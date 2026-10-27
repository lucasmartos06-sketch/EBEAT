'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { supabaseConfigured } from '@/lib/config';
import { COMMISSION_STATUS } from '@/lib/commissions';
import { formatPrice } from '@/lib/format';
import { currentMonth, getRanking, getRankingGenres, monthLabel } from '@/lib/ranking';
import { useUserId } from '@/lib/useUserId';

type Sanction = { id: string; level: number; reason: string; active: boolean; created_at: string };
type MyAuction = { id: string; status: string; result: string | null; bid_count: number; current_cents: number; start_cents: number; final_cents: number | null; ends_at: string; tracks: { title: string } | { title: string }[] | null };
type MyProposal = { id: string; status: string; price_cents: number; commission_id: string; commissions: { title: string } | { title: string }[] | null };
type MyCommission = { id: string; title: string; status: 'open' | 'in_progress' | 'closed'; budget_cents: number };
type Order = { id: string; amount_cents: number; commission_cents: number; status: string; source: string; created_at: string };
type Place = { genre: string; rank: number; points: number };

const LEVELS: Record<number, string> = { 1: 'Aviso', 2: 'Suspensión temporal', 3: 'Anulación', 4: 'Expulsión' };
const PROPOSAL: Record<string, string> = { pending: 'Pendiente', accepted: 'Aceptada', rejected: 'No elegida' };
const SOURCE: Record<string, string> = { purchase: 'Compra', auction: 'Subasta', commission: 'Encargo' };

function titleOf(t: { title: string } | { title: string }[] | null): string {
  if (!t) return 'Pista';
  return Array.isArray(t) ? t[0]?.title ?? 'Pista' : t.title;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="box" style={{ padding: 22 }}>
      <div className="faint" style={{ fontSize: 13 }}>{label}</div>
      <div className="price-big" style={{ fontSize: 32, marginTop: 6 }}>{value}</div>
      {hint && <div className="faint" style={{ fontSize: 13, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default function ProducerPanel() {
  const userId = useUserId();
  const [loaded, setLoaded] = useState(false);
  const [tracks, setTracks] = useState(0);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [auctions, setAuctions] = useState<MyAuction[]>([]);
  const [proposals, setProposals] = useState<MyProposal[]>([]);
  const [commissions, setCommissions] = useState<MyCommission[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const [t, s, a, p, c, o] = await Promise.all([
        sb.from('tracks').select('id', { count: 'exact', head: true }).eq('producer_id', userId).eq('status', 'published'),
        sb.from('sanctions').select('id,level,reason,active,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        sb.from('auctions').select('id,status,result,bid_count,current_cents,start_cents,final_cents,ends_at,tracks(title)').eq('seller_id', userId).order('created_at', { ascending: false }).limit(20),
        sb.from('commission_proposals').select('id,status,price_cents,commission_id,commissions(title)').eq('producer_id', userId).order('created_at', { ascending: false }).limit(20),
        sb.from('commissions').select('id,title,status,budget_cents').eq('buyer_id', userId).order('created_at', { ascending: false }).limit(20),
        sb.from('orders').select('id,amount_cents,commission_cents,status,source,created_at').eq('seller_id', userId).order('created_at', { ascending: false }).limit(20),
      ]);
      const month = currentMonth();
      const rankingGenres = await getRankingGenres();
      const boards = await Promise.all(rankingGenres.map(async (g) => ({ g, rows: await getRanking(month, g) })));
      if (cancelled) return;
      setTracks(t.count ?? 0);
      setSanctions((s.data ?? []) as Sanction[]);
      setAuctions((a.data ?? []) as unknown as MyAuction[]);
      setProposals((p.data ?? []) as unknown as MyProposal[]);
      setCommissions((c.data ?? []) as MyCommission[]);
      setOrders((o.data ?? []) as Order[]);
      const found: Place[] = [];
      for (const b of boards) {
        const idx = b.rows.findIndex((r) => r.producer_id === userId);
        if (idx >= 0) found.push({ genre: b.g, rank: idx + 1, points: b.rows[idx].points });
      }
      setPlaces(found);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!supabaseConfigured) return <div className="notice warn"><strong>Falta conectar Supabase.</strong></div>;
  if (userId === undefined) return <div className="muted">Comprobando sesión…</div>;
  if (userId === null) {
    return (
      <div className="notice">
        <strong>Entra para ver tu panel.</strong>{' '}
        <Link href="/entrar" style={{ color: 'var(--accent)', fontWeight: 600 }}>Entrar</Link>
      </div>
    );
  }
  if (!loaded) return <div className="muted">Cargando tu panel…</div>;

  const paid = orders.filter((o) => o.status === 'paid');
  const net = paid.reduce((sum, o) => sum + o.amount_cents - o.commission_cents, 0);
  const activeAuctions = auctions.filter((a) => a.status === 'active' && new Date(a.ends_at).getTime() > Date.now());
  const pendingWon = auctions.filter((a) => a.result === 'won');
  const pendingTotal = pendingWon.reduce((sum, a) => sum + (a.final_cents ?? 0), 0);
  const activeSanctions = sanctions.filter((s) => s.active);

  return (
    <div>
      {activeSanctions.map((s) => (
        <div key={s.id} className="notice warn" style={{ marginBottom: 16 }}>
          <strong>{LEVELS[s.level]}.</strong> {s.reason}{' '}
          {s.level >= 2 && 'Mientras dure, no puedes publicar pistas, subastar, pujar ni enviar propuestas. '}
          <Link href="/normas" style={{ color: 'var(--accent)', fontWeight: 600 }}>Ver normas y cómo apelar</Link>
        </div>
      ))}

      <div className="steps" style={{ marginTop: 0 }}>
        <Stat label="Ganancias netas cobradas" value={formatPrice(net)} hint="Tras la comisión de la plataforma" />
        <Stat label="Pendiente de cobro" value={formatPrice(pendingTotal)} hint={`${pendingWon.length} ${pendingWon.length === 1 ? 'subasta ganada' : 'subastas ganadas'}`} />
        <Stat label="Pistas publicadas" value={String(tracks)} />
        <Stat label="Subastas activas" value={String(activeAuctions.length)} />
      </div>

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Tu posición en el ranking</h2>
      <div className="faint" style={{ marginTop: 6, fontSize: 14 }}>{monthLabel(currentMonth())}</div>
      {places.length === 0 ? (
        <div className="notice" style={{ marginTop: 16, maxWidth: 720 }}>
          Todavía no tienes puntos este mes. Publica una pista para empezar a sumar.{' '}
          <Link href="/ranking" style={{ color: 'var(--accent)', fontWeight: 600 }}>Ver ranking</Link>
        </div>
      ) : (
        <div className="tags" style={{ marginTop: 16 }}>
          {places.map((p) => (
            <Link key={p.genre} href={`/ranking?genero=${encodeURIComponent(p.genre)}`} className="badge open">
              {p.rank}º en {p.genre} · {p.points} pts
            </Link>
          ))}
        </div>
      )}

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Últimas ventas</h2>
      {orders.length === 0 ? (
        <div className="notice" style={{ marginTop: 16, maxWidth: 720 }}>Todavía no tienes ventas. Aparecerán aquí cuando se activen los pagos.</div>
      ) : (
        <div className="list" style={{ marginTop: 16, maxWidth: 820 }}>
          {orders.map((o) => (
            <div key={o.id} className="list-item" style={{ cursor: 'default' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{SOURCE[o.source] ?? o.source}</div>
                <div className="faint" style={{ fontSize: 13 }}>
                  {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  {o.status !== 'paid' ? ` · ${o.status === 'refunded' ? 'Devuelto' : 'Pendiente'}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{formatPrice(o.amount_cents - o.commission_cents)}</div>
                <div className="faint" style={{ fontSize: 12 }}>de {formatPrice(o.amount_cents)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Mis subastas</h2>
      {auctions.length === 0 ? (
        <div className="notice" style={{ marginTop: 16, maxWidth: 720 }}>
          No has lanzado subastas. <Link href="/subastas/nueva" style={{ color: 'var(--accent)', fontWeight: 600 }}>Subastar una pista</Link>
        </div>
      ) : (
        <div className="list" style={{ marginTop: 16, maxWidth: 820 }}>
          {auctions.map((a) => (
            <Link key={a.id} href={`/subastas/${a.id}`} className="list-item">
              <div>
                <div style={{ fontWeight: 600 }}>{titleOf(a.tracks)}</div>
                <div className="faint" style={{ fontSize: 13 }}>
                  {a.status === 'active' ? 'Activa' : a.result === 'won' ? 'Vendida' : a.status === 'cancelled' ? 'Cancelada' : 'Sin venta'} · {a.bid_count} pujas
                </div>
              </div>
              <div style={{ fontWeight: 700 }}>{formatPrice(a.final_cents ?? (a.bid_count > 0 ? a.current_cents : a.start_cents))}</div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Mis propuestas a encargos</h2>
      {proposals.length === 0 ? (
        <div className="notice" style={{ marginTop: 16, maxWidth: 720 }}>
          No has enviado propuestas. <Link href="/encargos" style={{ color: 'var(--accent)', fontWeight: 600 }}>Ver encargos abiertos</Link>
        </div>
      ) : (
        <div className="list" style={{ marginTop: 16, maxWidth: 820 }}>
          {proposals.map((p) => (
            <Link key={p.id} href={`/encargos/${p.commission_id}`} className="list-item">
              <div>
                <div style={{ fontWeight: 600 }}>{titleOf(p.commissions)}</div>
                <div className="faint" style={{ fontSize: 13 }}>{PROPOSAL[p.status]}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{formatPrice(p.price_cents)}</div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Mis encargos</h2>
      {commissions.length === 0 ? (
        <div className="notice" style={{ marginTop: 16, maxWidth: 720 }}>
          No has pedido ningún beat. <Link href="/encargos/nuevo" style={{ color: 'var(--accent)', fontWeight: 600 }}>Pedir un beat</Link>
        </div>
      ) : (
        <div className="list" style={{ marginTop: 16, maxWidth: 820 }}>
          {commissions.map((c) => (
            <Link key={c.id} href={`/encargos/${c.id}`} className="list-item">
              <div>
                <div style={{ fontWeight: 600 }}>{c.title}</div>
                <div className="faint" style={{ fontSize: 13 }}>{COMMISSION_STATUS[c.status]}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{formatPrice(c.budget_cents)}</div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Link href="/subir" className="btn btn-primary btn-sm">Subir pista</Link>
        <Link href="/mensajes" className="btn btn-ghost btn-sm">Mis mensajes</Link>
        <Link href="/cuenta" className="btn btn-ghost btn-sm">Ajustes de cuenta</Link>
        <Link href={`/productor/${userId}`} className="btn btn-ghost btn-sm">Mi perfil público</Link>
      </div>
    </div>
  );
}
