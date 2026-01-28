// src/app/discover/page.tsx - VERSION ULTRA SIMPLE QUI MARCHE
'use client';
import { SimpleLoading } from '@/components/ui/SimpleLoading';
import { SimpleError } from '@/components/ui/SimpleError';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ================================
// VERSION SIMPLE POUR DÉBUG
// ================================

export default function DiscoverPageSimple() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<any>(null);

  const currentProfile = profiles[currentIndex];

  // ================================
  // CHARGEMENT ADAPTATIF
  // ================================

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Chargement des profils...');

      const response = await fetch('/api/discover');
      
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

  // Chargement initial
  useEffect(() => {
    loadProfiles();
  }, []);

  // ================================
  // RENDU SIMPLE
  // ================================

  if (loading) {
    return <SimpleLoading message="Chargement des profils ..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <h2 className="text-xl font-bold mb-4">Erreur</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="bg-gray-200 p-4 rounded mb-4 text-left">
            <h3 className="font-bold mb-2">Debug API:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(apiData, null, 2)}
            </pre>
          </div>
          <button
            onClick={loadProfiles}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Aucun profil</h2>
          <p className="mb-4">Aucun profil disponible</p>
          <button
            onClick={loadProfiles}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Fin des profils</h2>
          <p className="mb-4">Vous avez vu {currentIndex} profils</p>
          <button
            onClick={loadProfiles}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Recharger
          </button>
        </div>
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
            <p><strong>Profil actuel:</strong> {currentProfile?.name}</p>
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
            
            {/* Info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h2 className="text-2xl font-bold mb-1">
                {currentProfile.name}, {currentProfile.age}
              </h2>
              <p className="text-sm opacity-90 mb-2">📍 {currentProfile.location}</p>
              <p className="text-sm opacity-90 mb-2">💼 {currentProfile.profession}</p>
              <div className="flex items-center mb-3">
                <span className="bg-pink-500 text-white px-2 py-1 rounded-full text-xs">
                  ✨ {currentProfile.compatibility}% compatible
                </span>
                {currentProfile.isOnline && (
                  <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs ml-2">
                    🟢 En ligne
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {currentProfile.bio && (
            <div className="p-4">
              <p className="text-gray-700 text-sm">{currentProfile.bio}</p>
            </div>
          )}

          {/* Intérêts */}
          {currentProfile.interests && currentProfile.interests.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {currentProfile.interests.slice(0, 5).map((interest: string, index: number) => (
                  <span 
                    key={index}
                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="p-4 flex justify-center space-x-4">
            <button
              onClick={() => handleAction('dislike')}
              className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <span className="text-xl">👎</span>
            </button>
            
            <button
              onClick={() => handleAction('super_like')}
              className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            >
              <span className="text-xl">⭐</span>
            </button>
            
            <button
              onClick={() => handleAction('like')}
              className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors"
            >
              <span className="text-xl">💖</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}