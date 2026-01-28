'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ProfileFormProps } from '@/types/profiles';
import * as profileData from '../../../src/constants/profileData';

const BODY_TYPES = profileData.BODY_TYPES;
const EYE_COLORS = profileData.EYE_COLORS;
const HAIR_COLORS = profileData.HAIR_COLORS;

const PhysicalInfoForm: React.FC<ProfileFormProps> = ({
  profile,
  loading,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    height: profile?.height || '',
    weight: profile?.weight || '',
    bodyType: profile?.bodyType || '',
    eyeColor: profile?.eyeColor || '',
    hairColor: profile?.hairColor || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        height: formData.height ? parseInt(String(formData.height)) : null,
        weight: formData.weight ? parseInt(String(formData.weight)) : null
      };
      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Erreur soumission:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="form-section">
      <div className="form-section-header">
        <h2 className="form-section-title">
          Caractéristiques physiques
        </h2>
        <p className="form-section-subtitle">
          Ces informations aident à affiner les suggestions de profils compatibles
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <div className="form-grid">
          {/* Taille */}
          <div className="form-group">
            <label className="form-label">
              Taille (cm)
            </label>
            <input
              type="number"
              min="100"
              max="250"
              value={formData.height}
              onChange={(e) => handleInputChange('height', e.target.value)}
              className="input-field"
              placeholder="Ex: 175"
            />
            <p className="text-sm text-gray-500 mt-1">Entre 100 et 250 cm</p>
          </div>

          {/* Poids */}
          <div className="form-group">
            <label className="form-label">
              Poids (kg)
            </label>
            <input
              type="number"
              min="30"
              max="300"
              value={formData.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              className="input-field"
              placeholder="Ex: 70"
            />
            <p className="text-sm text-gray-500 mt-1">Entre 30 et 300 kg</p>
          </div>

          {/* Silhouette */}
          <div className="form-group">
            <label className="form-label">
              Silhouette
            </label>
            <select
              value={formData.bodyType}
              onChange={(e) => handleInputChange('bodyType', e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez votre silhouette</option>
              {BODY_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Couleur des yeux */}
          <div className="form-group">
            <label className="form-label">
              Couleur des yeux
            </label>
            <select
              value={formData.eyeColor}
              onChange={(e) => handleInputChange('eyeColor', e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez la couleur</option>
              {EYE_COLORS.map(color => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
          </div>

          {/* Couleur des cheveux */}
          <div className="form-group">
            <label className="form-label">
              Couleur des cheveux
            </label>
            <select
              value={formData.hairColor}
              onChange={(e) => handleInputChange('hairColor', e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez la couleur</option>
              {HAIR_COLORS.map(color => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="info-box">
          <h4 className="info-box-title">A propos de ces informations</h4>
          <p className="info-box-text">
            Ces informations sont optionnelles mais peuvent aider les autres utilisateurs
            à mieux vous connaître. Vous pouvez choisir de ne pas les renseigner.
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
              'Sauvegarder les caractéristiques'
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

export default PhysicalInfoForm;
