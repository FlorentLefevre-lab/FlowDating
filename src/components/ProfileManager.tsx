// components/ProfileManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  CheckIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  EyeIcon,
  PencilIcon,
  IdentificationIcon,
  PhotoIcon,
  HeartIcon,
  CogIcon
} from '@heroicons/react/24/outline';

// Import des composants enfants
import ProfileOverview from './profile/ProfileOverview';
import BasicInfoForm from './profile/BasicInfoForm';
import PersonalInfoForm from './profile/PersonalInfoForm';
import PhotosManager from './profile/PhotosManager';
import PreferencesForm from './profile/PreferencesForm';
import SettingsPanel from './profile/SettingsPanel';

// Import des types et hooks
import { useProfile } from '../hooks/useProfile';
import { UserProfile, TabType } from '../types/profiles';


const ProfileManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  
  const router = useRouter();
  const { data: session } = useSession();
  
  // Hook personnalisé pour la gestion du profil
  const {
    profile,
    photos,
    loading,
    loadProfile,
    updateProfile,
    updatePreferences
  } = useProfile();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Squares2X2Icon },
    { id: 'overview', label: 'Aperçu', icon: EyeIcon },
    { id: 'edit', label: 'Infos de base', icon: PencilIcon },
    { id: 'personal', label: 'Infos personnelles', icon: IdentificationIcon },
    { id: 'photos', label: 'Photos', icon: PhotoIcon },
    { id: 'preferences', label: 'Préférences', icon: HeartIcon },
    { id: 'settings', label: 'Paramètres', icon: CogIcon }
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const handleTabClick = (tabId: TabType) => {
    if (tabId === 'dashboard') {
      router.push('/dashboard');
    } else {
      setActiveTab(tabId);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const getProfileCompletion = () => {
    if (!profile) return 0;
    let completed = 0;
    const total = 12;
    
    if (profile.name) completed++;
    if (profile.age) completed++;
    if (profile.bio) completed++;
    if (profile.location) completed++;
    if (profile.interests && profile.interests.length > 0) completed++;
    if (photos.length > 0) completed++;
    if (profile.gender) completed++;
    if (profile.profession) completed++;
    if (profile.maritalStatus) completed++;
    if (profile.zodiacSign) completed++;
    if (profile.dietType) completed++;
    if (profile.religion) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const handleProfileUpdate = async (data: any) => {
    try {
      await updateProfile(data);
      showMessage('Profil sauvegardé avec succès !', 'success');
      setActiveTab('overview');
    } catch (error) {
      showMessage('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handlePreferencesUpdate = async (data: any) => {
    try {
      console.log('📤 Envoi préférences:', data);
      
      const response = await fetch('/api/user-preferences', {  // ← Changez cette ligne
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur:', response.status, errorText);
        throw new Error(`Erreur ${response.status}`);
      }
  
      const result = await response.json();
      console.log('✅ Succès:', result);
      
      showMessage('Préférences sauvegardées avec succès !', 'success');
      loadProfile();
      
    } catch (error) {
      console.error('❌ Erreur préférences:', error);
      showMessage('Erreur lors de la sauvegarde', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header avec navigation par onglets */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg mb-6"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Gestion du Profil
              </h1>
              <p className="text-gray-600 mt-1">
                Gérez vos informations et préférences
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Profil complété</div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getProfileCompletion()}%` }}
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-500"
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {getProfileCompletion()}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isDashboard = tab.id === 'dashboard';
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors ${
                  isDashboard
                    ? 'border-pink-500 text-pink-600 bg-gradient-to-r from-pink-50 to-rose-50'
                    : activeTab === tab.id
                    ? 'border-pink-500 text-pink-600 bg-pink-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isDashboard ? 'text-pink-500' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Messages de feedback */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`p-4 rounded-lg mb-6 ${
              messageType === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {messageType === 'success' ? (
                <CheckIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              )}
              {message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenu selon l'onglet actif */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-xl shadow-lg"
      >
        {activeTab === 'overview' && (
          <ProfileOverview 
            profile={profile}
            photos={photos}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === 'edit' && (
          <BasicInfoForm
            profile={profile}
            loading={loading}
            onSubmit={handleProfileUpdate}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {activeTab === 'personal' && (
          <PersonalInfoForm
            profile={profile}
            loading={loading}
            onSubmit={handleProfileUpdate}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {activeTab === 'photos' && (
          <PhotosManager
            photos={photos}
            onMessage={showMessage}
          />
        )}

        {activeTab === 'preferences' && (
          <PreferencesForm
            profile={profile}
            loading={loading}
            onSubmit={handlePreferencesUpdate}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            profile={profile}
            photos={photos}
            session={session}
            onMessage={showMessage}
          />
        )}
      </motion.div>
    </div>
  );
};

export default ProfileManager;