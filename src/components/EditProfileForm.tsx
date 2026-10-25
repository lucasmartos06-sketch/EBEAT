'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';
import { supabaseConfigured } from '@/lib/config';
import { useUserId } from '@/lib/useUserId';

export default function EditProfileForm() {
  const userId = useUserId();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;
    sb.from('profiles')
      .select('display_name,bio')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { display_name: string; bio: string | null } | null;
        setName(row?.display_name ?? '');
        setBio(row?.bio ?? '');
        setLoaded(true);
      });
  }, [userId]);

  if (!supabaseConfigured) {
    return <div className="notice warn"><strong>Falta conectar Supabase.</strong></div>;
  }
  if (userId === undefined) return <div className="muted">Comprobando sesión…</div>;
  if (userId === null) {
    return (
      <div className="notice">
        <strong>Entra para editar tu perfil.</strong>{' '}
        <Link href="/entrar" style={{ color: 'var(--accent)', fontWeight: 600 }}>Entrar</Link>
      </div>
    );
  }
  if (!loaded) return <div className="muted">Cargando tu perfil…</div>;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const sb = getSupabase();
    if (!sb || !userId) return;
    const cleanName = name.trim();
    if (!cleanName) return setMsg({ kind: 'error', text: 'Escribe un nombre.' });
    setBusy(true);
    const { error } = await sb
      .from('profiles')
      .update({ display_name: cleanName, bio: bio.trim() || null })
      .eq('id', userId);
    setBusy(false);
    if (error) return setMsg({ kind: 'error', text: 'No se pudo guardar: ' + error.message });
    setMsg({ kind: 'ok', text: 'Perfil guardado.' });
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field-group">
        <label htmlFor="name" className="label">Nombre de productor</label>
        <input id="name" className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="field-group">
        <label htmlFor="bio" className="label">Biografía</label>
        <textarea
          id="bio"
          className="field"
          rows={6}
          maxLength={600}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tu estilo, influencias y con quién has trabajado"
        />
        <div className="faint" style={{ marginTop: 6, fontSize: 13 }}>{bio.length}/600</div>
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar perfil'}
      </button>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
      <div style={{ marginTop: 18 }}>
        <Link href={`/productor/${userId}`} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>Ver mi perfil público</Link>
      </div>
    </form>
  );
}
