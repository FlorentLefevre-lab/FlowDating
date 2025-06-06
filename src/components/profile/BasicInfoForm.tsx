'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserProfile, ProfileFormProps } from '../../types/profiles';
import { PROFESSIONS } from '../../constants/profileData';

const BasicInfoForm: React.FC<ProfileFormProps> = ({ 
  profile, 
  loading, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    age: profile?.age || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    department: profile?.department || '',
    region: profile?.region || '',
    postcode: profile?.postcode || '',
    profession: profile?.profession || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Nom trop long (max 100 caractères)';
    }
    
    if (formData.age && (formData.age < 18 || formData.age > 100)) {
      newErrors.age = 'Âge doit être entre 18 et 100 ans';
    }
    
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio limitée à 500 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur soumission:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur quand l'utilisateur corrige
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="form-section">
      <div className="form-section-header">
        <h2 className="form-section-title">
          Informations de base
        </h2>
        <p className="form-section-subtitle">
          Renseignez vos informations principales pour créer votre profil
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">
              Nom complet *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`input-field ${errors.name ? 'error' : ''}`}
              placeholder="Votre nom complet"
              required
            />
            {errors.name && (
              <p className="form-error">
                <span>⚠️</span>
                {errors.name}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Âge
            </label>
            <input
              type="number"
              min="18"
              max="100"
              value={formData.age}
              onChange={(e) => handleInputChange('age', parseInt(e.target.value) || '')}
              className={`input-field ${errors.age ? 'error' : ''}`}
              placeholder="Votre âge"
            />
            {errors.age && (
              <p className="form-error">
                <span>⚠️</span>
                {errors.age}
              </p>
            )}
          </div>
        </div>

        <div className="form-grid">
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

          <div className="form-group">
            <label className="form-label">
              Localisation
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="input-field"
              placeholder="Ville, Région"
            />
          </div>
        </div>

        <div className="form-group form-grid-full">
          <label className="form-label">
            Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            rows={4}
            maxLength={500}
            className={`input-field ${errors.bio ? 'error' : ''}`}
            placeholder="Parlez un peu de vous..."
          />
          <div className="character-counter">
            {errors.bio && (
              <p className="form-error">
                <span>⚠️</span>
                {errors.bio}
              </p>
            )}
            <div className="character-count">
              {formData.bio.length}/500 caractères
            </div>
          </div>
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
              'Sauvegarder les modifications'
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

export default BasicInfoForm;