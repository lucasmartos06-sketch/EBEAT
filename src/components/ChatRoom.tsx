'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';
import { fetchNames } from '@/lib/profiles';
import { formatPrice } from '@/lib/format';
import { useUserId } from '@/lib/useUserId';
import BuyButton from '@/components/BuyButton';

type Conv = {
  id: string;
  track_id: string | null;
  commission_id: string | null;
  buyer_id: string;
  seller_id: string;
  subject: string;
};

type Msg = {
  id: string;
  sender_id: string;
  kind: 'text' | 'offer' | 'system';
  body: string;
  offer_cents: number | null;
  offer_status: 'pending' | 'accepted' | 'rejected' | null;
  created_at: string;
};

const POLL_MS = 5000;

function time(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoom({ id }: { id: string }) {
  const userId = useUserId();
  const [conv, setConv] = useState<Conv | null>(null);
  const [missing, setMissing] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [paidOffers, setPaidOffers] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [offer, setOffer] = useState('');
  const [mode, setMode] = useState<'text' | 'offer'>('text');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb
      .from('messages')
      .select('id,sender_id,kind,body,offer_cents,offer_status,created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Msg[]);
    const { data: paid } = await sb
      .from('orders')
      .select('offer_message_id')
      .eq('status', 'paid')
      .not('offer_message_id', 'is', null);
    setPaidOffers(((paid ?? []) as { offer_message_id: string }[]).map((p) => p.offer_message_id));
  }, [id]);

  useEffect(() => {
    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;

    (async () => {
      const { data } = await sb
        .from('conversations')
        .select('id,track_id,commission_id,buyer_id,seller_id,subject')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setMissing(true);
        return;
      }
      const c = data as Conv;
      setConv(c);
      setNames(await fetchNames([c.buyer_id, c.seller_id]));
      await loadMessages();
    })();

    const timer = setInterval(loadMessages, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [userId, id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (userId === undefined) return <div className="muted">Comprobando sesión…</div>;
  if (userId === null) {
    return (
      <div className="notice">
        <strong>Necesitas una cuenta para ver tus mensajes.</strong>{' '}
        <Link href="/entrar" style={{ color: 'var(--accent)', fontWeight: 600 }}>Entrar</Link>
      </div>
    );
  }
  if (missing) {
    return <div className="notice warn">No encontramos esta conversación o no participas en ella.</div>;
  }
  if (!conv) return <div className="muted">Cargando conversación…</div>;

  const otherId = conv.buyer_id === userId ? conv.seller_id : conv.buyer_id;
  const otherName = names[otherId] || 'Usuario';

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb || !conv) return;

    let row: Record<string, unknown>;
    if (mode === 'offer') {
      const euros = Number(offer.replace(',', '.').trim());
      if (offer.trim() === '' || Number.isNaN(euros) || euros < 0) return setError('Indica un precio válido en euros.');
      row = {
        conversation_id: conv.id,
        sender_id: userId,
        kind: 'offer',
        body: text.trim(),
        offer_cents: Math.round(euros * 100),
        offer_status: 'pending',
      };
    } else {
      if (!text.trim()) return;
      row = { conversation_id: conv.id, sender_id: userId, kind: 'text', body: text.trim() };
    }

    setBusy(true);
    const { error: insertError } = await sb.from('messages').insert(row);
    setBusy(false);
    if (insertError) return setError('No se pudo enviar: ' + insertError.message);
    setText('');
    setOffer('');
    setMode('text');
    await loadMessages();
  }

  async function respond(messageId: string, accept: boolean) {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    const { error: rpcError } = await sb.rpc('respond_offer', { p_message: messageId, p_accept: accept });
    if (rpcError) setError(rpcError.message);
    await loadMessages();
  }

  const hasAccepted = messages.some((m) => m.kind === 'offer' && m.offer_status === 'accepted');

  return (
    <div className="chat">
      <div className="chat-head">
        <div>
          <div className="faint" style={{ fontSize: 13 }}>Conversación con</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{otherName}</div>
          <div className="muted" style={{ fontSize: 14 }}>{conv.subject}</div>
        </div>
        {conv.track_id && (
          <Link href={`/pista/${conv.track_id}`} className="btn btn-ghost btn-sm">Ver pista</Link>
        )}
        {conv.commission_id && (
          <Link href={`/encargos/${conv.commission_id}`} className="btn btn-ghost btn-sm">Ver encargo</Link>
        )}
      </div>

      <div className="chat-body">
        {messages.length === 0 && (
          <div className="muted" style={{ textAlign: 'center', marginTop: 24 }}>
            Aún no hay mensajes. Saluda o haz una oferta.
          </div>
        )}
        {messages.map((m) => {
          if (m.kind === 'system') {
            return <div key={m.id} className="bubble-system">{m.body}</div>;
          }
          const mine = m.sender_id === userId;
          if (m.kind === 'offer') {
            return (
              <div key={m.id} className={`bubble offer ${mine ? 'mine' : 'theirs'}`}>
                <div className="faint" style={{ fontSize: 12 }}>{mine ? 'Tu oferta' : `Oferta de ${otherName}`}</div>
                <div className="offer-price">{formatPrice(m.offer_cents ?? 0)}</div>
                {m.body && <div style={{ marginTop: 6 }}>{m.body}</div>}
                {m.offer_status === 'pending' && !mine && (
                  <div className="offer-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => respond(m.id, true)}>Aceptar</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => respond(m.id, false)}>Rechazar</button>
                  </div>
                )}
                {m.offer_status === 'pending' && mine && <div className="faint" style={{ marginTop: 8, fontSize: 13 }}>Esperando respuesta…</div>}
                {m.offer_status === 'accepted' && <div className="status-ok">Aceptada</div>}
                {m.offer_status === 'accepted' && conv.track_id && userId === conv.buyer_id && !paidOffers.includes(m.id) && (
                  <BuyButton kind="offer" id={m.id} label={`Pagar ${formatPrice(m.offer_cents ?? 0)}`} small />
                )}
                {m.offer_status === 'accepted' && paidOffers.includes(m.id) && <div className="status-ok">Pagada</div>}
                {m.offer_status === 'rejected' && <div className="status-no">Rechazada</div>}
                <div className="bubble-time">{time(m.created_at)}</div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`bubble ${mine ? 'mine' : 'theirs'}`}>
              <div>{m.body}</div>
              <div className="bubble-time">{time(m.created_at)}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {hasAccepted && (
        <div className="notice" style={{ marginTop: 12 }}>
          <strong>Hay un acuerdo.</strong>{' '}
          {conv.track_id
            ? 'El comprador puede pagarlo con el botón «Pagar» de la oferta aceptada y descargar la pista desde su panel.'
            : 'El pago del encargo se hace desde la página del encargo.'}
        </div>
      )}

      <form className="chat-form" onSubmit={send}>
        <div className="pills" style={{ marginBottom: 10 }}>
          <button type="button" className={`pill ${mode === 'text' ? 'pill-active' : ''}`} onClick={() => setMode('text')}>Mensaje</button>
          <button type="button" className={`pill ${mode === 'offer' ? 'pill-active' : ''}`} onClick={() => setMode('offer')}>Hacer una oferta</button>
        </div>
        {mode === 'offer' && (
          <input
            className="field"
            style={{ marginBottom: 10 }}
            inputMode="decimal"
            placeholder="Precio que propones (€)"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            aria-label="Precio de la oferta en euros"
          />
        )}
        <div className="chat-send">
          <input
            className="field"
            placeholder={mode === 'offer' ? 'Añade una nota (opcional)' : 'Escribe un mensaje…'}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            aria-label="Mensaje"
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {mode === 'offer' ? 'Enviar oferta' : 'Enviar'}
          </button>
        </div>
        {error && <div className="msg error">{error}</div>}
      </form>
    </div>
  );
}
