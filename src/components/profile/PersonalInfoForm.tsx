'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, TagIcon } from '@heroicons/react/24/outline';
import { UserProfile, ProfileFormProps } from '../../types/profiles';
import { 
  GENDERS, 
  PROFESSIONS, 
  MARITAL_STATUS, 
  ZODIAC_SIGNS, 
  DIET_TYPES, 
  RELIGIONS, 
  ETHNICITIES,
  INTEREST_OPTIONS 
} from '../../constants/profileData';

const PersonalInfoForm: React.FC<ProfileFormProps> = ({ 
  profile, 
  loading, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    gender: profile?.gender || '',
    profession: profile?.profession || '',
    maritalStatus: profile?.maritalStatus || '',
    zodiacSign: profile?.zodiacSign || '',
    dietType: profile?.dietType || '',
    religion: profile?.religion || '',
    ethnicity: profile?.ethnicity || '',
    interests: profile?.interests || []
  });

  const [newInterest, setNewInterest] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur soumission:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInterestToggle = (interest: string) => {
    const newInterests = formData.interests.includes(interest)
      ? formData.interests.filter(i => i !== interest)
      : [...formData.interests, interest];
    
    setFormData(prev => ({ ...prev, interests: newInterests }));
  };

  const addCustomInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim()) && formData.interests.length < 15) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  return (
    <div className="form-section">
      <div className="form-section-header">
        <h2 className="form-section-title">
          Informations personnelles
        </h2>
        <p className="form-section-subtitle">
          Ces informations nous aident à vous proposer de meilleures correspondances
        </p>
      </div>
      
      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit} 
        className="space-y-responsive max-w-4xl"
      >
        {/* Section 1 : Informations de base */}
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Informations de base
          </h3>
          
          <div className="form-grid">
            {/* Genre */}
            <div className="form-group">
              <label className="form-label">
                Genre
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="input-field"
              >
                <option value="">Sélectionnez votre genre</option>
                {GENDERS.map(gender => (
                  <option key={gender.value} value={gender.value}>
                    {gender.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Profession */}
            <div className="form-group">
              <label className="form-label">
                Profession
              </label>
              <select
                value={formData.profession}
                onChange={(e) => handleInputChange('profession', e.target.value)}
                className="input-field"
              >
                <option value="">Sélectionnez votre profession</option>
                {PROFESSIONS.map(profession => (
                  <option key={profession.value} value={profession.value}>
                    {profession.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Statut marital */}
            <div className="form-group">
              <label className="form-label">
                Statut marital
              </label>
              <select
                value={formData.maritalStatus}
                onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                className="input-field"
              >
                <option value="">Sélectionnez votre statut</option>
                {MARITAL_STATUS.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Signe astrologique */}
            <div className="form-group">
              <label className="form-label">
                Signe astrologique
              </label>
              <select
                value={formData.zodiacSign}
                onChange={(e) => handleInputChange('zodiacSign', e.target.value)}
                className="input-field"
              >
                <option value="">Sélectionnez votre signe</option>
                {ZODIAC_SIGNS.map(sign => (
                  <option key={sign.value} value={sign.value}>
                    {sign.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2 : Style de vie */}
        <div className="bg-blue-50 rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Style de vie
          </h3>
          
          <div className="form-grid">
            {/* Régime alimentaire */}
            <div className="form-group">
              <label className="form-label">
                Régime alimentaire
              </label>
              <select
                value={formData.dietType}
                onChange={(e) => handleInputChange('dietType', e.target.value)}
                className="input-field"
              >
                <option value="">Sélectionnez votre régime</option>
                {DIET_TYPES.map(diet => (
                  <option key={diet.value} value={diet.value}>
                    {diet.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Religion */}
            <div className="form-group">
              <label className="form-label">
                Religion / Spiritualité
              </label>
              <select
                value={formData.religion}
                onChange={(e) => handleInputChange('religion', e.target.value)}
                className="input-field"
              >
                <option value="">Sélectionnez votre religion</option>
                {RELIGIONS.map(religion => (
                  <option key={religion.value} value={religion.value}>
                    {religion.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Origine ethnique */}
            <div className="form-group md:col-span-2">
              <label className="form-label">
                Origine ethnique (optionnel)
              </label>
              <select
                value={formData.ethnicity}
                onChange={(e) => handleInputChange('ethnicity', e.target.value)}
                className="input-field"
              >
                <option value="">Sélectionnez votre origine</option>
                {ETHNICITIES.map(ethnicity => (
                  <option key={ethnicity.value} value={ethnicity.value}>
                    {ethnicity.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section Centres d'intérêt - Responsive */}
        <div className="interests-section">
          <div className="interests-header">
            <TagIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            <h3 className="interests-title text-base sm:text-lg">
              Mes centres d'intérêt
            </h3>
            <span className="interests-counter text-xs sm:text-sm">({formData.interests.length}/15)</span>
          </div>
          
          <p className="text-gray-600 mb-4 text-sm sm:text-base">
            Sélectionnez vos centres d'intérêt pour améliorer votre profil
          </p>

          {/* Ajout d'intérêt personnalisé - Mobile first */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
                className="input-field flex-1"
                placeholder="Ajouter un intérêt personnalisé"
                disabled={formData.interests.length >= 15}
                maxLength={30}
              />
              <button
                type="button"
                onClick={addCustomInterest}
                disabled={formData.interests.length >= 15 || !newInterest.trim()}
                className="interests-add-button"
              >
                <span className="hidden sm:inline">Ajouter</span>
                <span className="sm:hidden">+</span>
              </button>
            </div>
          </div>
      
          {/* Options prédéfinies - Responsive grid */}
          <div className="interests-predefined">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = formData.interests.includes(interest);
                return (
                  <motion.button
                    key={interest}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInterestToggle(interest)}
                    className={`interest-tag-predefined text-xs sm:text-sm ${isSelected ? 'selected' : 'unselected'}`}
                  >
                    {isSelected && <CheckIcon className="w-3 h-3 inline mr-1" />}
                    <span className="truncate">{interest}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Intérêts sélectionnés */}
          {formData.interests.length > 0 && (
            <div className="interests-selected">
              <p className="interests-selected-header text-sm sm:text-base">
                <span className="font-medium">Vos intérêts sélectionnés :</span>
              </p>
              <div className="interests-selected-list">
                {formData.interests.map((interest) => (
                  <motion.span
                    key={interest}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="interest-tag-selected text-xs sm:text-sm"
                  >
                    <span className="truncate max-w-[100px] sm:max-w-none">{interest}</span>
                    <button
                      type="button"
                      onClick={() => removeInterest(interest)}
                      className="interest-tag-remove"
                      aria-label={`Supprimer ${interest}`}
                    >
                      ×
                    </button>
                  </motion.span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info box responsive */}
        <div className="info-box">
          <h4 className="info-box-title text-sm sm:text-base">ℹ️ À propos de ces informations</h4>
          <p className="info-box-text text-xs sm:text-sm">
            Ces informations nous aident à vous proposer des correspondances plus pertinentes.
            Vous pouvez choisir de ne pas renseigner certains champs si vous préférez.
          </p>
        </div>

        {/* Actions - Responsive */}
        <div className="section-actions">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="btn-section-primary"
          >
            {loading ? (
              <div className="loading-content">
                <div className="loading-spinner"></div>
                <span className="hidden sm:inline">Sauvegarde...</span>
                <span className="sm:hidden">...</span>
              </div>
            ) : (
              <>
                <span className="hidden sm:inline">Sauvegarder les informations</span>
                <span className="sm:hidden">Sauvegarder</span>
              </>
            )}
          </motion.button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-section-secondary"
          >
            Annuler
          </button>
        </div>
      </motion.form>
    </div>
  );
};

export default PersonalInfoForm;