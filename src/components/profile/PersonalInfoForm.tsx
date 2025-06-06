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
      
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
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
          <div className="form-group">
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

        {/* Section Centres d'intérêt */}
        <div className="interests-section">
          <div className="interests-header">
            <TagIcon className="w-6 h-6 text-purple-500" />
            <h3 className="interests-title">
              Mes centres d'intérêt
            </h3>
            <span className="interests-counter">({formData.interests.length}/15)</span>
          </div>
          
          <p className="text-gray-600 mb-4">
            Sélectionnez vos centres d'intérêt pour améliorer votre profil
          </p>

          {/* Ajout d'intérêt personnalisé */}
          <div className="interests-add-section">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
              className="input-field interests-input"
              placeholder="Ajouter un centre d'intérêt personnalisé"
              disabled={formData.interests.length >= 15}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={addCustomInterest}
              disabled={formData.interests.length >= 15 || !newInterest.trim()}
              className="interests-add-button"
            >
              Ajouter
            </motion.button>
          </div>
          
          {/* Options prédéfinies */}
          <div className="interests-predefined">
            <div className="interests-grid">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = formData.interests.includes(interest);
                return (
                  <motion.button
                    key={interest}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInterestToggle(interest)}
                    className={`interest-tag-predefined ${isSelected ? 'selected' : 'unselected'}`}
                  >
                    {isSelected && <CheckIcon className="w-3 h-3 inline mr-1" />}
                    {interest}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Intérêts sélectionnés */}
          {formData.interests.length > 0 && (
            <div className="interests-selected">
              <p className="interests-selected-header">
                <span className="font-medium">Vos intérêts sélectionnés :</span>
              </p>
              <div className="interests-selected-list">
                {formData.interests.map((interest, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="interest-tag-selected"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest)}
                      className="interest-tag-remove"
                    >
                      ×
                    </button>
                  </motion.span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="info-box">
          <h4 className="info-box-title">ℹ️ À propos de ces informations</h4>
          <p className="info-box-text">
            Ces informations nous aident à vous proposer des correspondances plus pertinentes.
            Vous pouvez choisir de ne pas renseigner certains champs si vous préférez.
          </p>
        </div>

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
                Sauvegarde...
              </div>
            ) : (
              'Sauvegarder les informations'
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
      </form>
    </div>
  );
};

export default PersonalInfoForm;