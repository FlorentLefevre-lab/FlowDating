'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'next-auth/react';
import { 
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  BellIcon,
  EyeIcon,
  LockClosedIcon,
  PauseIcon,
  XMarkIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

import { SettingsPanelProps } from '../../types/profiles';
import { useAccountSuspension } from '@/hooks/useAccountSuspension';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  profile, 
  photos, 
  session, 
  onMessage
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Vérifier si le compte est suspendu
  const isAccountSuspended = profile?.accountStatus === 'SUSPENDED';

  // ✅ Utilisation du hook pour la suspension ET réactivation
  const { suspendAccount, reactivateAccount, isLoading: isSuspending } = useAccountSuspension();

  const suspendReasons = [
    { value: 'break', label: 'Pause temporaire' },
    { value: 'privacy', label: 'Préoccupations de confidentialité' },
    { value: 'found_match', label: 'J\'ai trouvé quelqu\'un' },
    { value: 'too_busy', label: 'Trop occupé(e) actuellement' },
    { value: 'rethinking', label: 'Je repense à mes objectifs' },
    { value: 'other', label: 'Autre raison' }
  ];

  // ✅ Fonction de suspension utilisant le hook
  const handleSuspendAccount = async () => {
    try {
      console.log('🔄 Début suspension avec hook:', { reason: suspendReason });
      
      // Utiliser le hook pour suspendre
      await suspendAccount({ reason: suspendReason });
      
      // Fermer la modale (le hook gère la redirection)
      setShowSuspendModal(false);
      setSuspendReason('');
      
      // Afficher un message de succès
      onMessage('Suspension en cours...', 'success');
      
    } catch (error) {
      console.error('❌ Erreur suspension via hook:', error);
      onMessage(error instanceof Error ? error.message : 'Erreur lors de la suspension du compte', 'error');
    }
  };

  // ✅ NOUVELLE FONCTION - Réactivation du compte
  const handleReactivateAccount = async () => {
    try {
      console.log('🔄 Début réactivation avec hook');
      
      await reactivateAccount();
      
      onMessage('Votre compte a été réactivé avec succès ! Actualisation...', 'success');
      
      // Recharger la page pour mettre à jour le statut
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Erreur réactivation via hook:', error);
      onMessage(error instanceof Error ? error.message : 'Erreur lors de la réactivation du compte', 'error');
    }
  };

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
          try {
            await signOut({ redirect: false });
            
            const cookies = document.cookie.split(";");
            for (let cookie of cookies) {
              const eqPos = cookie.indexOf("=");
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
            
            localStorage.clear();
            sessionStorage.clear();
            
            window.location.replace('/');
          } catch (logoutError) {
            window.location.replace('/');
          }
        }, 2000);
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      onMessage('Erreur lors de la suppression du compte', 'error');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteConfirmation('');
    }
  };

  return (
    <div className="p-6">
      {/* ✅ NOUVELLE BANNIÈRE - Alerte si compte suspendu */}
      {isAccountSuspended && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-lg mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-orange-700">
                <strong>Votre compte est suspendu.</strong> Votre profil n'est pas visible et vous ne recevez plus de notifications. 
                Vous pouvez le réactiver ci-dessous dans la zone de danger.
              </p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Paramètres du compte
      </h2>
      
      <div className="space-y-6">
        {/* Informations du compte */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <UserCircleIcon className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-800">
              Informations du compte
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
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
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-500">Dernière mise à jour</div>
                <div className="text-gray-800">
                  {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Nombre de photos</div>
                <div className="text-gray-800">{photos.length}/6</div>
              </div>
              {/* ✅ STATUT DU COMPTE MODIFIÉ */}
              <div>
                <div className="text-sm font-medium text-gray-500">Statut du compte</div>
                <div className={`text-gray-800 flex items-center ${isAccountSuspended ? 'text-orange-600' : 'text-green-600'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${isAccountSuspended ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                  {isAccountSuspended ? 'Suspendu' : 'Actif'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paramètres de confidentialité */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-800">
              Confidentialité et sécurité
            </h3>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                defaultChecked 
                className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded" 
              />
              <div>
                <div className="font-medium text-gray-800">Profil visible dans les recherches</div>
                <div className="text-sm text-gray-600">
                  Permettre aux autres utilisateurs de découvrir votre profil
                </div>
              </div>
            </label>
            
            <label className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                defaultChecked 
                className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded" 
              />
              <div>
                <div className="font-medium text-gray-800">Recevoir des messages</div>
                <div className="text-sm text-gray-600">
                  Autoriser les nouveaux matches à vous envoyer des messages
                </div>
              </div>
            </label>
            
            <label className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded" 
              />
              <div>
                <div className="font-medium text-gray-800">Mode privé</div>
                <div className="text-sm text-gray-600">
                  Seules les personnes que vous likez peuvent voir votre profil
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Paramètres de notifications */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BellIcon className="w-6 h-6 text-yellow-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-800">
              Notifications
            </h3>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                defaultChecked 
                className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded" 
              />
              <div>
                <div className="font-medium text-gray-800">Nouveaux matches</div>
                <div className="text-sm text-gray-600">
                  Recevoir une notification pour chaque nouveau match
                </div>
              </div>
            </label>
            
            <label className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                defaultChecked 
                className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded" 
              />
              <div>
                <div className="font-medium text-gray-800">Nouveaux messages</div>
                <div className="text-sm text-gray-600">
                  Recevoir une notification pour chaque nouveau message
                </div>
              </div>
            </label>
            
            <label className="flex items-start space-x-3">
              <input 
                type="checkbox" 
                className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded" 
              />
              <div>
                <div className="font-medium text-gray-800">Emails marketing</div>
                <div className="text-sm text-gray-600">
                  Recevoir des conseils et actualités par email
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Statistiques du compte */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <EyeIcon className="w-6 h-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-800">
              Statistiques de votre profil
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-pink-600">127</div>
              <div className="text-sm text-gray-600">Vues de profil</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">23</div>
              <div className="text-sm text-gray-600">Likes reçus</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">8</div>
              <div className="text-sm text-gray-600">Matches actifs</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">15</div>
              <div className="text-sm text-gray-600">Conversations</div>
            </div>
          </div>
        </div>

        {/* ✅ ZONE DE DANGER MODIFIÉE */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-red-800">
              Zone de danger
            </h3>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-red-700 mb-4">
              Ces actions sont importantes. Réfléchissez bien avant de continuer.
            </p>
            
            <div className="space-y-3">
              {/* ✅ LOGIQUE CONDITIONNELLE - Suspension OU Réactivation */}
              {isAccountSuspended ? (
                /* COMPTE SUSPENDU - Bouton de réactivation */
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <PlayIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-800 mb-2">Réactiver votre compte</h4>
                      <p className="text-sm text-green-700 mb-3">
                        Votre compte est actuellement suspendu. Vous pouvez le réactiver immédiatement pour retrouver l'accès à toutes les fonctionnalités.
                      </p>
                      <button
                        onClick={handleReactivateAccount}
                        disabled={isSuspending}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isSuspending ? (
                          <div className="flex items-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Réactivation...
                          </div>
                        ) : (
                          '✅ Réactiver mon compte'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* COMPTE ACTIF - Bouton de suspension normal */
                <button 
                  onClick={() => {
                    console.log('🔄 Clic bouton suspension');
                    setShowSuspendModal(true);
                  }}
                  disabled={isSuspending}
                  className="w-full md:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm disabled:opacity-50"
                >
                  🔒 Désactiver temporairement mon compte
                </button>
              )}
              
              {/* Bouton de suppression - toujours visible */}
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="w-full md:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm ml-0 md:ml-3 mt-3 md:mt-0"
              >
                🗑️ Supprimer définitivement mon compte
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MODALE DE SUSPENSION - Seulement si compte actif */}
      <AnimatePresence>
        {showSuspendModal && !isAccountSuspended && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
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
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PauseIcon className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Suspendre temporairement votre compte ?
                </h3>
                <p className="text-gray-600">
                  Votre compte sera désactivé mais vous pourrez le réactiver à tout moment.
                </p>
              </div>

              {/* Informations sur la suspension */}
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

              {/* Sélection de la raison */}
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

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspendReason('');
                  }}
                  disabled={isSuspending}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSuspendAccount}
                  disabled={isSuspending}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isSuspending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Suspension...
                    </>
                  ) : (
                    <>
                      <PauseIcon className="w-4 h-4 mr-2" />
                      Confirmer la suspension
                    </>
                  )}
                </button>
              </div>

              {/* Avertissement */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 text-center">
                  ℹ️ Vous pourrez réactiver votre compte à tout moment en vous reconnectant.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE DE SUPPRESSION (inchangée) */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
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
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading || deleteConfirmation !== 'SUPPRIMER'}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
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