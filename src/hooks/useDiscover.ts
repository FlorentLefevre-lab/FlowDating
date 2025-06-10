// src/hooks/useDiscover.ts
import { useState, useEffect, useCallback } from 'react';

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  department: string;
  region: string;
  profession: string;
  interests: string[];
  photos: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
  compatibilityScore: number;
}

interface UseDiscoverResult {
  profiles: Profile[];
  currentProfile: Profile | null;
  nextProfile: Profile | null;
  loading: boolean;
  error: string | null;
  stats: {
    total: number;
    remaining: number;
    currentIndex: number;
  };
  actions: {
    like: () => Promise<{ isMatch: boolean; matchUser?: any }>;
    dislike: () => Promise<void>;
    skip: () => void;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
  };
}

export const useDiscover = (): UseDiscoverResult => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les profils
  const loadProfiles = useCallback(async (append = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);

      const response = await fetch('/api/discover');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du chargement des profils');
      }

      const data = await response.json();
      
      if (append) {
        setProfiles(prev => [...prev, ...data.profiles]);
      } else {
        setProfiles(data.profiles);
        setCurrentIndex(0);
      }

      console.log('✅ Profils chargés:', data.profiles.length);

    } catch (err: any) {
      console.error('❌ Erreur chargement profils:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger au montage du composant
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Charger plus de profils si on arrive vers la fin
  useEffect(() => {
    if (profiles.length > 0 && currentIndex >= profiles.length - 2) {
      console.log('🔄 Chargement de profils supplémentaires...');
      loadProfiles(true);
    }
  }, [currentIndex, profiles.length, loadProfiles]);

  // Action: Like
  const handleLike = useCallback(async () => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return { isMatch: false };

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: currentProfile.id,
          action: 'like'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du like');
      }

      if (result.success) {
        setCurrentIndex(prev => prev + 1);
        
        return {
          isMatch: result.isMatch,
          matchUser: result.targetUser
        };
      }

      return { isMatch: false };

    } catch (error: any) {
      console.error('❌ Erreur like:', error);
      setError(error.message);
      return { isMatch: false };
    }
  }, [profiles, currentIndex]);

  // Action: Dislike
  const handleDislike = useCallback(async () => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: currentProfile.id,
          action: 'dislike'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du dislike');
      }

      if (result.success) {
        setCurrentIndex(prev => prev + 1);
      }

    } catch (error: any) {
      console.error('❌ Erreur dislike:', error);
      setError(error.message);
    }
  }, [profiles, currentIndex]);

  // Action: Skip (passer sans action)
  const handleSkip = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
  }, []);

  // Action: Refresh
  const handleRefresh = useCallback(async () => {
    await loadProfiles(false);
  }, [loadProfiles]);

  // Action: Load More
  const handleLoadMore = useCallback(async () => {
    await loadProfiles(true);
  }, [loadProfiles]);

  // Calculer les profils actuels
  const currentProfile = profiles[currentIndex] || null;
  const nextProfile = profiles[currentIndex + 1] || null;

  // Calculer les statistiques
  const stats = {
    total: profiles.length,
    remaining: Math.max(0, profiles.length - currentIndex),
    currentIndex
  };

  return {
    profiles,
    currentProfile,
    nextProfile,
    loading,
    error,
    stats,
    actions: {
      like: handleLike,
      dislike: handleDislike,
      skip: handleSkip,
      refresh: handleRefresh,
      loadMore: handleLoadMore
    }
  };
};