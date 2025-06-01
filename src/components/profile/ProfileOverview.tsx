// components/profile/ProfileOverview.tsx
'use client';
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PencilIcon, 
  PhotoIcon, 
  HeartIcon,
  MapPinIcon,
  BriefcaseIcon,
  CalendarIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface ProfileOverviewProps {
  profile: any;
  photos: any[];
  onTabChange: (tab: string) => void;
}

const ProfileOverview: React.FC<ProfileOverviewProps> = ({ 
  profile, 
  photos, 
  onTabChange 
}) => {
  // Debug : vérifier les données reçues
  useEffect(() => {
    console.log('🔍 ProfileOverview - Données reçues:');
    console.log('- Profile:', profile);
    console.log('- Photos:', photos);
    console.log('- Photo principale:', photos?.find(p => p.isPrimary));
  }, [profile, photos]);

  if (!profile) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale - Informations du profil */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section Informations de base */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6 border border-pink-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Informations de base
              </h2>
              <button
                onClick={() => onTabChange('edit')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-pink-600 bg-white rounded-lg hover:bg-pink-50 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                Modifier
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nom</label>
                <p className="text-gray-800 font-medium">
                  {profile.name || 'Non renseigné'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Âge</label>
                <p className="text-gray-800 font-medium">
                  {profile.age ? `${profile.age} ans` : 'Non renseigné'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Localisation</label>
                <p className="text-gray-800 font-medium flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4 text-gray-500" />
                  {profile.location || 'Non renseignée'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Profession</label>
                <p className="text-gray-800 font-medium flex items-center gap-1">
                  <BriefcaseIcon className="w-4 h-4 text-gray-500" />
                  {profile.profession || 'Non renseignée'}
                </p>
              </div>
            </div>
            
            {profile.bio && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-600">Bio</label>
                <p className="text-gray-800 mt-1 leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}
          </motion.div>

          {/* Section Informations personnelles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Informations personnelles
              </h2>
              <button
                onClick={() => onTabChange('personal')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-pink-600 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                Modifier
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Genre</label>
                <p className="text-gray-800 font-medium">
                  {profile.gender || 'Non renseigné'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Statut matrimonial</label>
                <p className="text-gray-800 font-medium">
                  {profile.maritalStatus || 'Non renseigné'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Signe zodiacal</label>
                <p className="text-gray-800 font-medium">
                  {profile.zodiacSign || 'Non renseigné'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Régime alimentaire</label>
                <p className="text-gray-800 font-medium">
                  {profile.dietType || 'Non renseigné'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Section Centres d'intérêt */}
          {profile.interests && profile.interests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Centres d'intérêt
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 rounded-full text-sm font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Colonne droite - Photos et actions rapides */}
        <div className="space-y-6">
          {/* Section Photos */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Photos ({photos?.length || 0})
              </h2>
              <button
                onClick={() => onTabChange('photos')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-pink-600 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
              >
                <PhotoIcon className="w-4 h-4" />
                Gérer
              </button>
            </div>
            
            {photos && photos.length > 0 ? (
              <div>
                {/* Photo principale en grand */}
                {(() => {
                  const mainPhoto = photos.find(p => p.isPrimary) || photos[0];
                  return mainPhoto ? (
                    <div className="mb-4">
                      <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
                        <img
                          src={mainPhoto.url}
                          alt="Photo principale"
                          className="w-full h-full object-cover"
                        />
                        {mainPhoto.isPrimary && (
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <StarIcon className="w-3 h-3" />
                            Principale
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Miniatures des autres photos */}
                {photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {photos.slice(0, 4).map((photo, index) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative"
                      >
                        <img
                          src={photo.url}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {photo.isPrimary && (
                          <div className="absolute top-1 left-1 bg-yellow-400 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">
                            ★
                          </div>
                        )}
                      </div>
                    ))}
                    {photos.length > 4 && (
                      <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-500 font-medium text-sm">
                          +{photos.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <PhotoIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Aucune photo ajoutée</p>
                <button
                  onClick={() => onTabChange('photos')}
                  className="mt-2 text-pink-600 hover:text-pink-700 font-medium"
                >
                  Ajouter des photos
                </button>
              </div>
            )}
          </motion.div>

          {/* Actions rapides */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Actions rapides
            </h2>
            
            <div className="space-y-3">
              <button
                onClick={() => onTabChange('preferences')}
                className="w-full flex items-center gap-3 p-3 text-left bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
              >
                <HeartIcon className="w-5 h-5 text-pink-600" />
                <span className="font-medium text-gray-800">
                  Gérer les préférences
                </span>
              </button>
              
              <button
                onClick={() => onTabChange('photos')}
                className="w-full flex items-center gap-3 p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <PhotoIcon className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-800">
                  Ajouter des photos
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverview;