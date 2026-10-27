'use client';

import { useState } from 'react';
import { GENRES } from '@/lib/config';
import { normalizeGenre } from '@/lib/genres';

const OTHER = '__other__';

// Desplegable de géneros con la opción «Otro» para escribir uno nuevo.
// El valor final viaja en un campo oculto con el nombre indicado, así que el formulario lo lee con normalidad.
export default function GenreSelect({ id = 'genre', name = 'genre' }: { id?: string; name?: string }) {
  const [selected, setSelected] = useState(GENRES[0]);
  const [custom, setCustom] = useState('');
  const value = selected === OTHER ? normalizeGenre(custom) : selected;

  return (
    <>
      <select id={id} className="field" value={selected} onChange={(e) => setSelected(e.target.value)}>
        {GENRES.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
        <option value={OTHER}>Otro (escribir)…</option>
      </select>
      {selected === OTHER && (
        <input
          className="field"
          style={{ marginTop: 10 }}
          value={custom}
          maxLength={30}
          placeholder="Escribe el género"
          aria-label="Género"
          onChange={(e) => setCustom(e.target.value)}
        />
      )}
      <input type="hidden" name={name} value={value} />
    </>
  );
}
