// hooks/useEmailVerification.ts - Simplifié
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useEmailVerification() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 🎯 PLUS BESOIN DE VÉRIFIER L'AUTH - Le middleware le fait
    // On vérifie juste l'email
    if (status === 'loading') return;
    
    if (session && !session.user.emailVerified) {
      console.log('⚠️ Email non vérifié, redirection vers /auth/email-required');
      router.push('/auth/email-required');
    }
  }, [session, status, router]);

  return {
    isLoading: status === 'loading',
    isVerified: !!session?.user?.emailVerified,
    session,
    user: session?.user
  };
}