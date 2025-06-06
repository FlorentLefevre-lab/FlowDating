'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HeartIcon, 
  MapPinIcon, 
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

import { UserProfile, UserPreferences, MessageType } from '../../types/profiles';
import { LOOKING_FOR_OPTIONS, DISTANCE_OPTIONS } from '../../constants/profileData';

interface PreferencesFormProps {
  profile: UserProfile | null;
  loading: boolean;
  onSubmit: (data: any) => void;
}

const PreferencesForm: React.FC<PreferencesFormProps> = ({ 
  profile, 
  loading, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState<UserPreferences>({
    minAge: profile?.preferences?.minAge || 18,
    maxAge: profile?.preferences?.maxAge || 35,
    maxDistance: profile?.preferences?.maxDistance || 50,
    gender: profile?.preferences?.gender || '',
    lookingFor: profile?.preferences?.lookingFor || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Options pour les genres recherchés
  const genderOptions = [
    { value: 'femme', label: 'Femmes', shortLabel: 'F' },
    { value: 'homme', label: 'Hommes', shortLabel: 'H' },
    { value: 'non-binaire', label: 'Personnes non-binaires', shortLabel: 'NB' },
    { value: 'tous', label: 'Tout le monde', shortLabel: 'Tous' }
  ];

  const handleInputChange = (field: keyof UserPreferences, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validation
    if (formData.minAge && formData.maxAge && formData.minAge > formData.maxAge) {
      alert('L\'âge minimum ne peut pas être supérieur à l\'âge maximum');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('❌ Erreur soumission préférences:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-section">
      <div className="form-section-header">
        <h2 className="form-section-title">
          Mes Préférences
        </h2>
        <p className="form-section-subtitle">
          Personnalisez vos critères de recherche pour trouver des profils compatibles
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="space-y-responsive max-w-4xl"
      >
        {/* Tranche d'âge */}
        <div className="profile-section">
          <div className="profile-header">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
              <h3 className="profile-title text-base sm:text-lg">Tranche d'âge</h3>
            </div>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                Âge minimum
              </label>
              <input
                type="number"
                min="18"
                max="99"
                value={formData.minAge || 18}
                onChange={(e) => handleInputChange('minAge', parseInt(e.target.value))}
                className="input-field"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">
                Âge maximum
              </label>
              <input
                type="number"
                min="18"
                max="99"
                value={formData.maxAge || 35}
                onChange={(e) => handleInputChange('maxAge', parseInt(e.target.value))}
                className="input-field"
              />
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <span className="text-gray-600 bg-gray-50 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base">
              Entre {formData.minAge} et {formData.maxAge} ans
            </span>
          </div>
        </div>

        {/* Distance */}
        <div className="profile-section">
          <div className="profile-header">
            <div className="flex items-center gap-3">
              <MapPinIcon className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
              <h3 className="profile-title text-base sm:text-lg">Distance maximale</h3>
            </div>
          </div>
          
          {/* Responsive : 2 colonnes sur mobile, 4 sur desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DISTANCE_OPTIONS.map((option) => (
              <motion.button
                key={option.value}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleInputChange('maxDistance', option.value)}
                className={`preference-option text-center py-3 sm:py-4 ${
                  formData.maxDistance === option.value ? 'selected' : ''
                }`}
              >
                <div className="font-medium text-sm sm:text-base">{option.label}</div>
                <div className="text-xs opacity-75 hidden sm:block">{option.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Genre recherché */}
        <div className="profile-section">
          <div className="profile-header">
            <div className="flex items-center gap-3">
              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
              <h3 className="profile-title text-base sm:text-lg">Je recherche</h3>
            </div>
          </div>
          
          {/* Responsive : 2 colonnes sur mobile, 4 sur desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {genderOptions.map((option) => (
              <motion.button
                key={option.value}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleInputChange('gender', option.value)}
                className={`preference-option py-3 sm:py-4 ${
                  formData.gender === option.value ? 'selected' : ''
                }`}
              >
                {/* Texte court sur mobile, complet sur desktop */}
                <span className="sm:hidden font-medium text-sm">{option.shortLabel}</span>
                <span className="hidden sm:inline font-medium">{option.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Type de relation */}
        <div className="profile-section">
          <div className="profile-header">
            <div className="flex items-center gap-3">
              <HeartIcon className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
              <h3 className="profile-title text-base sm:text-lg">Type de relation recherchée</h3>
            </div>
          </div>
          
          {/* Stack sur mobile, grid sur desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LOOKING_FOR_OPTIONS.map((option) => (
              <motion.button
                key={option.value}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleInputChange('lookingFor', option.value)}
                className={`preference-option text-left p-3 sm:p-4 ${
                  formData.lookingFor === option.value ? 'selected' : ''
                }`}
              >
                <div className="font-medium text-sm sm:text-base">{option.label}</div>
                <div className="text-xs sm:text-sm opacity-75 mt-1">{option.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Résumé des préférences - Responsive */}
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4 sm:p-6 border border-pink-200">
          <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Résumé de vos préférences</h4>
          <div className="space-y-2 text-xs sm:text-sm text-gray-700">
            <p>
              <span className="font-medium">Âge :</span> {formData.minAge}-{formData.maxAge} ans
            </p>
            <p>
              <span className="font-medium">Distance :</span> {
                DISTANCE_OPTIONS.find(d => d.value === formData.maxDistance)?.label || `${formData.maxDistance} km`
              } maximum
            </p>
            {formData.gender && (
              <p>
                <span className="font-medium">Recherche :</span> {
                  genderOptions.find(g => g.value === formData.gender)?.label
                }
              </p>
            )}
            {formData.lookingFor && (
              <p>
                <span className="font-medium">Type de relation :</span> {
                  LOOKING_FOR_OPTIONS.find(l => l.value === formData.lookingFor)?.label
                }
              </p>
            )}
          </div>
        </div>

        {/* Boutons d'action - Responsive */}
        <div className="section-actions">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting || loading}
            className="btn-section-primary"
          >
            {isSubmitting ? (
              <div className="loading-content">
                <div className="loading-spinner"></div>
                <span className="hidden sm:inline">Sauvegarde...</span>
                <span className="sm:hidden">...</span>
              </div>
            ) : (
              <>
                <span className="hidden sm:inline">Sauvegarder mes préférences</span>
                <span className="sm:hidden">Sauvegarder</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Info box responsive */}
        <div className="info-box">
          <h4 className="info-box-title text-sm sm:text-base">
            💡 Pourquoi définir vos préférences ?
          </h4>
          <ul className="info-box-text space-y-1 text-xs sm:text-sm">
            <li>• Recevez des suggestions plus pertinentes</li>
            <li>• Gagnez du temps dans vos recherches</li>
            <li className="hidden sm:list-item">• Augmentez vos chances de compatibilité</li>
            <li>• Personnalisez votre expérience de rencontres</li>
          </ul>
        </div>
      </motion.form>
    </div>
  );
};

export default PreferencesForm;