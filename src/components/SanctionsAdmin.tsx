'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useUserId } from '@/lib/useUserId';

type Found = { id: string; display_name: string; email: string; max_active_level: number };
type Row = { id: string; user_id: string; display_name: string; level: number; reason: string; active: boolean; created_at: string };

const LEVELS: Record<number, string> = { 1: 'Nivel 1 · Aviso', 2: 'Nivel 2 · Suspensión temporal', 3: 'Nivel 3 · Anulación', 4: 'Nivel 4 · Expulsión' };

export default function SanctionsAdmin() {
  const userId = useUserId();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Found[]>([]);
  const [target, setTarget] = useState<Found | null>(null);
  const [level, setLevel] = useState(1);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error } = await sb.rpc('admin_sanctions');
    if (error) {
      setDenied(true);
      return;
    }
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  if (userId === undefined) return <div className="muted">Comprobando sesión…</div>;
  if (userId === null) {
    return (
      <div className="notice">
        <strong>Entra con tu cuenta de administrador.</strong>{' '}
        <Link href="/entrar" style={{ color: 'var(--accent)', fontWeight: 600 }}>Entrar</Link>
      </div>
    );
  }
  if (denied) return <div className="notice warn">Esta página es solo para administradores de eBeat.</div>;
  if (rows === null) return <div className="muted">Cargando…</div>;

  async function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const sb = getSupabase();
    if (!sb) return;
    const { data, error } = await sb.rpc('admin_find_users', { p_q: q });
    if (error) return setMsg({ kind: 'error', text: error.message });
    setFound((data ?? []) as Found[]);
  }

  async function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const sb = getSupabase();
    if (!sb || !target) return;
    if (level === 4 && !window.confirm(`¿Expulsar a ${target.display_name}? Se ocultarán todas sus pistas.`)) return;
    const { error } = await sb.rpc('apply_sanction', { p_user: target.id, p_level: level, p_reason: reason });
    if (error) return setMsg({ kind: 'error', text: error.message });
    setMsg({ kind: 'ok', text: 'Sanción aplicada.' });
    setTarget(null);
    setReason('');
    setFound([]);
    setQ('');
    await load();
  }

  async function lift(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.rpc('lift_sanction', { p_sanction: id });
    if (error) return setMsg({ kind: 'error', text: error.message });
    await load();
  }

  return (
    <div>
      <form className="form" onSubmit={search} style={{ maxWidth: 720 }}>
        <h2 style={{ fontSize: 22, marginBottom: 14 }}>1. Busca al usuario</h2>
        <div className="chat-send">
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o correo (mínimo 2 letras)" aria-label="Buscar usuario" />
          <button type="submit" className="btn btn-ghost">Buscar</button>
        </div>
        {found.length > 0 && (
          <div className="list" style={{ marginTop: 16 }}>
            {found.map((u) => (
              <button
                key={u.id}
                type="button"
                className="list-item"
                style={{ textAlign: 'left', color: 'inherit', borderColor: target?.id === u.id ? 'var(--accent)' : undefined }}
                onClick={() => setTarget(u)}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{u.display_name}</div>
                  <div className="faint" style={{ fontSize: 13 }}>{u.email}</div>
                </div>
                {u.max_active_level > 0 && <span className="badge">Sanción activa: nivel {u.max_active_level}</span>}
              </button>
            ))}
          </div>
        )}
      </form>

      {target && (
        <form className="form" onSubmit={apply} style={{ maxWidth: 720, marginTop: 24 }}>
          <h2 style={{ fontSize: 22, marginBottom: 14 }}>2. Sanción para {target.display_name}</h2>
          <div className="field-group">
            <label htmlFor="level" className="label">Nivel</label>
            <select id="level" className="field" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{LEVELS[n]}</option>)}
            </select>
            <div className="faint" style={{ marginTop: 6, fontSize: 13 }}>
              Los niveles 2, 3 y 4 bloquean publicar, subastar, pujar y proponer. El nivel 4 oculta además todas sus pistas.
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="reason" className="label">Motivo (lo verá el usuario)</label>
            <textarea id="reason" className="field" rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary">Aplicar sanción</button>
        </form>
      )}
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}

      <h2 className="section" style={{ marginTop: 48, fontSize: 28 }}>Sanciones recientes</h2>
      {rows.length === 0 ? (
        <div className="muted" style={{ marginTop: 12 }}>No hay sanciones.</div>
      ) : (
        <div className="list" style={{ marginTop: 16, maxWidth: 820 }}>
          {rows.map((r) => (
            <div key={r.id} className="list-item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{r.display_name} · {LEVELS[r.level]}</div>
                <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{r.reason}</div>
                <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                  {new Date(r.created_at).toLocaleDateString('es-ES')} · {r.active ? 'Activa' : 'Levantada'}
                </div>
              </div>
              {r.active && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => lift(r.id)}>Levantar</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
