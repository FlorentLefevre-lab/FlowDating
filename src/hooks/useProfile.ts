// hooks/useProfile.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserProfile, 
  Photo, 
  ProfileUpdatePayload, 
  PhotoUploadResponse, 
  UseProfileReturn,
  ApiResponse 
} from '@/types/profiles';

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fonction pour récupérer le profil
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/profile', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error(`Erreur ${response.status}`);
      }

      const data: ApiResponse<{ profile: UserProfile; photos: Photo[] }> = await response.json();
      
      if (data.profile) {
        setProfile(data.profile);
        setPhotos(data.photos || []);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement du profil';
      setError(errorMessage);
      console.error('❌ Erreur fetchProfile:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fonction pour mettre à jour le profil
  const updateProfile = useCallback(async (data: ProfileUpdatePayload) => {
    try {
      setError(null);

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      const updatedData = await response.json();
      
      // Mettre à jour l'état local
      setProfile(prev => prev ? { ...prev, ...updatedData } : null);

      console.log('✅ Profil mis à jour avec succès');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      setError(errorMessage);
      console.error('❌ Erreur updateProfile:', err);
      throw err; // Re-throw pour que le composant puisse gérer l'erreur
    }
  }, []);

  // Fonction pour uploader une photo
  const uploadPhoto = useCallback(async (file: File): Promise<PhotoUploadResponse> => {
    try {
      setError(null);

      // Validation côté client
      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB
        throw new Error('La taille de l\'image ne doit pas dépasser 5MB');
      }

      if (photos.length >= 6) {
        throw new Error('Maximum 6 photos autorisées');
      }

      // 1. Upload vers Cloudinary (remplacez par votre configuration)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'your_preset');

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!cloudinaryResponse.ok) {
        throw new Error('Erreur lors de l\'upload vers Cloudinary');
      }

      const cloudinaryData = await cloudinaryResponse.json();

      // 2. Sauvegarder en base de données
      const dbResponse = await fetch('/api/profile/photos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          imageUrl: cloudinaryData.secure_url,
          alt: file.name,
        }),
      });

      if (!dbResponse.ok) {
        const errorData = await dbResponse.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      const newPhoto: PhotoUploadResponse = await dbResponse.json();

      // 3. Mettre à jour l'état local
      setPhotos(prev => [...prev, newPhoto]);

      console.log('✅ Photo uploadée avec succès');
      return newPhoto;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'upload';
      setError(errorMessage);
      console.error('❌ Erreur uploadPhoto:', err);
      throw err;
    }
  }, [photos.length]);

  // Fonction pour supprimer une photo
  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/profile/photos?id=${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      // Mettre à jour l'état local
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));

      console.log('✅ Photo supprimée avec succès');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setError(errorMessage);
      console.error('❌ Erreur deletePhoto:', err);
      throw err;
    }
  }, []);

  // Fonction pour définir une photo comme principale
  const setPrimaryPhoto = useCallback(async (photoId: string) => {
    try {
      setError(null);

      const response = await fetch('/api/profile/photos/upload', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ photoId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      // Mettre à jour l'état local
      setPhotos(prev => prev.map(photo => ({
        ...photo,
        isPrimary: photo.id === photoId
      })));

      console.log('✅ Photo principale mise à jour');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      setError(errorMessage);
      console.error('❌ Erreur setPrimaryPhoto:', err);
      throw err;
    }
  }, []);

  // Fonction pour rafraîchir le profil
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Charger le profil au montage du composant
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Calculer le pourcentage de complétion
  const completionPercentage = profile ? calculateCompletionPercentage(profile, photos) : 0;

  return {
    profile: profile ? { ...profile, completionPercentage } : null,
    photos,
    loading,
    error,
    updateProfile,
    uploadPhoto,
    deletePhoto,
    setPrimaryPhoto,
    refreshProfile,
  };
}

// Fonction utilitaire pour calculer le pourcentage de complétion
function calculateCompletionPercentage(profile: UserProfile, photos: Photo[]): number {
  const requiredFields = [
    'name',
    'age',
    'bio',
    'location',
    'gender',
    'profession',
  ];

  const optionalFields = [
    'maritalStatus',
    'zodiacSign',
    'dietType',
    'religion',
    'ethnicity',
  ];

  let completedRequired = 0;
  let completedOptional = 0;

  // Vérifier les champs obligatoires
  requiredFields.forEach(field => {
    const value = profile[field as keyof UserProfile];
    if (value !== null && value !== undefined && value !== '') {
      completedRequired++;
    }
  });

  // Vérifier les champs optionnels
  optionalFields.forEach(field => {
    const value = profile[field as keyof UserProfile];
    if (value !== null && value !== undefined && value !== '') {
      completedOptional++;
    }
  });

  // Vérifier les photos (au moins 1 photo requise)
  const hasPhotos = photos.length > 0 ? 1 : 0;

  // Vérifier les intérêts (au moins 3 recommandés)
  const hasInterests = profile.interests && profile.interests.length >= 3 ? 1 : 0;

  // Calcul du pourcentage
  const requiredScore = (completedRequired / requiredFields.length) * 60; // 60% pour les champs obligatoires
  const photoScore = hasPhotos * 20; // 20% pour les photos
  const interestScore = hasInterests * 10; // 10% pour les intérêts
  const optionalScore = (completedOptional / optionalFields.length) * 10; // 10% pour les champs optionnels

  return Math.round(requiredScore + photoScore + interestScore + optionalScore);
}

export default useProfile;