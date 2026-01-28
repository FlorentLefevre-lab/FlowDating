'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { UserProfile, ProfileFormProps } from '@/types/profiles';
import { PROFESSIONS } from '@/constants/profileData';


// Type pour les données de l'API data.gouv.fr
interface CommuneData {
  nom: string;
  code: string;
  codeDepartement: string;
  codeRegion: string;
  codesPostaux: string[];
  population: number;
  departement?: {
    nom: string;
    code: string;
  };
  region?: {
    nom: string;
    code: string;
  };
}

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
  
  // États pour l'autocomplétion des villes
  const [cityQuery, setCityQuery] = useState(formData.location);
  const [cities, setCities] = useState<CommuneData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCityIndex, setSelectedCityIndex] = useState(-1);
  const [isValidCity, setIsValidCity] = useState(!!formData.location);
  const [selectedCityData, setSelectedCityData] = useState<CommuneData | null>(null);
  
  // NOUVEAU: État pour tracker si l'utilisateur a modifié le champ ville
  const [cityHasBeenModified, setCityHasBeenModified] = useState(false);
  const [originalCityValue] = useState(profile?.location || '');
  
  const cityInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Fonction pour rechercher les villes via l'API data.gouv.fr
  const searchCities = async (query: string) => {
    if (query.length < 2) {
      setCities([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codesPostaux,codeDepartement,codeRegion,population,departement,region&boost=population&limit=10`
      );
      
      if (response.ok) {
        const data: CommuneData[] = await response.json();
        setCities(data);
        setShowSuggestions(true);
        setSelectedCityIndex(-1);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de villes:', error);
      setCities([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Fonction pour valider une ville existante au chargement
  const validateExistingCity = async (cityName: string) => {
    if (!cityName.trim()) return;
    
    try {
      // Extraire le nom de la ville (sans code postal)
      const cleanCityName = cityName.split(' (')[0];
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(cleanCityName)}&fields=nom,code,codesPostaux,codeDepartement,codeRegion,population,departement,region&boost=population&limit=5`
      );
      
      if (response.ok) {
        const data: CommuneData[] = await response.json();
        // Chercher une correspondance exacte
        const matchingCity = data.find(city => {
          const expectedFormat = `${city.nom}${city.codesPostaux.length > 0 ? ` (${city.codesPostaux[0]})` : ''}`;
          return expectedFormat === cityName || city.nom === cleanCityName;
        });
        
        if (matchingCity) {
          setIsValidCity(true);
          setSelectedCityData(matchingCity);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la validation de la ville existante:', error);
    }
  };

  // Valider la ville existante au montage du composant
  useEffect(() => {
    if (formData.location && !isValidCity) {
      validateExistingCity(formData.location);
    }
  }, []);

  // Debounce de la recherche - SEULEMENT si l'utilisateur a modifié le champ
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Ne rechercher que si l'utilisateur a modifié le champ
    if (cityHasBeenModified) {
      debounceRef.current = setTimeout(() => {
        if (cityQuery.trim()) {
          searchCities(cityQuery);
        } else {
          setCities([]);
          setShowSuggestions(false);
        }
      }, 300);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [cityQuery, cityHasBeenModified]);

  // Fonction pour sélectionner une ville
  const selectCity = (city: CommuneData) => {
    const cityLocation = `${city.nom}${city.codesPostaux.length > 0 ? ` (${city.codesPostaux[0]})` : ''}`;
    
    setCityQuery(cityLocation);
    setFormData(prev => ({
      ...prev,
      location: cityLocation,
      department: city.departement?.nom || '',
      region: city.region?.nom || '',
      postcode: city.codesPostaux[0] || ''
    }));
    
    // Marquer la ville comme valide et stocker les données
    setIsValidCity(true);
    setSelectedCityData(city);
    
    setShowSuggestions(false);
    setCities([]);
    setSelectedCityIndex(-1);
    
    // Effacer l'erreur de localisation si elle existe
    if (errors.location) {
      setErrors(prev => ({ ...prev, location: '' }));
    }
  };

  // Gestion du clavier pour la navigation dans les suggestions
  const handleCityInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || cities.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedCityIndex(prev => 
          prev < cities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedCityIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedCityIndex >= 0 && selectedCityIndex < cities.length) {
          selectCity(cities[selectedCityIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedCityIndex(-1);
        cityInputRef.current?.blur();
        break;
    }
  };

  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityInputRef.current && 
        !cityInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedCityIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    
    // NOUVELLE LOGIQUE DE VALIDATION DE LA VILLE
    if (!formData.location.trim()) {
      newErrors.location = 'La ville est obligatoire';
    } else if (cityHasBeenModified) {
      // Validation stricte SEULEMENT si l'utilisateur a modifié le champ
      if (!isValidCity || !selectedCityData) {
        newErrors.location = 'Veuillez sélectionner une ville dans la liste des suggestions';
      } else {
        // Vérifier que la ville saisie correspond exactement à celle sélectionnée
        const expectedLocation = `${selectedCityData.nom}${selectedCityData.codesPostaux.length > 0 ? ` (${selectedCityData.codesPostaux[0]})` : ''}`;
        if (formData.location !== expectedLocation) {
          newErrors.location = 'La ville saisie ne correspond pas à une ville valide';
        }
      }
    }
    // Si l'utilisateur n'a pas modifié le champ, on accepte la valeur existante
    
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

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCityQuery(value);
    handleInputChange('location', value);
    
    // NOUVEAU: Marquer que le champ a été modifié dès le premier changement
    if (!cityHasBeenModified && value !== originalCityValue) {
      setCityHasBeenModified(true);
    }
    
    // Invalider la ville si l'utilisateur modifie manuellement (seulement si modifications actives)
    if (cityHasBeenModified && isValidCity && selectedCityData) {
      const expectedLocation = `${selectedCityData.nom}${selectedCityData.codesPostaux.length > 0 ? ` (${selectedCityData.codesPostaux[0]})` : ''}`;
      if (value !== expectedLocation) {
        setIsValidCity(false);
        setSelectedCityData(null);
        // Réinitialiser les champs automatiques seulement si on est en mode modification
        if (cityHasBeenModified) {
          setFormData(prev => ({
            ...prev,
            department: '',
            region: '',
            postcode: ''
          }));
        }
      }
    }
    
    // Si le champ est vidé, réinitialiser l'état
    if (!value.trim()) {
      setIsValidCity(false);
      setSelectedCityData(null);
    }
  };

  // Détermine si le submit doit être désactivé
  const shouldDisableSubmit = () => {
    if (loading) return true;
    if (!formData.location.trim()) return true;
    if (cityHasBeenModified && (!isValidCity || !selectedCityData)) return true;
    return false;
  };

  // Détermine le message d'état pour la ville
  const getCityStatusMessage = () => {
    if (!formData.location.trim()) {
      return {
        type: 'error',
        message: '❌ Aucune ville saisie - Champ obligatoire'
      };
    }
    
    if (!cityHasBeenModified) {
      return {
        type: 'info',
        message: `ℹ️ Ville actuelle : ${formData.location} (modification non requise)`
      };
    }
    
    if (isValidCity && selectedCityData) {
      return {
        type: 'success',
        message: `✅ Ville validée : ${selectedCityData.nom} (${selectedCityData.departement?.nom})`
      };
    }
    
    return {
      type: 'error',
      message: '❌ Aucune ville sélectionnée - Veuillez choisir dans les suggestions'
    };
  };

  const cityStatus = getCityStatusMessage();

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

          <div className="form-group relative">
            <label className="form-label">
              Ville *
            </label>
            <div className="relative">
              <div className="relative">
                <input
                  ref={cityInputRef}
                  type="text"
                  value={cityQuery}
                  onChange={handleCityInputChange}
                  onKeyDown={handleCityInputKeyDown}
                  onFocus={() => {
                    // Afficher les suggestions seulement si l'utilisateur a commencé à modifier ET qu'il y a des résultats
                    if (cityHasBeenModified && cities.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className={`input-field pr-10 ${errors.location ? 'error' : ''} ${
                    cityQuery && (isValidCity || !cityHasBeenModified) ? 'valid' : ''
                  }`}
                  placeholder="Tapez le nom de votre ville..."
                  autoComplete="off"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {isSearching ? (
                    <div className="loading-spinner-small"></div>
                  ) : cityQuery && (isValidCity || !cityHasBeenModified) ? (
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : cityQuery && cityHasBeenModified && !isValidCity ? (
                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {cityHasBeenModified && cityQuery && !isValidCity && !isSearching && cities.length === 0 && (
                <div className="mt-1 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  💡 Aucune ville trouvée. Vérifiez l'orthographe ou essayez un nom plus court.
                </div>
              )}

              {errors.location && (
                <p className="form-error">
                  <span>⚠️</span>
                  {errors.location}
                </p>
              )}

              <AnimatePresence>
                {showSuggestions && cities.length > 0 && cityHasBeenModified && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
                  >
                    {cities.map((city, index) => (
                      <motion.div
                        key={`${city.code}-${index}`}
                        whileHover={{ backgroundColor: '#f3f4f6' }}
                        onClick={() => selectCity(city)}
                        className={`
                          px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0
                          ${selectedCityIndex === index ? 'bg-purple-50 border-purple-200' : ''}
                          hover:bg-gray-50 transition-colors
                        `}
                      >
                        <div className="flex items-center space-x-3">
                          <MapPinIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {city.nom}
                              </span>
                              {city.codesPostaux.length > 0 && (
                                <span className="text-sm text-gray-500">
                                  ({city.codesPostaux[0]})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {city.departement?.nom && city.region?.nom && (
                                <span>{city.departement.nom}, {city.region.nom}</span>
                              )}
                              {city.population && (
                                <span className="ml-2">• {city.population.toLocaleString()} hab.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {(formData.department || formData.region || formData.postcode) && (
          <div className="form-grid">
            {formData.department && (
              <div className="form-group">
                <label className="form-label">
                  Département
                </label>
                <input
                  type="text"
                  value={formData.department}
                  readOnly
                  className="input-field bg-gray-50 text-gray-700"
                  placeholder="Rempli automatiquement"
                />
              </div>
            )}

            {formData.region && (
              <div className="form-group">
                <label className="form-label">
                  Région
                </label>
                <input
                  type="text"
                  value={formData.region}
                  readOnly
                  className="input-field bg-gray-50 text-gray-700"
                  placeholder="Rempli automatiquement"
                />
              </div>
            )}

            {formData.postcode && (
              <div className="form-group">
                <label className="form-label">
                  Code postal
                </label>
                <input
                  type="text"
                  value={formData.postcode}
                  readOnly
                  className="input-field bg-gray-50 text-gray-700"
                  placeholder="Rempli automatiquement"
                />
              </div>
            )}
          </div>
        )}

        <div className="info-box">
          <h4 className="info-box-title">ℹ️ Validation des données</h4>
          <p className="info-box-text">
            <strong>Ville (obligatoire) :</strong> Si vous modifiez la ville, vous devez obligatoirement sélectionner une ville dans la liste des suggestions. Si vous conservez la ville existante, aucune revalidation n'est nécessaire.
            <span className={`block mt-1 ${
              cityStatus.type === 'success' ? 'text-green-600' : 
              cityStatus.type === 'error' ? 'text-red-600' : 
              'text-blue-600'
            }`}>
              {cityStatus.message}
            </span>
          </p>
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
            disabled={shouldDisableSubmit()}
            className={`btn-section-primary ${
              shouldDisableSubmit() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
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
          
          {shouldDisableSubmit() && !loading && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              ⚠️ {!formData.location.trim() 
                ? 'Veuillez saisir une ville.' 
                : 'Impossible de sauvegarder : veuillez sélectionner une ville valide dans les suggestions.'}
            </div>
          )}
        </div>
      </form>

      <style jsx>{`
        .loading-spinner-small {
          @apply inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-purple-500 border-r-transparent;
        }
        
        .input-field:focus {
          @apply outline-none ring-2 ring-purple-500 border-transparent;
        }
        
        .input-field.error {
          @apply border-red-500 ring-2 ring-red-200;
        }
        
        .input-field.valid {
          @apply border-green-500 ring-2 ring-green-200;
        }
        
        .form-error {
          @apply mt-1 text-sm text-red-600 flex items-center space-x-1;
        }
        
        .character-counter {
          @apply flex justify-between items-center mt-1;
        }
        
        .character-count {
          @apply text-sm text-gray-500;
        }
        
        .info-box {
          @apply bg-blue-50 border border-blue-200 rounded-lg p-4;
        }
        
        .info-box-title {
          @apply font-semibold text-blue-900 mb-2;
        }
        
        .info-box-text {
          @apply text-blue-800 text-sm leading-relaxed;
        }
      `}</style>
    </div>
  );
};

export default BasicInfoForm;