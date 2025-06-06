'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  PencilIcon,
  PhotoIcon,
  HeartIcon,
  IdentificationIcon,
  CogIcon,
  UserIcon,
  MapPinIcon,
  BriefcaseIcon,
  CalendarIcon,
  TagIcon,
  StarIcon,
  EyeIcon,
  CheckIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

// Types simplifiés pour éviter les erreurs d'import
interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  alt?: string;
  createdAt: string;
}

interface UserProfile {
  id: string;
  email?: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  profession?: string;
  interests?: string[];
  photos?: Photo[];
  gender?: string;
  createdAt?: string;
  updatedAt?: string;
}

type TabType = 'overview' | 'edit' | 'personal' | 'photos' | 'preferences' | 'settings';
type MessageType = 'success' | 'error' | 'warning' | 'info';

interface ProfileOverviewProps {
  profile: UserProfile | null;
  onTabChange?: (tab: TabType) => void;  // ✅ Optionnel avec valeur par défaut
  onMessage?: (text: string, type: MessageType) => void;  // ✅ Optionnel
}

const ProfileOverview: React.FC<ProfileOverviewProps> = ({ 
  profile, 
  onTabChange = () => {}, // ✅ Fonction par défaut pour éviter les erreurs
  onMessage = () => {}    // ✅ Fonction par défaut pour éviter les erreurs
}) => {
  if (!profile) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  const mainPhoto = profile.photos?.find(p => p.isPrimary) || profile.photos?.[0];
  const completionPercentage = Math.round(
    ([
      profile.name, 
      profile.age, 
      profile.bio, 
      profile.location, 
      profile.interests?.length && profile.interests.length > 0, 
      profile.photos?.length && profile.photos.length > 0,
      profile.gender,
      profile.profession
    ].filter(Boolean).length / 8) * 100
  );

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Colonne principale - Informations du profil */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Carte principale du profil */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-pink-50 via-white to-purple-50 rounded-2xl p-6 border border-pink-100 shadow-lg"
          >
            <div className="flex items-start gap-6">
              {/* Photo de profil */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex-shrink-0 relative"
              >
                {mainPhoto ? (
                  <div className="relative">
                    <img
                      src={mainPhoto.url}
                      alt="Photo de profil"
                      className="w-24 h-24 rounded-xl object-cover shadow-lg"
                      onError={(e) => {
                        console.error('Erreur chargement image:', mainPhoto.url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {mainPhoto.isPrimary && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-white rounded-full p-1">
                        <StarIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center shadow-lg">
                    <UserIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                {/* Badge de complétion */}
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-gray-200">
                  <div className="text-xs font-bold text-pink-600">
                    {completionPercentage}%
                  </div>
                </div>
              </motion.div>
              
              {/* Informations principales */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {profile.name || (
                      <span className="text-gray-400 italic">Nom non défini</span>
                    )}
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      console.log('Clic sur modifier profil');
                      try {
                        onTabChange('edit');
                      } catch (error) {
                        console.error('Erreur onTabChange:', error);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-pink-600 bg-white rounded-lg hover:bg-pink-50 transition-all shadow-sm border border-pink-200"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Modifier
                  </motion.button>
                </div>
                
                {/* Informations secondaires */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  {profile.age && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-pink-500" />
                      <span>{profile.age} ans</span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-blue-500" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.profession && (
                    <div className="flex items-center gap-2">
                      <BriefcaseIcon className="w-4 h-4 text-green-500" />
                      <span>{profile.profession}</span>
                    </div>
                  )}
                </div>
                
                {/* Bio */}
                {profile.bio ? (
                  <p className="text-gray-700 leading-relaxed bg-white/50 rounded-lg p-3 border border-gray-100">
                    {profile.bio}
                  </p>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 italic text-center">
                      Aucune bio définie. 
                      <button 
                        onClick={() => {
                          console.log('Clic sur ajouter bio');
                          try {
                            onTabChange('edit');
                          } catch (error) {
                            console.error('Erreur onTabChange bio:', error);
                          }
                        }}
                        className="text-pink-500 hover:text-pink-600 ml-1"
                      >
                        Ajoutez-en une !
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Centres d'intérêt */}
            {profile.interests && profile.interests.length > 0 ? (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-purple-500" />
                    Centres d'intérêt ({profile.interests.length})
                  </h3>
                  <button
                    onClick={() => {
                      console.log('Clic sur modifier intérêts');
                      try {
                        onTabChange('personal');
                      } catch (error) {
                        console.error('Erreur onTabChange intérêts:', error);
                      }
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    Modifier
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.slice(0, 8).map((interest, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-sm font-medium shadow-sm"
                    >
                      {interest}
                    </motion.span>
                  ))}
                  {profile.interests.length > 8 && (
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm">
                      +{profile.interests.length - 8} autres
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-200 text-center">
                  <TagIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    Aucun centre d'intérêt défini.
                  </p>
                  <button
                    onClick={() => {
                      console.log('Clic sur ajouter intérêts');
                      try {
                        onTabChange('personal');
                      } catch (error) {
                        console.error('Erreur onTabChange ajouter intérêts:', error);
                      }
                    }}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium mt-1"
                  >
                    Ajoutez vos passions !
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Statistiques du profil */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { 
                label: 'Photos', 
                value: profile.photos?.length || 0, 
                max: 6, 
                color: 'pink',
                icon: PhotoIcon,
                action: () => {
                  console.log('Clic sur stat photos');
                  try {
                    onTabChange('photos');
                  } catch (error) {
                    console.error('Erreur onTabChange photos:', error);
                  }
                }
              },
              { 
                label: 'Vues', 
                value: 127, 
                color: 'blue',
                icon: EyeIcon 
              },
              { 
                label: 'Likes', 
                value: 23, 
                color: 'purple',
                icon: HeartIcon 
              },
              { 
                label: 'Matches', 
                value: 8, 
                color: 'green',
                icon: CheckIcon 
              }
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center transition-all hover:shadow-md ${
                    stat.action ? 'cursor-pointer hover:border-pink-300' : ''
                  }`}
                  onClick={() => {
                    if (stat.action) {
                      console.log(`Clic sur stat ${stat.label}`);
                      try {
                        stat.action();
                      } catch (error) {
                        console.error(`Erreur stat ${stat.label}:`, error);
                      }
                    }
                  }}
                >
                  <div className="flex items-center justify-center mb-2">
                    <Icon className={`w-6 h-6 text-${stat.color}-500`} />
                  </div>
                  <div className={`text-2xl font-bold text-${stat.color}-600 mb-1`}>
                    {stat.value}{stat.max && `/${stat.max}`}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Colonne droite - Photos et actions */}
        <div className="space-y-6">
          
          {/* Section Photos */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PhotoIcon className="w-5 h-5 text-pink-500" />
                Photos ({profile.photos?.length || 0}/6)
              </h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  console.log('Clic sur gérer photos');
                  try {
                    onTabChange('photos');
                  } catch (error) {
                    console.error('Erreur onTabChange gérer photos:', error);
                  }
                }}
                className="text-sm text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg hover:bg-pink-100 transition-colors"
              >
                Gérer
              </motion.button>
            </div>
            
            {profile.photos && profile.photos.length > 0 ? (
              <div>
                {/* Photo principale */}
                {mainPhoto && (
                  <div className="mb-4">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative shadow-lg">
                      <img
                        src={mainPhoto.url}
                        alt="Photo principale"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Erreur chargement photo principale:', mainPhoto.url);
                        }}
                      />
                      {mainPhoto.isPrimary && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                          <StarIcon className="w-3 h-3" />
                          Principale
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Miniatures */}
                {profile.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {profile.photos.slice(0, 4).map((photo, index) => (
                      <motion.div
                        key={photo.id}
                        whileHover={{ scale: 1.05 }}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative shadow-sm"
                      >
                        <img
                          src={photo.url}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error(`Erreur chargement photo ${index + 1}:`, photo.url);
                          }}
                        />
                        {photo.isPrimary && (
                          <div className="absolute top-1 left-1 bg-yellow-400 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">
                            ★
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {profile.photos.length > 4 && (
                      <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center shadow-sm">
                        <span className="text-gray-500 font-medium text-sm">
                          +{profile.photos.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <PhotoIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Aucune photo
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Ajoutez des photos pour rendre votre profil plus attractif
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log('Clic sur ajouter photos');
                    try {
                      onTabChange('photos');
                    } catch (error) {
                      console.error('Erreur onTabChange ajouter photos:', error);
                    }
                  }}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                >
                  Ajouter des photos
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* Actions rapides */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Actions rapides
            </h2>
            
            <div className="space-y-3">
              {[
                { 
                  label: 'Mes préférences', 
                  tab: 'preferences', 
                  icon: HeartIcon, 
                  color: 'red',
                  description: 'Critères de recherche'
                },
                { 
                  label: 'Infos personnelles', 
                  tab: 'personal', 
                  icon: IdentificationIcon, 
                  color: 'purple',
                  description: 'Genre, profession, etc.'
                },
                { 
                  label: 'Paramètres', 
                  tab: 'settings', 
                  icon: CogIcon, 
                  color: 'gray',
                  description: 'Confidentialité, notifications'
                }
              ].map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      console.log(`Clic sur action ${action.label}`);
                      try {
                        onTabChange(action.tab as TabType);
                      } catch (error) {
                        console.error(`Erreur action ${action.label}:`, error);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-lg bg-${action.color}-50 hover:bg-${action.color}-100 transition-all group border border-${action.color}-100`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 text-${action.color}-600`} />
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {action.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {action.description}
                        </div>
                      </div>
                    </div>
                    <ChevronRightIcon className={`w-4 h-4 text-${action.color}-400 group-hover:text-${action.color}-600 transition-colors`} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverview;