'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhotoIcon, 
  TrashIcon, 
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  StarIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

import { Photo, PhotosManagerProps } from '../../types/profiles';

// Déclaration TypeScript pour Cloudinary
declare global {
  interface Window {
    cloudinary: any;
  }
}

const PhotosManager: React.FC<PhotosManagerProps> = ({ photos, onMessage }) => {
  const [localPhotos, setLocalPhotos] = useState<Photo[]>(photos);
  const [uploading, setUploading] = useState(false);
  const [cloudinaryLoaded, setCloudinaryLoaded] = useState(false);

  // Synchroniser avec les props
  useEffect(() => {
    setLocalPhotos(photos);
    loadPhotosFromAPI();
  }, [photos]);

  // Charger le script Cloudinary
  useEffect(() => {
    const loadCloudinaryWidget = () => {
      if (window.cloudinary) {
        setCloudinaryLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
      script.async = true;
      script.onload = () => {
        setCloudinaryLoaded(true);
        console.log('✅ Cloudinary widget chargé');
      };
      script.onerror = () => {
        console.error('❌ Erreur chargement Cloudinary widget');
        onMessage('Erreur de chargement du widget photo', 'error');
      };
      document.head.appendChild(script);
    };

    loadCloudinaryWidget();
  }, [onMessage]);

  // Charger les photos depuis l'API
  const loadPhotosFromAPI = async () => {
    try {
      const response = await fetch('/api/profile/photos');
      
      if (response.ok) {
        const data = await response.json();
        const apiPhotos = data.photos || [];
        setLocalPhotos(apiPhotos);
      }
    } catch (error) {
      console.error('❌ Erreur chargement photos:', error);
    }
  };

  // Ouvrir le widget Cloudinary
  const openCloudinaryWidget = () => {
    if (!cloudinaryLoaded || !window.cloudinary) {
      onMessage('Widget photo en cours de chargement...', 'error');
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      onMessage('Configuration Cloudinary manquante', 'error');
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        sources: ['local', 'camera', 'image_search', 'url'],
        multiple: true,
        maxFiles: 6 - localPhotos.length,
        maxFileSize: 10000000, // 10MB
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maxImageWidth: 2000,
        maxImageHeight: 2000,
        cropping: true,
        croppingAspectRatio: 1,
        folder: 'dating_app_photos',
        theme: 'minimal',
        styles: {
          palette: {
            window: '#ffffff',
            sourceBg: '#f8fafc',
            windowBorder: '#e5e7eb',
            tabIcon: '#ec4899',
            inactiveTabIcon: '#9ca3af',
            menuIcons: '#6b7280',
            link: '#ec4899',
            action: '#ec4899',
            inProgress: '#ec4899',
            complete: '#10b981',
            error: '#ef4444'
          }
        }
      },
      (error: any, result: any) => {
        if (error) {
          console.error('❌ Erreur widget Cloudinary:', error);
          onMessage('Erreur lors de l\'upload', 'error');
          setUploading(false);
          return;
        }

        if (result && result.event === 'success') {
          savePhotoToDatabase(result.info.secure_url);
        }

        if (result && result.event === 'queues-start') {
          setUploading(true);
        }

        if (result && result.event === 'queues-end') {
          setUploading(false);
        }

        if (result && result.event === 'close') {
          setUploading(false);
        }
      }
    );

    widget.open();
  };

  // Sauvegarder en base de données
  const savePhotoToDatabase = async (imageUrl: string) => {
    try {
      const response = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl,
          isPrimary: localPhotos.length === 0
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur base de données: ${response.status}`);
      }

      const savedPhoto = await response.json();
      setLocalPhotos(prev => [...prev, savedPhoto]);
      onMessage('Photo ajoutée avec succès !', 'success');

      setTimeout(() => loadPhotosFromAPI(), 1000);

    } catch (error: any) {
      console.error('❌ Erreur sauvegarde photo:', error);
      onMessage(`Erreur: ${error.message}`, 'error');
    }
  };

  // Supprimer une photo
  const deletePhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return;

    try {
      const response = await fetch(`/api/profile/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setLocalPhotos(prev => prev.filter(p => p.id !== photoId));
      onMessage('Photo supprimée', 'success');
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      onMessage('Erreur lors de la suppression', 'error');
    }
  };

  // Définir photo principale
  const setPrimaryPhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/profile/photos/${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      setLocalPhotos(prev => prev.map(p => ({
        ...p,
        isPrimary: p.id === photoId
      })));
      onMessage('Photo principale mise à jour', 'success');
    } catch (error) {
      console.error('❌ Erreur photo principale:', error);
      onMessage('Erreur lors de la mise à jour', 'error');
    }
  };

  const canAddMore = localPhotos.length < 6;

  return (
    <div className="form-section">
      {/* Header */}
      <div className="form-section-header">
        <h2 className="form-section-title">
          Mes Photos ({localPhotos.length}/6)
        </h2>
        <p className="form-section-subtitle">
          Ajoutez vos meilleures photos pour attirer l'attention
        </p>
      </div>

      {/* Bouton d'upload Cloudinary - Responsive */}
      {canAddMore && (
        <div className="mb-6 sm:mb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCloudinaryWidget}
            disabled={uploading || !cloudinaryLoaded}
            className={`upload-area ${uploading || !cloudinaryLoaded ? 'disabled' : ''}`}
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="loading-spinner mb-3"></div>
                <span className="text-gray-600 font-medium text-sm sm:text-base">Upload en cours...</span>
                <span className="text-xs sm:text-sm text-gray-500">Traitement de vos photos</span>
              </div>
            ) : !cloudinaryLoaded ? (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-pulse rounded-full h-6 w-6 sm:h-8 sm:w-8 bg-gray-300 mb-3"></div>
                <span className="text-gray-600 font-medium text-sm sm:text-base">Chargement...</span>
                <span className="text-xs sm:text-sm text-gray-500">Préparation du widget photo</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <CameraIcon className="w-8 h-8 sm:w-10 sm:h-10 text-pink-500" />
                  <ArrowUpTrayIcon className="w-8 h-8 sm:w-10 sm:h-10 text-pink-500" />
                </div>
                <span className="text-gray-700 font-semibold text-base sm:text-lg mb-1">
                  Ajouter des photos
                </span>
                <span className="text-gray-500 text-xs sm:text-sm text-center">
                  <span className="hidden sm:inline">Caméra • Galerie • Recherche • URL</span>
                  <span className="sm:hidden">Caméra • Galerie</span>
                </span>
              </div>
            )}
          </motion.button>
        </div>
      )}

      {/* Grille des photos - Responsive */}
      {localPhotos.length > 0 ? (
        <div className="photos-grid mb-6">
          <AnimatePresence>
            {localPhotos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.02 }}
                className="photo-card"
              >
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Badge photo principale - Responsive */}
                {photo.isPrimary && (
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <StarIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">Principale</span>
                    <span className="sm:hidden">Main</span>
                  </div>
                )}

                {/* Numéro de la photo */}
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/50 text-white w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold">
                  {index + 1}
                </div>

                {/* Overlay avec actions */}
                <div className="photo-overlay">
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex justify-between items-center gap-2">
                    {/* Bouton définir comme principale */}
                    {!photo.isPrimary && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setPrimaryPhoto(photo.id)}
                        className="bg-white/90 backdrop-blur-sm text-gray-700 p-2 sm:p-2.5 rounded-lg hover:bg-white transition-all shadow-lg"
                        title="Définir comme photo principale"
                      >
                        <StarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </motion.button>
                    )}

                    {/* Bouton supprimer */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deletePhoto(photo.id)}
                      className="bg-red-500/90 backdrop-blur-sm text-white p-2 sm:p-2.5 rounded-lg hover:bg-red-600 transition-all shadow-lg ml-auto"
                      title="Supprimer cette photo"
                    >
                      <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        // État vide - Responsive
        <div className="text-center py-12 sm:py-16 mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <PhotoIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
            Aucune photo ajoutée
          </h3>
          <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base px-4">
            Commencez par ajouter quelques photos pour créer un profil attractif !
          </p>
        </div>
      )}

      {/* Alerte limite atteinte */}
      {!canAddMore && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="alert alert-warning mb-6"
        >
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 mb-1 text-sm sm:text-base">
                Limite de photos atteinte
              </h4>
              <p className="text-amber-700 text-xs sm:text-sm">
                Vous avez ajouté le maximum de 6 photos. Pour en ajouter de nouvelles, 
                supprimez d'abord une photo existante.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Conseils pour de meilleures photos - Responsive */}
      <div className="info-box">
        <h4 className="info-box-title text-sm sm:text-base">
          💡 Conseils pour de meilleures photos
        </h4>
        <ul className="info-box-text space-y-2 text-xs sm:text-sm">
          <li>• Utilisez des photos récentes et de bonne qualité</li>
          <li>• Montrez votre visage clairement sur votre photo principale</li>
          <li className="hidden sm:list-item">• Variez les types de photos : portrait, corps entier, activités</li>
          <li>• Évitez les filtres trop prononcés</li>
          <li>• Souriez naturellement !</li>
        </ul>
      </div>
    </div>
  );
};

export default PhotosManager;