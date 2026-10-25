'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import { useUserId } from '@/lib/useUserId';

type Row = { id: string; title: string; genre: string; price_cents: number; status: 'published' | 'hidden'; audio_path: string };

export default function MyTracks() {
  const userId = useUserId();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    const { data } = await sb
      .from('tracks')
      .select('id,title,genre,price_cents,status,audio_path')
      .eq('producer_id', userId)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as Row[]);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!userId) return null;
  if (rows === null) return <div className="muted">Cargando tus pistas…</div>;

  async function toggle(r: Row) {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    const { error: e } = await sb
      .from('tracks')
      .update({ status: r.status === 'published' ? 'hidden' : 'published' })
      .eq('id', r.id);
    if (e) setError(e.message);
    await load();
  }

  async function remove(r: Row) {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    const { data: active } = await sb
      .from('auctions')
      .select('id')
      .eq('track_id', r.id)
      .eq('status', 'active')
      .limit(1);
    if (active && active.length > 0) {
      return setError('Esta pista tiene una subasta activa. Espera a que termine o cancélala antes de borrarla.');
    }
    const { data: sold } = await sb
      .from('orders')
      .select('id')
      .eq('track_id', r.id)
      .eq('status', 'paid')
      .limit(1);
    if (sold && sold.length > 0) {
      return setError('Esta pista ya se ha vendido y el comprador puede descargarla, así que no se puede borrar. Puedes ocultarla.');
    }
    if (!window.confirm(`¿Borrar «${r.title}»? No se puede deshacer.`)) return;
    const { error: e } = await sb.from('tracks').delete().eq('id', r.id);
    if (e) return setError(e.message);
    await sb.storage.from('previews').remove([r.audio_path]);
    await sb.storage.from('originals').remove([r.audio_path]);
    await load();
  }

  return (
    <div>
      {rows.length === 0 ? (
        <div className="notice">
          Todavía no has subido pistas. <Link href="/subir" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sube la primera</Link>.
        </div>
      ) : (
        <div className="list" style={{ maxWidth: 720 }}>
          {rows.map((r) => (
            <div key={r.id} className="list-item" style={{ flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <Link href={`/pista/${r.id}`} style={{ fontWeight: 600, fontSize: 17 }}>{r.title}</Link>
                <div className="faint" style={{ fontSize: 13, marginTop: 2 }}>
                  {r.genre} · {formatPrice(r.price_cents)} · {r.status === 'published' ? 'Publicada' : 'Oculta'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(r)}>
                  {r.status === 'published' ? 'Ocultar' : 'Publicar'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(r)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className="msg error">{error}</div>}
    </div>
  );
}
