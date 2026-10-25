'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { useUserId } from '@/lib/useUserId';

type Msg = { kind: 'error' | 'ok'; text: string } | null;

function translate(message: string): string {
  if (message.includes('at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (message.includes('same') || message.includes('different')) return 'La nueva contraseña debe ser distinta de la actual.';
  if (message.toLowerCase().includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
  if (message.includes('already been registered') || message.includes('already registered')) return 'Ese correo ya tiene otra cuenta.';
  return message;
}

export default function SecurityForm() {
  const router = useRouter();
  const userId = useUserId();
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [emailMsg, setEmailMsg] = useState<Msg>(null);
  const [passMsg, setPassMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getSupabase()
      ?.auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ''));
  }, [userId]);

  if (!userId) return null;

  async function changeEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailMsg(null);
    const sb = getSupabase();
    if (!sb) return;
    const value = newEmail.trim();
    if (!value || !value.includes('@')) return setEmailMsg({ kind: 'error', text: 'Escribe un correo válido.' });
    setBusy(true);
    const { error } = await sb.auth.updateUser({ email: value });
    setBusy(false);
    if (error) return setEmailMsg({ kind: 'error', text: translate(error.message) });
    setNewEmail('');
    setEmailMsg({ kind: 'ok', text: 'Te hemos enviado un correo para confirmar el cambio. Hasta que lo confirmes, seguirás usando el correo actual.' });
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPassMsg(null);
    const sb = getSupabase();
    if (!sb) return;
    if (password.length < 6) return setPassMsg({ kind: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
    if (password !== password2) return setPassMsg({ kind: 'error', text: 'Las dos contraseñas no coinciden.' });
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (error) return setPassMsg({ kind: 'error', text: translate(error.message) });
    setPassword('');
    setPassword2('');
    setPassMsg({ kind: 'ok', text: 'Contraseña cambiada.' });
  }

  async function signOut() {
    await getSupabase()?.auth.signOut();
    router.push('/');
  }

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
      <form className="form" onSubmit={changeEmail}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Correo</h2>
        <div className="muted" style={{ fontSize: 14, marginBottom: 16 }}>Tu correo actual: <strong style={{ color: 'var(--text)' }}>{email}</strong></div>
        <div className="field-group">
          <label htmlFor="newEmail" className="label">Nuevo correo</label>
          <input id="newEmail" type="email" className="field" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-ghost" disabled={busy}>Cambiar correo</button>
        {emailMsg && <div className={`msg ${emailMsg.kind}`}>{emailMsg.text}</div>}
      </form>

      <form className="form" onSubmit={changePassword}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Contraseña</h2>
        <div className="field-group">
          <label htmlFor="pw1" className="label">Nueva contraseña</label>
          <input id="pw1" type="password" autoComplete="new-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field-group">
          <label htmlFor="pw2" className="label">Repite la contraseña</label>
          <input id="pw2" type="password" autoComplete="new-password" className="field" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-ghost" disabled={busy}>Cambiar contraseña</button>
        {passMsg && <div className={`msg ${passMsg.kind}`}>{passMsg.text}</div>}
      </form>

      <div className="form">
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Sesión</h2>
        <button type="button" className="btn btn-ghost" onClick={signOut}>Cerrar sesión</button>
      </div>
    </div>
  );
}
