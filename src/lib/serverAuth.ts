// Utilidades solo para el servidor: cliente con clave de servicio y comprobación de quién llama.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

// La clave de servicio salta las reglas de seguridad: NUNCA debe llegar al navegador.
export function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function userFromRequest(req: Request): Promise<{ id: string; email?: string } | null> {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

export function siteOrigin(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return req.headers.get('origin') || new URL(req.url).origin;
}

export function commissionPercent(): number {
  const n = Number(process.env.NEXT_PUBLIC_COMMISSION_PERCENT);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
}
