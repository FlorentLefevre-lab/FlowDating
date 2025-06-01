// types/profile.ts
export interface Photo {
    id: string;
    url: string;
    isPrimary: boolean;
    createdAt: string;
  }
  
  export interface UserProfile {
    id: string;
    name: string | null;
    email: string;
    age: number | null;
    bio: string | null;
    location: string | null;
    interests: string[];
    photos: Photo[];
    gender: string | null;
    profession: string | null;
    maritalStatus: string | null;
    zodiacSign: string | null;
    dietType: string | null;
    religion: string | null;
    ethnicity: string | null;
    preferences?: {
      minAge: number;
      maxAge: number;
      maxDistance: number;
      genderPreference: string | null;
    };
    createdAt: string;
    updatedAt: string;
  }
  
  export type TabType = 'dashboard' | 'overview' | 'edit' | 'personal' | 'photos' | 'preferences' | 'settings';
  
  // constants/profile.ts
  export const GENDERS = [
    { value: 'HOMME', label: 'Homme' },
    { value: 'FEMME', label: 'Femme' },
    { value: 'NON_BINAIRE', label: 'Non binaire' },
    { value: 'AUTRE', label: 'Autre' }
  ];
  
  export const PROFESSIONS = [
    { value: 'SANTE', label: 'Santé & Médical' },
    { value: 'EDUCATION', label: 'Éducation & Formation' },
    { value: 'TECH', label: 'Technologie & IT' },
    { value: 'FINANCE', label: 'Finance & Banque' },
    { value: 'DROIT', label: 'Droit & Justice' },
    { value: 'ARTS', label: 'Arts & Créatif' },
    { value: 'MEDIA', label: 'Médias & Communication' },
    { value: 'COMMERCE', label: 'Commerce & Vente' },
    { value: 'INGENIERIE', label: 'Ingénierie' },
    { value: 'RESTAURATION', label: 'Restauration & Hôtellerie' },
    { value: 'TRANSPORT', label: 'Transport & Logistique' },
    { value: 'AGRICULTURE', label: 'Agriculture & Environnement' },
    { value: 'SPORT', label: 'Sport & Fitness' },
    { value: 'SERVICES', label: 'Services' },
    { value: 'ETUDIANT', label: 'Étudiant(e)' },
    { value: 'RETRAITE', label: 'Retraité(e)' },
    { value: 'RECHERCHE_EMPLOI', label: 'En recherche d\'emploi' },
    { value: 'ENTREPRENEUR', label: 'Entrepreneur' },
    { value: 'AUTRE', label: 'Autre' }
  ];
  
  export const MARITAL_STATUS = [
    { value: 'CELIBATAIRE', label: 'Célibataire' },
    { value: 'DIVORCE', label: 'Divorcé(e)' },
    { value: 'VEUF', label: 'Veuf/Veuve' },
    { value: 'SEPARE', label: 'Séparé(e)' },
    { value: 'COMPLIQUE', label: 'C\'est compliqué' }
  ];
  
  export const ZODIAC_SIGNS = [
    { value: 'BELIER', label: 'Bélier ♈' },
    { value: 'TAUREAU', label: 'Taureau ♉' },
    { value: 'GEMEAUX', label: 'Gémeaux ♊' },
    { value: 'CANCER', label: 'Cancer ♋' },
    { value: 'LION', label: 'Lion ♌' },
    { value: 'VIERGE', label: 'Vierge ♍' },
    { value: 'BALANCE', label: 'Balance ♎' },
    { value: 'SCORPION', label: 'Scorpion ♏' },
    { value: 'SAGITTAIRE', label: 'Sagittaire ♐' },
    { value: 'CAPRICORNE', label: 'Capricorne ♑' },
    { value: 'VERSEAU', label: 'Verseau ♒' },
    { value: 'POISSONS', label: 'Poissons ♓' }
  ];
  
  export const DIET_TYPES = [
    { value: 'OMNIVORE', label: 'Omnivore' },
    { value: 'VEGETARIEN', label: 'Végétarien' },
    { value: 'VEGETALIEN', label: 'Végétalien/Vegan' },
    { value: 'PESCETARIEN', label: 'Pescétarien' },
    { value: 'FLEXITARIEN', label: 'Flexitarien' },
    { value: 'CRUDIVORE', label: 'Crudivore' },
    { value: 'SANS_GLUTEN', label: 'Sans gluten' },
    { value: 'KETO', label: 'Keto/Cétogène' },
    { value: 'AUTRE', label: 'Autre régime' }
  ];
  
  export const RELIGIONS = [
    { value: 'ATHEE', label: 'Athée' },
    { value: 'AGNOSTIQUE', label: 'Agnostique' },
    { value: 'CHRETIEN', label: 'Chrétien' },
    { value: 'CATHOLIQUE', label: 'Catholique' },
    { value: 'PROTESTANT', label: 'Protestant' },
    { value: 'ORTHODOXE', label: 'Orthodoxe' },
    { value: 'MUSULMAN', label: 'Musulman' },
    { value: 'JUIF', label: 'Juif' },
    { value: 'BOUDDHISTE', label: 'Bouddhiste' },
    { value: 'HINDOU', label: 'Hindou' },
    { value: 'SIKH', label: 'Sikh' },
    { value: 'SPIRITUEL', label: 'Spirituel (non religieux)' },
    { value: 'AUTRE', label: 'Autre religion' }
  ];
  
  export const ETHNICITIES = [
    { value: 'CAUCASIEN', label: 'Caucasien/Blanc' },
    { value: 'AFRODESCENDANT', label: 'Afrodescendant/Noir' },
    { value: 'ASIATIQUE', label: 'Asiatique' },
    { value: 'HISPANIQUE', label: 'Hispanique/Latino' },
    { value: 'ARABE', label: 'Arabe/Moyen-Orient' },
    { value: 'AMERINDIEN', label: 'Amérindien' },
    { value: 'PACIFIQUE', label: 'Îles du Pacifique' },
    { value: 'METISSE', label: 'Métissé/Mixte' },
    { value: 'AUTRE', label: 'Autre' },
    { value: 'PREFERE_PAS_DIRE', label: 'Préfère ne pas dire' }
  ];
  
  // Fonction helper pour obtenir le label
  export const getLabel = (value: string | null, options: { value: string; label: string }[]) => {
    if (!value) return 'Non défini';
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };