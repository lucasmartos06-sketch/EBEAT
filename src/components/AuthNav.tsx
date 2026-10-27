'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

export default function AuthNav() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsAdmin(false);
    if (!userId) return;
    // Solo los administradores tienen una fila en esta tabla (si todavía no existe, simplemente no se muestra).
    getSupabase()
      ?.from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [userId]);

  if (userId) {
    return (
      <>
        <Link href="/panel" className="nav-link">Mi panel</Link>
        <Link href="/cuenta" className="nav-link">Ajustes</Link>
        {isAdmin && <Link href="/admin/ingresos" className="nav-link">Admin</Link>}
        <button
        type="button"
        className="nav-link"
        onClick={async () => {
          await getSupabase()?.auth.signOut();
        }}
      >
        Cerrar sesión
        </button>
      </>
    );
  }
  return (
    <Link href="/entrar" className="nav-link">
      Entrar
    </Link>
  );
}
