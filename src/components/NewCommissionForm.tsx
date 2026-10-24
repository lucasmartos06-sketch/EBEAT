'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { GENRES, supabaseConfigured } from '@/lib/config';
import { useUserId } from '@/lib/useUserId';

export default function NewCommissionForm() {
  const router = useRouter();
  const userId = useUserId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabaseConfigured) {
    return (
      <div className="notice warn">
        <strong>Falta conectar Supabase.</strong> Los encargos no están disponibles todavía.
      </div>
    );
  }
  if (userId === undefined) return <div className="muted">Comprobando sesión…</div>;
  if (userId === null) {
    return (
      <div className="notice">
        <strong>Necesitas una cuenta para pedir un beat.</strong>{' '}
        <Link href="/entrar" style={{ color: 'var(--accent)', fontWeight: 600 }}>Entra o crea tu cuenta</Link>.
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb || !userId) return;

    const f = new FormData(e.currentTarget);
    const title = String(f.get('title') || '').trim();
    const genre = String(f.get('genre') || '');
    const description = String(f.get('description') || '').trim();
    const budgetRaw = String(f.get('budget') || '').replace(',', '.').trim();
    const budget = Number(budgetRaw);

    if (!title) return setError('Escribe un título para el encargo.');
    if (!description) return setError('Describe el beat que necesitas.');
    if (budgetRaw === '' || Number.isNaN(budget) || budget < 0) return setError('Indica un presupuesto válido en euros.');

    setBusy(true);
    const { data, error: insertError } = await sb
      .from('commissions')
      .insert({
        buyer_id: userId,
        title,
        genre,
        description,
        budget_cents: Math.round(budget * 100),
      })
      .select('id')
      .single();
    setBusy(false);

    if (insertError || !data) {
      return setError('No se pudo publicar el encargo: ' + (insertError?.message ?? 'error desconocido'));
    }
    router.push(`/encargos/${data.id}`);
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field-group">
        <label htmlFor="title" className="label">Título</label>
        <input id="title" name="title" type="text" className="field" required maxLength={120} placeholder="Trap oscuro para mi single" />
      </div>

      <div className="field-row">
        <div className="field-group">
          <label htmlFor="genre" className="label">Género</label>
          <select id="genre" name="genre" className="field" defaultValue={GENRES[0]}>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="budget" className="label">Presupuesto (€)</label>
          <input id="budget" name="budget" type="text" inputMode="decimal" className="field" required placeholder="50" />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="description" className="label">Describe el beat</label>
        <textarea
          id="description"
          name="description"
          className="field"
          rows={6}
          required
          maxLength={2000}
          placeholder="Ambiente, BPM aproximado, referencias, instrumentos, para qué lo quieres usar y fecha límite"
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Publicando…' : 'Publicar encargo'}
      </button>

      {error && <div className="msg error">{error}</div>}
    </form>
  );
}
