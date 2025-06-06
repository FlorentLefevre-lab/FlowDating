import { PrismaClient, Gender, MaritalStatus, MessageStatus, MessageType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Types pour les données
interface UserData {
  name: string;
  email: string;
  hashedPassword: string;
  primaryAuthMethod: 'EMAIL_PASSWORD';
  age: number;
  bio: string;
  location: string;
  profession: string;
  gender: Gender;
  maritalStatus: MaritalStatus;
  zodiacSign: string;
  dietType: string;
  religion: string;
  interests: string[];
  department: string;
  ethnicity: string;
  postcode: string;
  region: string;
  lastSeen: Date;
  isOnline: boolean;
}

interface LikeData {
  senderId: string;
  receiverId: string;
  createdAt: Date;
}

interface Match {
  user1: string;
  user2: string;
}

// Données de test réalistes
const firstNames: string[] = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William',
  'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander',
  'Abigail', 'Michael', 'Emily', 'Daniel', 'Elizabeth', 'Jacob', 'Mila', 'Logan', 'Ella', 'Jackson',
  'Avery', 'Levi', 'Sofia', 'Sebastian', 'Camila', 'Mateo', 'Aria', 'Jack', 'Scarlett', 'Owen',
  'Victoria', 'Theodore', 'Madison', 'Aiden', 'Luna', 'Samuel', 'Grace', 'Joseph', 'Chloe', 'John',
  'Penelope', 'David', 'Layla', 'Wyatt', 'Riley', 'Matthew', 'Zoey', 'Luke', 'Nora', 'Asher',
  'Lily', 'Carter', 'Eleanor', 'Julian', 'Hannah', 'Grayson', 'Lillian', 'Leo', 'Addison', 'Jayden',
  'Aubrey', 'Gabriel', 'Ellie', 'Isaac', 'Stella', 'Oliver', 'Natalie', 'Jonathan', 'Connor',
  'Leah', 'Jeremiah', 'Hazel', 'Ryan', 'Violet', 'Adrian', 'Aurora', 'Maverick', 'Savannah', 'Hudson',
  'Audrey', 'Colton', 'Brooklyn', 'Eli', 'Bella', 'Thomas', 'Claire', 'Aaron', 'Skylar', 'Ian'
];

const lastNames: string[] = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const cities: string[] = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
  'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne'
];

const professions: string[] = [
  'Développeur', 'Designer', 'Marketing', 'Vendeur', 'Professeur', 'Médecin', 'Avocat', 'Ingénieur', 
  'Architecte', 'Chef', 'Artiste', 'Photographe', 'Écrivain', 'Consultant', 'Analyste', 'Manager',
  'Entrepreneur', 'Comptable', 'Infirmier', 'Psychologue', 'Journaliste', 'Musicien', 'Commercial',
  'Technicien', 'Pharmacien', 'Dentiste', 'Vétérinaire', 'Coiffeur', 'Mécanicien', 'Électricien'
];

const genders: Gender[] = [Gender.MALE, Gender.FEMALE, Gender.NON_BINARY, Gender.OTHER];
const maritalStatuses: MaritalStatus[] = [MaritalStatus.SINGLE, MaritalStatus.IN_RELATIONSHIP, MaritalStatus.DIVORCED, MaritalStatus.WIDOWED];
const zodiacSigns: string[] = [
  'Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge',
  'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'
];
const dietTypes: string[] = ['Omnivore', 'Végétarien', 'Végétalien', 'Pescétarien', 'Sans gluten', 'Flexitarien'];
const religions: string[] = ['Catholique', 'Protestant', 'Musulman', 'Juif', 'Bouddhiste', 'Hindou', 'Athée', 'Agnostique'];
const ethnicities: string[] = ['Européenne', 'Africaine', 'Asiatique', 'Latino', 'Moyen-Oriental', 'Mixte'];

const interests: string[] = [
  'Sport', 'Musique', 'Cinéma', 'Lecture', 'Voyage', 'Cuisine', 'Art', 'Technologie',
  'Mode', 'Photographie', 'Danse', 'Théâtre', 'Gaming', 'Fitness', 'Yoga', 'Méditation',
  'Randonnée', 'Vélo', 'Natation', 'Tennis', 'Football', 'Basketball', 'Escalade', 'Surf',
  'Jardinage', 'Bricolage', 'Peinture', 'Écriture', 'Langues', 'Bénévolat', 'Animaux', 'Nature'
];

const regions: string[] = [
  'Île-de-France', 'Auvergne-Rhône-Alpes', 'Nouvelle-Aquitaine', 'Occitanie', 'Hauts-de-France',
  'Grand Est', 'Provence-Alpes-Côte d\'Azur', 'Pays de la Loire', 'Bretagne', 'Normandie',
  'Bourgogne-Franche-Comté', 'Centre-Val de Loire', 'Corse'
];

// Fonctions utilitaires avec types
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], min: number = 1, max: number = 5): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRandomPostcode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function generateRandomBio(): string {
  const bios: string[] = [
    "Passionné(e) de voyages et de nouvelles découvertes. J'aime partager de bons moments et rire !",
    "Amateur/trice de bonne cuisine et de soirées entre amis. La vie est belle quand on la partage.",
    "Sportif/ve dans l'âme, j'adore l'aventure et les défis. Toujours prêt(e) pour de nouvelles expériences !",
    "Créatif/ve et curieux/se, j'aime l'art sous toutes ses formes. La beauté est partout si on sait regarder.",
    "Entrepreneur dans l'âme avec une passion pour l'innovation. J'aime construire et créer du lien.",
    "Nature lover qui préfère les couchers de soleil aux écrans. Simplicité et authenticité avant tout.",
    "Mélomane invétéré(e), la musique rythme ma vie. Concerts, festivals, je suis toujours partant(e) !",
    "Lecteur/trice compulsif/ve qui voyage à travers les livres. Une bonne histoire vaut tous les trésors.",
    "Gastronome qui explore le monde une assiette à la fois. Cuisiner et partager, mes plus grands plaisirs.",
    "Digital nomad en quête d'équilibre entre travail et passion. La liberté avant tout !"
  ];
  return getRandomElement(bios);
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function clearDatabase(): Promise<void> {
  console.log('🧹 Nettoyage de la base de données...');
  
  // Ordre important pour respecter les contraintes de clés étrangères
  await prisma.notificationSettings.deleteMany();
  await prisma.message.deleteMany();
  await prisma.profileView.deleteMany();
  await prisma.dislike.deleteMany();
  await prisma.like.deleteMany();
  await prisma.block.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('✅ Base de données nettoyée !');
}

async function generateUsers(): Promise<string[]> {
  console.log('🚀 Génération de 100 utilisateurs...');
  
  const hashedPassword = await hashPassword('123456');
  const users: UserData[] = [];

  // 🎯 CRÉATION GARANTIE DE ZOE LEE EN PREMIER
  console.log('👑 Création spéciale de Zoe Lee...');
  const zoeUser: UserData = {
    name: 'Zoe Lee',
    email: 'zoe.lee0@example.com',
    hashedPassword: hashedPassword,
    primaryAuthMethod: 'EMAIL_PASSWORD',
    age: 28,
    bio: "Passionnée de photographie et de voyages. J'adore découvrir de nouveaux endroits et rencontrer des gens intéressants ! 📸✈️",
    location: 'Paris',
    profession: 'Photographe',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.SINGLE,
    zodiacSign: 'Balance',
    dietType: 'Végétarien',
    religion: 'Agnostique',
    interests: ['Photographie', 'Voyage', 'Art', 'Musique', 'Cinéma', 'Nature'],
    department: '75',
    ethnicity: 'Asiatique',
    postcode: '75001',
    region: 'Île-de-France',
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // Il y a 2 heures
    isOnline: true, // Zoe est en ligne
  };
  
  users.push(zoeUser);
  console.log('✅ Zoe Lee créée avec succès !');

  // Génération des 99 autres utilisateurs
  for (let i = 1; i < 100; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    
    // S'assurer qu'on ne duplique pas l'email de Zoe
    if (email === 'zoe.lee0@example.com') {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 100}@example.com`;
    }
    
    const userData: UserData = {
      name: `${firstName} ${lastName}`,
      email: email,
      hashedPassword: hashedPassword,
      primaryAuthMethod: 'EMAIL_PASSWORD',
      age: Math.floor(Math.random() * (50 - 18 + 1)) + 18,
      bio: generateRandomBio(),
      location: getRandomElement(cities),
      profession: getRandomElement(professions),
      gender: getRandomElement(genders),
      maritalStatus: getRandomElement(maritalStatuses),
      zodiacSign: getRandomElement(zodiacSigns),
      dietType: getRandomElement(dietTypes),
      religion: getRandomElement(religions),
      interests: getRandomElements(interests, 2, 6),
      department: Math.floor(Math.random() * 95 + 1).toString().padStart(2, '0'),
      ethnicity: getRandomElement(ethnicities),
      postcode: generateRandomPostcode(),
      region: getRandomElement(regions),
      lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      isOnline: Math.random() > 0.7,
    };

    users.push(userData);
  }

  await prisma.user.createMany({
    data: users,
    skipDuplicates: true
  });

  console.log('✅ 100 utilisateurs créés avec succès !');
  
  const createdUsers = await prisma.user.findMany({
    select: { id: true, email: true }
  });
  
  // Vérifier que Zoe est bien créée
  const zoeCreated = createdUsers.find(user => user.email === 'zoe.lee0@example.com');
  if (zoeCreated) {
    console.log(`🎯 Zoe Lee confirmée avec l'ID: ${zoeCreated.id}`);
  } else {
    console.error('❌ ERREUR: Zoe Lee n\'a pas été créée !');
  }
  
  return createdUsers.map((user: { id: string }) => user.id);
}

async function generatePreferences(userIds: string[]): Promise<void> {
  console.log('🎯 Génération des préférences utilisateur...');
  
  const preferences = userIds.map((userId: string) => ({
    userId,
    minAge: Math.floor(Math.random() * (25 - 18 + 1)) + 18,
    maxAge: Math.floor(Math.random() * (45 - 30 + 1)) + 30,
    maxDistance: Math.floor(Math.random() * (100 - 10 + 1)) + 10,
    gender: Math.random() > 0.5 ? getRandomElement(genders) : null,
    lookingFor: getRandomElement(['Relation sérieuse', 'Relation décontractée', 'Amitié', 'Je ne sais pas encore'])
  }));

  await prisma.userPreferences.createMany({
    data: preferences,
    skipDuplicates: true
  });

  console.log('✅ Préférences utilisateur créées !');
}

async function generateNotificationSettings(userIds: string[]): Promise<void> {
  console.log('🔔 Génération des paramètres de notification...');
  
  const notificationSettings = userIds.map((userId: string) => ({
    userId,
    messageNotifications: Math.random() > 0.2,
    likeNotifications: Math.random() > 0.1,
    matchNotifications: Math.random() > 0.05,
    soundEnabled: Math.random() > 0.3,
    vibrationEnabled: Math.random() > 0.4,
    quietHoursStart: Math.random() > 0.5 ? "22:00" : null,
    quietHoursEnd: Math.random() > 0.5 ? "08:00" : null
  }));

  await prisma.notificationSettings.createMany({
    data: notificationSettings,
    skipDuplicates: true
  });

  console.log('✅ Paramètres de notification créés !');
}

async function generatePhotos(userIds: string[]): Promise<void> {
  console.log('📸 Génération des photos de profil...');
  
  // 🎯 Trouver l'ID de Zoe pour lui donner des photos spéciales
  const zoeUser = await prisma.user.findUnique({
    where: { email: 'zoe.lee0@example.com' },
    select: { id: true }
  });

  const photos: Array<{
    userId: string;
    url: string;
    isPrimary: boolean;
    alt: string;
  }> = [];
  
  userIds.forEach((userId: string) => {
    const photoCount = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < photoCount; i++) {
      let photoUrl: string;
      
      // 🎯 Photos spéciales pour Zoe (femme)
      if (userId === zoeUser?.id) {
        const photoNumber = Math.floor(Math.random() * 99) + 1;
        photoUrl = `https://randomuser.me/api/portraits/women/${photoNumber}.jpg`;
      } else {
        // Photos aléatoires pour les autres
        const gender = Math.random() > 0.5 ? 'men' : 'women';
        const photoNumber = Math.floor(Math.random() * 99) + 1;
        photoUrl = `https://randomuser.me/api/portraits/${gender}/${photoNumber}.jpg`;
      }
      
      photos.push({
        userId,
        url: photoUrl,
        isPrimary: i === 0,
        alt: `Photo de profil ${i + 1}`
      });
    }
  });

  await prisma.photo.createMany({
    data: photos,
    skipDuplicates: true
  });

  console.log('✅ Photos de profil créées !');
}

async function generateLikes(userIds: string[]): Promise<LikeData[]> {
  console.log('❤️ Génération des likes...');
  
  // 🎯 Trouver l'ID de Zoe Lee
  const zoeUser = await prisma.user.findUnique({
    where: { email: 'zoe.lee0@example.com' },
    select: { id: true }
  });

  const zoeId = zoeUser?.id;
  
  if (!zoeId) {
    console.error('❌ ERREUR: Zoe Lee introuvable pour les likes !');
    return [];
  }
  
  console.log(`📍 Zoe trouvée avec l'ID: ${zoeId}`);
  
  const likes: LikeData[] = [];
  const likePairs = new Set<string>();
  const today = new Date(); // 🎯 Date d'aujourd'hui pour Zoe
  
  // 🎯 GARANTIR DES LIKES POUR ZOE D'ABORD
  console.log('💕 Génération de likes spéciaux pour Zoe...');
  const otherUserIds = userIds.filter(id => id !== zoeId);
  
  // Zoe reçoit 8-12 likes aujourd'hui
  const zoeReceivedLikesCount = Math.floor(Math.random() * 5) + 8; // 8-12 likes
  for (let i = 0; i < zoeReceivedLikesCount && i < otherUserIds.length; i++) {
    const senderId = otherUserIds[i];
    const hoursAgo = Math.floor(Math.random() * 12); // Entre 0 et 12 heures
    const likeDate = new Date(today.getTime() - (hoursAgo * 60 * 60 * 1000));
    
    likes.push({
      senderId,
      receiverId: zoeId,
      createdAt: likeDate
    });
    
    likePairs.add(`${senderId}-${zoeId}`);
    console.log(`💕 Like pour Zoe de l'utilisateur ${senderId} à ${likeDate.toLocaleString()}`);
  }
  
  // Zoe envoie quelques likes aussi (pour créer des matches)
  const zoeSentLikesCount = Math.floor(Math.random() * 4) + 3; // 3-6 likes envoyés
  for (let i = 0; i < zoeSentLikesCount && i < otherUserIds.length; i++) {
    const receiverId = otherUserIds[i + 10]; // Utilisateurs différents
    if (receiverId && !likePairs.has(`${zoeId}-${receiverId}`)) {
      const hoursAgo = Math.floor(Math.random() * 12);
      const likeDate = new Date(today.getTime() - (hoursAgo * 60 * 60 * 1000));
      
      likes.push({
        senderId: zoeId,
        receiverId,
        createdAt: likeDate
      });
      
      likePairs.add(`${zoeId}-${receiverId}`);
      console.log(`💕 Like de Zoe vers l'utilisateur ${receiverId} à ${likeDate.toLocaleString()}`);
    }
  }
  
  // Générer les likes pour les autres utilisateurs
  for (const senderId of userIds) {
    if (senderId === zoeId) continue; // Zoe déjà traitée
    
    const likeCount = Math.floor(Math.random() * 21) + 5;
    const availableTargets = userIds.filter((id: string) => id !== senderId);
    
    for (let i = 0; i < likeCount && availableTargets.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableTargets.length);
      const receiverId = availableTargets[randomIndex];
      const pairKey = `${senderId}-${receiverId}`;
      
      if (!likePairs.has(pairKey)) {
        likePairs.add(pairKey);
        
        // Pour les autres (pas Zoe), dates aléatoires dans le passé
        const likeDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        likes.push({
          senderId,
          receiverId,
          createdAt: likeDate
        });
        
        availableTargets.splice(randomIndex, 1);
      }
    }
  }

  await prisma.like.createMany({
    data: likes,
    skipDuplicates: true
  });

  console.log(`✅ ${likes.length} likes créés !`);
  
  // 🎯 Compter les likes de Zoe spécifiquement
  const zoeLikes = likes.filter(like => like.receiverId === zoeId);
  console.log(`🎯 Zoe a reçu ${zoeLikes.length} likes aujourd'hui !`);
  
  return likes;
}

async function generateDislikes(userIds: string[]): Promise<void> {
  console.log('👎 Génération des dislikes...');
  
  // 🎯 Trouver l'ID de Zoe Lee
  const zoeUser = await prisma.user.findUnique({
    where: { email: 'zoe.lee0@example.com' },
    select: { id: true }
  });

  const zoeId = zoeUser?.id;
  
  const dislikes: Array<{
    senderId: string;
    receiverId: string;
    createdAt: Date;
  }> = [];
  const dislikePairs = new Set<string>();
  const today = new Date(); // 🎯 Date d'aujourd'hui pour Zoe
  
  for (const senderId of userIds) {
    const dislikeCount = Math.floor(Math.random() * 9) + 2;
    const availableTargets = userIds.filter((id: string) => id !== senderId);
    
    for (let i = 0; i < dislikeCount && availableTargets.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableTargets.length);
      const receiverId = availableTargets[randomIndex];
      const pairKey = `${senderId}-${receiverId}`;
      
      if (!dislikePairs.has(pairKey)) {
        dislikePairs.add(pairKey);
        
        // 🎯 Si c'est pour Zoe (receiverId) ou de Zoe (senderId), utiliser la date d'aujourd'hui
        let dislikeDate: Date;
        if (receiverId === zoeId || senderId === zoeId) {
          const hoursAgo = Math.floor(Math.random() * 12);
          dislikeDate = new Date(today.getTime() - (hoursAgo * 60 * 60 * 1000));
        } else {
          dislikeDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        }
        
        dislikes.push({
          senderId,
          receiverId,
          createdAt: dislikeDate
        });
        
        availableTargets.splice(randomIndex, 1);
      }
    }
  }

  await prisma.dislike.createMany({
    data: dislikes,
    skipDuplicates: true
  });

  console.log(`✅ ${dislikes.length} dislikes créés !`);
}

async function generateProfileViews(userIds: string[]): Promise<void> {
  console.log('👀 Génération des vues de profil...');
  
  // 🎯 Trouver l'ID de Zoe Lee
  const zoeUser = await prisma.user.findUnique({
    where: { email: 'zoe.lee0@example.com' },
    select: { id: true }
  });

  const zoeId = zoeUser?.id;
  
  const profileViews: Array<{
    viewerId: string;
    viewedId: string;
    createdAt: Date;
  }> = [];
  const viewPairs = new Set<string>();
  const today = new Date();
  
  // 🎯 GARANTIR DES VUES POUR ZOE D'ABORD
  if (zoeId) {
    console.log('👀 Génération de vues spéciales pour le profil de Zoe...');
    const otherUserIds = userIds.filter(id => id !== zoeId);
    
    // Zoe reçoit 15-25 vues de profil aujourd'hui
    const zoeViewsCount = Math.floor(Math.random() * 11) + 15; // 15-25 vues
    for (let i = 0; i < zoeViewsCount && i < otherUserIds.length; i++) {
      const viewerId = otherUserIds[i];
      const hoursAgo = Math.floor(Math.random() * 12);
      const viewDate = new Date(today.getTime() - (hoursAgo * 60 * 60 * 1000));
      
      profileViews.push({
        viewerId,
        viewedId: zoeId,
        createdAt: viewDate
      });
      
      viewPairs.add(`${viewerId}-${zoeId}`);
      console.log(`👀 Vue du profil de Zoe par l'utilisateur ${viewerId} à ${viewDate.toLocaleString()}`);
    }
  }
  
  // Générer les autres vues de profil
  for (let i = profileViews.length; i < 500; i++) {
    const viewerId = getRandomElement(userIds);
    const viewedId = getRandomElement(userIds.filter((id: string) => id !== viewerId));
    const pairKey = `${viewerId}-${viewedId}`;
    
    if (!viewPairs.has(pairKey)) {
      viewPairs.add(pairKey);
      
      // 🎯 Si c'est pour Zoe (viewedId) ou de Zoe (viewerId), utiliser la date d'aujourd'hui
      let viewDate: Date;
      if (viewedId === zoeId || viewerId === zoeId) {
        const hoursAgo = Math.floor(Math.random() * 12);
        viewDate = new Date(today.getTime() - (hoursAgo * 60 * 60 * 1000));
      } else {
        viewDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      }
      
      profileViews.push({
        viewerId,
        viewedId,
        createdAt: viewDate
      });
    }
  }

  await prisma.profileView.createMany({
    data: profileViews,
    skipDuplicates: true
  });

  console.log(`✅ ${profileViews.length} vues de profil créées !`);
  
  // 🎯 Compter les vues de profil de Zoe spécifiquement
  if (zoeId) {
    const zoeViews = profileViews.filter(view => view.viewedId === zoeId);
    console.log(`🎯 Le profil de Zoe a été vu ${zoeViews.length} fois aujourd'hui !`);
  }
}

async function generateMessages(userIds: string[], likes: LikeData[]): Promise<void> {
  console.log('💬 Génération des messages...');
  
  // 🎯 Trouver l'ID de Zoe Lee
  const zoeUser = await prisma.user.findUnique({
    where: { email: 'zoe.lee0@example.com' },
    select: { id: true }
  });

  const zoeId = zoeUser?.id;
  
  const matches = new Map<string, Match>();
  
  // Identifier les matches (likes mutuels)
  likes.forEach((like: LikeData) => {
    const reverseMatch = likes.find((l: LikeData) => 
      l.senderId === like.receiverId && l.receiverId === like.senderId
    );
    
    if (reverseMatch) {
      const conversationKey = [like.senderId, like.receiverId].sort().join('-');
      if (!matches.has(conversationKey)) {
        matches.set(conversationKey, {
          user1: like.senderId,
          user2: like.receiverId
        });
      }
    }
  });

  console.log(`📱 ${matches.size} matches trouvés, génération des conversations...`);

  const messages: Array<{
    senderId: string;
    receiverId: string;
    content: string;
    messageType: MessageType;
    status: MessageStatus;
    createdAt: Date;
    readAt: Date | null;
    deliveredAt: Date;
  }> = [];
  
  const sampleMessages: string[] = [
    "Salut ! Comment ça va ?",
    "Hello ! Sympa ton profil 😊",
    "Coucou ! Tu fais quoi de beau ?",
    "Salut ! J'ai vu qu'on avait des goûts en commun !",
    "Hello ! Ça te dit qu'on discute ?",
    "Salut ! Comment s'est passé ta journée ?",
    "Coucou ! Tu es de quelle région ?",
    "Hello ! J'adore tes photos !",
    "Salut ! Tu aimes quoi comme musique ?",
    "Coucou ! Des projets pour le weekend ?",
    "Merci pour le match ! 😍",
    "Super ! J'espère qu'on va bien s'entendre",
    "Parfait ! Raconte-moi un peu tes passions",
    "Génial ! Tu fais du sport ?",
    "Cool ! Tu voyages souvent ?",
    "Ah oui j'adore aussi ! 🎵",
    "Exactement pareil pour moi !",
    "Haha c'est marrant ça ! 😄",
    "Vraiment ? Moi aussi j'adore ça !",
    "C'est clair ! On se ressemble 😊"
  ];

  const today = new Date();

  for (const [conversationKey, match] of Array.from(matches.entries())) {
    const messageCount = Math.floor(Math.random() * 20) + 5;
    const participants = [match.user1, match.user2];
    
    // 🎯 Vérifier si Zoe fait partie de cette conversation
    const isZoeConversation = participants.includes(zoeId || '');
    
    for (let i = 0; i < messageCount; i++) {
      const senderId = getRandomElement(participants);
      const receiverId = participants.find((p: string) => p !== senderId)!;
      
      // 🎯 Si c'est une conversation avec Zoe, utiliser des dates d'aujourd'hui
      let messageDate: Date;
      if (isZoeConversation) {
        const hoursAgo = Math.floor(Math.random() * 12);
        messageDate = new Date(today.getTime() - (hoursAgo * 60 * 60 * 1000));
      } else {
        messageDate = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
      }
      
      const deliveredAt = new Date(messageDate.getTime() + Math.random() * 60 * 1000);
      
      messages.push({
        senderId,
        receiverId,
        content: getRandomElement(sampleMessages),
        messageType: MessageType.TEXT,
        status: Math.random() > 0.1 ? MessageStatus.READ : MessageStatus.DELIVERED,
        createdAt: messageDate,
        readAt: Math.random() > 0.2 ? new Date(deliveredAt.getTime() + Math.random() * 60 * 60 * 1000) : null,
        deliveredAt
      });
    }
  }

  if (messages.length > 0) {
    await prisma.message.createMany({
      data: messages,
      skipDuplicates: true
    });
  }

  console.log(`✅ ${messages.length} messages créés pour ${matches.size} conversations !`);
  
  // 🎯 Compter les messages de Zoe spécifiquement
  if (zoeId) {
    const zoeMessages = messages.filter(message => message.receiverId === zoeId);
    console.log(`🎯 Zoe a reçu ${zoeMessages.length} messages aujourd'hui !`);
  }
}

async function main(): Promise<void> {
  try {
    console.log('🎬 Début de la génération des données de test...\n');
    console.log('👑 MODIFICATION SPÉCIALE : Création garantie de Zoe Lee avec activités d\'aujourd\'hui !\n');

    await clearDatabase();
    const userIds = await generateUsers();
    await generatePreferences(userIds);
    await generateNotificationSettings(userIds);
    await generatePhotos(userIds);
    const likes = await generateLikes(userIds);
    await generateDislikes(userIds);
    await generateProfileViews(userIds);
    await generateMessages(userIds, likes);

    // Statistiques finales
    const stats = {
      users: await prisma.user.count(),
      likes: await prisma.like.count(),
      dislikes: await prisma.dislike.count(),
      messages: await prisma.message.count(),
      views: await prisma.profileView.count(),
      photos: await prisma.photo.count(),
      preferences: await prisma.userPreferences.count(),
      notifications: await prisma.notificationSettings.count()
    };

    // Calcul des matches
    const allLikes = await prisma.like.findMany();
    const matchCount = allLikes.filter(like => 
      allLikes.some(otherLike => 
        otherLike.senderId === like.receiverId && 
        otherLike.receiverId === like.senderId
      )
    ).length / 2;

    // 🎯 Statistiques spéciales pour Zoe
    const zoeUser = await prisma.user.findUnique({
      where: { email: 'zoe.lee0@example.com' },
      select: { id: true }
    });

    if (zoeUser) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const zoeStatsToday = {
        likesToday: await prisma.like.count({
          where: {
            receiverId: zoeUser.id,
            createdAt: { gte: today }
          }
        }),
        messagesToday: await prisma.message.count({
          where: {
            receiverId: zoeUser.id,
            createdAt: { gte: today }
          }
        }),
        viewsToday: await prisma.profileView.count({
          where: {
            viewedId: zoeUser.id,
            createdAt: { gte: today }
          }
        }),
        matchesToday: await prisma.like.count({
          where: {
            receiverId: zoeUser.id,
            createdAt: { gte: today },
            sender: {
              sentLikes: {
                some: {
                  receiverId: zoeUser.id,
                  createdAt: { gte: today }
                }
              }
            }
          }
        })
      };

      console.log('\n👑 STATISTIQUES SPÉCIALES POUR ZOE LEE (aujourd\'hui) :');
      console.log(`   ❤️  Likes reçus aujourd'hui : ${zoeStatsToday.likesToday}`);
      console.log(`   💬 Messages reçus aujourd'hui : ${zoeStatsToday.messagesToday}`);
      console.log(`   👀 Vues de profil aujourd'hui : ${zoeStatsToday.viewsToday}`);
      console.log(`   💕 Matches aujourd'hui : ${zoeStatsToday.matchesToday}`);
      console.log(`   🆔 ID de Zoe : ${zoeUser.id}`);
    } else {
      console.error('❌ ERREUR CRITIQUE : Zoe Lee non trouvée après création !');
    }

    console.log('\n🎉 Génération terminée avec succès !');
    console.log('📊 Statistiques finales :');
    console.log(`   👥 Utilisateurs : ${stats.users}`);
    console.log(`   ❤️  Likes : ${stats.likes}`);
    console.log(`   💕 Matches : ${matchCount}`);
    console.log(`   👎 Dislikes : ${stats.dislikes}`);
    console.log(`   💬 Messages : ${stats.messages}`);
    console.log(`   👀 Vues de profil : ${stats.views}`);
    console.log(`   📸 Photos : ${stats.photos}`);
    console.log(`   🎯 Préférences : ${stats.preferences}`);
    console.log(`   🔔 Paramètres notification : ${stats.notifications}`);
    
    console.log('\n🔐 Informations de connexion :');
    console.log('   📧 Email Zoe : zoe.lee0@example.com');
    console.log('   🔑 Mot de passe : 123456');
    console.log('   📧 Autres emails : [prenom].[nom][numero]@example.com');
    console.log('\n👑 SPÉCIAL : Zoe Lee est GARANTIE créée avec toutes ses activités d\'aujourd\'hui !');

  } catch (error) {
    console.error('❌ Erreur lors de la génération :', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('💥 Erreur fatale :', e);
    process.exit(1);
  });