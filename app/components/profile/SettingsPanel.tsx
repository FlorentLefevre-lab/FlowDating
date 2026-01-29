'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'next-auth/react';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  BellIcon,
  LockClosedIcon,
  PauseIcon,
  XMarkIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

import { SettingsPanelProps } from '../../types/profiles';
import { useAccountActions } from '@/hooks/useAccountActions';
import { getMaxPhotos } from '@/lib/config/photos';
import { Button, Card } from '@/components/ui';

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  profile,
  photos,
  session,
  onMessage,
  isPremium = false
}) => {
  const maxPhotos = getMaxPhotos(isPremium);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  
  // États pour les paramètres de notification
  const [notificationSettings, setNotificationSettings] = useState({
    messageNotifications: true,
    likeNotifications: true,
    matchNotifications: true
  });

  // Logique de statut robuste
  const accountStatus = (() => {
    if (!profile) {
      return 'UNKNOWN';
    }

    const rawStatus = profile.accountStatus;

    if (rawStatus !== null && rawStatus !== undefined && rawStatus !== '') {
      const status = String(rawStatus).trim().toUpperCase();
      const validStatuses = ['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED', 'PENDING_VERIFICATION'];
      if (validStatuses.includes(status)) {
        return status;
      } else {
        return 'ACTIVE';
      }
    }

    if (profile.id && profile.email) {
      return 'ACTIVE';
    }

    return 'UNKNOWN';
  })();

  const isAccountSuspended = accountStatus === 'SUSPENDED' || accountStatus === 'BANNED';
  const isAccountActive = accountStatus === 'ACTIVE';
  
  const { reactivateAccount, isLoading: hookIsLoading } = useAccountActions();
  // Réinitialisation de l'état de suspension
  useEffect(() => {
    if (profile?.id) {
      setIsSuspending(false);
    }
  }, [profile?.id, accountStatus]);

  // Charger les paramètres de notification
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const response = await fetch('/api/user/notification-settings');
        if (response.ok) {
          const settings = await response.json();
          setNotificationSettings(prev => ({
            ...prev,
            ...settings
          }));
        }
      } catch (error) {
        console.error('Erreur chargement paramètres notifications:', error);
      }
    };

    if (profile?.id) {
      loadNotificationSettings();
    }
  }, [profile?.id]);

  // Sauvegarder les paramètres de notification
  const updateNotificationSettings = async (newSettings: Partial<typeof notificationSettings>) => {
    try {
      const updatedSettings = { ...notificationSettings, ...newSettings };
      setNotificationSettings(updatedSettings);

      const response = await fetch('/api/user/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });

      if (!response.ok) {
        throw new Error('Erreur sauvegarde paramètres');
      }

      onMessage('Paramètres mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Erreur mise à jour paramètres:', error);
      onMessage('Erreur lors de la mise à jour des paramètres', 'error');
      setNotificationSettings(prev => ({ ...prev, ...Object.fromEntries(
        Object.entries(newSettings).map(([key, value]) => [key, !value])
      )}));
    }
  };

  const suspendReasons = [
    { value: 'break', label: 'Pause temporaire' },
    { value: 'privacy', label: 'Préoccupations de confidentialité' },
    { value: 'found_match', label: 'J\'ai trouvé quelqu\'un' },
    { value: 'too_busy', label: 'Trop occupé(e) actuellement' },
    { value: 'rethinking', label: 'Je repense à mes objectifs' },
    { value: 'other', label: 'Autre raison' }
  ];

  // Fonction de nettoyage complète
  const clearAllUserData = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(";");
        
        for (let cookie of cookies) {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname};`;
        }
      }
      
      await signOut({ 
        redirect: false,
        callbackUrl: '/'
      });
      
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  };

  // Fonction de suspension avec vérifications
  const handleSuspendAccount = async () => {
    if (isSuspending) {
      return;
    }
    
    if (!profile?.id) {
      onMessage('Erreur: Profil non trouvé. Veuillez actualiser la page.', 'error');
      return;
    }
    
    if (accountStatus !== 'ACTIVE') {
      onMessage(`Erreur: Compte avec statut ${accountStatus}. Seuls les comptes actifs peuvent être suspendus.`, 'error');
      return;
    }

    const currentReason = suspendReason;
    setIsSuspending(true);
    
    try {
      setShowSuspendModal(false);
      setSuspendReason('');
      
      onMessage('Suspension du compte en cours...', 'info');
      
      const response = await fetch('/api/user/suspend-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: currentReason }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 400 && result.suggestion === 'reactivate') {
          throw new Error(`${result.message} Utilisez le bouton "Réactiver" à la place.`);
        }
        
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        if (response.status === 404) {
          throw new Error('Utilisateur introuvable. Veuillez vous reconnecter.');
        }
        
        throw new Error(result.message || result.error || 'Erreur lors de la suspension');
      }
      
      onMessage('Compte suspendu avec succès. Déconnexion en cours...', 'success');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await clearAllUserData();
      
      window.location.href = '/';
      
    } catch (error) {
      setIsSuspending(false);
      setShowSuspendModal(true);
      setSuspendReason(currentReason);
      
      onMessage(
        error instanceof Error ? error.message : 'Erreur lors de la suspension du compte', 
        'error'
      );
    }
  };

  // Fonction de réactivation
  const handleReactivateAccount = async () => {
    try {
      setShowReactivateModal(false);
      
      await reactivateAccount();
      
      onMessage('Votre compte a été réactivé avec succès ! Actualisation...', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Erreur réactivation:', error);
      onMessage(error instanceof Error ? error.message : 'Erreur lors de la réactivation du compte', 'error');
    }
  };

  // Fonction de suppression
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      onMessage('Veuillez taper "SUPPRIMER" pour confirmer', 'error');
      return;
    }

    try {
      setLoading(true);
      
      let currentUserId = profile?.id;
      let currentUserEmail = profile?.email;
      
      if (!currentUserId && session?.user) {
        currentUserId = session.user.id || (session.user as any).sub || (session.user as any).userId;
        currentUserEmail = session.user.email || undefined;
      }
      
      if (!currentUserId && !currentUserEmail) {
        onMessage('Erreur: Session invalide. Veuillez vous reconnecter.', 'error');
        return;
      }
      
      setShowDeleteModal(false);
      setDeleteConfirmation('');
      
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          forceUserId: currentUserId,
          forceUserEmail: currentUserEmail 
        })
      });

      if (response.ok) {
        onMessage('Compte supprimé avec succès. Déconnexion...', 'success');
        
        setTimeout(async () => {
          await clearAllUserData();
          window.location.href = '/';
        }, 2000);
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      onMessage('Erreur lors de la suppression du compte', 'error');
      setLoading(false);
      setShowDeleteModal(true);
    }
  };

  return (
    <div className="p-4">
      {/* Bannière d'alerte si compte suspendu ou banni */}
      {isAccountSuspended && (
        <div className={`border-l-4 p-3 rounded-r-lg mb-4 ${
          profile?.accountStatus === 'BANNED' 
            ? 'bg-red-100 border-red-500' 
            : 'bg-orange-100 border-orange-500'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className={`h-5 w-5 ${
                profile?.accountStatus === 'BANNED' ? 'text-red-500' : 'text-orange-500'
              }`} />
            </div>
            <div className="ml-3">
              <p className={`text-sm ${
                profile?.accountStatus === 'BANNED' ? 'text-red-700' : 'text-orange-700'
              }`}>
                <strong>
                  {profile?.accountStatus === 'BANNED' 
                    ? 'Votre compte est banni.' 
                    : 'Votre compte est suspendu.'
                  }
                </strong> 
                {profile?.accountStatus === 'BANNED'
                  ? ' Votre accès à la plateforme a été restreint. Contactez le support pour plus d\'informations.'
                  : ' Votre profil n\'est pas visible et vous ne recevez plus de notifications. Vous pouvez le réactiver ci-dessous dans la zone de danger.'
                }
              </p>
              <p className={`text-xs mt-1 ${
                profile?.accountStatus === 'BANNED' ? 'text-red-600' : 'text-orange-600'
              }`}>
                Statut actuel: {profile?.accountStatus || 'Non défini'}
              </p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold text-gray-800 mb-3">
        Paramètres du compte
      </h2>

      <div className="space-y-3">
        {/* Informations du compte */}
        <Card className="p-4">
          <div className="flex items-center mb-2">
            <UserCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-800">
              Informations du compte
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="space-y-2">
              <div>
                <div className="text-sm font-medium text-gray-500">Email</div>
                <div className="text-gray-800">{profile?.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Membre depuis</div>
                <div className="text-gray-800">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs font-medium text-gray-500">Dernière mise à jour</div>
                <div className="text-gray-800">
                  {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">Photos</div>
                <div className="text-gray-800">{photos.length}/{maxPhotos}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">Statut</div>
                <div className={`flex items-center ${isAccountSuspended ? 'text-orange-600' : 'text-green-600'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${isAccountSuspended ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                  {accountStatus === 'UNKNOWN' ? 'Inconnu' : (isAccountSuspended ? 'Suspendu' : 'Actif')}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Paramètres de confidentialité */}
        <Card className="p-4">
          <div className="flex items-center mb-2">
            <ShieldCheckIcon className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-800">
              Confidentialité
            </h3>
          </div>
          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
            Les paramètres de confidentialité avancés seront bientôt disponibles.
          </p>
        </Card>

        {/* Paramètres de notifications */}
        <Card className="p-4">
          <div className="flex items-center mb-2">
            <BellIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-800">
              Notifications
            </h3>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={notificationSettings.messageNotifications}
                onChange={(e) => updateNotificationSettings({ messageNotifications: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-gray-700">Messages</span>
            </label>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={notificationSettings.likeNotifications}
                onChange={(e) => updateNotificationSettings({ likeNotifications: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-gray-700">Likes</span>
            </label>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={notificationSettings.matchNotifications}
                onChange={(e) => updateNotificationSettings({ matchNotifications: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-gray-700">Matchs</span>
            </label>
          </div>
        </Card>

        {/* Zone de danger */}
        <Card className="bg-red-50 border-red-200 p-4">
          <div className="flex items-center mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-sm font-semibold text-red-800">
              Zone de danger
            </h3>
          </div>

          <p className="text-xs text-red-700 mb-3">
            Ces actions sont importantes et irréversibles.
          </p>

          <div className="grid grid-cols-2 gap-2">
              {/* Bouton Suspension/Réactivation */}
              {(() => {
                if (accountStatus === 'SUSPENDED') {
                  return (
                    <button
                      onClick={() => setShowReactivateModal(true)}
                      disabled={hookIsLoading}
                      className="flex items-center justify-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {hookIsLoading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          ...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4 mr-1" />
                          Réactiver
                        </>
                      )}
                    </button>
                  );
                }

                if (accountStatus === 'BANNED') {
                  return (
                    <div className="flex items-center justify-center px-3 py-2 text-sm bg-red-500 text-white rounded-lg cursor-not-allowed">
                      <LockClosedIcon className="w-4 h-4 mr-1" />
                      Banni
                    </div>
                  );
                }

                if (accountStatus === 'ACTIVE') {
                  const canSuspend = !isSuspending && !!profile?.id;

                  return (
                    <button
                      onClick={() => {
                        if (canSuspend) {
                          setShowSuspendModal(true);
                        } else {
                          onMessage('Impossible de suspendre le compte actuellement', 'error');
                        }
                      }}
                      disabled={!canSuspend}
                      className={`flex items-center justify-center px-3 py-2 text-sm text-white rounded-lg transition-colors ${
                        canSuspend
                          ? 'bg-orange-500 hover:bg-orange-600'
                          : 'bg-gray-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {isSuspending ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          ...
                        </>
                      ) : (
                        <>
                          <PauseIcon className="w-4 h-4 mr-1" />
                          Suspendre
                        </>
                      )}
                    </button>
                  );
                }

                return (
                  <div className="flex items-center justify-center px-3 py-2 text-xs bg-yellow-400 text-black rounded-lg">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    {accountStatus}
                  </div>
                );
              })()}

              {/* Bouton Suppression */}
              <Button
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center text-sm py-2"
              >
                <XMarkIcon className="w-4 h-4 mr-1" />
                Supprimer
              </Button>
            </div>
        </Card>
      </div>

      {/* Modale de réactivation */}
      <AnimatePresence>
        {showReactivateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowReactivateModal(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-content"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlayIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Réactiver votre compte ?
                </h3>
                <p className="text-gray-600">
                  Votre profil redeviendra visible et vous recommencerez à recevoir des notifications.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-green-800 mb-3">
                  ✅ Après réactivation :
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Votre profil sera à nouveau visible</li>
                  <li>• Vous pourrez envoyer et recevoir des messages</li>
                  <li>• Les notifications seront réactivées</li>
                  <li>• Vous pourrez voir de nouveaux profils</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReactivateModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="default"
                  onClick={handleReactivateAccount}
                  disabled={hookIsLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {hookIsLoading ? (
                    <>
                      <div className="spinner-sm mr-2"></div>
                      Réactivation...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Réactiver
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modale de suspension */}
      <AnimatePresence>
        {showSuspendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSuspendModal(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-content"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PauseIcon className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Suspendre votre compte ?
                </h3>
                <p className="text-gray-600">
                  Votre compte sera suspendu et vous serez automatiquement déconnecté.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                  ⚠️ Déconnexion automatique
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Vous serez immédiatement déconnecté</li>
                  <li>• Vos cookies de session seront supprimés</li>
                  <li>• Vous serez redirigé vers la page d'accueil</li>
                  <li>• Pour vous reconnecter, utilisez vos identifiants habituels</li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-orange-800 mb-3">
                  ⏸️ Pendant la suspension :
                </h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Votre profil ne sera plus visible par les autres</li>
                  <li>• Vous ne recevrez plus de notifications</li>
                  <li>• Vos conversations seront préservées</li>
                  <li>• Vous ne pourrez pas envoyer/recevoir de messages</li>
                  <li>• Vous pourrez réactiver votre compte en vous reconnectant</li>
                </ul>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison de la suspension (optionnel) :
                </label>
                <select
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  disabled={isSuspending}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Sélectionnez une raison</option>
                  {suspendReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspendReason('');
                  }}
                  disabled={isSuspending}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="default"
                  onClick={handleSuspendAccount}
                  disabled={isSuspending}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {isSuspending ? (
                    <>
                      <div className="spinner-sm mr-2"></div>
                      Suspension...
                    </>
                  ) : (
                    <>
                      <PauseIcon className="w-4 h-4 mr-2" />
                      Suspendre
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modale de suppression */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-content"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Supprimer définitivement votre compte ?
                </h3>
                <p className="text-gray-600">
                  Cette action est irréversible et supprimera toutes vos données.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-red-800 mb-3">
                  🗑️ Sera supprimé définitivement :
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Votre profil et toutes vos informations personnelles</li>
                  <li>• Toutes vos photos ({photos.length} photo{photos.length !== 1 ? 's' : ''})</li>
                  <li>• Tous vos messages et conversations</li>
                  <li>• Tous vos likes donnés et reçus</li>
                  <li>• Tous vos matches actuels</li>
                  <li>• Votre historique d'activité</li>
                  <li>• Vos préférences de recherche</li>
                </ul>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pour confirmer, tapez <span className="font-bold text-red-600">SUPPRIMER</span> ci-dessous :
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Tapez SUPPRIMER"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={loading || deleteConfirmation !== 'SUPPRIMER'}
                  className="flex-1"
                >
                  {loading ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700 text-center">
                  ⚠️ Cette action ne peut pas être annulée. Toutes vos données seront perdues à jamais.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPanel;