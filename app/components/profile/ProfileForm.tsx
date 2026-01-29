'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CldUploadWidget, CldImage } from 'next-cloudinary';
import { motion, AnimatePresence } from 'framer-motion';
import { TrashIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { profileSchema, preferencesSchema, ProfileFormData, PreferencesFormData } from './../../lib/validations/profile';
import { getMaxPhotos } from '@/lib/config/photos';
import { Button, Card, Input, Badge } from '@/components/ui';



interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

interface UserProfile {
  id: string;
  name: string | null;
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
}

const ProfileForm: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  // Calcul du max photos selon le statut premium
  const maxPhotos = getMaxPhotos(isPremium);

  // Form pour le profil
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    setValue: setValueProfile,
    watch: watchProfile,
    formState: { errors: errorsProfile }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  });

  // Form pour les préférences
  const {
    register: registerPreferences,
    handleSubmit: handleSubmitPreferences,
    setValue: setValuePreferences,
    formState: { errors: errorsPreferences }
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema)
  });

  const interests = watchProfile('interests') || [];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile');
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
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      setMessage('Erreur lors du chargement du profil');
    }
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setMessage('Profil sauvegardé avec succès !');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      setMessage('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPreferences = async (data: PreferencesFormData) => {
    try {
      const response = await fetch('/api/profile/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setMessage('Préférences sauvegardées avec succès !');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Erreur sauvegarde préférences');
      }
    } catch (error) {
      setMessage('Erreur sauvegarde préférences');
    }
  };

  const handlePhotoUpload = async (result: any) => {
    try {
      const response = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: result.secure_url })
      });

      if (response.ok) {
        const newPhoto = await response.json();
        setPhotos([...photos, newPhoto]);
        setMessage('Photo ajoutée avec succès !');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Erreur upload photo');
      }
    } catch (error) {
      setMessage('Erreur upload photo');
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return;

    try {
      const response = await fetch(`/api/profile/photos/${photoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPhotos(photos.filter(p => p.id !== photoId));
        setMessage('Photo supprimée avec succès');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erreur lors de la suppression');
      }
    } catch (error) {
      setMessage('Erreur lors de la suppression');
    }
  };

  const setPrimaryPhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/profile/photos/${photoId}`, {
        method: 'PUT'
      });

      if (response.ok) {
        setPhotos(photos.map(p => ({
          ...p,
          isPrimary: p.id === photoId
        })));
        setMessage('Photo principale mise à jour');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erreur mise à jour photo principale');
      }
    } catch (error) {
      setMessage('Erreur mise à jour photo principale');
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

  return (
    <Card className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-heading text-center mb-2">
          Mon Profil
        </h2>
        <p className="text-body text-center">
          Complétez votre profil pour faire de meilleures rencontres
        </p>
      </motion.div>
      
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
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Colonne gauche - Informations personnelles */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-subheading mb-6 flex items-center">
            <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
            Informations personnelles
          </h3>
          
          <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
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
                <Button
                  type="button"
                  variant="default"
                  onClick={addInterest}
                  disabled={interests.length >= 10}
                >
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {interests.map((interest, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge className="badge-primary inline-flex items-center gap-2">
                        {interest}
                        <button
                          type="button"
                          onClick={() => removeInterest(interest)}
                          className="text-primary-500 hover:text-primary-700 transition-colors"
                        >
                          ×
                        </button>
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="spinner-sm mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder le profil'
              )}
            </Button>
          </form>

          {/* Préférences de recherche */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <h3 className="text-subheading mb-6 flex items-center">
              <span className="w-2 h-2 bg-secondary-500 rounded-full mr-3"></span>
              Préférences de recherche
            </h3>
            <form onSubmit={handleSubmitPreferences(onSubmitPreferences)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Âge minimum
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    {...registerPreferences('minAge', { valueAsNumber: true })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    {...registerPreferences('maxAge', { valueAsNumber: true })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                  {...registerPreferences('maxDistance', { valueAsNumber: true })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {errorsPreferences.maxDistance && (
                  <p className="text-red-500 text-sm mt-1">{errorsPreferences.maxDistance.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full bg-secondary-500 hover:bg-secondary-600"
              >
                Sauvegarder les préférences
              </Button>
            </form>
          </motion.div>
        </motion.div>

        {/* Colonne droite - Photos */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-subheading mb-6 flex items-center">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
            Photos ({photos.length}/{maxPhotos})
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <AnimatePresence>
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  <CldImage
                    src={photo.url}
                    alt={`Photo ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  {photo.isPrimary && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <StarIconSolid className="w-3 h-3" />
                      Principale
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!photo.isPrimary && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setPrimaryPhoto(photo.id)}
                        className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        title="Définir comme photo principale"
                      >
                        <StarIcon className="w-4 h-4" />
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deletePhoto(photo.id)}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      title="Supprimer"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {photos.length < 6 && (
            <CldUploadWidget
              uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
              onSuccess={handlePhotoUpload}
              options={{
                maxFiles: 1,
                resourceType: "image",
                maxFileSize: 5000000, // 5MB
                clientAllowedFormats: ["jpg", "jpeg", "png", "gif"]
              }}
            >
              {({ open }) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => open()}
                  className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors text-center"
                >
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-lg font-medium">Ajouter une photo</p>
                    <p className="text-sm">Cliquez pour télécharger</p>
                    <p className="text-xs mt-2">JPG, PNG, GIF • Max 5MB</p>
                  </div>
                </motion.button>
              )}
            </CldUploadWidget>
          )}
        </motion.div>
      </div>
    </Card>
  );
};

export default ProfileForm;