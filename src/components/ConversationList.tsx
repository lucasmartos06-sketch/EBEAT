'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { fetchNames } from '@/lib/profiles';
import { supabaseConfigured } from '@/lib/config';
import { useUserId } from '@/lib/useUserId';

type Row = {
  id: string;
  buyer_id: string;
  seller_id: string;
  subject: string;
  last_message_at: string;
};

export default function ConversationList() {
  const userId = useUserId();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;
    (async () => {
      const { data } = await sb
        .from('conversations')
        .select('id,buyer_id,seller_id,subject,last_message_at')
        .order('last_message_at', { ascending: false });
      const list = (data ?? []) as Row[];
      setRows(list);
      setNames(await fetchNames(list.flatMap((r) => [r.buyer_id, r.seller_id])));
    })();
  }, [userId]);

  if (!supabaseConfigured) {
    return <div className="notice warn"><strong>Falta conectar Supabase.</strong> Los mensajes no están disponibles todavía.</div>;
  }
  if (userId === undefined) return <div className="muted">Comprobando sesión…</div>;
  if (userId === null) {
    return (
      <div className="notice">
        <strong>Necesitas una cuenta para ver tus mensajes.</strong>{' '}
        <Link href="/entrar" style={{ color: 'var(--accent)', fontWeight: 600 }}>Entrar</Link>
      </div>
    );
  }
  if (rows === null) return <div className="muted">Cargando…</div>;
  if (rows.length === 0) {
    return (
      <div className="notice">
        Todavía no tienes conversaciones. Abre una pista del <Link href="/catalogo" style={{ color: 'var(--accent)', fontWeight: 600 }}>catálogo</Link>{' '}
        y pulsa <strong>Negociar con el productor</strong>, o responde a un <Link href="/encargos" style={{ color: 'var(--accent)', fontWeight: 600 }}>encargo</Link>.
      </div>
    );
  }

  return (
    <div className="list">
      {rows.map((r) => {
        const otherId = r.buyer_id === userId ? r.seller_id : r.buyer_id;
        return (
          <Link key={r.id} href={`/mensajes/${r.id}`} className="list-item">
            <div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{names[otherId] || 'Usuario'}</div>
              <div className="muted" style={{ fontSize: 14 }}>{r.subject}</div>
            </div>
            <div className="faint" style={{ fontSize: 13 }}>
              {new Date(r.last_message_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
