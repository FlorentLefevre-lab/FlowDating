'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAccountSuspension } from '@/hooks/useAccountSuspension';

interface AccountInfo {
  accountStatus: string;
  suspendedAt: string;
  suspendedUntil?: string;
  suspensionReason?: string;
}

export default function AccountSuspendedPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { reactivateAccount, isLoading } = useAccountSuspension();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [canReactivate, setCanReactivate] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchAccountInfo();
    } else if (session === null) {
      // Pas de session, rediriger vers login
      router.push('/auth/login');
    }
  }, [session, router]);

  const fetchAccountInfo = async () => {
    try {
      const response = await fetch('/api/user/status');
      if (response.ok) {
        const data = await response.json();
        setAccountInfo(data);
        
        // Vérifier si l'utilisateur peut réactiver son compte
        if (data.suspendedUntil) {
          const canReactivateNow = new Date() >= new Date(data.suspendedUntil);
          setCanReactivate(canReactivateNow);
        } else {
          // Suspension indéfinie - peut être réactivée manuellement
          setCanReactivate(true);
        }
      }
    } catch (error) {
      console.error('Erreur récupération info compte:', error);
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateAccount();
      // La redirection est gérée dans le hook
    } catch (error) {
      console.error('Erreur réactivation:', error);
      alert('Erreur lors de la réactivation du compte');
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSuspensionReasonLabel = (reason?: string) => {
    const reasons: Record<string, string> = {
      'break': 'Pause temporaire',
      'privacy': 'Préoccupations de confidentialité',
      'found_match': 'J\'ai trouvé quelqu\'un',
      'too_busy': 'Trop occupé(e) actuellement',
      'rethinking': 'Je repense à mes objectifs',
      'other': 'Autre raison'
    };
    return reasons[reason || ''] || 'Non spécifiée';
  };

  // Affichage de chargement pendant la vérification de session
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de votre statut...</p>
        </div>
      </div>
    );
  }

  // Redirection en cours si pas de session
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-xl shadow-lg p-8"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Compte suspendu
          </h1>
          <p className="text-gray-600">
            Votre compte a été temporairement désactivé
          </p>
        </div>

        {accountInfo && (
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Informations de suspension
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date de suspension :</span>
                  <span className="font-medium">
                    {formatDate(accountInfo.suspendedAt)}
                  </span>
                </div>
                
                {accountInfo.suspensionReason && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Raison :</span>
                    <span className="font-medium">
                      {getSuspensionReasonLabel(accountInfo.suspensionReason)}
                    </span>
                  </div>
                )}

                {accountInfo.suspendedUntil && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fin prévue :</span>
                    <span className="font-medium">
                      {formatDate(accountInfo.suspendedUntil)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Pendant la suspension
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Votre profil n'est pas visible par les autres</li>
                <li>• Vous ne pouvez pas envoyer/recevoir de messages</li>
                <li>• Vos conversations sont préservées</li>
                <li>• Vous ne recevez pas de notifications</li>
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {canReactivate ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReactivate}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Réactivation...</span>
                </div>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Réactiver mon compte
                </>
              )}
            </motion.button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <ClockIcon className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-yellow-800 text-sm">
                Votre compte sera automatiquement réactivé le{' '}
                {accountInfo?.suspendedUntil && formatDate(accountInfo.suspendedUntil)}
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            Se déconnecter
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Des questions ? Contactez-nous à{' '}
            <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}