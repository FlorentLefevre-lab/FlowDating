// src/app/discover/page.tsx - VERSION GRILLE AVEC FILTRES
'use client';
import { SimpleLoading, SimpleError, Button, Card, PhotoCarousel, Badge, Input } from '@/components/ui';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Star, MapPin, Briefcase, Eye, RefreshCw, SlidersHorizontal, Settings, ChevronDown, ChevronUp, Search, Loader2 } from 'lucide-react';

// ================================
// TYPES
// ================================

interface Profile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  location?: string;
  profession?: string;
  interests?: string[];
  photos?: { id?: string; url: string; isPrimary?: boolean }[];
  compatibility?: number;
  isOnline?: boolean;
  role?: string;
  gender?: string;
  height?: number;
  bodyType?: string;
  eyeColor?: string;
  hairColor?: string;
  distance?: number; // Distance en km depuis l'utilisateur connecté
}

// ================================
// COMPOSANT MODAL PROFIL
// ================================

const ProfileModal = ({
  profile,
  onClose,
  onAction
}: {
  profile: Profile;
  onClose: () => void;
  onAction: (action: string) => void;
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photos Carousel */}
        <div className="relative">
          <PhotoCarousel
            photos={profile.photos || []}
            height="h-80"
            objectFit="cover"
            counterPosition="top-left"
          />

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-30 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>

          {/* Badge Admin/Moderator */}
          {(profile.role === 'ADMIN' || profile.role === 'MODERATOR') && (
            <div className="absolute top-3 left-14 z-20">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                profile.role === 'ADMIN'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
              }`}>
                {profile.role === 'ADMIN' ? '👑 Admin' : '🛡️ Mod'}
              </span>
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 320px - 80px)' }}>
          {/* Nom et infos principales */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {profile.name}, {profile.age}
              </h2>
              {profile.isOnline && (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  En ligne
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-gray-600 text-sm">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-pink-500" />
                  {profile.location}
                  {profile.distance !== undefined && (
                    <span className="text-pink-600 font-medium">
                      ({profile.distance} km)
                    </span>
                  )}
                </span>
              )}
              {profile.profession && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4 text-pink-500" />
                  {profile.profession}
                </span>
              )}
            </div>

            {profile.compatibility && (
              <div className="mt-2">
                <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                  ✨ {profile.compatibility}% compatible
                </Badge>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                À propos
              </h3>
              <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Caractéristiques */}
          {(profile.height || profile.bodyType || profile.eyeColor || profile.hairColor) && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Caractéristiques
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.height && (
                  <Badge variant="secondary">{profile.height} cm</Badge>
                )}
                {profile.bodyType && (
                  <Badge variant="secondary">{profile.bodyType}</Badge>
                )}
                {profile.eyeColor && (
                  <Badge variant="secondary">Yeux {profile.eyeColor}</Badge>
                )}
                {profile.hairColor && (
                  <Badge variant="secondary">Cheveux {profile.hairColor}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Intérêts */}
          {profile.interests && profile.interests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Centres d'intérêt
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <Badge key={index} className="bg-pink-100 text-pink-700">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-gray-50 flex justify-center gap-4">
          <Button
            onClick={() => onAction('dislike')}
            variant="outline"
            size="lg"
            className="w-16 h-16 rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-100"
          >
            <span className="text-2xl">👎</span>
          </Button>

          <Button
            onClick={() => onAction('super_like')}
            variant="outline"
            size="lg"
            className="w-16 h-16 rounded-full border-2 border-blue-400 hover:border-blue-500 hover:bg-blue-50"
          >
            <Star className="w-7 h-7 text-blue-500" />
          </Button>

          <Button
            onClick={() => onAction('like')}
            variant="default"
            size="lg"
            className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
          >
            <Heart className="w-7 h-7" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// ================================
// COMPOSANT CARTE PROFIL
// ================================

const ProfileCard = ({
  profile,
  onAction,
  onViewProfile,
  isProcessing
}: {
  profile: Profile;
  onAction: (action: string) => void;
  onViewProfile: () => void;
  isProcessing: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
        isProcessing ? 'opacity-50 pointer-events-none' : 'hover:shadow-xl'
      }`}
    >
      {/* Photo avec carousel */}
      <div className="relative cursor-pointer group" onClick={onViewProfile}>
        <PhotoCarousel
          photos={profile.photos || []}
          height="h-64"
          objectFit="cover"
          showArrows={(profile.photos?.length || 0) > 1}
          showIndicators={false}
          counterPosition="top-left"
        />

        {/* Overlay gradient - z-20 pour être au-dessus du carousel */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-20" />

        {/* Badge Admin/Moderator */}
        {(profile.role === 'ADMIN' || profile.role === 'MODERATOR') && (
          <div className="absolute top-2 left-2 z-30">
            <span className={`px-2 py-1 rounded-full text-xs font-bold shadow ${
              profile.role === 'ADMIN'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
            }`}>
              {profile.role === 'ADMIN' ? '👑' : '🛡️'}
            </span>
          </div>
        )}

        {/* Online badge */}
        {profile.isOnline && (
          <div className="absolute top-2 right-2 z-30">
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              En ligne
            </span>
          </div>
        )}

        {/* Infos sur la photo - z-30 pour être au-dessus du gradient */}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white z-30 pointer-events-none">
          <h3 className="text-lg font-bold truncate drop-shadow-lg">
            {profile.name}, {profile.age}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            {profile.location && (
              <span className="flex items-center gap-1 drop-shadow-md">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{profile.location}</span>
                {profile.distance !== undefined && (
                  <span className="text-pink-300 font-medium whitespace-nowrap">
                    • {profile.distance} km
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Bouton voir profil au hover - pointer-events-none sur le fond pour laisser passer les clics aux flèches */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-25 pointer-events-none">
          <div className="absolute inset-0 bg-black/30" />
          <span className="relative bg-white text-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 pointer-events-auto cursor-pointer">
            <Eye className="w-4 h-4" />
            Voir le profil
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-3">
        {/* Profession */}
        {profile.profession && (
          <p className="text-gray-600 text-sm mb-2 flex items-center gap-1 truncate">
            <Briefcase className="w-3 h-3 text-pink-500 flex-shrink-0" />
            {profile.profession}
          </p>
        )}

        {/* Compatibilité */}
        {profile.compatibility && (
          <div className="mb-3">
            <span className="text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-2 py-1 rounded-full">
              ✨ {profile.compatibility}% compatible
            </span>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => onAction('dislike')}
            variant="ghost"
            size="sm"
            className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200"
            disabled={isProcessing}
          >
            <span className="text-xl">👎</span>
          </Button>

          <Button
            onClick={() => onAction('super_like')}
            variant="ghost"
            size="sm"
            className="w-12 h-12 rounded-full bg-blue-100 hover:bg-blue-200"
            disabled={isProcessing}
          >
            <Star className="w-5 h-5 text-blue-500" />
          </Button>

          <Button
            onClick={() => onAction('like')}
            variant="ghost"
            size="sm"
            className="w-12 h-12 rounded-full bg-pink-100 hover:bg-pink-200"
            disabled={isProcessing}
          >
            <Heart className="w-5 h-5 text-pink-500" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// ================================
// COMPOSANT PRINCIPAL
// ================================

// Liste des villes françaises principales
const FRENCH_CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
  'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne',
  'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Clermont-Ferrand',
  'Le Mans', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens', 'Limoges', 'Perpignan',
  'Metz', 'Besançon', 'Orléans', 'Rouen', 'Mulhouse', 'Caen', 'Nancy'
];

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [userPreferences, setUserPreferences] = useState<any>(null);

  // États des filtres
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [distanceFilter, setDistanceFilter] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  // Ref pour le debounce du slider de distance
  const distanceDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ================================
  // CHARGEMENT DES PRÉFÉRENCES
  // ================================

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/user-preferences');
      if (response.ok) {
        const prefs = await response.json();
        setUserPreferences(prefs);
        return prefs;
      }
    } catch (err) {
      console.warn('Impossible de charger les préférences:', err);
    }
    return null;
  };

  // ================================
  // CHARGEMENT DES PROFILS
  // ================================

  const loadProfiles = useCallback(async (prefs?: any, distance?: number, showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setIsFiltering(true);
      }
      setError(null);

      const preferences = prefs || userPreferences;
      const params = new URLSearchParams();

      if (preferences) {
        if (preferences.minAge) params.set('minAge', preferences.minAge.toString());
        if (preferences.maxAge) params.set('maxAge', preferences.maxAge.toString());
        if (preferences.gender && preferences.gender !== 'ALL') {
          params.set('gender', preferences.gender);
        }
      }

      // Utiliser la distance du filtre local ou celle des préférences
      const maxDistance = distance ?? distanceFilter;
      params.set('maxDistance', maxDistance.toString());

      const queryString = params.toString();
      const url = queryString ? `/api/discover?${queryString}` : '/api/discover';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Extraction des profils (adaptation au format API)
      let extractedProfiles = [];
      if (data.users && Array.isArray(data.users)) {
        extractedProfiles = data.users;
      } else if (data.profiles && Array.isArray(data.profiles)) {
        extractedProfiles = data.profiles;
      } else if (Array.isArray(data)) {
        extractedProfiles = data;
      }

      // Récupérer la localisation de l'utilisateur depuis les métadonnées
      if (data.meta?.userLocation) {
        setUserLocation(data.meta.userLocation);
      }

      // Normalisation
      const normalizedProfiles = extractedProfiles.map((profile: any) => ({
        id: profile.id,
        name: profile.name || 'Nom inconnu',
        age: profile.age || 25,
        bio: profile.bio,
        location: profile.location,
        profession: profile.profession,
        interests: profile.interests || [],
        photos: profile.photos || [],
        compatibility: profile.compatibility || profile.compatibilityScore || 50,
        isOnline: profile.isOnline || false,
        role: profile.role,
        gender: profile.gender,
        height: profile.height,
        bodyType: profile.bodyType,
        eyeColor: profile.eyeColor,
        hairColor: profile.hairColor,
        distance: profile.distance, // Distance en km depuis l'API
      }));

      setProfiles(normalizedProfiles);

    } catch (err: any) {
      console.error('Erreur chargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  }, [userPreferences, distanceFilter]);

  // ================================
  // ACTIONS
  // ================================

  const handleAction = async (profileId: string, action: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    setProcessingIds(prev => new Set(prev).add(profileId));

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: profileId,
          action
        })
      });

      const result = await response.json();

      if (result.isMatch) {
        alert(`🎉 Match avec ${profile.name} !`);
        window.dispatchEvent(new Event('match-updated'));
      }

      // Retirer le profil de la liste
      setProfiles(prev => prev.filter(p => p.id !== profileId));

      // Fermer la modal si ouverte
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(null);
      }

    } catch (error) {
      console.error('Erreur action:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  };

  // Chargement initial
  useEffect(() => {
    const init = async () => {
      const prefs = await loadPreferences();
      if (prefs?.maxDistance) {
        setDistanceFilter(prefs.maxDistance);
      }
      await loadProfiles(prefs, prefs?.maxDistance, true);
    };
    init();
  }, []);

  // Recharger les profils quand la distance change (avec debounce)
  const handleDistanceChange = (newDistance: number) => {
    setDistanceFilter(newDistance);

    // Annuler le précédent timeout
    if (distanceDebounceRef.current) {
      clearTimeout(distanceDebounceRef.current);
    }

    // Déclencher le rechargement après 500ms d'inactivité
    distanceDebounceRef.current = setTimeout(() => {
      loadProfiles(userPreferences, newDistance, false);
    }, 500);
  };

  // Cleanup du timeout au démontage
  useEffect(() => {
    return () => {
      if (distanceDebounceRef.current) {
        clearTimeout(distanceDebounceRef.current);
      }
    };
  }, []);

  // Filtrage local des profils
  const filteredProfiles = useMemo(() => {
    let result = [...profiles];

    // Filtre par recherche (nom, profession)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.profession?.toLowerCase().includes(query) ||
        p.location?.toLowerCase().includes(query)
      );
    }

    // Filtre par localisation
    if (locationFilter) {
      result = result.filter(p =>
        p.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    return result;
  }, [profiles, searchQuery, locationFilter]);

  // Reset des filtres
  const resetFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    const defaultDistance = userPreferences?.maxDistance || 100;
    setDistanceFilter(defaultDistance);
    // Recharger les profils avec les paramètres par défaut
    loadProfiles(userPreferences, defaultDistance, false);
  };

  // ================================
  // RENDU
  // ================================

  if (loading) {
    return <SimpleLoading message="Chargement des profils..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md mx-4 p-6 text-center">
          <h2 className="text-xl font-bold mb-4">Erreur</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => loadProfiles()} variant="default">
            Réessayer
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Ligne principale */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                Découvrir
              </h1>
              <p className="text-gray-500 text-sm">
                {filteredProfiles.length} profil{filteredProfiles.length > 1 ? 's' : ''}
                {filteredProfiles.length !== profiles.length && ` (sur ${profiles.length})`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtres
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button
                onClick={() => loadProfiles()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Barre de recherche rapide */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par nom, profession, ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Button
              onClick={() => window.location.href = '/profile?tab=preferences'}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 whitespace-nowrap"
              title="Modifier mes préférences de recherche"
            >
              <Settings className="w-4 h-4" />
              Préférences
            </Button>
          </div>

          {/* Panneau de filtres avancés */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-2 border-t mt-3 space-y-4">
                  {/* Filtre par ville */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Zone géographique
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={locationFilter === '' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLocationFilter('')}
                        className="text-xs"
                      >
                        Toutes
                      </Button>
                      {FRENCH_CITIES.slice(0, 12).map(city => (
                        <Button
                          key={city}
                          variant={locationFilter === city ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setLocationFilter(locationFilter === city ? '' : city)}
                          className="text-xs"
                        >
                          {city}
                        </Button>
                      ))}
                    </div>
                    {/* Input personnalisé pour autre ville */}
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Ou saisissez une ville..."
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="max-w-xs h-9 text-sm"
                      />
                      {locationFilter && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocationFilter('')}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Filtre par distance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distance maximale : <span className="text-pink-600 font-bold">{distanceFilter} km</span>
                      {userLocation && (
                        <span className="text-gray-500 font-normal ml-2">
                          depuis <span className="text-pink-600">{userLocation}</span>
                        </span>
                      )}
                      {isFiltering && (
                        <Loader2 className="inline-block w-4 h-4 ml-2 animate-spin text-pink-500" />
                      )}
                    </label>
                    {!userLocation && (
                      <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Définissez votre ville dans votre profil pour activer le filtrage par distance
                      </p>
                    )}
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={distanceFilter}
                      onChange={(e) => handleDistanceChange(Number(e.target.value))}
                      className="w-full max-w-md h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                      disabled={!userLocation}
                    />
                    <div className="flex justify-between text-xs text-gray-500 max-w-md">
                      <span>10 km</span>
                      <span>100 km</span>
                      <span>250 km</span>
                      <span>500 km</span>
                    </div>
                  </div>

                  {/* Actions filtres */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-sm text-gray-500">
                      {filteredProfiles.length} résultat{filteredProfiles.length > 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="text-gray-600"
                      >
                        Réinitialiser
                      </Button>
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={() => window.location.href = '/profile?tab=preferences'}
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Plus de critères
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {profiles.length === 0 ? (
          <Card className="p-8 text-center max-w-md mx-auto">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Aucun profil disponible
            </h2>
            <p className="text-gray-600 mb-6">
              Revenez plus tard ou modifiez vos critères de recherche.
            </p>
            <div className="space-y-3">
              <Button onClick={() => loadProfiles()} variant="gradient" className="w-full">
                🔄 Vérifier les nouveaux profils
              </Button>
              <Button
                onClick={() => window.location.href = '/profile?tab=preferences'}
                variant="outline"
                className="w-full"
              >
                ⚙️ Modifier mes préférences
              </Button>
            </div>
          </Card>
        ) : filteredProfiles.length === 0 ? (
          <Card className="p-8 text-center max-w-md mx-auto">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Aucun résultat
            </h2>
            <p className="text-gray-600 mb-6">
              Aucun profil ne correspond à vos filtres actuels.
            </p>
            <div className="space-y-3">
              <Button onClick={resetFilters} variant="gradient" className="w-full">
                🔄 Réinitialiser les filtres
              </Button>
              <Button
                onClick={() => window.location.href = '/profile?tab=preferences'}
                variant="outline"
                className="w-full"
              >
                ⚙️ Modifier mes préférences
              </Button>
            </div>
          </Card>
        ) : (
          <div className="relative">
            {/* Overlay de chargement pendant le filtrage */}
            {isFiltering && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-start justify-center pt-20">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg">
                  <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                  <span className="text-gray-600">Mise à jour...</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence>
                {filteredProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onAction={(action) => handleAction(profile.id, action)}
                    onViewProfile={() => setSelectedProfile(profile)}
                    isProcessing={processingIds.has(profile.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Modal profil */}
      <AnimatePresence>
        {selectedProfile && (
          <ProfileModal
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            onAction={(action) => handleAction(selectedProfile.id, action)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
