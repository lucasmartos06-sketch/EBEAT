import { getSupabase } from './supabase';

// Devuelve { idDelUsuario: nombreVisible } para una lista de usuarios.
export async function fetchNames(ids: string[]): Promise<Record<string, string>> {
  const sb = getSupabase();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!sb || unique.length === 0) return {};
  const { data } = await sb.from('profiles').select('id,display_name').in('id', unique);
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as { id: string; display_name: string }[]) {
    out[row.id] = row.display_name;
  }
  return out;
}
