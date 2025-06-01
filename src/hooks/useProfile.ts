// hooks/useProfile.ts
import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UserProfile {
  id?: string;
  name?: string;
  age?: number;
  bio?: string;
  location?: string;
  interests?: string[];
  profession?: string;
  gender?: string;
  maritalStatus?: string;
  zodiacSign?: string;
  dietType?: string;
  religion?: string;
  preferences?: {
    id?: string;
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    gender?: string;
    interests?: string[];
    lookingFor?: string;
  };
}

interface Photo {
  id: string;
  url: string;
  isMain?: boolean;
  isPrimary?: boolean;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { data: session, status } = useSession();

  const loadProfile = useCallback(async () => {
    if (status === 'loading') return;
    if (!session?.user) {
      console.log('❌ Pas de session utilisateur pour charger le profil');
      return;
    }

    console.log('🔄 Chargement du profil...');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Réponse API profile:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Données profil reçues:', data);
        setProfile(data.profile || data);
        setPhotos(data.photos || []);
      } else {
        const errorData = await response.text();
        console.error('❌ Erreur API profile:', response.status, errorData);
        setError(`Erreur ${response.status}: ${errorData}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement du profil:', error);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [session, status]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!session?.user) {
      throw new Error('Utilisateur non connecté');
    }

    console.log('🔄 Mise à jour du profil avec:', data);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      console.log('📡 Réponse mise à jour profil:', response.status);

      if (response.ok) {
        const updatedProfile = await response.json();
        console.log('✅ Profil mis à jour:', updatedProfile);
        setProfile(prev => ({ ...prev, ...updatedProfile }));
        return updatedProfile;
      } else {
        const errorData = await response.text();
        console.error('❌ Erreur mise à jour:', response.status, errorData);
        throw new Error(`Erreur ${response.status}: ${errorData}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      setError(error instanceof Error ? error.message : 'Erreur de mise à jour');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const updatePreferences = useCallback(async (preferences) => {
    if (!session?.user) {
      throw new Error('Utilisateur non connecté');
    }
  
    console.log('🔄 Mise à jour des préférences avec:', preferences);
    setLoading(true);
  
    try {
      const response = await fetch('/api/profile/preferences', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences)
      });
  
      console.log('📡 Réponse préférences:', response.status);
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API:', response.status, errorText);
        throw new Error(`Erreur ${response.status}`);
      }
  
      const updatedPrefs = await response.json();
      console.log('✅ Préférences mises à jour:', updatedPrefs);
      
      setProfile(prev => prev ? { 
        ...prev, 
        preferences: updatedPrefs 
      } : null);
      
      return updatedPrefs;
  
    } catch (error) {
      console.error('❌ Erreur updatePreferences:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Fonction pour recharger seulement les photos
  const reloadPhotos = useCallback(async () => {
    try {
      console.log('🔄 Rechargement des photos...');
      const response = await fetch('/api/profile/photos');
      
      if (response.ok) {
        const data = await response.json();
        const apiPhotos = data.photos || [];
        console.log('✅ Photos rechargées:', apiPhotos);
        setPhotos(apiPhotos);
      }
    } catch (error) {
      console.error('❌ Erreur rechargement photos:', error);
    }
  }, []);

  return {
    profile,
    photos,
    loading,
    error,
    loadProfile,
    updateProfile,
    updatePreferences,
    reloadPhotos,
    isAuthenticated: !!session?.user
  };
};