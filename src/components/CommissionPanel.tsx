'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { fetchNames } from '@/lib/profiles';
import { formatPrice } from '@/lib/format';
import { useUserId } from '@/lib/useUserId';
import type { Commission } from '@/lib/commissions';

type Proposal = {
  id: string;
  producer_id: string;
  price_cents: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
};

const PROPOSAL_STATUS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'No elegida',
};

export default function CommissionPanel({ commission }: { commission: Commission }) {
  const router = useRouter();
  const userId = useUserId();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb
      .from('commission_proposals')
      .select('id,producer_id,price_cents,message,status')
      .eq('commission_id', commission.id)
      .order('created_at', { ascending: true });
    const list = (data ?? []) as Proposal[];
    setProposals(list);
    setNames(await fetchNames(list.map((p) => p.producer_id)));
    setLoaded(true);
  }, [commission.id]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  if (userId === undefined) return <div className="panel muted">Comprobando sesión…</div>;
  if (userId === null) {
    return (
      <div className="panel">
        <strong>¿Quieres hacer este beat?</strong>
        <p className="muted" style={{ margin: '10px 0 18px', fontSize: 15, lineHeight: 1.55 }}>
          Entra con tu cuenta de productor para enviar tu propuesta.
        </p>
        <Link href="/entrar" className="btn btn-primary btn-block">Entrar o crear cuenta</Link>
      </div>
    );
  }

  const isBuyer = userId === commission.buyer_id;
  const mine = proposals.find((p) => p.producer_id === userId);

  async function openChat(proposalId: string) {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    const { data, error: rpcError } = await sb.rpc('start_commission_conversation', { p_proposal: proposalId });
    if (rpcError || !data) return setError(rpcError?.message ?? 'No se pudo abrir el chat.');
    router.push(`/mensajes/${data}`);
  }

  async function accept(proposalId: string) {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    setBusy(true);
    const { data, error: rpcError } = await sb.rpc('accept_proposal', { p_proposal: proposalId });
    setBusy(false);
    if (rpcError || !data) return setError(rpcError?.message ?? 'No se pudo aceptar la propuesta.');
    router.push(`/mensajes/${data}`);
  }

  async function closeCommission() {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    const { error: rpcError } = await sb.rpc('close_commission', { p_commission: commission.id });
    if (rpcError) return setError(rpcError.message);
    router.refresh();
  }

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb || !userId) return;
    const f = new FormData(e.currentTarget);
    const priceRaw = String(f.get('price') || '').replace(',', '.').trim();
    const price = Number(priceRaw);
    const message = String(f.get('message') || '').trim();
    if (priceRaw === '' || Number.isNaN(price) || price < 0) return setError('Indica tu precio en euros.');
    if (!message) return setError('Escribe un mensaje para el comprador.');

    setBusy(true);
    const { error: insertError } = await sb.from('commission_proposals').insert({
      commission_id: commission.id,
      producer_id: userId,
      price_cents: Math.round(price * 100),
      message,
    });
    setBusy(false);
    if (insertError) {
      return setError(
        insertError.code === '23505'
          ? 'Ya enviaste una propuesta a este encargo.'
          : 'No se pudo enviar: ' + insertError.message,
      );
    }
    await load();
  }

  // Vista de quien hizo el encargo
  if (isBuyer) {
    return (
      <div className="panel">
        <strong>Propuestas recibidas</strong>
        {!loaded && <div className="muted" style={{ marginTop: 12 }}>Cargando…</div>}
        {loaded && proposals.length === 0 && (
          <p className="muted" style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.55 }}>
            Aún no hay propuestas. Cuando un productor responda, la verás aquí.
          </p>
        )}
        {proposals.map((p) => (
          <div key={p.id} className="row" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{names[p.producer_id] || 'Productor'}</span>
              <span style={{ fontWeight: 700 }}>{formatPrice(p.price_cents)}</span>
            </div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>{p.message}</div>
            <div className="faint" style={{ marginTop: 6, fontSize: 13 }}>{PROPOSAL_STATUS[p.status]}</div>
            <div className="offer-actions">
              {commission.status === 'open' && p.status === 'pending' && (
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => accept(p.id)}>
                  Aceptar
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openChat(p.id)}>
                Hablar
              </button>
            </div>
          </div>
        ))}
        {commission.status !== 'closed' && (
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 22 }} onClick={closeCommission}>
            Cerrar encargo
          </button>
        )}
        {error && <div className="msg error">{error}</div>}
      </div>
    );
  }

  // Vista de un productor
  if (mine) {
    return (
      <div className="panel">
        <strong>Tu propuesta</strong>
        <div className="price-big" style={{ fontSize: 36, marginTop: 8 }}>{formatPrice(mine.price_cents)}</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{mine.message}</div>
        <div className="faint" style={{ marginTop: 8, fontSize: 13 }}>{PROPOSAL_STATUS[mine.status]}</div>
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 18 }} onClick={() => openChat(mine.id)}>
          Hablar con {commission.buyer_name}
        </button>
        {error && <div className="msg error">{error}</div>}
      </div>
    );
  }

  if (commission.status !== 'open') {
    return <div className="panel muted">Este encargo ya no admite propuestas.</div>;
  }

  return (
    <form className="panel" onSubmit={send}>
      <strong>Enviar una propuesta</strong>
      <div className="field-group" style={{ marginTop: 16 }}>
        <label htmlFor="price" className="label">Tu precio (€)</label>
        <input id="price" name="price" type="text" inputMode="decimal" className="field" required />
      </div>
      <div className="field-group">
        <label htmlFor="message" className="label">Mensaje para el comprador</label>
        <textarea
          id="message"
          name="message"
          className="field"
          rows={4}
          required
          maxLength={1000}
          placeholder="Cuéntale cómo lo harías, plazo de entrega y ejemplos de tu trabajo"
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Enviando…' : 'Enviar propuesta'}
      </button>
      {error && <div className="msg error">{error}</div>}
    </form>
  );
}
