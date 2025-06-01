// components/profile/SettingsPanel.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'next-auth/react';
import { 
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  BellIcon,
  EyeIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { UserProfile, Photo } from  '../../types/profiles';




interface Props {
  profile: UserProfile | null;
  photos: Photo[];
  session: any;
  onMessage: (message: string, type?: 'success' | 'error') => void;
}

const SettingsPanel: React.FC<Props> = ({ profile, photos, session, onMessage }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

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

        {/* Zone de danger */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-red-800">
              Zone de danger
            </h3>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-red-700 mb-4">
              Ces actions sont définitives et irréversibles. Réfléchissez bien avant de continuer.
            </p>
            
            <div className="space-y-3">
              <button className="w-full md:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
                🔒 Désactiver temporairement mon compte
              </button>
              
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

      {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
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

              {/* Liste des données supprimées */}
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

              {/* Confirmation par saisie */}
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

              {/* Actions */}
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

              {/* Avertissement final */}
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