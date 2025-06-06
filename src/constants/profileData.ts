// src/constants/profileData.ts

export const GENDERS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
  { value: 'non-binaire', label: 'Non-binaire' },
  { value: 'autre', label: 'Autre' },
  { value: 'prefer-not-to-say', label: 'Préfère ne pas dire' }
];

export const PROFESSIONS = [
  { value: 'etudiant', label: 'Étudiant(e)' },
  { value: 'ingenieur', label: 'Ingénieur(e)' },
  { value: 'medecin', label: 'Médecin' },
  { value: 'enseignant', label: 'Enseignant(e)' },
  { value: 'avocat', label: 'Avocat(e)' },
  { value: 'artiste', label: 'Artiste' },
  { value: 'entrepreneur', label: 'Entrepreneur(se)' },
  { value: 'commercial', label: 'Commercial(e)' },
  { value: 'developpeur', label: 'Développeur(se)' },
  { value: 'designer', label: 'Designer' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'sante', label: 'Santé' },
  { value: 'education', label: 'Éducation' },
  { value: 'restauration', label: 'Restauration' },
  { value: 'sport', label: 'Sport' },
  { value: 'mode', label: 'Mode' },
  { value: 'media', label: 'Médias' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'transport', label: 'Transport' },
  { value: 'securite', label: 'Sécurité' },
  { value: 'fonction-publique', label: 'Fonction publique' },
  { value: 'retraite', label: 'Retraité(e)' },
  { value: 'recherche-emploi', label: 'En recherche d\'emploi' },
  { value: 'autre', label: 'Autre' }
];

export const MARITAL_STATUS = [
  { value: 'celibataire', label: 'Célibataire' },
  { value: 'divorce', label: 'Divorcé(e)' },
  { value: 'veuf', label: 'Veuf(ve)' },
  { value: 'separe', label: 'Séparé(e)' },
  { value: 'complique', label: 'C\'est compliqué' }
];

export const ZODIAC_SIGNS = [
  { value: 'belier', label: 'Bélier ♈' },
  { value: 'taureau', label: 'Taureau ♉' },
  { value: 'gemeaux', label: 'Gémeaux ♊' },
  { value: 'cancer', label: 'Cancer ♋' },
  { value: 'lion', label: 'Lion ♌' },
  { value: 'vierge', label: 'Vierge ♍' },
  { value: 'balance', label: 'Balance ♎' },
  { value: 'scorpion', label: 'Scorpion ♏' },
  { value: 'sagittaire', label: 'Sagittaire ♐' },
  { value: 'capricorne', label: 'Capricorne ♑' },
  { value: 'verseau', label: 'Verseau ♒' },
  { value: 'poissons', label: 'Poissons ♓' }
];

export const DIET_TYPES = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarien', label: 'Végétarien' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescetarien', label: 'Pescétarien' },
  { value: 'flexitarien', label: 'Flexitarien' },
  { value: 'sans-gluten', label: 'Sans gluten' },
  { value: 'keto', label: 'Keto' },
  { value: 'halal', label: 'Halal' },
  { value: 'casher', label: 'Casher' },
  { value: 'autre', label: 'Autre' }
];

export const RELIGIONS = [
  { value: 'atheisme', label: 'Athéisme' },
  { value: 'agnosticisme', label: 'Agnosticisme' },
  { value: 'christianisme', label: 'Christianisme' },
  { value: 'catholicisme', label: 'Catholicisme' },
  { value: 'protestantisme', label: 'Protestantisme' },
  { value: 'orthodoxe', label: 'Orthodoxe' },
  { value: 'islam', label: 'Islam' },
  { value: 'judaisme', label: 'Judaïsme' },
  { value: 'hindouisme', label: 'Hindouisme' },
  { value: 'bouddhisme', label: 'Bouddhisme' },
  { value: 'sikhisme', label: 'Sikhisme' },
  { value: 'spiritualite', label: 'Spiritualité' },
  { value: 'autre', label: 'Autre' }
];

export const ETHNICITIES = [
  { value: 'caucasien', label: 'Caucasien' },
  { value: 'africain', label: 'Africain' },
  { value: 'afro-americain', label: 'Afro-américain' },
  { value: 'asiatique', label: 'Asiatique' },
  { value: 'hispanique', label: 'Hispanique/Latino' },
  { value: 'arabe', label: 'Arabe' },
  { value: 'indien', label: 'Indien' },
  { value: 'metisse', label: 'Métissé' },
  { value: 'autre', label: 'Autre' },
  { value: 'prefer-not-to-say', label: 'Préfère ne pas dire' }
];

export const INTEREST_OPTIONS = [
  // Sports et fitness
  'Sport', 'Fitness', 'Yoga', 'Running', 'Natation', 'Football', 'Basketball', 'Tennis',
  'Escalade', 'Randonnée', 'Vélo', 'Ski', 'Surf', 'Danse', 'Arts martiaux',
  
  // Musique et arts
  'Musique', 'Concert', 'Festival', 'Piano', 'Guitare', 'Chant', 'Peinture', 'Dessin',
  'Photographie', 'Sculpture', 'Théâtre', 'Opéra', 'Art moderne', 'Street art',
  
  // Culture et divertissement
  'Cinéma', 'Séries', 'Lecture', 'Littérature', 'Poésie', 'Écriture', 'Blogging',
  'Podcast', 'Documentaire', 'Histoire', 'Philosophie', 'Musées', 'Expositions',
  
  // Gastronomie
  'Cuisine', 'Pâtisserie', 'Oenologie', 'Bière artisanale', 'Café', 'Restaurant',
  'Gastronomie', 'Végétarisme', 'Nutrition', 'Food truck',
  
  // Voyage et aventure
  'Voyage', 'Backpacking', 'Road trip', 'Camping', 'Plage', 'Montagne', 'City break',
  'Culture locale', 'Langues étrangères', 'Géographie',
  
  // Technologie et sciences
  'Technologie', 'Informatique', 'Programmation', 'Gaming', 'Sciences', 'Astronomie',
  'Physique', 'Mathématiques', 'Intelligence artificielle', 'Robotique',
  
  // Nature et environnement
  'Nature', 'Jardinage', 'Écologie', 'Environnement', 'Animaux', 'Chiens', 'Chats',
  'Équitation', 'Ornithologie', 'Botanique',
  
  // Lifestyle et bien-être
  'Méditation', 'Mindfulness', 'Développement personnel', 'Spiritualité', 'Mode',
  'Beauté', 'DIY', 'Décoration', 'Architecture', 'Design',
  
  // Social et politique
  'Politique', 'Actualités', 'Débat', 'Bénévolat', 'Humanitaire', 'Justice sociale',
  'Féminisme', 'Droits humains',
  
  // Business et entrepreneuriat
  'Entrepreneuriat', 'Business', 'Marketing', 'Finance', 'Investissement',
  'Immobilier', 'Networking', 'Leadership'
];

export const LOOKING_FOR_OPTIONS = [
  {
    value: 'relation-serieuse',
    label: 'Relation sérieuse',
    description: 'Je cherche une relation durable et engagée'
  },
  {
    value: 'relation-decontractee',
    label: 'Relation décontractée',
    description: 'Je veux prendre le temps de me connaître'
  },
  {
    value: 'amitie',
    label: 'Amitié',
    description: 'Je recherche de nouveaux amis'
  },
  {
    value: 'aventure',
    label: 'Aventure',
    description: 'Je suis ouvert(e) à toutes les possibilités'
  },
  {
    value: 'pas-sur',
    label: 'Je ne sais pas encore',
    description: 'Je verrai bien où ça me mène'
  },
  {
    value: 'mariage',
    label: 'Mariage',
    description: 'Je cherche la personne avec qui fonder une famille'
  }
];

export const DISTANCE_OPTIONS = [
  {
    value: 10,
    label: '10 km',
    description: 'Très proche'
  },
  {
    value: 25,
    label: '25 km',
    description: 'À proximité'
  },
  {
    value: 50,
    label: '50 km',
    description: 'Région'
  },
  {
    value: 100,
    label: '100 km',
    description: 'Large zone'
  },
  {
    value: 200,
    label: '200 km',
    description: 'Très large'
  },
  {
    value: 500,
    label: '500+ km',
    description: 'Partout'
  }
];