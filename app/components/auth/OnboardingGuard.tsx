// app/components/auth/OnboardingGuard.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode, useRef } from 'react';

interface OnboardingGuardProps {
  children: ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldShowContent, setShouldShowContent] = useState(false);
  const checkInProgress = useRef(false);

  // DEBUG LOG
  console.log('[OnboardingGuard] status:', status, 'isChecking:', isChecking, 'shouldShowContent:', shouldShowContent);

  useEffect(() => {
    console.log('[OnboardingGuard] useEffect triggered, status:', status);

    const checkOnboarding = async () => {
      console.log('[OnboardingGuard] checkOnboarding called');
      // Éviter les appels multiples simultanés
      if (checkInProgress.current) return;

      // Ne pas vérifier si pas authentifié
      if (status !== 'authenticated') {
        setIsChecking(false);
        setShouldShowContent(true);
        return;
      }

      // Ne pas vérifier si on est déjà sur la page d'onboarding
      if (pathname === '/auth/onboarding') {
        setIsChecking(false);
        setShouldShowContent(true);
        return;
      }

      checkInProgress.current = true;

      try {
        const response = await fetch('/api/auth/onboarding/status');

        // Si erreur (401, 404, 500), laisser passer
        if (!response.ok) {
          setShouldShowContent(true);
          setIsChecking(false);
          checkInProgress.current = false;
          return;
        }

        const result = await response.json();
        console.log('[OnboardingGuard] API response:', result);

        // Si onboarding pas encore fait, rediriger UNE SEULE FOIS
        if (!result.completed) {
          console.log('[OnboardingGuard] Redirecting to onboarding...');
          router.replace('/auth/onboarding');
          return;
        }

        // Onboarding déjà complété, afficher le contenu
        setShouldShowContent(true);
      } catch (error) {
        console.warn('Erreur vérification onboarding:', error);
        // En cas d'erreur, laisser passer
        setShouldShowContent(true);
      } finally {
        setIsChecking(false);
        checkInProgress.current = false;
      }
    };

    if (status === 'authenticated') {
      checkOnboarding();
    } else if (status === 'unauthenticated') {
      setIsChecking(false);
      setShouldShowContent(true);
    }
  }, [status, router, pathname]);

  // Pendant le loading de la session ou la vérification
  if (status === 'loading' || (status === 'authenticated' && isChecking && !shouldShowContent)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💖</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Afficher le contenu
  if (shouldShowContent) {
    return <>{children}</>;
  }

  // Redirection en cours
  return null;
}
