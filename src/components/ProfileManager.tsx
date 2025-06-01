// components/ProfileManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserIcon, 
  PhotoIcon, 
  HeartIcon, 
  CogIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon, 
  StarIcon,
  PlusIcon,
  CheckIcon 
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { z } from 'zod';

// ===== SCHEMAS DE VALIDATION =====
const profileSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  age: z.coerce.number().min(18, 'Âge minimum 18 ans').max(100, 'Âge maximum 100 ans').optional().nullable(),
  bio: z.string().max(500, 'Bio limitée à 500 caractères').optional().nullable(),
  location: z.string().max(100, 'Localisation trop longue').optional().nullable(),
  interests: z.array(z.string()).max(10, 'Maximum 10 centres d\'intérêt').optional()
});

const preferencesSchema = z.object({
  minAge: z.coerce.number().min(18, 'Âge minimum 18 ans').max(99, 'Âge maximum 99 ans'),
  maxAge: z.coerce.number().min(18, 'Âge minimum 18 ans').max(99, 'Âge maximum 99 ans'),
  maxDistance: z.coerce.number().min(1, 'Distance minimum 1 km').max(500, 'Distance maximum 500 km'),
  gender: z.string().optional().nullable()
}).refine(data => data.minAge <= data.maxAge, {
  message: "L'âge minimum ne peut pas être supérieur à l'âge maximum",
  path: ["minAge"]
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PreferencesFormData = z.infer<typeof preferencesSchema>;

// ===== INTERFACES =====
interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  age: number | null;
  bio: string | null;
  location: string | null;
  interests: string[];
  photos: Photo[];
  preferences?: {
    minAge: number;
    maxAge: number;
    maxDistance: number;
    gender: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

type TabType = 'overview' | 'edit' | 'photos' | 'preferences' | 'settings';

// ===== COMPOSANT PRINCIPAL =====
const ProfileManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newInterest, setNewInterest] = useState('');

  // Form pour le profil
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    setValue: setValueProfile,
    watch: watchProfile,
    formState: { errors: errorsProfile, isDirty: isDirtyProfile }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      age: null,
      bio: '',
      location: '',
      interests: []
    }
  });

  // Form pour les préférences
  const {
    register: registerPreferences,
    handleSubmit: handleSubmitPreferences,
    setValue: setValuePreferences,
    formState: { errors: errorsPreferences, isDirty: isDirtyPreferences }
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      minAge: 18,
      maxAge: 35,
      maxDistance: 50,
      gender: ''
    }
  });

  const interests = watchProfile('interests') || [];

  const tabs = [
    { id: 'overview', label: 'Aperçu', icon: EyeIcon },
    { id: 'edit', label: 'Modifier', icon: PencilIcon },
    { id: 'photos', label: 'Photos', icon: PhotoIcon },
    { id: 'preferences', label: 'Préférences', icon: HeartIcon },
    { id: 'settings', label: 'Paramètres', icon: CogIcon }
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/user-profile');
      if (response.ok) {
        const userData: UserProfile = await response.json();
        setProfile(userData);
        setPhotos(userData.photos || []);
        
        // Remplir les formulaires
        setValueProfile('name', userData.name || '');
        setValueProfile('age', userData.age);
        setValueProfile('bio', userData.bio);
        setValueProfile('location', userData.location);
        setValueProfile('interests', userData.interests || []);
        
        if (userData.preferences) {
          setValuePreferences('minAge', userData.preferences.minAge);
          setValuePreferences('maxAge', userData.preferences.maxAge);
          setValuePreferences('maxDistance', userData.preferences.maxDistance);
          setValuePreferences('gender', userData.preferences.gender || '');
        } else {
          setValuePreferences('minAge', 18);
          setValuePreferences('maxAge', 35);
          setValuePreferences('maxDistance', 50);
          setValuePreferences('gender', '');
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      setMessage('Erreur lors du chargement du profil');
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    setLoading(true);
    console.log('🔄 Données du profil à envoyer:', data);
    
    const cleanData = {
      name: data.name,
      age: data.age || null,
      bio: data.bio || null,
      location: data.location || null,
      interests: data.interests || []
    };
    
    try {
      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        showMessage('Profil sauvegardé avec succès !');
        setActiveTab('overview');
      } else {
        showMessage('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      showMessage('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPreferences = async (data: PreferencesFormData) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        setProfile(prev => prev ? { ...prev, preferences: data } : null);
        showMessage('Préférences sauvegardées avec succès !');
      } else {
        showMessage('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde préférences:', error);
      showMessage('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Upload de photos avec Cloudinary simplifié (temporairement désactivé)
  const handlePhotoUpload = async (result: any) => {
    try {
      console.log('📸 Upload Cloudinary:', result.secure_url);
      
      const response = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: result.secure_url })
      });

      if (response.ok) {
        const newPhoto = await response.json();
        setPhotos([...photos, newPhoto]);
        showMessage('Photo ajoutée avec succès !');
      } else {
        showMessage('Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      showMessage('Erreur upload photo');
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return;

    try {
      console.log('🗑️ Suppression photo:', photoId);
      
      const response = await fetch(`/api/profile/photos/${photoId}`, {
        method: 'DELETE'
      });

      console.log('🗑️ Statut suppression:', response.status);

      if (response.ok) {
        setPhotos(photos.filter(p => p.id !== photoId));
        showMessage('Photo supprimée avec succès');
      } else {
        showMessage('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('💥 Erreur suppression:', error);
      showMessage('Erreur lors de la suppression');
    }
  };

  const setPrimaryPhoto = async (photoId: string) => {
    try {
      console.log('⭐ Définir photo principale:', photoId);
      
      const response = await fetch(`/api/profile/photos/${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, action: 'setPrimary' })
      });

      console.log('⭐ Statut photo principale:', response.status);

      if (response.ok) {
        setPhotos(photos.map(p => ({
          ...p,
          isPrimary: p.id === photoId
        })));
        showMessage('Photo principale mise à jour');
      } else {
        showMessage('Erreur mise à jour photo principale');
      }
    } catch (error) {
      console.error('💥 Erreur photo principale:', error);
      showMessage('Erreur mise à jour photo principale');
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim()) && interests.length < 10) {
      const newInterests = [...interests, newInterest.trim()];
      setValueProfile('interests', newInterests);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    const newInterests = interests.filter(i => i !== interest);
    setValueProfile('interests', newInterests);
  };

  const getProfileCompletion = () => {
    if (!profile) return 0;
    let completed = 0;
    const total = 6;
    
    if (profile.name) completed++;
    if (profile.age) completed++;
    if (profile.bio) completed++;
    if (profile.location) completed++;
    if (profile.interests && profile.interests.length > 0) completed++;
    if (photos.length > 0) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const primaryPhoto = photos.find(p => p.isPrimary);

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
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-pink-500 text-pink-600 bg-pink-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {/* Indicateurs de changements non sauvegardés */}
                {((tab.id === 'edit' && isDirtyProfile) || 
                  (tab.id === 'preferences' && isDirtyPreferences)) && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                )}
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
              message.includes('succès') || message.includes('ajoutée') || message.includes('sauvegardées')
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.includes('succès') ? (
                <CheckIcon className="w-5 h-5 text-green-600" />
              ) : (
                <div className="w-5 h-5 text-red-600">⚠</div>
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
        {/* ONGLET APERÇU */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Photo principale et infos de base */}
              <div className="lg:col-span-1">
                <div className="text-center">
                  {primaryPhoto ? (
                    <img
                      src={primaryPhoto.url}
                      alt="Photo de profil"
                      className="w-48 h-48 rounded-full object-cover mx-auto border-4 border-pink-100"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-full bg-gray-100 mx-auto flex items-center justify-center border-4 border-gray-200">
                      <UserIcon className="w-24 h-24 text-gray-400" />
                    </div>
                  )}
                  <h2 className="text-2xl font-bold text-gray-800 mt-4">
                    {profile?.name || 'Nom non défini'}
                  </h2>
                  {profile?.age && (
                    <p className="text-gray-600">{profile.age} ans</p>
                  )}
                  {profile?.location && (
                    <p className="text-gray-500 mt-1">{profile.location}</p>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-2">Statistiques</h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-pink-600">
                          {photos.length}
                        </div>
                        <div className="text-sm text-gray-500">Photos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {profile?.interests?.length || 0}
                        </div>
                        <div className="text-sm text-gray-500">Intérêts</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations détaillées */}
              <div className="lg:col-span-2 space-y-6">
                {/* Bio */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    À propos
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {profile?.bio ? (
                      <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                    ) : (
                      <p className="text-gray-400 italic">
                        Aucune bio définie. Ajoutez une description pour vous présenter !
                      </p>
                    )}
                  </div>
                </div>

                {/* Centres d'intérêt */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Centres d'intérêt
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {profile?.interests && profile.interests.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">
                        Aucun centre d'intérêt défini. Ajoutez vos passions !
                      </p>
                    )}
                  </div>
                </div>

                {/* Préférences de recherche */}
                {profile?.preferences && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Préférences de recherche
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Âge</div>
                          <div className="font-medium">
                            {profile.preferences.minAge} - {profile.preferences.maxAge} ans
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Distance</div>
                          <div className="font-medium">
                            {profile.preferences.maxDistance} km
                          </div>
                        </div>
                        {profile.preferences.gender && (
                          <div>
                            <div className="text-sm text-gray-500">Genre recherché</div>
                            <div className="font-medium">
                              {profile.preferences.gender}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions rapides */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="p-4 border border-pink-200 rounded-lg hover:bg-pink-50 transition-colors text-left"
                  >
                    <PencilIcon className="w-6 h-6 text-pink-600 mb-2" />
                    <div className="font-medium text-gray-800">Modifier le profil</div>
                    <div className="text-sm text-gray-500">Mettre à jour vos informations</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('photos')}
                    className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-left"
                  >
                    <PhotoIcon className="w-6 h-6 text-blue-600 mb-2" />
                    <div className="font-medium text-gray-800">Gérer les photos</div>
                    <div className="text-sm text-gray-500">Ajouter ou supprimer des photos</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET MODIFICATION */}
        {activeTab === 'edit' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Modifier le profil
            </h2>
            
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Nom complet *
                  </label>
                  <input
                    {...registerProfile('name')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                    placeholder="Votre nom complet"
                  />
                  {errorsProfile.name && (
                    <p className="text-red-500 text-sm mt-1">{errorsProfile.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Âge
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    {...registerProfile('age', { valueAsNumber: true })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                    placeholder="Votre âge"
                  />
                  {errorsProfile.age && (
                    <p className="text-red-500 text-sm mt-1">{errorsProfile.age.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Localisation
                </label>
                <input
                  {...registerProfile('location')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="Ville, Pays"
                />
                {errorsProfile.location && (
                  <p className="text-red-500 text-sm mt-1">{errorsProfile.location.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Bio
                </label>
                <textarea
                  {...registerProfile('bio')}
                  rows={4}
                  maxLength={500}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
                  placeholder="Parlez un peu de vous..."
                />
                {errorsProfile.bio && (
                  <p className="text-red-500 text-sm mt-1">{errorsProfile.bio.message}</p>
                )}
              </div>

              {/* Centres d'intérêt */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Centres d'intérêt ({interests.length}/10)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                    placeholder="Ajouter un centre d'intérêt"
                    disabled={interests.length >= 10}
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    disabled={interests.length >= 10}
                    className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {interests.map((interest, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => removeInterest(interest)}
                          className="text-pink-500 hover:text-pink-700 transition-colors"
                        >
                          ×
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 px-4 rounded-lg hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 font-medium transition-all"
                >
                  {loading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                </motion.button>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ONGLET PHOTOS */}
        {activeTab === 'photos' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Gestion des photos ({photos.length}/6)
              </h2>
              
              {/* Bouton d'upload temporaire */}
              {photos.length < 6 && (
                <button
                  onClick={() => showMessage('Configuration Cloudinary en cours - Fonctionnalité bientôt disponible')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                  disabled
                >
                  <PlusIcon className="w-5 h-5" />
                  Upload temporairement désactivé
                </button>
              )}
            </div>
            
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <PhotoIcon className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-500 mb-2">
                  Aucune photo
                </h3>
                <p className="text-gray-400 mb-6">
                  Fonctionnalité upload en cours de configuration
                </p>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
                  <h4 className="font-medium text-blue-800 mb-2">🔧 Configuration en cours</h4>
                  <p className="text-sm text-blue-700">
                    L'upload de photos Cloudinary est en cours de configuration. 
                    Cette fonctionnalité sera bientôt disponible.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <AnimatePresence>
                  {photos.map((photo, index) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group"
                    >
                      <img
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      
                      {/* Badge photo principale */}
                      {photo.isPrimary && (
                        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <StarIconSolid className="w-3 h-3" />
                          Principale
                        </div>
                      )}
                      
                      {/* Actions au survol */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        {!photo.isPrimary && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setPrimaryPhoto(photo.id)}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            title="Définir comme photo principale"
                          >
                            <StarIcon className="w-5 h-5" />
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deletePhoto(photo.id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Zone d'ajout temporairement désactivée */}
                {photos.length < 6 && (
                  <div className="h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400">
                    <PlusIcon className="w-12 h-12 mb-2" />
                    <span className="font-medium">Upload en configuration</span>
                    <span className="text-sm">Bientôt disponible</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Informations sur la configuration */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">⚠️ Statut de la fonctionnalité photos</h4>
              <div className="text-sm text-yellow-700">
                <p className="mb-2">La fonctionnalité d'upload de photos est temporairement désactivée pendant la configuration Cloudinary.</p>
                <p><strong>Fonctionnalités disponibles :</strong></p>
                <ul className="list-disc list-inside mt-1">
                  <li>Affichage des photos existantes</li>
                  <li>Suppression de photos</li>
                  <li>Définition de photo principale</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET PRÉFÉRENCES */}
        {activeTab === 'preferences' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Préférences de recherche
            </h2>
            
            <form onSubmit={handleSubmitPreferences(onSubmitPreferences)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Âge minimum
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    {...registerPreferences('minAge', { 
                      valueAsNumber: true,
                      required: "L'âge minimum est requis"
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="18"
                  />
                  {errorsPreferences.minAge && (
                    <p className="text-red-500 text-sm mt-1">{errorsPreferences.minAge.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Âge maximum
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    {...registerPreferences('maxAge', { 
                      valueAsNumber: true,
                      required: "L'âge maximum est requis"
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="35"
                  />
                  {errorsPreferences.maxAge && (
                    <p className="text-red-500 text-sm mt-1">{errorsPreferences.maxAge.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Distance maximum (km)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  {...registerPreferences('maxDistance', { 
                    valueAsNumber: true,
                    required: "La distance maximum est requise"
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="50"
                />
                {errorsPreferences.maxDistance && (
                  <p className="text-red-500 text-sm mt-1">{errorsPreferences.maxDistance.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Genre recherché (optionnel)
                </label>
                <select
                  {...registerPreferences('gender')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Tous les genres</option>
                  <option value="HOMME">Homme</option>
                  <option value="FEMME">Femme</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 font-medium transition-all"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder les préférences'}
              </motion.button>
            </form>
          </div>
        )}

        {/* ONGLET PARAMÈTRES */}
        {activeTab === 'settings' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Paramètres du compte
            </h2>
            
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">
                  Informations du compte
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>Email: {profile?.email}</div>
                  <div>Membre depuis: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('fr-FR') : 'N/A'}</div>
                  <div>Dernière mise à jour: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('fr-FR') : 'N/A'}</div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">
                  Confidentialité
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-3" />
                    <span className="text-sm text-gray-700">
                      Rendre mon profil visible dans les recherches
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-3" />
                    <span className="text-sm text-gray-700">
                      Autoriser les messages de nouveaux utilisateurs
                    </span>
                  </label>
                </div>
              </div>

              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h3 className="font-medium text-red-800 mb-2">
                  Zone de danger
                </h3>
                <p className="text-sm text-red-600 mb-4">
                  Ces actions sont irréversibles. Soyez prudent.
                </p>
                <div className="space-y-2">
                  <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm">
                    Supprimer mon compte
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProfileManager;