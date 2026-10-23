'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { COMMISSION_PERCENT, GENRES, LICENSES, supabaseConfigured } from '@/lib/config';

const MAX_SIZE_MB = 50;

export default function UploadForm() {
  const router = useRouter();
  // undefined = comprobando, null = sin sesión, string = id del usuario
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [license, setLicense] = useState('comercial');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

  if (!supabaseConfigured) {
    return (
      <div className="notice warn">
        <strong>Falta conectar Supabase.</strong> Sin las claves configuradas no se pueden subir pistas.
        Sigue la guía de puesta en marcha (docs/GUIA-PUESTA-EN-MARCHA.md).
      </div>
    );
  }

  if (userId === undefined) return <div className="muted">Comprobando sesión…</div>;

  if (userId === null) {
    return (
      <div className="notice">
        <strong>Necesitas una cuenta para subir pistas.</strong>{' '}
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
    const bpmRaw = String(f.get('bpm') || '').trim();
    const priceRaw = String(f.get('price') || '').replace(',', '.').trim();
    const description = String(f.get('description') || '').trim();
    const file = f.get('audio') as File | null;

    if (!title) return setError('Escribe un título.');
    const price = Number(priceRaw);
    if (priceRaw === '' || Number.isNaN(price) || price < 0) return setError('Indica un precio válido en euros.');
    const bpm = bpmRaw === '' ? null : Number(bpmRaw);
    if (bpm !== null && (!Number.isInteger(bpm) || bpm < 40 || bpm > 300)) {
      return setError('El BPM debe ser un número entre 40 y 300.');
    }
    if (!file || file.size === 0) return setError('Elige el archivo de audio de tu beat.');
    if (!file.type.startsWith('audio/')) return setError('El archivo debe ser de audio (MP3 o WAV).');
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return setError(`El archivo no puede pesar más de ${MAX_SIZE_MB} MB.`);
    if (!f.get('consent')) return setError('Debes confirmar que la pista es tuya.');

    setBusy(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

    const upload = await sb.storage.from('previews').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) {
      setBusy(false);
      return setError('No se pudo subir el audio: ' + upload.error.message);
    }

    const { data, error: insertError } = await sb
      .from('tracks')
      .insert({
        producer_id: userId,
        title,
        genre,
        bpm,
        price_cents: Math.round(price * 100),
        license,
        description: description || null,
        audio_path: path,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      await sb.storage.from('previews').remove([path]);
      setBusy(false);
      return setError('No se pudo guardar la pista: ' + (insertError?.message ?? 'error desconocido'));
    }

    router.push(`/pista/${data.id}`);
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="notice warn" style={{ marginBottom: 26 }}>
        <strong>Versión de pruebas.</strong> Por ahora el audio se guarda sin protección adicional (sin marca
        de agua ni archivo original privado). No subas todavía pistas que quieras vender de verdad.
      </div>

      <div className="field-group">
        <label htmlFor="audio" className="label">Archivo de audio (beat completo, MP3 o WAV, máx. {MAX_SIZE_MB} MB)</label>
        <input id="audio" name="audio" type="file" accept="audio/*" className="field" required />
      </div>

      <div className="field-group">
        <label htmlFor="title" className="label">Título</label>
        <input id="title" name="title" type="text" className="field" required maxLength={120} />
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
          <label htmlFor="bpm" className="label">BPM (opcional)</label>
          <input id="bpm" name="bpm" type="number" className="field" min={40} max={300} />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="description" className="label">Descripción (opcional)</label>
        <textarea
          id="description"
          name="description"
          className="field"
          rows={4}
          maxLength={2000}
          placeholder="Ambiente, instrumentos y para qué proyectos encaja"
        />
      </div>

      <div className="field-group">
        <span className="label">Licencia</span>
        {Object.entries(LICENSES).map(([key, lic]) => (
          <label key={key} className="check" style={{ marginBottom: 12 }}>
            <input
              type="radio"
              name="license"
              value={key}
              checked={license === key}
              onChange={() => setLicense(key)}
            />
            <span>
              <strong style={{ color: 'var(--text)' }}>{lic.name}</strong>
              <br />
              <span className="muted">{lic.desc}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="field-group">
        <label htmlFor="price" className="label">Precio (€)</label>
        <input id="price" name="price" type="text" inputMode="decimal" className="field" required placeholder="29" />
        {COMMISSION_PERCENT !== null && (
          <div className="faint" style={{ marginTop: 8, fontSize: 13 }}>
            La plataforma se queda un {COMMISSION_PERCENT} % de cada venta.
          </div>
        )}
      </div>

      <label className="check" style={{ marginBottom: 24 }}>
        <input type="checkbox" name="consent" />
        <span>Declaro que soy el autor de esta pista y que tengo derecho a venderla.</span>
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Subiendo…' : 'Publicar pista'}
      </button>

      {error && <div className="msg error">{error}</div>}
    </form>
  );
}
