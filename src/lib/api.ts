import { getSupabase } from './supabase';

// Llama a una ruta del servidor de eBeat enviando la sesión del usuario.
export async function authedFetch(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const sb = getSupabase();
  const session = sb ? (await sb.auth.getSession()).data.session : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const res = await fetch(path, {
    method: init.method ?? 'POST',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}
