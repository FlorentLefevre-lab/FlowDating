'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseAccountSuspensionReturn {
  reactivateAccount: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useAccountSuspension(): UseAccountSuspensionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const reactivateAccount = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la réactivation');
      }

      // Rediriger vers la page d'accueil après réactivation
      router.push('/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    reactivateAccount,
    isLoading,
    error,
  };
}
