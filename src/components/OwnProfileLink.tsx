'use client';

import Link from 'next/link';
import { useUserId } from '@/lib/useUserId';

export default function OwnProfileLink({ producerId }: { producerId: string }) {
  const userId = useUserId();
  if (!userId || userId !== producerId) return null;
  return (
    <Link href="/cuenta" className="btn btn-ghost btn-sm">
      Editar mi perfil
    </Link>
  );
}
