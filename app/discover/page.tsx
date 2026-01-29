// src/app/discover/page.tsx - VERSION AVEC FILTRAGE PAR PRÉFÉRENCES
'use client';
import { SimpleLoading, SimpleError, Button, Card } from '@/components/ui';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Enums valides pour le genre
const validGenders = ['MALE', 'FEMALE', 'OTHER', 'NON_BINARY', 'ALL'];

// ================================
// VERSION AVEC PRÉFÉRENCES UTILISATEUR
// ================================

export default function DiscoverPageSimple() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);

  const currentProfile = profiles[currentIndex];

  // ================================
  // CHARGEMENT DES PRÉFÉRENCES
  // ================================

  const loadPreferences = async () => {
    try {
      console.log('⚙️ Chargement des préférences utilisateur...');
      const response = await fetch('/api/user-preferences');

      if (response.ok) {
        const prefs = await response.json();
        console.log('✅ Préférences chargées:', prefs);
        setUserPreferences(prefs);
        return prefs;
      }
    } catch (err) {
      console.warn('⚠️ Impossible de charger les préférences:', err);
    }
    return null;
  };

  // ================================
  // CHARGEMENT DES PROFILS AVEC FILTRES
  // ================================

  const loadProfiles = async (prefs?: any) => {
    try {
      setLoading(true);
      setError(null);

      // Utiliser les préférences passées ou celles en state
      const preferences = prefs || userPreferences;

      // Construire les query params selon les préférences
      const params = new URLSearchParams();

      if (preferences) {
        if (preferences.minAge) params.set('minAge', preferences.minAge.toString());
        if (preferences.maxAge) params.set('maxAge', preferences.maxAge.toString());
        if (preferences.maxDistance) params.set('maxDistance', preferences.maxDistance.toString());

        // Ajouter le filtre gender (déjà en enum anglais)
        if (preferences.gender && preferences.gender !== 'ALL') {
          params.set('gender', preferences.gender);
          console.log(`🎯 Filtre gender: ${preferences.gender}`);
        }
      }

      const queryString = params.toString();
      const url = queryString ? `/api/discover?${queryString}` : '/api/discover';

      console.log('🔍 Chargement des profils avec URL:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      console.log('📊 DONNÉES BRUTES REÇUES:', data);
      console.log('📊 Type de data:', typeof data);
      console.log('📊 Clés disponibles:', Object.keys(data));

      // ✅ ADAPTATION AUTOMATIQUE AU FORMAT API
      let extractedProfiles = [];

      // L'API optimisée retourne { users: [...] }
      if (data.users && Array.isArray(data.users)) {
        extractedProfiles = data.users;
        console.log('✅ Trouvé data.users:', extractedProfiles.length);
      }
      // Ancien format { profiles: [...] }
      else if (data.profiles && Array.isArray(data.profiles)) {
        extractedProfiles = data.profiles;
        console.log('✅ Trouvé data.profiles:', extractedProfiles.length);
      }
      // Format direct array
      else if (Array.isArray(data)) {
        extractedProfiles = data;
        console.log('✅ Data est un array direct:', extractedProfiles.length);
      }
      // Autre format nestéd
      else if (data.data?.users) {
        extractedProfiles = data.data.users;
        console.log('✅ Trouvé data.data.users:', extractedProfiles.length);
      }
      else {
        console.error('❌ Aucun profil trouvé dans:', data);
        throw new Error('Format de données non reconnu');
      }

      console.log('👥 Profils extraits:', extractedProfiles);

      if (extractedProfiles.length === 0) {
        console.warn('⚠️ Aucun profil dans le tableau');
      }

      // ✅ NORMALISATION DES PROFILS
      const normalizedProfiles = extractedProfiles.map((profile: any, index: number) => {
        console.log(`👤 Profil ${index}:`, profile);
        
        return {
          id: profile.id || `profile-${index}`,
          name: profile.name || 'Nom inconnu',
          age: profile.age || 25,
          bio: profile.bio || 'Aucune bio',
          location: profile.location || 'Lieu inconnu',
          profession: profile.profession || 'Profession inconnue',
          interests: profile.interests || [],
          photos: profile.photos || [
            {
              id: 'placeholder',
              url: 'https://via.placeholder.com/400x600/f3f4f6/9ca3af?text=Photo',
              isPrimary: true
            }
          ],
          // Compatibilité avec les deux noms possibles
          compatibility: profile.compatibility || profile.compatibilityScore || 50,
          isOnline: profile.isOnline || false,
          memberSince: profile.memberSince || profile.createdAt || new Date().toISOString()
        };
      });

      console.log('✅ Profils normalisés:', normalizedProfiles.length);

      setProfiles(normalizedProfiles);
      setCurrentIndex(0);
      setApiData(data);

    } catch (err: any) {
      console.error('❌ Erreur chargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // ACTIONS SIMPLIFIÉES
  // ================================

  const handleAction = async (action: string) => {
    if (!currentProfile) return;

    try {
      console.log(`💝 Action ${action} pour:`, currentProfile.name);

      // Avancer l'index
      setCurrentIndex(prev => prev + 1);

      // Envoyer à l'API
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: currentProfile.id,
          action
        })
      });

      const result = await response.json();
      console.log('📡 Résultat action:', result);

      if (result.isMatch) {
        alert(`🎉 Match avec ${currentProfile.name} !`);
      }

      // Recharger si nécessaire
      if (currentIndex >= profiles.length - 2) {
        console.log('📥 Rechargement...');
        await loadProfiles();
      }

    } catch (error) {
      console.error('❌ Erreur action:', error);
    }
  };

  // Chargement initial : préférences puis profils
  useEffect(() => {
    const init = async () => {
      const prefs = await loadPreferences();
      await loadProfiles(prefs);
    };
    init();
  }, []);

  // ================================
  // RENDU SIMPLE
  // ================================

  if (loading) {
    return <SimpleLoading message="Chargement des profils ..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center">
        <Card className="max-w-md mx-4 p-6">
          <div className="text-center">
            <h2 className="text-subheading mb-4">Erreur</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left">
              <h3 className="font-bold mb-2 text-sm">Debug API:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </div>
            <Button onClick={() => loadProfiles()} variant="default">
              Réessayer
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center">
        <Card className="p-6 text-center">
          <h2 className="text-subheading mb-4">Aucun profil</h2>
          <p className="text-body mb-4">Aucun profil disponible</p>
          <Button onClick={() => loadProfiles()} variant="default">
            Recharger
          </Button>
        </Card>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center">
        <Card className="p-6 text-center">
          <h2 className="text-subheading mb-4">Fin des profils</h2>
          <p className="text-body mb-4">Vous avez vu {currentIndex} profils</p>
          <Button onClick={() => loadProfiles()} variant="gradient">
            Recharger
          </Button>
        </Card>
      </div>
    );
  }

  // ================================
  // INTERFACE SIMPLIFIÉE
  // ================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header simple */}
      <div className="bg-white shadow p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-pink-600">Découvrir</h1>
          <div className="text-sm text-gray-500">
            {currentIndex + 1} / {profiles.length}
          </div>
        </div>
      </div>

      {/* Debug panel */}
      <div className="max-w-md mx-auto p-4">
        <details className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-4">
          <summary className="cursor-pointer font-bold">🐛 Debug Info</summary>
          <div className="mt-2 text-xs">
            <p><strong>Profils chargés:</strong> {profiles.length}</p>
            <p><strong>Index actuel:</strong> {currentIndex}</p>
            <p><strong>Profil actuel:</strong> {currentProfile?.name} ({currentProfile?.gender})</p>
            <details className="mt-2">
              <summary>⚙️ Préférences utilisateur</summary>
              <pre className="bg-white p-2 rounded mt-1 overflow-auto max-h-32">
                {JSON.stringify(userPreferences, null, 2)}
              </pre>
            </details>
            <details className="mt-2">
              <summary>Données API brutes</summary>
              <pre className="bg-white p-2 rounded mt-1 overflow-auto max-h-32">
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </details>
          </div>
        </details>
      </div>

      {/* Card simple */}
      <div className="max-w-md mx-auto px-4">
        <motion.div
          key={currentProfile.id}
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          {/* Photo */}
          <div
            className="h-96 bg-cover bg-center relative"
            style={{
              backgroundImage: `url(${currentProfile.photos?.[0]?.url || 'https://via.placeholder.com/400x600/f3f4f6/9ca3af?text=Photo'})`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            {/* Badge Admin/Moderator */}
            {(currentProfile.role === 'ADMIN' || currentProfile.role === 'MODERATOR') && (
              <div className="absolute top-4 left-4 z-10">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 ${
                  currentProfile.role === 'ADMIN'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                }`}>
                  {currentProfile.role === 'ADMIN' ? '👑' : '🛡️'}
                  {currentProfile.role === 'ADMIN' ? 'Admin' : 'Modérateur'}
                </span>
              </div>
            )}

            {/* Info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h2 className="text-2xl font-bold mb-1">
                {currentProfile.name}, {currentProfile.age}
              </h2>
              <p className="text-sm opacity-90 mb-2">📍 {currentProfile.location}</p>
              <p className="text-sm opacity-90 mb-2">💼 {currentProfile.profession}</p>
              <div className="flex items-center mb-3 gap-2">
                <span className="badge-primary">
                  ✨ {currentProfile.compatibility}% compatible
                </span>
                {currentProfile.isOnline && (
                  <span className="badge-online">
                    🟢 En ligne
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {currentProfile.bio && (
            <div className="p-4">
              <p className="text-body">{currentProfile.bio}</p>
            </div>
          )}

          {/* Intérêts */}
          {currentProfile.interests && currentProfile.interests.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {currentProfile.interests.slice(0, 5).map((interest: string, index: number) => (
                  <span key={index} className="badge badge-gray">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="p-4 flex-center space-x-4">
            <Button
              onClick={() => handleAction('dislike')}
              variant="ghost"
              size="icon"
              className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <span className="text-2xl">👎</span>
            </Button>

            <Button
              onClick={() => handleAction('super_like')}
              variant="ghost"
              size="icon"
              className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              <span className="text-2xl">⭐</span>
            </Button>

            <Button
              onClick={() => handleAction('like')}
              variant="ghost"
              size="icon"
              className="w-14 h-14 rounded-full bg-primary-500 hover:bg-primary-600 text-white"
            >
              <span className="text-2xl">💖</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}