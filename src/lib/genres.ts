import { GENRES } from './config';

// Limpia un género escrito a mano: sin símbolos raros, máximo 30 caracteres, primera letra en mayúscula.
// Si coincide con uno de la lista (sin importar mayúsculas), usa el de la lista.
export function normalizeGenre(raw: string): string {
  const cleaned = raw
    .replace(/[^\p{L}\p{N} &/+'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30)
    .trim();
  if (!cleaned) return '';
  const known = GENRES.find((g) => g.toLowerCase() === cleaned.toLowerCase());
  if (known) return known;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
