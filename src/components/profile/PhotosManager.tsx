// components/profile/PhotosManager.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhotoIcon, 
  TrashIcon, 
  ArrowUpTrayIcon,
  ExclamationCircleIcon,
  StarIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

// Types pour Cloudinary
declare global {
  interface Window {
    cloudinary: any;
  }
}

interface Photo {
  id: string;
  url: string;
  isPrimary?: boolean;
}

interface PhotosManagerProps {
  photos: Photo[];
  onMessage: (message: string, type: 'success' | 'error') => void;
}

const PhotosManager: React.FC<PhotosManagerProps> = ({ photos, onMessage }) => {
  const [localPhotos, setLocalPhotos] = useState<Photo[]>(photos);
  const [uploading, setUploading] = useState(false);
  const [cloudinaryLoaded, setCloudinaryLoaded] = useState(false);

  // Charger les photos au montage du composant
  // Charger le script Cloudinary
  useEffect(() => {
    console.log('🔍 PhotosManager monté, photos reçues:', photos);
    loadPhotosFromAPI(); // Toujours recharger pour être sûr
  }, []);
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

  // Synchroniser avec les props ET recharger depuis l'API
  useEffect(() => {
    setLocalPhotos(photos);
    // Si pas de photos dans les props, recharger depuis l'API
    if (photos.length === 0) {
      loadPhotosFromAPI();
    }
  }, [photos]);

  // Charger les photos depuis l'API
  const loadPhotosFromAPI = async () => {
    try {
      console.log('🔄 Rechargement des photos depuis l\'API...');
      const response = await fetch('/api/profile/photos');
      
      if (response.ok) {
        const data = await response.json();
        const apiPhotos = data.photos || [];
        console.log('✅ Photos chargées:', apiPhotos);
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

    console.log('🔧 Config Cloudinary:', { cloudName, uploadPreset });

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        sources: [
          'local',      // Fichiers locaux
          'camera',     // Caméra
          'image_search', // Recherche d'images
          'url'         // URL
        ],
        multiple: true,
        maxFiles: 6 - localPhotos.length, // Limite selon photos existantes
        maxFileSize: 10000000, // 10MB
        maxImageFileSize: 10000000,
        maxVideoFileSize: 0, // Pas de vidéo
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maxImageWidth: 2000,
        maxImageHeight: 2000,
        cropping: true,
        croppingAspectRatio: 1, // Carré
        showAdvancedOptions: false,
        showInsecurePreview: false,
        showUploadMoreButton: true,
        folder: 'dating_app_photos', // Dossier dans Cloudinary
        publicId: `user_photo_${Date.now()}`,
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
            error: '#ef4444',
            textDark: '#1f2937',
            textLight: '#6b7280'
          }
        },
        text: {
          en: {
            'queue.title': 'Ajout de photos',
            'queue.title_uploading_with_counter': 'Upload de {{num}} photos',
            'queue.title_processing_with_counter': 'Traitement de {{num}} photos',
            'queue.title_uploading_processing_with_counter': 'Préparation de {{num}} photos',
            'queue.upload_more': 'Ajouter plus de photos',
            'local.browse': 'Parcourir',
            'local.dd_title_single': 'Glissez une photo ici',
            'local.dd_title_multi': 'Glissez vos photos ici',
            'camera.capture': 'Prendre une photo',
            'camera.switch_camera': 'Changer de caméra',
            'camera.take_pic': 'Capturer',
            'camera.retake': 'Reprendre',
            'sources.local.title': 'Mes fichiers',
            'sources.camera.title': 'Caméra',
            'sources.image_search.title': 'Recherche',
            'sources.url.title': 'URL'
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

        console.log('📡 Résultat Cloudinary:', result);

        if (result && result.event === 'success') {
          console.log('✅ Photo uploadée:', result.info.secure_url);
          savePhotoToDatabase(result.info.secure_url);
        }

        if (result && result.event === 'queues-start') {
          setUploading(true);
          console.log('🔄 Début upload...');
        }

        if (result && result.event === 'queues-end') {
          setUploading(false);
          console.log('✅ Upload terminé');
        }

        if (result && result.event === 'close') {
          setUploading(false);
          console.log('🔒 Widget fermé');
        }
      }
    );

    widget.open();
  };

  // Sauvegarder en base de données
  const savePhotoToDatabase = async (imageUrl: string) => {
    try {
      console.log('💾 Sauvegarde en base:', imageUrl);

      const response = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl,
          isPrimary: localPhotos.length === 0
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur sauvegarde:', response.status, errorText);
        throw new Error(`Erreur base de données: ${response.status}`);
      }

      const savedPhoto = await response.json();
      console.log('✅ Photo sauvegardée:', savedPhoto);

      setLocalPhotos(prev => [...prev, savedPhoto]);
      onMessage('Photo ajoutée avec succès !', 'success');

      // Recharger toutes les photos pour être sûr
      setTimeout(() => loadPhotosFromAPI(), 1000);

    } catch (error) {
      console.error('❌ Erreur sauvegarde photo:', error);
      onMessage(`Erreur: ${error.message}`, 'error');
    }
  };

  // Supprimer une photo
  const deletePhoto = async (photoId: string) => {
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Mes Photos ({localPhotos.length}/6)
        </h2>
        <p className="text-gray-600">
          Ajoutez vos meilleures photos pour attirer l'attention
        </p>
      </div>

      {/* Bouton d'upload Cloudinary */}
      {canAddMore && (
        <div className="mb-8">
          <button
            onClick={openCloudinaryWidget}
            disabled={uploading || !cloudinaryLoaded}
            className={`w-full h-32 border-2 border-dashed rounded-xl transition-all duration-200 ${
              uploading || !cloudinaryLoaded
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-pink-300 bg-pink-50 hover:bg-pink-100 hover:border-pink-400 cursor-pointer'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-3"></div>
                <span className="text-gray-600 font-medium">Upload en cours...</span>
                <span className="text-sm text-gray-500">Traitement de vos photos</span>
              </div>
            ) : !cloudinaryLoaded ? (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-pulse rounded-full h-8 w-8 bg-gray-300 mb-3"></div>
                <span className="text-gray-600 font-medium">Chargement...</span>
                <span className="text-sm text-gray-500">Préparation du widget photo</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <CameraIcon className="w-10 h-10 text-pink-500" />
                  <ArrowUpTrayIcon className="w-10 h-10 text-pink-500" />
                </div>
                <span className="text-gray-700 font-semibold text-lg mb-1">
                  Ajouter des photos
                </span>
                <span className="text-gray-500">
                  Caméra • Galerie • Recherche • URL
                </span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Grille des photos */}
      {localPhotos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <AnimatePresence>
            {localPhotos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-lg"
              >
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Badge photo principale */}
                {photo.isPrimary && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <StarIcon className="w-3 h-3" />
                    Principale
                  </div>
                )}

                {/* Numéro de la photo */}
                <div className="absolute top-3 right-3 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>

                {/* Overlay avec actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                    {/* Bouton définir comme principale */}
                    {!photo.isPrimary && (
                      <button
                        onClick={() => setPrimaryPhoto(photo.id)}
                        className="bg-white/90 backdrop-blur-sm text-gray-700 p-2.5 rounded-lg hover:bg-white transition-all shadow-lg"
                        title="Définir comme photo principale"
                      >
                        <StarIcon className="w-4 h-4" />
                      </button>
                    )}

                    {/* Bouton supprimer */}
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="bg-red-500/90 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-red-600 transition-all shadow-lg ml-auto"
                      title="Supprimer cette photo"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        // État vide
        <div className="text-center py-16 mb-6">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <PhotoIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Aucune photo ajoutée
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Commencez par ajouter quelques photos pour créer un profil attractif !
          </p>
        </div>
      )}

      {/* Alerte limite atteinte */}
      {!canAddMore && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
        >
          <div className="flex items-start gap-3">
            <ExclamationCircleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 mb-1">
                Limite de photos atteinte
              </h4>
              <p className="text-amber-700 text-sm">
                Vous avez ajouté le maximum de 6 photos. Pour en ajouter de nouvelles, 
                supprimez d'abord une photo existante.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PhotosManager;