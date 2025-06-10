// components/common/LocationAutoComplete.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPinIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface ApiCity {
  properties: {
    label: string;
    name: string;
    context: string;
    city: string;
    citycode: string;
    postcode: string;
    population?: number;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface LocationData {
  city: string;
  department: string;
  region: string;
  fullAddress: string;
  postcode: string;
  coordinates?: [number, number];
}

interface Props {
  value: string;
  onChange: (locationData: LocationData) => void;
  placeholder?: string;
  className?: string;
}

// Base de données de fallback pour les villes principales
const FALLBACK_CITIES = [
  { name: "Chauny", department: "Aisne", region: "Hauts-de-France", postcode: "02300" },
  { name: "Laon", department: "Aisne", region: "Hauts-de-France", postcode: "02000" },
  { name: "Paris", department: "Paris", region: "Île-de-France", postcode: "75000" },
  { name: "Lyon", department: "Rhône", region: "Auvergne-Rhône-Alpes", postcode: "69000" },
  { name: "Marseille", department: "Bouches-du-Rhône", region: "Provence-Alpes-Côte d'Azur", postcode: "13000" },
  { name: "Toulouse", department: "Haute-Garonne", region: "Occitanie", postcode: "31000" },
  { name: "Nice", department: "Alpes-Maritimes", region: "Provence-Alpes-Côte d'Azur", postcode: "06000" },
  { name: "Nantes", department: "Loire-Atlantique", region: "Pays de la Loire", postcode: "44000" },
  { name: "Strasbourg", department: "Bas-Rhin", region: "Grand Est", postcode: "67000" },
  { name: "Montpellier", department: "Hérault", region: "Occitanie", postcode: "34000" },
  { name: "Bordeaux", department: "Gironde", region: "Nouvelle-Aquitaine", postcode: "33000" },
  { name: "Lille", department: "Nord", region: "Hauts-de-France", postcode: "59000" },
  { name: "Rennes", department: "Ille-et-Vilaine", region: "Bretagne", postcode: "35000" },
];

// Fonction de recherche locale en fallback
const searchLocalCities = (query: string) => {
  const normalizedQuery = query.toLowerCase().trim();
  return FALLBACK_CITIES
    .filter(city => 
      city.name.toLowerCase().includes(normalizedQuery) ||
      city.department.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, 8)
    .map(city => ({
      properties: {
        label: `${city.name} ${city.postcode}`,
        name: city.name,
        context: `${city.postcode.substring(0,2)}, ${city.department}, ${city.region}`,
        city: city.name,
        citycode: city.postcode.substring(0,2) + "000",
        postcode: city.postcode,
        population: 50000
      },
      geometry: {
        coordinates: [2.0, 49.0] as [number, number]
      }
    }));
};
const parseContext = (context: string): { department: string; region: string } => {
  // Le contexte est au format: "Code département, Département, Région"
  // Exemple: "69, Rhône, Auvergne-Rhône-Alpes"
  const parts = context.split(', ');
  if (parts.length >= 3) {
    return {
      department: parts[1].trim(),
      region: parts[2].trim()
    };
  }
  // Fallback si le format est différent
  return {
    department: parts[parts.length - 2]?.trim() || '',
    region: parts[parts.length - 1]?.trim() || ''
  };
};

const LocationAutoComplete: React.FC<Props> = ({ 
  value, 
  onChange, 
  placeholder = "Tapez votre ville...",
  className = ""
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<ApiCity[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fonction de recherche avec l'API Adresse
  const searchCities = useCallback(async (query: string): Promise<void> => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouveau AbortController pour cette requête
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const encodedQuery = encodeURIComponent(query.trim());
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodedQuery}&type=municipality&limit=8&autocomplete=1`;
      
      console.log('🔍 Recherche API:', url);
      
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      console.log('📡 Réponse API:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API:', errorText);
        throw new Error(`Erreur API: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Données reçues:', data);
      
      if (data.features && Array.isArray(data.features)) {
        console.log('✅ Suggestions trouvées:', data.features.length);
        setSuggestions(data.features);
        setShowSuggestions(data.features.length > 0);
      } else {
        console.log('⚠️ Aucune suggestion dans la réponse');
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('❌ Erreur de recherche complète:', err);
        console.log('🔄 Tentative avec base de données locale...');
        
        // Fallback vers la base locale
        const localResults = searchLocalCities(query);
        if (localResults.length > 0) {
          console.log('✅ Résultats locaux trouvés:', localResults.length);
          setSuggestions(localResults);
          setShowSuggestions(true);
          setError(null);
        } else {
          setError(`Erreur de recherche: ${err.message}`);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce pour éviter trop de requêtes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCities(inputValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue, searchCities]);

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Gestion de la saisie
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
    setError(null);
  };

  // Sélection d'une suggestion
  const selectSuggestion = (city: ApiCity) => {
    const { department, region } = parseContext(city.properties.context);
    const fullAddress = city.properties.label;
    
    console.log('🎯 Sélection de la ville:', {
      city: city.properties.city || city.properties.name,
      department,
      region,
      fullAddress,
      postcode: city.properties.postcode
    });
    
    setInputValue(fullAddress);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    const locationData = {
      city: city.properties.city || city.properties.name,
      department: department,
      region: region,
      fullAddress: fullAddress,
      postcode: city.properties.postcode,
      coordinates: city.geometry.coordinates
    };
    
    console.log('📤 Envoi des données vers le formulaire:', locationData);
    onChange(locationData);
  };

  // Navigation au clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Fermer les suggestions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      console.log('🖱️ Clic détecté, target:', event.target);
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        const suggestionContainer = inputRef.current.parentElement?.querySelector('[data-suggestions]');
        if (suggestionContainer && suggestionContainer.contains(event.target as Node)) {
          console.log('🎯 Clic dans les suggestions, ne pas fermer');
          return;
        }
        console.log('🚪 Fermeture des suggestions (clic extérieur)');
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll automatique vers l'élément sélectionné
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className={`w-full p-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all ${className}`}
          autoComplete="off"
        />
        <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        
        {loading ? (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
          </div>
        ) : (
          <ChevronDownIcon className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
        )}
      </div>

      {error && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-red-200 rounded-lg shadow-lg p-3">
          <div className="text-red-600 text-center text-sm">
            {error}
          </div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && !error && (
        <div 
          data-suggestions="true"
          className="absolute z-[9999] w-full mt-1 bg-white border-2 border-pink-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
        >
          {suggestions.map((city, index) => {
            const { department, region } = parseContext(city.properties.context);
            return (
              <div
                key={`${city.properties.citycode}-${index}`}
                ref={el => suggestionRefs.current[index] = el}
                onMouseDown={(e) => {
                  console.log('🖱️ MouseDown sur suggestion:', city.properties.name);
                  e.preventDefault();
                  e.stopPropagation();
                  // Exécuter la sélection directement dans mouseDown
                  selectSuggestion(city);
                }}
                onClick={(e) => {
                  console.log('🎯 Clic sur suggestion:', city.properties.name);
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`p-3 cursor-pointer transition-colors ${
                  index === selectedIndex 
                    ? 'bg-pink-50 border-l-4 border-pink-500' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {city.properties.city || city.properties.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {department} • {region}
                    </div>
                    <div className="text-xs text-gray-500">
                      {city.properties.postcode}
                    </div>
                  </div>
                  {city.properties.population && (
                    <div className="text-xs text-gray-400 ml-2">
                      {(city.properties.population / 1000).toFixed(0)}k hab.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !loading && !error && inputValue.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <div className="text-gray-500 text-center text-sm">
            Aucune ville trouvée pour "{inputValue}"
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAutoComplete;