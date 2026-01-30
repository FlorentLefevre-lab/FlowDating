'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  IdentificationIcon,
  PhotoIcon,
  HeartIcon,
  UserIcon,
  SparklesIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// 🆕 NOUVEAU : Imports centralisés depuis @/components/ui
import { SimpleLoading, SimpleError } from '@/components/ui';

// Import pour les statistiques
import { StatsDashboard } from './StatsDashboard';
import { useStats } from '@/hooks/useStats';

// ✅ GARDER : Tous vos imports et types exactement comme avant
import type { UserProfile, TabType, MessageType } from '@/types/profiles';
import dynamic from 'next/dynamic';

// ✅ GARDER : Tous vos imports dynamiques exactement comme avant
const ProfileOverview = dynamic(() => import('./ProfileOverview'), {
  loading: () => <SimpleLoading message="Chargement de l'aperçu..." />
});

const BasicInfoForm = dynamic(() => import('./BasicInfoForm'), {
  loading: () => <SimpleLoading message="Chargement du formulaire..." />
});

const PersonalInfoForm = dynamic(() => import('./PersonalInfoForm'), {
  loading: () => <SimpleLoading message="Chargement des informations..." />
});

const PhotosManager = dynamic(() => import('./PhotosManager'), {
  loading: () => <SimpleLoading message="Chargement des photos..." />
});

const PreferencesForm = dynamic(() => import('./PreferencesForm'), {
  loading: () => <SimpleLoading message="Chargement des préférences..." />
});

const PhysicalInfoForm = dynamic(() => import('./PhysicalInfoForm'), {
  loading: () => <SimpleLoading message="Chargement des caractéristiques..." />
});

const LifestyleForm = dynamic(() => import('./LifestyleForm'), {
  loading: () => <SimpleLoading message="Chargement du style de vie..." />
});

const ProfileManager: React.FC = () => {
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Lire le paramètre tab de l'URL au chargement
    const tabParam = searchParams?.get('tab');
    const validTabs: TabType[] = ['overview', 'edit', 'personal', 'physical', 'lifestyle', 'photos', 'preferences', 'stats'];
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      return tabParam as TabType;
    }
    return 'overview';
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('success');

  // 🆕 NOUVEAU : Ajouter un état d'erreur
  const [error, setError] = useState<string | null>(null);

  // Hook pour les statistiques
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
    lastUpdated: statsLastUpdated
  } = useStats(false);

  // 🔥 DEBUG: Afficher les stats du hook
  console.log('📊 [ProfileManager] useStats:', {
    statsData,
    statsLoading,
    statsError,
    statsLastUpdated
  });

  // Configuration des onglets (ordre: Aperçu, Photos, Préférences, Stats, Infos de base, Infos détaillées, Physique, Style de vie)
  const tabs = [
    {
      id: 'overview' as TabType,
      label: 'Aperçu',
      icon: EyeIcon,
      color: 'blue',
      description: 'Vue d\'ensemble de votre profil'
    },
    {
      id: 'photos' as TabType,
      label: 'Photos',
      icon: PhotoIcon,
      color: 'yellow',
      description: 'Gérer vos photos de profil'
    },
    {
      id: 'preferences' as TabType,
      label: 'Préférences',
      icon: HeartIcon,
      color: 'red',
      description: 'Critères de recherche'
    },
    {
      id: 'stats' as TabType,
      label: 'Statistiques',
      icon: ChartBarIcon,
      color: 'indigo',
      description: 'Vos statistiques de profil'
    },
    {
      id: 'edit' as TabType,
      label: 'Infos de base',
      icon: PencilIcon,
      color: 'green',
      description: 'Nom, âge, bio, localisation'
    },
    {
      id: 'personal' as TabType,
      label: 'Infos détaillées',
      icon: IdentificationIcon,
      color: 'purple',
      description: 'Genre, profession, centres d\'intérêt'
    },
    {
      id: 'physical' as TabType,
      label: 'Physique',
      icon: UserIcon,
      color: 'cyan',
      description: 'Taille, poids, silhouette'
    },
    {
      id: 'lifestyle' as TabType,
      label: 'Style de vie',
      icon: SparklesIcon,
      color: 'orange',
      description: 'Tabac, alcool, enfants, animaux'
    }
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  // 🆕 AMÉLIORÉ : Fonction loadProfile avec gestion d'erreur
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null); // Reset error
      console.log('🔄 Chargement du profil...');
      
      const response = await fetch('/api/profile', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: Impossible de charger le profil`);
      }

      const data = await response.json();
      console.log('📊 Profil chargé:', data);
      
      if (data.profile) {
        setProfile(data.profile);
      } else {
        setProfile(data);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      setError(error.message || 'Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  // ✅ GARDER : Toutes vos autres fonctions exactement comme avant
  const loadPreferences = async () => {
    try {
      console.log('🔄 Chargement des préférences...');
      
      const response = await fetch('/api/user-preferences', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const preferences = await response.json();
        console.log('✅ Préférences chargées:', preferences);
        
        setProfile(prev => prev ? { 
          ...prev, 
          preferences 
        } : null);
        
        return preferences;
      } else {
        console.log('⚠️ Pas de préférences trouvées, utilisation des valeurs par défaut');
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur chargement préférences:', error);
      return null;
    }
  };

  useEffect(() => {
    if (profile && !profile.preferences) {
      loadPreferences();
    }
  }, [profile]);

  const showMessage = (msg: string, type: MessageType = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const getProfileCompletion = () => {
    if (!profile) return 0;
    
    const fields = [
      profile.name,
      profile.age,
      profile.bio,
      profile.location,
      profile.interests?.length > 0,
      profile.photos?.length > 0,
      profile.gender,
      profile.profession,
    ];
    
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  // ✅ GARDER : Tous vos handlers exactement comme avant
  const handleBasicInfoSubmit = async (data: any) => {
    setSaving(true);
    try {
      console.log('💾 [ProfileManager] Sauvegarde des infos de base:', data);
      console.log('💾 [ProfileManager] Ancien nom:', profile?.name, '-> Nouveau nom:', data.name);

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ProfileManager] Réponse API erreur:', response.status, errorText);
        throw new Error(`HTTP ${response.status}`);
      }

      const updatedData = await response.json();
      console.log('✅ [ProfileManager] Réponse API succès:', updatedData);
      console.log('✅ [ProfileManager] Nom mis à jour:', updatedData.name);

      setProfile(prev => {
        const newProfile = prev ? { ...prev, ...updatedData } : null;
        console.log('✅ [ProfileManager] Nouveau profil state:', newProfile?.name);
        return newProfile;
      });

      // 🔄 Rafraîchir la session NextAuth pour mettre à jour le nom dans la navbar
      await updateSession();
      console.log('✅ [ProfileManager] Session NextAuth rafraîchie');

      showMessage('✅ Informations de base sauvegardées !', 'success');
      setActiveTab('overview');
    } catch (error) {
      console.error('❌ [ProfileManager] Erreur sauvegarde:', error);
      showMessage('❌ Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePersonalInfoSubmit = async (data: any) => {
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des infos personnelles:', data);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const updatedData = await response.json();
      setProfile(prev => prev ? { ...prev, ...updatedData } : null);
      
      showMessage('✅ Informations personnelles sauvegardées !', 'success');
      setActiveTab('overview');
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      showMessage('❌ Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhysicalInfoSubmit = async (data: any) => {
    setSaving(true);
    try {
      console.log('Sauvegarde des caractéristiques physiques:', data);

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const updatedData = await response.json();
      setProfile(prev => prev ? { ...prev, ...updatedData } : null);

      showMessage('Caractéristiques physiques sauvegardées !', 'success');
      setActiveTab('overview');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showMessage('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLifestyleSubmit = async (data: any) => {
    setSaving(true);
    try {
      console.log('Sauvegarde du style de vie:', data);

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const updatedData = await response.json();
      setProfile(prev => prev ? { ...prev, ...updatedData } : null);

      showMessage('Style de vie sauvegardé !', 'success');
      setActiveTab('overview');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showMessage('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSubmit = async (data: any) => {
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des préférences:', data);
      
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const updatedPreferences = await response.json();
      setProfile(prev => prev ? { 
        ...prev, 
        preferences: updatedPreferences 
      } : null);
      
      showMessage('✅ Préférences sauvegardées !', 'success');
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde préférences:', error);
      showMessage(error.message || '❌ Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
  };

  // 🆕 AMÉLIORÉ : État de chargement simplifié
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <SimpleLoading message="Chargement de votre profil..." />
      </div>
    );
  }

  // 🆕 NOUVEAU : État d'erreur simplifié
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <SimpleError 
          message={error}
          onRetry={() => {
            setError(null);
            loadProfile();
          }}
        />
      </div>
    );
  }

  // ✅ GARDER : Tout le reste de votre JSX exactement comme avant
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto p-4 md:p-6">

        {/* ✅ GARDER : Header avec barre de progression exactement comme avant */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 border-b border-gray-200">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                ✨ Gestion du Profil
              </h1>
              <p className="text-gray-600 text-sm md:text-base">
                Gérez vos informations et préférences de rencontres
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-xs md:text-sm text-gray-500 mb-2">Profil complété</div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="relative w-16 md:w-20 h-2 md:h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getProfileCompletion()}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-pink-500 to-blue-500 rounded-full"
                  />
                </div>
                <div className="text-base md:text-lg font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                  {getProfileCompletion()}%
                </div>
              </div>
            </div>
          </div>

          {/* Navigation par onglets */}
          <div className="flex overflow-x-auto bg-gradient-to-r from-gray-50 to-gray-100">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex flex-col items-center gap-2 p-4 border-b-2 transition-all duration-300 relative min-w-24 md:min-w-32 ${
                    isActive
                      ? 'border-pink-500 text-pink-600 bg-pink-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-pink-500' : ''}`} />
                  <div className="font-medium text-xs text-center whitespace-nowrap">
                    {tab.label}
                  </div>

                  {tab.id === 'photos' && profile?.photos?.length ? (
                    <span className="absolute top-1 right-1 min-w-5 h-5 px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-pink-500 text-white shadow-sm">
                      {profile.photos.length}
                    </span>
                  ) : null}

                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ✅ GARDER : Messages de feedback exactement comme avant */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-4 rounded-xl mb-6 shadow-lg ${
                messageType === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {messageType === 'success' ? (
                  <CheckIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <span className="font-medium text-sm md:text-base">{message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✅ GARDER : Contenu principal exactement comme avant */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
          >
            {activeTab === 'overview' && (
              <ProfileOverview
                profile={profile}
                onTabChange={setActiveTab}
                onMessage={showMessage}
                isPremium={profile?.isPremium || false}
              />
            )}

            {activeTab === 'edit' && (
              <BasicInfoForm 
                profile={profile}
                loading={saving}
                onSubmit={handleBasicInfoSubmit}
                onCancel={() => setActiveTab('overview')}
              />
            )}

            {activeTab === 'personal' && (
              <PersonalInfoForm
                profile={profile}
                loading={saving}
                onSubmit={handlePersonalInfoSubmit}
                onCancel={() => setActiveTab('overview')}
              />
            )}

            {activeTab === 'physical' && (
              <PhysicalInfoForm
                profile={profile}
                loading={saving}
                onSubmit={handlePhysicalInfoSubmit}
                onCancel={() => setActiveTab('overview')}
              />
            )}

            {activeTab === 'lifestyle' && (
              <LifestyleForm
                profile={profile}
                loading={saving}
                onSubmit={handleLifestyleSubmit}
                onCancel={() => setActiveTab('overview')}
              />
            )}

            {activeTab === 'photos' && (
              <PhotosManager
                photos={profile?.photos || []}
                onMessage={showMessage}
                onPhotosChange={() => loadProfile()}
                isPremium={profile?.isPremium || false}
              />
            )}

            {activeTab === 'preferences' && (
              <PreferencesForm
                profile={profile}
                loading={saving}
                onSubmit={handlePreferencesSubmit}
              />
            )}

            {activeTab === 'stats' && (
              <div className="p-6">
                <div className="form-section-header mb-6">
                  <h2 className="text-heading mb-2">
                    Mes Statistiques
                  </h2>
                  <p className="text-body">
                    Suivez l'évolution de votre profil et votre activité
                  </p>
                </div>
                <StatsDashboard
                  showDetailedStats={true}
                  stats={statsData || undefined}
                  isLoading={statsLoading}
                  error={statsError}
                  onRefresh={refetchStats}
                  lastUpdated={statsLastUpdated}
                  className="h-full"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfileManager;