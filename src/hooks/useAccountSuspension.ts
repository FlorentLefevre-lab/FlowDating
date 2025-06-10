// src/hooks/useAccountSuspension.ts - Version corrigée complète

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

  // 🔧 FONCTION DE SUSPENSION MODIFIÉE - Sans redirection automatique
  const suspendAccount = async (data: SuspendAccountData = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Hook suspension (sans redirection) - Envoi requête:', data);
      
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

      console.log('✅ Hook suspension - Succès (pas de redirection automatique)');
      
      // 🔧 PLUS DE REDIRECTION AUTOMATIQUE 
      // Le composant appelant gère maintenant la déconnexion et redirection
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Hook suspension - Erreur:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      // 🔧 TOUJOURS REMETTRE isLoading À FALSE - CORRECTION PRINCIPALE
      setIsLoading(false);
      console.log('🔄 Hook suspension - isLoading remis à false');
    }
  };

  // ✅ FONCTION DE RÉACTIVATION - Garde la redirection pour cette action
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
      
      // 🔧 GARDE LA REDIRECTION POUR LA RÉACTIVATION (comportement normal)
      // Car la réactivation est une action "positive" qui doit ramener l'utilisateur dans l'app
      router.push('/home');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Hook réactivation - Erreur:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      // 🔧 CORRECTION: Toujours remettre isLoading à false
      setIsLoading(false);
      console.log('🔄 Hook réactivation - isLoading remis à false');
    }
  };

  // ✅ FONCTION DE VÉRIFICATION DU STATUT - Inchangée
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

  // 🔧 FONCTION DE REFRESH MODIFIÉE - Gère seulement la navigation d'état conditionnelle
  const refreshAccountStatus = async () => {
    const status = await checkAccountStatus();
    
    if (status) {
      // 🔧 LOGIQUE DE NAVIGATION CONDITIONNELLE
      // Seulement si l'utilisateur est sur une page "incorrecte" pour son statut
      
      const currentPath = window.location.pathname;
      
      // Si le compte est maintenant actif et qu'on était sur la page de suspension
      if (status.accountStatus === 'ACTIVE' && currentPath === '/account-suspended') {
        console.log('🔄 Redirection vers home - compte réactivé');
        router.push('/home');
      }
      
      // Note: On ne redirige PAS vers account-suspended si le compte est suspendu
      // Car l'utilisateur sera déconnecté par le composant
    }
    
    return status;
  };

  // 🔧 FONCTION UTILITAIRE POUR VÉRIFIER SI LE COMPTE EST SUSPENDU
  const isAccountSuspended = async (): Promise<boolean> => {
    try {
      const status = await checkAccountStatus();
      return status?.accountStatus === 'SUSPENDED';
    } catch (error) {
      console.error('❌ Erreur vérification suspension:', error);
      return false;
    }
  };

  // 🔧 FONCTION POUR OBTENIR LES DÉTAILS DE LA SUSPENSION
  const getSuspensionDetails = async () => {
    try {
      const status = await checkAccountStatus();
      if (status?.accountStatus === 'SUSPENDED') {
        return {
          suspendedAt: status.suspendedAt,
          suspendedUntil: status.suspendedUntil,
          suspensionReason: status.suspensionReason,
          canReactivate: status.canReactivate
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération détails suspension:', error);
      return null;
    }
  };

  // 🔧 FONCTION DE NETTOYAGE DES ERREURS
  const clearError = () => {
    setError(null);
    console.log('🧹 Erreur du hook effacée');
  };

  // 🔧 FONCTION DE RESET COMPLET DU HOOK
  const resetHook = () => {
    setIsLoading(false);
    setError(null);
    console.log('🔄 Hook suspension réinitialisé');
  };

  // 🔧 FONCTION POUR FORCER L'ARRÊT DU LOADING (debug)
  const forceStopLoading = () => {
    setIsLoading(false);
    console.log('🛑 Loading forcé à false (debug)');
  };

  return {
    // Actions principales
    suspendAccount,        // 🔧 Modifié : plus de redirection automatique
    reactivateAccount,     // ✅ Inchangé : garde la redirection vers /home
    checkAccountStatus,    // ✅ Inchangé
    refreshAccountStatus,  // 🔧 Modifié : navigation conditionnelle seulement
    
    // Fonctions utilitaires
    isAccountSuspended,    // 🔧 Nouveau : vérifie rapidement si suspendu
    getSuspensionDetails,  // 🔧 Nouveau : obtient les détails de suspension
    clearError,           // ✅ Inchangé
    resetHook,            // 🔧 Nouveau : reset complet
    forceStopLoading,     // 🔧 Nouveau : debug loading bloqué
    
    // État
    isLoading,
    error
  };
};