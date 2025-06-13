'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, TagIcon, Bars3Icon } from '@heroicons/react/24/outline';
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
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const MAX_INTERESTS = 9;

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
    const isSelected = formData.interests.includes(interest);
    
    if (isSelected) {
      // Retirer l'intérêt
      const newInterests = formData.interests.filter(i => i !== interest);
      setFormData(prev => ({ ...prev, interests: newInterests }));
    } else {
      // Ajouter l'intérêt (si limite pas atteinte)
      if (formData.interests.length < MAX_INTERESTS) {
        setFormData(prev => ({
          ...prev,
          interests: [...prev.interests, interest]
        }));
      }
    }
  };

  const addCustomInterest = () => {
    if (newInterest.trim() && 
        !formData.interests.includes(newInterest.trim()) && 
        formData.interests.length < MAX_INTERESTS) {
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

  // Fonctions de drag and drop
  const handleDragStart = (e: React.DragEvent, interest: string) => {
    setDraggedItem(interest);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const dragIndex = formData.interests.indexOf(draggedItem);
    if (dragIndex === -1) return;
    
    const newInterests = [...formData.interests];
    
    // Retirer l'élément de sa position actuelle
    newInterests.splice(dragIndex, 1);
    
    // L'insérer à la nouvelle position
    newInterests.splice(dropIndex, 0, draggedItem);
    
    setFormData(prev => ({ ...prev, interests: newInterests }));
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
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
            <span className="interests-counter">
              ({formData.interests.length}/{MAX_INTERESTS})
            </span>
          </div>
          
          {formData.interests.length >= MAX_INTERESTS && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-amber-800 text-sm">
                ⚠️ Vous avez sélectionné le maximum d'intérêts ({MAX_INTERESTS}). 
                Supprimez-en un pour pouvoir en ajouter d'autres.
              </p>
            </div>
          )}
          
          {/* Options prédéfinies */}
          <div className="interests-predefined">
            <div className="interests-grid">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = formData.interests.includes(interest);
                const isDisabled = !isSelected && formData.interests.length >= MAX_INTERESTS;
                
                return (
                  <motion.button
                    key={interest}
                    type="button"
                    whileHover={!isDisabled ? { scale: 1.05 } : {}}
                    whileTap={!isDisabled ? { scale: 0.95 } : {}}
                    onClick={() => !isDisabled && handleInterestToggle(interest)}
                    disabled={isDisabled}
                    className={`interest-tag-predefined ${
                      isSelected 
                        ? 'selected' 
                        : isDisabled 
                          ? 'disabled opacity-50 cursor-not-allowed' 
                          : 'unselected'
                    }`}
                  >
                    {isSelected && <CheckIcon className="w-3 h-3 inline mr-1" />}
                    {interest}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Intérêts sélectionnés avec drag and drop */}
          {formData.interests.length > 0 && (
            <div className="interests-selected">
              <p className="interests-selected-header">
                <span className="font-medium">
                  Vos intérêts par ordre de préférence :
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  (Glissez-déposez pour réorganiser)
                </span>
              </p>
              <div className="interests-selected-list space-y-2">
                {formData.interests.map((interest, index) => (
                  <motion.div
                    key={interest}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`
                      interest-item-draggable group
                      ${draggedItem === interest ? 'opacity-50' : ''}
                      ${dragOverIndex === index ? 'border-purple-400 bg-purple-50' : ''}
                    `}
                    draggable
                    onDragStart={(e) => handleDragStart(e, interest)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Numéro de préférence */}
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      
                      {/* Icône de drag */}
                      <Bars3Icon className="w-4 h-4 text-gray-400 cursor-move group-hover:text-purple-500 transition-colors" />
                      
                      {/* Nom de l'intérêt */}
                      <span className="flex-1 text-gray-700 font-medium">
                        {interest}
                      </span>
                      
                      {/* Bouton de suppression */}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold hover:bg-red-200 transition-colors"
                        title="Supprimer cet intérêt"
                      >
                        ×
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="info-box">
          <h4 className="info-box-title">ℹ️ À propos de ces informations</h4>
          <p className="info-box-text">
            Ces informations nous aident à vous proposer des correspondances plus pertinentes.
            L'ordre de vos intérêts indique vos préférences (1 = le plus important).
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

      {/* Styles CSS supplémentaires */}
      <style jsx>{`
        .interest-item-draggable {
          @apply bg-white border border-gray-200 rounded-lg p-4 cursor-move transition-all duration-200;
        }
        
        .interest-item-draggable:hover {
          @apply shadow-md border-purple-300;
        }
        
        .interests-selected-list {
          @apply space-y-2;
        }
        
        .interest-tag-predefined.disabled {
          @apply opacity-50 cursor-not-allowed bg-gray-100 text-gray-400;
        }
        
        .interest-tag-predefined.disabled:hover {
          @apply scale-100;
        }
      `}</style>
    </div>
  );
};

export default PersonalInfoForm;