// src/hooks/useAccountSuspension.ts - Hook côté client
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SuspendAccountData {
  reason?: string;
  suspendUntil?: string;
}

interface AccountStatus {
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED' | 'PENDING_VERIFICATION';
  suspendedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  isOnline: boolean;
  lastSeen?: string;
  canReactivate: boolean;
}

export const useAccountSuspension = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const suspendAccount = async (data: SuspendAccountData = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Hook suspension - Envoi requête:', data);
      
      const response = await fetch('/api/user/suspend-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log('📤 Hook suspension - Réponse API:', result);

      if (!response.ok) {
        // Gérer le cas où le compte est déjà suspendu
        if (response.status === 400 && result.suggestion === 'reactivate') {
          throw new Error(`${result.message} Utilisez le bouton "Réactiver" à la place.`);
        }
        
        // Gérer d'autres cas d'erreur
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        if (response.status === 404) {
          throw new Error('Utilisateur introuvable. Veuillez vous reconnecter.');
        }
        
        throw new Error(result.message || result.error || 'Erreur lors de la suspension');
      }

      console.log('✅ Hook suspension - Succès');
      
      // Rediriger vers une page de confirmation
      router.push('/account-suspended');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Hook suspension - Erreur:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateAccount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Hook réactivation - Envoi requête');
      
      const response = await fetch('/api/user/suspend-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      console.log('📤 Hook réactivation - Réponse API:', result);

      if (!response.ok) {
        // Gérer les cas d'erreur spécifiques
        if (response.status === 400 && result.error === 'Le compte n\'est pas suspendu') {
          throw new Error('Votre compte est déjà actif.');
        }
        
        if (response.status === 400 && result.error === 'Suspension temporaire en cours') {
          throw new Error(result.message || 'Votre suspension temporaire n\'est pas encore expirée.');
        }
        
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        if (response.status === 404) {
          throw new Error('Utilisateur introuvable. Veuillez vous reconnecter.');
        }
        
        throw new Error(result.message || result.error || 'Erreur lors de la réactivation');
      }

      console.log('✅ Hook réactivation - Succès');
      
      // Rediriger vers le dashboard ou home après réactivation
      router.push('/home');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Hook réactivation - Erreur:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const checkAccountStatus = async (): Promise<AccountStatus | null> => {
    try {
      console.log('🔄 Hook vérification statut - Envoi requête');
      
      const response = await fetch('/api/user/suspend-account', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      console.log('📤 Hook vérification statut - Réponse API:', result);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('⚠️ Session expirée lors de la vérification du statut');
          return null;
        }
        
        throw new Error(result.error || 'Erreur lors de la vérification du statut');
      }

      console.log('✅ Hook vérification statut - Succès');
      return result.data;
    } catch (err) {
      console.error('❌ Hook vérification statut - Erreur:', err);
      return null;
    }
  };

  const refreshAccountStatus = async () => {
    const status = await checkAccountStatus();
    
    if (status) {
      // Si le compte est maintenant actif et qu'on était sur la page de suspension
      if (status.accountStatus === 'ACTIVE' && window.location.pathname === '/account-suspended') {
        router.push('/home');
      }
      
      // Si le compte est suspendu et qu'on n'est pas sur la page de suspension
      if (status.accountStatus === 'SUSPENDED' && window.location.pathname !== '/account-suspended') {
        router.push('/account-suspended');
      }
    }
    
    return status;
  };

  const clearError = () => {
    setError(null);
  };

  return {
    suspendAccount,
    reactivateAccount,
    checkAccountStatus,
    refreshAccountStatus,
    clearError,
    isLoading,
    error
  };
};