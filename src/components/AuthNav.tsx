'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

export default function AuthNav() {
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setLogged(Boolean(data.session)));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setLogged(Boolean(session));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (logged) {
    return (
      <button
        type="button"
        className="nav-link"
        onClick={async () => {
          await getSupabase()?.auth.signOut();
        }}
      >
        Cerrar sesión
      </button>
    );
  }
  return (
    <Link href="/entrar" className="nav-link">
      Entrar
    </Link>
  );
}
