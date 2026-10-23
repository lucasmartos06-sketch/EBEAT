'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { supabaseConfigured } from '@/lib/config';

function translate(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('already registered')) return 'Ese correo ya tiene una cuenta. Prueba a entrar.';
  if (message.includes('at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (message.includes('not confirmed')) return 'Confirma tu correo antes de entrar (revisa tu bandeja).';
  if (message.toLowerCase().includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
  return message;
}

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'entrar' | 'registro'>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  if (!supabaseConfigured) {
    return (
      <div className="notice warn">
        <strong>Falta conectar Supabase.</strong> Mientras no estén configuradas las claves, no se puede
        crear cuenta ni entrar. Sigue la guía de puesta en marcha (docs/GUIA-PUESTA-EN-MARCHA.md).
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    try {
      if (mode === 'registro') {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg({ kind: 'ok', text: 'Cuenta creada. Revisa tu correo para confirmarla y después entra.' });
          setMode('entrar');
        } else {
          router.push('/subir');
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/subir');
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Ha ocurrido un error. Inténtalo de nuevo.';
      setMsg({ kind: 'error', text: translate(text) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form narrow" onSubmit={onSubmit}>
      <h2 style={{ fontSize: 28 }}>{mode === 'entrar' ? 'Entrar' : 'Crear cuenta'}</h2>

      {mode === 'registro' && (
        <div className="field-group" style={{ marginTop: 22 }}>
          <label htmlFor="name" className="label">Nombre de productor</label>
          <input
            id="name"
            className="field"
            type="text"
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cómo quieres que te conozcan"
          />
        </div>
      )}

      <div className="field-group" style={{ marginTop: mode === 'registro' ? 0 : 22 }}>
        <label htmlFor="email" className="label">Correo electrónico</label>
        <input
          id="email"
          className="field"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="field-group">
        <label htmlFor="password" className="label">Contraseña</label>
        <input
          id="password"
          className="field"
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Un momento…' : mode === 'entrar' ? 'Entrar' : 'Crear cuenta'}
      </button>

      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}

      <div className="switch">
        {mode === 'entrar' ? (
          <>
            ¿Aún no tienes cuenta?{' '}
            <button type="button" onClick={() => { setMode('registro'); setMsg(null); }}>Crea una</button>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{' '}
            <button type="button" onClick={() => { setMode('entrar'); setMsg(null); }}>Entra</button>
          </>
        )}
      </div>
    </form>
  );
}
