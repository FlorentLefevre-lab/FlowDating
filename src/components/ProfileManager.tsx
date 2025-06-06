'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { 
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  IdentificationIcon,
  PhotoIcon,
  HeartIcon,
  CogIcon,
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

// Import des types
import type { UserProfile, TabType, MessageType } from '../types/profiles';

// Import des composants avec des imports dynamiques
import dynamic from 'next/dynamic';

const ProfileOverview = dynamic(() => import('./profile/ProfileOverview'), {
  loading: () => <div className="p-responsive animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-200 rounded"></div>
  </div>
});

const BasicInfoForm = dynamic(() => import('./profile/BasicInfoForm'), {
  loading: () => <div className="p-responsive animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
    <div className="space-y-4">
      <div className="h-12 bg-gray-200 rounded"></div>
      <div className="h-12 bg-gray-200 rounded"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  </div>
});

const PersonalInfoForm = dynamic(() => import('./profile/PersonalInfoForm'), {
  loading: () => <div className="p-responsive animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded"></div>
      ))}
    </div>
  </div>
});

const PhotosManager = dynamic(() => import('./profile/PhotosManager'), {
  loading: () => <div className="p-responsive animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="aspect-square bg-gray-200 rounded-xl"></div>
      ))}
    </div>
  </div>
});

const PreferencesForm = dynamic(() => import('./profile/PreferencesForm'), {
  loading: () => <div className="p-responsive animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
    <div className="space-y-6">
      <div className="h-32 bg-gray-200 rounded"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  </div>
});

const SettingsPanel = dynamic(() => import('./profile/SettingsPanel'), {
  loading: () => <div className="p-responsive animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded"></div>
      ))}
    </div>
  </div>
});

const ProfileManager: React.FC = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('success');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Configuration des onglets avec responsive
  const tabs = [
    { 
      id: 'dashboard' as const, 
      label: 'Accueil', 
      shortLabel: 'Home',
      icon: HomeIcon, 
      color: 'blue',
      description: 'Retour au tableau de bord',
      isLink: true,
      href: '/dashboard'
    },
    { 
      id: 'overview' as TabType, 
      label: 'Aperçu', 
      shortLabel: 'Vue',
      icon: EyeIcon, 
      color: 'blue',
      description: 'Vue d\'ensemble de votre profil'
    },
    { 
      id: 'edit' as TabType, 
      label: 'Infos de base', 
      shortLabel: 'Base',
      icon: PencilIcon, 
      color: 'green',
      description: 'Nom, âge, bio, localisation'
    },
    { 
      id: 'personal' as TabType, 
      label: 'Infos personnelles', 
      shortLabel: 'Perso',
      icon: IdentificationIcon, 
      color: 'purple',
      description: 'Genre, profession, centres d\'intérêt'
    },
    { 
      id: 'photos' as TabType, 
      label: 'Photos', 
      shortLabel: 'Photos',
      icon: PhotoIcon, 
      color: 'yellow',
      description: 'Gérer vos photos de profil'
    },
    { 
      id: 'preferences' as TabType, 
      label: 'Préférences', 
      shortLabel: 'Pref',
      icon: HeartIcon, 
      color: 'red',
      description: 'Critères de recherche'
    },
    { 
      id: 'settings' as TabType, 
      label: 'Paramètres', 
      shortLabel: 'Config',
      icon: CogIcon, 
      color: 'gray',
      description: 'Confidentialité et sécurité'
    }
  ];

  // Chargement initial
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      console.log('🔄 Chargement du profil...');
      
      const response = await fetch('/api/profile', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Profil chargé:', data);
      
      if (data.profile) {
        setProfile(data.profile);
      } else {
        setProfile(data);
      }
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      showMessage('Erreur lors du chargement du profil', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  // Calcul du pourcentage de complétion
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

  // Handlers pour les formulaires
  const handleBasicInfoSubmit = async (data: any) => {
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des infos de base:', data);
      
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
      
      showMessage('✅ Informations de base sauvegardées !', 'success');
      setActiveTab('overview');
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
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

  // Fonction pour changer d'onglet et fermer le menu mobile
  const handleTabChange = (tabId: TabType | 'dashboard') => {
    if (tabId === 'dashboard') {
      window.location.href = '/dashboard';
      return;
    }
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  // Obtenir le titre de l'onglet actif
  const getActiveTabTitle = () => {
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    return activeTabConfig ? (isMobile ? activeTabConfig.shortLabel : activeTabConfig.label) : 'Profil';
  };

  // Fermer le menu mobile si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen && !(event.target as Element).closest('.mobile-menu')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Empêcher le scroll
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="responsive-container">
          <div className="animate-pulse space-y-6">
            {/* Header skeleton */}
            <div className="bg-white rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="hidden md:flex space-x-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded flex-1"></div>
                ))}
              </div>
            </div>
            {/* Content skeleton */}
            <div className="bg-white rounded-2xl p-4 md:p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="responsive-container">

        {/* Header avec barre de progression */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6"
        >
          <div className="mobile-header">
            <div className="mobile-header-content">
              <div className="mobile-header-title-container">
                {/* Mobile Hamburger Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="hamburger-button"
                  aria-label="Menu de navigation"
                >
                  <motion.div
                    animate={isMobileMenuOpen ? "open" : "closed"}
                    variants={{
                      open: { rotate: 180 },
                      closed: { rotate: 0 }
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {isMobileMenuOpen ? (
                      <XMarkIcon className="w-6 h-6 text-gray-700" />
                    ) : (
                      <Bars3Icon className="w-6 h-6 text-gray-700" />
                    )}
                  </motion.div>
                </button>

                {/* Title */}
                <div className="min-w-0 flex-1">
                  <h1 className="mobile-title truncate">
                    ✨ {getActiveTabTitle()}
                  </h1>
                  <p className="mobile-subtitle">
                    Gérez vos informations et préférences
                  </p>
                </div>
              </div>
            </div>
            
            {/* Indicateur de progression */}
            <div className="progress-container">
              <div className="progress-label">Profil complété</div>
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getProfileCompletion()}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="progress-fill"
                  />
                </div>
                <div className="progress-percentage">
                  {getProfileCompletion()}%
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation par onglets */}
          <div className="desktop-navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Si c'est un lien externe (dashboard)
              if (tab.isLink) {
                return (
                  <motion.a
                    key={tab.id}
                    href={tab.href}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="nav-tab inactive"
                  >
                    <Icon className="nav-tab-icon" />
                    <div className="nav-tab-label">{tab.label}</div>
                  </motion.a>
                );
              }
              
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTabChange(tab.id as TabType)}
                  className={`nav-tab ${isActive ? 'active' : 'inactive'}`}
                >
                  <Icon className={`nav-tab-icon ${isActive ? 'active' : ''}`} />
                  <div className="nav-tab-label">{tab.label}</div>
                  
                  {/* Badge pour photos */}
                  {tab.id === 'photos' && profile?.photos?.length && (
                    <span className="nav-tab-badge">
                      {profile.photos.length}
                    </span>
                  )}
                  
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

        {/* Messages de feedback */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-4 rounded-xl mb-6 shadow-lg mx-4 md:mx-0 ${
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

        {/* Contenu principal */}
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

            {activeTab === 'photos' && (
              <PhotosManager 
                photos={profile?.photos || []}
                onMessage={showMessage}
                onPhotosChange={() => loadProfile()}
              />
            )}

            {activeTab === 'preferences' && (
              <PreferencesForm 
                profile={profile}
                loading={saving}
                onSubmit={handlePreferencesSubmit}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPanel 
                profile={profile}
                photos={profile?.photos || []}
                session={session}
                onMessage={showMessage}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Menu Slide-out */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="mobile-menu-backdrop"
            />
            
            {/* Mobile Menu */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="mobile-menu"
            >
              {/* Header du menu mobile */}
              <div className="mobile-menu-header">
                <div className="mobile-menu-avatar-container">
                  <div className="mobile-menu-avatar">
                    {profile?.photos?.[0] ? (
                      <img 
                        src={profile.photos[0].url} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-6 h-6" />
                    )}
                  </div>
                  <div className="mobile-menu-user-info">
                    <h3 className="truncate">{profile?.name || 'Utilisateur'}</h3>
                    <p>Profil complété à {getProfileCompletion()}%</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="mobile-menu-items">
                {tabs.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <motion.div
                      key={`menu-${index}-${tab.label}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {tab.isLink ? (
                        <motion.a
                          href={tab.href}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="mobile-menu-item inactive"
                        >
                          <Icon className={`mobile-menu-item-icon text-${tab.color}-600`} />
                          <div className="mobile-menu-item-content">
                            <div className="mobile-menu-item-title">{tab.label}</div>
                            <div className="mobile-menu-item-description text-xs">{tab.description}</div>
                          </div>
                          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        </motion.a>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleTabChange(tab.id as TabType)}
                          className={`mobile-menu-item ${isActive ? 'active' : 'inactive'}`}
                        >
                          <Icon className={`mobile-menu-item-icon text-${tab.color}-${isActive ? '600' : '500'}`} />
                          <div className="mobile-menu-item-content">
                            <div className={`mobile-menu-item-title ${isActive ? 'active' : ''}`}>
                              {tab.label}
                              {tab.id === 'photos' && profile?.photos?.length && (
                                <span className="mobile-menu-item-badge">
                                  {profile.photos.length}
                                </span>
                              )}
                            </div>
                            <div className="mobile-menu-item-description text-xs">{tab.description}</div>
                          </div>
                          {isActive && (
                            <div className="mobile-menu-item-indicator"></div>
                          )}
                        </motion.button>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer du menu mobile */}
              <div className="mobile-menu-footer">
                <div className="mobile-menu-footer-content">
                  <p className="text-xs">Flow Dating v1.0</p>
                  <div className="mobile-menu-progress">
                    <div 
                      className="progress-fill"
                      style={{ width: `${getProfileCompletion()}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileManager;