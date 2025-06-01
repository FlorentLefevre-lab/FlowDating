// components/profile/PreferencesForm.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HeartIcon, 
  MapPinIcon, 
  CalendarIcon,
  UserIcon,
  TagIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface UserPreferences {
  id?: string;
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  gender?: string;
  interests?: string[];
  lookingFor?: string;
}

interface PreferencesFormProps {
  profile: any;
  loading: boolean;
  onSubmit: (data: any) => void;
}

const PreferencesForm: React.FC<PreferencesFormProps> = ({ 
  profile, 
  loading, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState<UserPreferences>({
    minAge: 18,
    maxAge: 35,
    maxDistance: 50,
    gender: '',
    interests: [],
    lookingFor: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les préférences existantes
  useEffect(() => {
    if (profile?.preferences) {
      console.log('🔄 Chargement des préférences:', profile.preferences);
      setFormData({
        minAge: profile.preferences.minAge || 18,
        maxAge: profile.preferences.maxAge || 35,
        maxDistance: profile.preferences.maxDistance || 50,
        gender: profile.preferences.gender || '',
        interests: profile.preferences.interests || [],
        lookingFor: profile.preferences.lookingFor || ''
      });
    }
  }, [profile]);

  // Options disponibles
  const genderOptions = [
    { value: 'femme', label: 'Femmes' },
    { value: 'homme', label: 'Hommes' },
    { value: 'non-binaire', label: 'Personnes non-binaires' },
    { value: 'tous', label: 'Tout le monde' }
  ];

  const lookingForOptions = [
    { value: 'relation-serieuse', label: 'Relation sérieuse' },
    { value: 'relation-casual', label: 'Relation décontractée' },
    { value: 'amitie', label: 'Amitié' },
    { value: 'aventure', label: 'Aventure' },
    { value: 'mariage', label: 'Mariage' },
    { value: 'pas-sur', label: 'Je ne sais pas encore' }
  ];

  const interestOptions = [
    'Sport', 'Fitness', 'Yoga', 'Course', 'Natation', 'Football', 'Tennis',
    'Voyage', 'Aventure', 'Randonnée', 'Camping', 'Photographie',
    'Musique', 'Concert', 'Festival', 'Danse', 'Chant',
    'Lecture', 'Écriture', 'Cinéma', 'Série TV', 'Théâtre', 'Art',
    'Cuisine', 'Gastronomie', 'Vin', 'Bière',
    'Technologie', 'Gaming', 'Programmation',
    'Nature', 'Environnement', 'Jardinage', 'Animaux',
    'Méditation', 'Bien-être', 'Mode', 'Shopping'
  ];

  const distanceOptions = [
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 25, label: '25 km' },
    { value: 50, label: '50 km' },
    { value: 100, label: '100 km' },
    { value: 500, label: 'Partout en France' },
    { value: 1000, label: 'Partout dans le monde' }
  ];

  const handleInputChange = (field: keyof UserPreferences, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests?.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...(prev.interests || []), interest]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    console.log('📤 Soumission des préférences:', formData);
    
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
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="p-6 space-y-8"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Mes Préférences
        </h2>
        <p className="text-gray-600">
          Personnalisez vos critères de recherche pour trouver des profils compatibles
        </p>
      </div>

      {/* Tranche d'âge */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <CalendarIcon className="w-6 h-6 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-800">Tranche d'âge</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Âge minimum
            </label>
            <input
              type="number"
              min="18"
              max="99"
              value={formData.minAge || 18}
              onChange={(e) => handleInputChange('minAge', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Âge maximum
            </label>
            <input
              type="number"
              min="18"
              max="99"
              value={formData.maxAge || 35}
              onChange={(e) => handleInputChange('maxAge', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <span className="text-gray-600">
            Entre {formData.minAge} et {formData.maxAge} ans
          </span>
        </div>
      </div>

      {/* Distance */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <MapPinIcon className="w-6 h-6 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-800">Distance maximale</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {distanceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleInputChange('maxDistance', option.value)}
              className={`p-3 rounded-lg border-2 transition-all ${
                formData.maxDistance === option.value
                  ? 'border-pink-500 bg-pink-50 text-pink-700 font-medium'
                  : 'border-gray-200 hover:border-pink-300 text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genre recherché */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <UserIcon className="w-6 h-6 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-800">Je recherche</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {genderOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleInputChange('gender', option.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                formData.gender === option.value
                  ? 'border-pink-500 bg-pink-50 text-pink-700 font-medium'
                  : 'border-gray-200 hover:border-pink-300 text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type de relation */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <HeartIcon className="w-6 h-6 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-800">Type de relation recherchée</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lookingForOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleInputChange('lookingFor', option.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                formData.lookingFor === option.value
                  ? 'border-pink-500 bg-pink-50 text-pink-700 font-medium'
                  : 'border-gray-200 hover:border-pink-300 text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Centres d'intérêt */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <TagIcon className="w-6 h-6 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-800">
            Centres d'intérêt recherchés ({formData.interests?.length || 0})
          </h3>
        </div>
        
        <p className="text-gray-600 mb-4">
          Sélectionnez les centres d'intérêt que vous aimeriez partager
        </p>
        
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((interest) => {
            const isSelected = formData.interests?.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => handleInterestToggle(interest)}
                className={`px-4 py-2 rounded-full border-2 transition-all text-sm ${
                  isSelected
                    ? 'border-pink-500 bg-pink-500 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-pink-300'
                }`}
              >
                {isSelected && <CheckIcon className="w-4 h-4 inline mr-1" />}
                {interest}
              </button>
            );
          })}
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
            isSubmitting || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Sauvegarde...
            </div>
          ) : (
            'Sauvegarder mes préférences'
          )}
        </button>
      </div>

      {/* Résumé des préférences */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-6 border border-pink-200">
        <h4 className="font-semibold text-gray-800 mb-3">Résumé de vos préférences</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-medium">Âge :</span> {formData.minAge}-{formData.maxAge} ans
          </p>
          <p>
            <span className="font-medium">Distance :</span> {formData.maxDistance} km maximum
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
                lookingForOptions.find(l => l.value === formData.lookingFor)?.label
              }
            </p>
          )}
          {formData.interests && formData.interests.length > 0 && (
            <p>
              <span className="font-medium">Intérêts :</span> {formData.interests.join(', ')}
            </p>
          )}
        </div>
      </div>
    </motion.form>
  );
};

export default PreferencesForm;