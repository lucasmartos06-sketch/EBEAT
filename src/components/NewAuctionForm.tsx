'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { supabaseConfigured } from '@/lib/config';
import { useUserId } from '@/lib/useUserId';

type MyTrack = { id: string; title: string };

const DURATIONS = [
  { hours: 24, label: '24 horas' },
  { hours: 48, label: '48 horas' },
  { hours: 72, label: '3 días' },
  { hours: 168, label: '7 días' },
];

export default function NewAuctionForm() {
  const router = useRouter();
  const userId = useUserId();
  const [tracks, setTracks] = useState<MyTrack[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;
    sb.from('tracks')
      .select('id,title')
      .eq('producer_id', userId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data }) => setTracks((data ?? []) as MyTrack[]));
  }, [userId]);

  if (!supabaseConfigured) {
    return <div className="notice warn"><strong>Falta conectar Supabase.</strong> Las subastas no están disponibles todavía.</div>;
  }
  if (userId === undefined) return <div className="muted">Comprobando sesión…</div>;
  if (userId === null) {
    return (
      <div className="notice">
        <strong>Necesitas una cuenta para subastar una pista.</strong>{' '}
        <Link href="/entrar" style={{ color: 'var(--accent)', fontWeight: 600 }}>Entra o crea tu cuenta</Link>.
      </div>
    );
  }
  if (tracks === null) return <div className="muted">Cargando tus pistas…</div>;
  if (tracks.length === 0) {
    return (
      <div className="notice">
        Todavía no tienes pistas publicadas.{' '}
        <Link href="/subir" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sube una pista</Link> y vuelve aquí.
      </div>
    );
  }

  function toCents(raw: string): number | null {
    const v = raw.replace(',', '.').trim();
    if (v === '') return null;
    const n = Number(v);
    if (Number.isNaN(n) || n < 0) return NaN;
    return Math.round(n * 100);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb) return;

    const f = new FormData(e.currentTarget);
    const trackId = String(f.get('track') || '');
    const start = toCents(String(f.get('start') || ''));
    const reserve = toCents(String(f.get('reserve') || ''));
    const hours = Number(f.get('hours'));

    if (start === null || Number.isNaN(start)) return setError('Indica un precio de salida válido en euros.');
    if (reserve !== null && Number.isNaN(reserve)) return setError('El precio de reserva no es válido.');
    if (reserve !== null && reserve < start) return setError('La reserva no puede ser menor que el precio de salida.');

    setBusy(true);
    const { data, error: rpcError } = await sb.rpc('create_auction', {
      p_track: trackId,
      p_start: start,
      p_reserve: reserve,
      p_hours: hours,
    });
    setBusy(false);
    if (rpcError || !data) return setError(rpcError?.message ?? 'No se pudo crear la subasta.');
    router.push(`/subastas/${data}`);
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field-group">
        <label htmlFor="track" className="label">Pista</label>
        <select id="track" name="track" className="field" defaultValue={tracks[0].id}>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field-group">
          <label htmlFor="start" className="label">Precio de salida (€)</label>
          <input id="start" name="start" type="text" inputMode="decimal" className="field" required placeholder="1" />
        </div>
        <div className="field-group">
          <label htmlFor="reserve" className="label">Precio de reserva (€, opcional)</label>
          <input id="reserve" name="reserve" type="text" inputMode="decimal" className="field" placeholder="30" />
        </div>
      </div>
      <div className="faint" style={{ margin: '-8px 0 22px', fontSize: 13, lineHeight: 1.5 }}>
        La reserva es el mínimo por el que aceptas vender. Es secreta: los compradores solo ven si se ha alcanzado.
        Si la subasta termina por debajo, no hay venta.
      </div>

      <div className="field-group">
        <label htmlFor="hours" className="label">Duración</label>
        <select id="hours" name="hours" className="field" defaultValue={48}>
          {DURATIONS.map((d) => (
            <option key={d.hours} value={d.hours}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className="notice" style={{ marginBottom: 24 }}>
        <strong>Reglas.</strong> Quien puje último y no sea superado queda obligado a comprar la pista. Una vez
        que hay pujas no se puede cancelar la subasta. En los últimos 2 minutos, cada puja alarga la subasta 2
        minutos más.
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Creando…' : 'Lanzar subasta'}
      </button>
      {error && <div className="msg error">{error}</div>}
    </form>
  );
}
