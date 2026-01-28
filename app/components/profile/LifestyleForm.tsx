'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ProfileFormProps } from '@/types/profiles';
import * as profileData from '../../../src/constants/profileData';

const SMOKING_OPTIONS = profileData.SMOKING_OPTIONS;
const DRINKING_OPTIONS = profileData.DRINKING_OPTIONS;
const DRUGS_OPTIONS = profileData.DRUGS_OPTIONS;
const CHILDREN_OPTIONS = profileData.CHILDREN_OPTIONS;
const PETS_OPTIONS = profileData.PETS_OPTIONS;
const EDUCATION_OPTIONS = profileData.EDUCATION_OPTIONS;

const LifestyleForm: React.FC<ProfileFormProps> = ({
  profile,
  loading,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    smoking: profile?.smoking || '',
    drinking: profile?.drinking || '',
    drugs: profile?.drugs || '',
    children: profile?.children || '',
    pets: profile?.pets || '',
    education: profile?.education || ''
  });

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

  return (
    <div className="form-section">
      <div className="form-section-header">
        <h2 className="form-section-title">
          Style de vie
        </h2>
        <p className="form-section-subtitle">
          Partagez vos habitudes pour trouver des personnes compatibles
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <div className="form-grid">
          {/* Tabac */}
          <div className="form-group">
            <label className="form-label">
              Tabac
            </label>
            <select
              value={formData.smoking}
              onChange={(e) => handleInputChange('smoking', e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez une option</option>
              {SMOKING_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Alcool */}
          <div className="form-group">
            <label className="form-label">
              Alcool
            </label>
            <select
              value={formData.drinking}
              onChange={(e) => handleInputChange('drinking', e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez une option</option>
              {DRINKING_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Drogues */}
          <div className="form-group">
            <label className="form-label">
              Drogues
            </label>
            <select
              value={formData.drugs}
              onChange={(e) => handleInputChange('drugs', e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez une option</option>
              {DRUGS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Enfants */}
          <div className="form-group">
            <label className="form-label">
              Enfants
            </label>
            <select
              value={formData.children}
              onChange={(e) => handleInputChange('children', e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez une option</option>
              {CHILDREN_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Animaux */}
          <div className="form-group">
            <label className="form-label">
              Animaux de compagnie
            </label>
            <select
              value={formData.pets}
              onChange={(e) => handleInputChange('pets', e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez une option</option>
              {PETS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Niveau d'etudes */}
          <div className="form-group">
            <label className="form-label">
              Niveau d'etudes
            </label>
            <select
              value={formData.education}
              onChange={(e) => handleInputChange('education', e.target.value)}
              className="input-field"
            >
              <option value="">Sélectionnez une option</option>
              {EDUCATION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="info-box">
          <h4 className="info-box-title">A propos de ces informations</h4>
          <p className="info-box-text">
            Ces informations sur votre style de vie aident à trouver des personnes
            partageant des valeurs et habitudes similaires. Tous les champs sont optionnels.
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
              'Sauvegarder le style de vie'
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

export default LifestyleForm;
