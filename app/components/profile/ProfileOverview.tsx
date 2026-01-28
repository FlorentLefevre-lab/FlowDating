'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
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
  onTabChange?: (tab: TabType) => void;
  onMessage?: (text: string, type: MessageType) => void;
}

const ProfileOverview: React.FC<ProfileOverviewProps> = ({ 
  profile, 
  onTabChange = () => {},
  onMessage = () => {}
}) => {
  const { data: session } = useSession();
  
  // État pour les statistiques
  const [userStats, setUserStats] = useState({
    // Stats totales (pour la page profil)
    totalStats: {
      profileViews: 0,
      likesReceived: 0,
      matchesCount: 0,
      messagesReceived: 0
    },
    // Stats du jour (pour comparaison)
    dailyStats: {
      profileViews: 0,
      likesReceived: 0,
      matchesCount: 0,
      messagesReceived: 0
    }
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Charger les statistiques
  useEffect(() => {
    const loadUserStats = async () => {
      if (!session?.user?.id) return;
      
      try {
        console.log('🔄 Chargement des statistiques flexibles pour le profil...');
        const response = await fetch(`/api/users/${session.user.id}/stats`);
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Stats reçues pour le profil:', {
            totaux: data.totalStats,
            aujourdhui: data.dailyStats
          });
          
          setUserStats({
            totalStats: {
              profileViews: data.totalStats?.profileViews || 0,
              likesReceived: data.totalStats?.likesReceived || 0,
              matchesCount: data.totalStats?.matchesCount || 0,
              messagesReceived: data.totalStats?.messagesReceived || 0
            },
            dailyStats: {
              profileViews: data.dailyStats?.profileViews || 0,
              likesReceived: data.dailyStats?.likesReceived || 0,
              matchesCount: data.dailyStats?.matchesCount || 0,
              messagesReceived: data.dailyStats?.messagesReceived || 0
            }
          });
        } else {
          console.error('❌ Erreur HTTP:', response.status);
        }
      } catch (error) {
        console.error('❌ Erreur chargement stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadUserStats();
    
    // Actualiser les stats toutes les 30 secondes
    const interval = setInterval(loadUserStats, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

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

          {/* Statistiques du profil - TOTAUX */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                📊 Mes statistiques totales
              </h3>
              {isLoadingStats && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Chargement...</span>
                </div>
              )}
            </div>

            {/* Grille des statistiques */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Photos */}
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200 text-center transition-all hover:shadow-md cursor-pointer hover:border-pink-300"
                onClick={() => {
                  console.log('Clic sur stat photos');
                  try {
                    onTabChange('photos');
                  } catch (error) {
                    console.error('Erreur onTabChange photos:', error);
                  }
                }}
              >
                <div className="flex items-center justify-center mb-3">
                  <PhotoIcon className="w-8 h-8 text-pink-600" />
                </div>
                <div className="text-3xl font-bold text-pink-700 mb-2">
                  {profile.photos?.length || 0}
                </div>
                <div className="text-sm text-pink-600 font-medium">Photos</div>
                <div className="text-xs text-pink-500 mt-1">sur 6 max</div>
              </motion.div>

              {/* Vues totales */}
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 text-center transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-center mb-3">
                  <EyeIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-700 mb-2">
                  {isLoadingStats ? '...' : userStats.totalStats.profileViews}
                </div>
                <div className="text-sm text-blue-600 font-medium">Vues</div>
                <div className="text-xs text-blue-500 mt-1">total reçues</div>
              </motion.div>

              {/* Likes totaux */}
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 text-center transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-center mb-3">
                  <HeartIcon className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-purple-700 mb-2">
                  {isLoadingStats ? '...' : userStats.totalStats.likesReceived}
                </div>
                <div className="text-sm text-purple-600 font-medium">Likes</div>
                <div className="text-xs text-purple-500 mt-1">total reçus</div>
              </motion.div>

              {/* Matches totaux */}
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 text-center transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-center mb-3">
                  <CheckIcon className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-700 mb-2">
                  {isLoadingStats ? '...' : userStats.totalStats.matchesCount}
                </div>
                <div className="text-sm text-green-600 font-medium">Matches</div>
                <div className="text-xs text-green-500 mt-1">total obtenus</div>
              </motion.div>
            </div>

            {/* Message informatif avec comparaison */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    📊 Statistiques totales
                  </p>
                  <p className="text-xs text-gray-500">
                    Depuis la création de votre profil
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    📅 Aujourd'hui : {userStats.dailyStats.profileViews} vues, {userStats.dailyStats.likesReceived} likes, {userStats.dailyStats.matchesCount} matches
                  </p>
                  <p className="text-xs text-gray-500">
                    Activité du jour
                  </p>
                </div>
              </div>
            </div>
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
              {/* Préférences */}
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  console.log('Clic sur action Mes préférences');
                  try {
                    onTabChange('preferences');
                  } catch (error) {
                    console.error('Erreur action Mes préférences:', error);
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-red-50 hover:bg-red-100 transition-all group border border-red-100"
              >
                <div className="flex items-center gap-3">
                  <HeartIcon className="w-5 h-5 text-red-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      Mes préférences
                    </div>
                    <div className="text-xs text-gray-500">
                      Critères de recherche
                    </div>
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors" />
              </motion.button>

              {/* Infos personnelles */}
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  console.log('Clic sur action Infos personnelles');
                  try {
                    onTabChange('personal');
                  } catch (error) {
                    console.error('Erreur action Infos personnelles:', error);
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-all group border border-purple-100"
              >
                <div className="flex items-center gap-3">
                  <IdentificationIcon className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      Infos personnelles
                    </div>
                    <div className="text-xs text-gray-500">
                      Genre, profession, etc.
                    </div>
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
              </motion.button>

              {/* Paramètres */}
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  console.log('Clic sur action Paramètres');
                  try {
                    onTabChange('settings');
                  } catch (error) {
                    console.error('Erreur action Paramètres:', error);
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all group border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <CogIcon className="w-5 h-5 text-gray-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      Paramètres
                    </div>
                    <div className="text-xs text-gray-500">
                      Confidentialité, notifications
                    </div>
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverview;