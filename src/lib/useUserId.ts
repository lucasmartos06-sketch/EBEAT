'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from './supabase';

// undefined = comprobando, null = sin sesión, string = id del usuario
export function useUserId(): string | null | undefined {
  const [id, setId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setId(null);
      return;
    }
    sb.auth.getSession().then(({ data }) => setId(data.session?.user.id ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return id;
}
