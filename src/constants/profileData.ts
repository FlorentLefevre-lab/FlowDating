// constants/profileData.ts - Données statiques pour les formulaires

export const GENDERS = [
    { value: 'homme', label: 'Homme' },
    { value: 'femme', label: 'Femme' },
    { value: 'non-binaire', label: 'Non-binaire' },
    { value: 'autre', label: 'Autre' }
  ] as const;
  
  export const PROFESSIONS = [
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'artisan', label: 'Artisan' },
    { value: 'cadre', label: 'Cadre' },
    { value: 'commerce', label: 'Commerce' },
    { value: 'communication', label: 'Communication' },
    { value: 'education', label: 'Éducation' },
    { value: 'employe', label: 'Employé' },
    { value: 'etudiant', label: 'Étudiant' },
    { value: 'finance', label: 'Finance' },
    { value: 'fonctionnaire', label: 'Fonctionnaire' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'ingenieur', label: 'Ingénieur' },
    { value: 'juridique', label: 'Juridique' },
    { value: 'medical', label: 'Médical' },
    { value: 'professionliberale', label: 'Profession libérale' },
    { value: 'retraite', label: 'Retraité' },
    { value: 'sante', label: 'Santé' },
    { value: 'sansemploi', label: 'Sans emploi' },
    { value: 'technologie', label: 'Technologie' },
    { value: 'transport', label: 'Transport' },
    { value: 'autre', label: 'Autre' }
  ] as const;
  
  export const MARITAL_STATUS = [
    { value: 'celibataire', label: 'Célibataire' },
    { value: 'divorce', label: 'Divorcé(e)' },
    { value: 'veuf', label: 'Veuf/Veuve' },
    { value: 'separe', label: 'Séparé(e)' },
    { value: 'complique', label: 'C\'est compliqué' },
    { value: 'ouvert', label: 'Relation ouverte' }
  ] as const;
  
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
  ] as const;
  
  export const DIET_TYPES = [
    { value: 'omnivore', label: 'Omnivore' },
    { value: 'vegetarien', label: 'Végétarien' },
    { value: 'vegetalien', label: 'Végétalien/Vegan' },
    { value: 'pescetarien', label: 'Pescétarien' },
    { value: 'flexitarien', label: 'Flexitarien' },
    { value: 'paleo', label: 'Paléo' },
    { value: 'keto', label: 'Kétogène' },
    { value: 'sans-gluten', label: 'Sans gluten' },
    { value: 'sans-lactose', label: 'Sans lactose' },
    { value: 'halal', label: 'Halal' },
    { value: 'casher', label: 'Casher' },
    { value: 'autre', label: 'Autre' }
  ] as const;
  
  export const RELIGIONS = [
    { value: 'chretien', label: 'Chrétien' },
    { value: 'catholique', label: 'Catholique' },
    { value: 'protestant', label: 'Protestant' },
    { value: 'orthodoxe', label: 'Orthodoxe' },
    { value: 'musulman', label: 'Musulman' },
    { value: 'juif', label: 'Juif' },
    { value: 'bouddhiste', label: 'Bouddhiste' },
    { value: 'hindou', label: 'Hindou' },
    { value: 'sikh', label: 'Sikh' },
    { value: 'athee', label: 'Athée' },
    { value: 'agnostique', label: 'Agnostique' },
    { value: 'spirituel', label: 'Spirituel sans religion' },
    { value: 'autre', label: 'Autre' },
    { value: 'non-specifie', label: 'Je préfère ne pas préciser' }
  ] as const;
  
  export const ETHNICITIES = [
    { value: 'europeen', label: 'Européen' },
    { value: 'africain', label: 'Africain' },
    { value: 'maghrebin', label: 'Maghrébin' },
    { value: 'asiatique', label: 'Asiatique' },
    { value: 'asie-est', label: 'Asie de l\'Est' },
    { value: 'asie-sud', label: 'Asie du Sud' },
    { value: 'asie-sud-est', label: 'Asie du Sud-Est' },
    { value: 'americain', label: 'Américain' },
    { value: 'latino', label: 'Latino/Hispanique' },
    { value: 'moyen-orient', label: 'Moyen-Orient' },
    { value: 'oceanien', label: 'Océanien' },
    { value: 'metisse', label: 'Métissé' },
    { value: 'autre', label: 'Autre' },
    { value: 'non-specifie', label: 'Je préfère ne pas préciser' }
  ] as const;
  
  export const INTEREST_OPTIONS = [
    // Sport et fitness
    'Sport', 'Fitness', 'Yoga', 'Pilates', 'Course à pied', 'Marathon', 'Natation', 
    'Cyclisme', 'VTT', 'Football', 'Basketball', 'Tennis', 'Badminton', 'Volleyball',
    'Rugby', 'Hockey', 'Golf', 'Ski', 'Snowboard', 'Surf', 'Plongée', 'Escalade',
    'Randonnée', 'Trail', 'Musculation', 'CrossFit', 'Arts martiaux', 'Boxe',
    'Danse', 'Salsa', 'Bachata', 'Tango', 'Ballet', 'Hip-hop',
    
    // Voyage et aventure
    'Voyage', 'Aventure', 'Backpacking', 'Road trip', 'Camping', 'Glamping',
    'Trekking', 'Alpinisme', 'Spéléologie', 'Géocaching',
    'Photographie de voyage', 'Culture locale', 'Gastronomie locale',
    
    // Arts et culture
    'Photographie', 'Peinture', 'Dessin', 'Sculpture', 'Céramique', 'Art numérique',
    'Musique', 'Piano', 'Guitare', 'Chant', 'DJ', 'Composition', 'Concert',
    'Festival de musique', 'Opéra', 'Jazz', 'Rock', 'Électro', 'Classique',
    'Théâtre', 'Improvisation', 'Stand-up', 'Cinéma', 'Série TV', 'Documentaires',
    'Animation', 'Court-métrage', 'Festival de cinéma',
    
    // Littérature et écriture
    'Lecture', 'Romans', 'Science-fiction', 'Fantasy', 'Thriller', 'Biographies',
    'Poésie', 'BD', 'Manga', 'Écriture', 'Nouvelles', 'Blog', 'Journalisme',
    'Club de lecture', 'Librairies', 'Salon du livre',
    
    // Cuisine et gastronomie
    'Cuisine', 'Pâtisserie', 'Boulangerie', 'Gastronomie', 'Œnologie', 'Dégustation',
    'Vin', 'Champagne', 'Bière artisanale', 'Cocktails', 'Café', 'Thé',
    'Cuisine du monde', 'Végétarienne', 'Vegan', 'Cuisine française', 'Sushi',
    'Street food', 'Marché', 'Restaurant', 'Food truck',
    
    // Technologie et innovation
    'Technologie', 'Informatique', 'Programmation', 'Intelligence artificielle',
    'Robotique', 'Gaming', 'Jeux vidéo', 'E-sport', 'Réalité virtuelle',
    'Blockchain', 'Cryptomonnaies', 'Startups', 'Innovation', 'Gadgets',
    'Électronique', 'Impression 3D', 'Drones',
    
    // Nature et environnement
    'Nature', 'Écologie', 'Environnement', 'Développement durable', 'Jardinage',
    'Permaculture', 'Botanique', 'Ornithologie', 'Astronomie', 'Météorologie',
    'Géologie', 'Minéralogie', 'Animaux', 'Chiens', 'Chats', 'Équitation',
    'Apiculture', 'Agriculture bio',
    
    // Bien-être et spiritualité
    'Méditation', 'Mindfulness', 'Spiritualité', 'Développement personnel',
    'Psychologie', 'Coaching', 'Bien-être', 'Relaxation', 'Massage',
    'Aromathérapie', 'Naturopathie', 'Ayurveda', 'Feng shui',
    
    // Mode et beauté
    'Mode', 'Stylisme', 'Couture', 'Tricot', 'Shopping', 'Vintage',
    'Beauté', 'Maquillage', 'Coiffure', 'Parfums', 'Bijoux', 'Accessoires'
  ] as const;
  
  export const LOOKING_FOR_OPTIONS = [
    { value: 'relation-serieuse', label: 'Relation sérieuse', description: 'Je cherche une relation durable' },
    { value: 'relation-casual', label: 'Relation décontractée', description: 'Sans engagement particulier' },
    { value: 'amitie', label: 'Amitié', description: 'Je cherche de nouveaux amis' },
    { value: 'aventure', label: 'Aventure', description: 'Rencontres sans lendemain' },
    { value: 'mariage', label: 'Mariage', description: 'Je veux fonder une famille' },
    { value: 'reseau', label: 'Réseau professionnel', description: 'Contacts professionnels' },
    { value: 'activites', label: 'Partenaire d\'activités', description: 'Quelqu\'un pour partager mes loisirs' },
    { value: 'pas-sur', label: 'Je ne sais pas encore', description: 'Je reste ouvert aux possibilités' }
  ] as const;
  
  export const DISTANCE_OPTIONS = [
    { value: 5, label: '5 km', description: 'Très proche' },
    { value: 10, label: '10 km', description: 'Quartier élargi' },
    { value: 25, label: '25 km', description: 'Agglomération' },
    { value: 50, label: '50 km', description: 'Région proche' },
    { value: 100, label: '100 km', description: 'Département' },
    { value: 250, label: '250 km', description: 'Plusieurs départements' },
    { value: 500, label: '500 km', description: 'Partout en France' },
    { value: 1000, label: '1000+ km', description: 'Europe' },
    { value: 999999, label: 'Partout dans le monde', description: 'Aucune limite' }
  ] as const;
  
  export const DEFAULT_PROFILE_CONFIG = {
    maxPhotos: 6,
    maxInterests: 15,
    maxBioLength: 500,
    minAge: 18,
    maxAge: 99,
    defaultDistance: 50,
    defaultAgeRange: { min: 22, max: 35 }
  } as const;
  
  export const VALIDATION_RULES = {
    name: {
      minLength: 2,
      maxLength: 100,
      required: true
    },
    bio: {
      maxLength: 500,
      required: false
    },
    age: {
      min: 18,
      max: 99,
      required: false
    },
    interests: {
      max: 15,
      required: false
    }
  } as const;