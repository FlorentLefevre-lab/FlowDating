// prisma/seed-5000.ts - Seed avec 5000 utilisateurs répartis en France
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient, Gender, AccountStatus, AuthMethod, MaritalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ==========================================
// DONNÉES DE BASE
// ==========================================

const FRENCH_CITIES = [
  { name: 'Paris', department: '75', region: 'Île-de-France', postcode: '75001' },
  { name: 'Marseille', department: '13', region: 'Provence-Alpes-Côte d\'Azur', postcode: '13001' },
  { name: 'Lyon', department: '69', region: 'Auvergne-Rhône-Alpes', postcode: '69001' },
  { name: 'Toulouse', department: '31', region: 'Occitanie', postcode: '31000' },
  { name: 'Nice', department: '06', region: 'Provence-Alpes-Côte d\'Azur', postcode: '06000' },
  { name: 'Nantes', department: '44', region: 'Pays de la Loire', postcode: '44000' },
  { name: 'Strasbourg', department: '67', region: 'Grand Est', postcode: '67000' },
  { name: 'Montpellier', department: '34', region: 'Occitanie', postcode: '34000' },
  { name: 'Bordeaux', department: '33', region: 'Nouvelle-Aquitaine', postcode: '33000' },
  { name: 'Lille', department: '59', region: 'Hauts-de-France', postcode: '59000' },
  { name: 'Rennes', department: '35', region: 'Bretagne', postcode: '35000' },
  { name: 'Reims', department: '51', region: 'Grand Est', postcode: '51100' },
  { name: 'Saint-Étienne', department: '42', region: 'Auvergne-Rhône-Alpes', postcode: '42000' },
  { name: 'Toulon', department: '83', region: 'Provence-Alpes-Côte d\'Azur', postcode: '83000' },
  { name: 'Le Havre', department: '76', region: 'Normandie', postcode: '76600' },
  { name: 'Grenoble', department: '38', region: 'Auvergne-Rhône-Alpes', postcode: '38000' },
  { name: 'Dijon', department: '21', region: 'Bourgogne-Franche-Comté', postcode: '21000' },
  { name: 'Angers', department: '49', region: 'Pays de la Loire', postcode: '49000' },
  { name: 'Nîmes', department: '30', region: 'Occitanie', postcode: '30000' },
  { name: 'Villeurbanne', department: '69', region: 'Auvergne-Rhône-Alpes', postcode: '69100' },
  { name: 'Clermont-Ferrand', department: '63', region: 'Auvergne-Rhône-Alpes', postcode: '63000' },
  { name: 'Le Mans', department: '72', region: 'Pays de la Loire', postcode: '72000' },
  { name: 'Aix-en-Provence', department: '13', region: 'Provence-Alpes-Côte d\'Azur', postcode: '13100' },
  { name: 'Brest', department: '29', region: 'Bretagne', postcode: '29200' },
  { name: 'Tours', department: '37', region: 'Centre-Val de Loire', postcode: '37000' },
  { name: 'Amiens', department: '80', region: 'Hauts-de-France', postcode: '80000' },
  { name: 'Limoges', department: '87', region: 'Nouvelle-Aquitaine', postcode: '87000' },
  { name: 'Annecy', department: '74', region: 'Auvergne-Rhône-Alpes', postcode: '74000' },
  { name: 'Perpignan', department: '66', region: 'Occitanie', postcode: '66000' },
  { name: 'Besançon', department: '25', region: 'Bourgogne-Franche-Comté', postcode: '25000' },
  { name: 'Orléans', department: '45', region: 'Centre-Val de Loire', postcode: '45000' },
  { name: 'Metz', department: '57', region: 'Grand Est', postcode: '57000' },
  { name: 'Rouen', department: '76', region: 'Normandie', postcode: '76000' },
  { name: 'Mulhouse', department: '68', region: 'Grand Est', postcode: '68100' },
  { name: 'Caen', department: '14', region: 'Normandie', postcode: '14000' },
  { name: 'Nancy', department: '54', region: 'Grand Est', postcode: '54000' },
  { name: 'Saint-Denis', department: '93', region: 'Île-de-France', postcode: '93200' },
  { name: 'Argenteuil', department: '95', region: 'Île-de-France', postcode: '95100' },
  { name: 'Montreuil', department: '93', region: 'Île-de-France', postcode: '93100' },
  { name: 'Roubaix', department: '59', region: 'Hauts-de-France', postcode: '59100' },
  { name: 'Tourcoing', department: '59', region: 'Hauts-de-France', postcode: '59200' },
  { name: 'Avignon', department: '84', region: 'Provence-Alpes-Côte d\'Azur', postcode: '84000' },
  { name: 'Dunkerque', department: '59', region: 'Hauts-de-France', postcode: '59140' },
  { name: 'Poitiers', department: '86', region: 'Nouvelle-Aquitaine', postcode: '86000' },
  { name: 'Nice', department: '06', region: 'Provence-Alpes-Côte d\'Azur', postcode: '06300' },
  { name: 'Versailles', department: '78', region: 'Île-de-France', postcode: '78000' },
  { name: 'Courbevoie', department: '92', region: 'Île-de-France', postcode: '92400' },
  { name: 'Créteil', department: '94', region: 'Île-de-France', postcode: '94000' },
  { name: 'Pau', department: '64', region: 'Nouvelle-Aquitaine', postcode: '64000' },
  { name: 'La Rochelle', department: '17', region: 'Nouvelle-Aquitaine', postcode: '17000' },
];

const MALE_FIRST_NAMES = [
  'Lucas', 'Hugo', 'Gabriel', 'Louis', 'Raphaël', 'Arthur', 'Nathan', 'Adam', 'Jules', 'Léo',
  'Ethan', 'Paul', 'Théo', 'Mathis', 'Noah', 'Tom', 'Maxime', 'Antoine', 'Alexandre', 'Victor',
  'Thomas', 'Pierre', 'Nicolas', 'Julien', 'Benjamin', 'Clément', 'Romain', 'François', 'Adrien', 'Maxence',
  'Florian', 'Kevin', 'Quentin', 'Mathieu', 'Guillaume', 'Sébastien', 'David', 'Olivier', 'Laurent', 'Christophe',
  'Jean', 'Michel', 'Philippe', 'Alain', 'Patrick', 'Bernard', 'Éric', 'Stéphane', 'Frédéric', 'Jérôme',
  'Marc', 'Bruno', 'Daniel', 'Yves', 'Christian', 'Gilles', 'Pascal', 'René', 'Serge', 'Claude',
  'Axel', 'Enzo', 'Liam', 'Gabin', 'Evan', 'Noé', 'Mael', 'Sacha', 'Dylan', 'Ryan',
  'Malo', 'Nolan', 'Timéo', 'Aaron', 'Eliott', 'Léon', 'Lorenzo', 'Samuel', 'Oscar', 'Martin'
];

const FEMALE_FIRST_NAMES = [
  'Emma', 'Louise', 'Jade', 'Alice', 'Chloé', 'Léa', 'Manon', 'Inès', 'Camille', 'Sarah',
  'Zoé', 'Léonie', 'Lina', 'Rose', 'Anna', 'Julia', 'Lou', 'Juliette', 'Eva', 'Charlotte',
  'Marie', 'Sophie', 'Laura', 'Julie', 'Pauline', 'Margot', 'Anaïs', 'Clara', 'Océane', 'Mathilde',
  'Lucie', 'Émilie', 'Marion', 'Audrey', 'Céline', 'Mélanie', 'Aurélie', 'Caroline', 'Stéphanie', 'Isabelle',
  'Nathalie', 'Valérie', 'Sylvie', 'Catherine', 'Christine', 'Véronique', 'Sandrine', 'Corinne', 'Martine', 'Nicole',
  'Léna', 'Mia', 'Romane', 'Victoire', 'Agathe', 'Clémence', 'Margaux', 'Ambre', 'Lola', 'Nina',
  'Elsa', 'Luna', 'Adèle', 'Capucine', 'Jeanne', 'Gabrielle', 'Iris', 'Valentine', 'Apolline', 'Constance',
  'Faustine', 'Salomé', 'Maëlys', 'Élise', 'Noémie', 'Justine', 'Élodie', 'Fanny', 'Laure', 'Amélie'
];

const LAST_NAMES = [
  'Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent',
  'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard',
  'Bonnet', 'Dupont', 'Lambert', 'Fontaine', 'Rousseau', 'Vincent', 'Muller', 'Lefevre', 'Faure', 'Andre',
  'Mercier', 'Blanc', 'Guerin', 'Boyer', 'Garnier', 'Chevalier', 'François', 'Legrand', 'Gauthier', 'Garcia',
  'Perrin', 'Robin', 'Clement', 'Morin', 'Nicolas', 'Henry', 'Roussel', 'Mathieu', 'Gautier', 'Masson',
  'Marchand', 'Duval', 'Denis', 'Dumont', 'Marie', 'Lemaire', 'Noel', 'Meyer', 'Dufour', 'Meunier',
  'Brun', 'Blanchard', 'Giraud', 'Joly', 'Riviere', 'Lucas', 'Brunet', 'Gaillard', 'Barbier', 'Arnaud',
  'Martinez', 'Gerard', 'Roche', 'Renard', 'Schmitt', 'Leroux', 'Colin', 'Vidal', 'Caron', 'Picard',
  'Roger', 'Fabre', 'Aubert', 'Lemoine', 'Renaud', 'Dumas', 'Lacroix', 'Olivier', 'Philippe', 'Bourgeois',
  'Pierre', 'Benoit', 'Rey', 'Leclerc', 'Payet', 'Rolland', 'Leclercq', 'Guillaume', 'Lecomte', 'Lopez'
];

const PROFESSIONS = [
  'Développeur', 'Designer', 'Médecin', 'Avocat', 'Ingénieur', 'Professeur', 'Infirmier', 'Architecte',
  'Comptable', 'Journaliste', 'Chef cuisinier', 'Photographe', 'Marketing', 'Commercial', 'Consultant',
  'Psychologue', 'Kinésithérapeute', 'Pharmacien', 'Dentiste', 'Vétérinaire', 'Notaire', 'Banquier',
  'Entrepreneur', 'Artiste', 'Musicien', 'Acteur', 'Réalisateur', 'Styliste', 'Graphiste', 'Webdesigner',
  'Data Scientist', 'Product Manager', 'UX Designer', 'DevOps', 'Chef de projet', 'RH', 'Directeur',
  'Trader', 'Analyste', 'Auditeur', 'Coach sportif', 'Ostéopathe', 'Sage-femme', 'Diététicien',
  'Agent immobilier', 'Décorateur', 'Fleuriste', 'Boulanger', 'Sommelier', 'Œnologue'
];

const INTERESTS = [
  'voyage', 'cuisine', 'musique', 'cinema', 'lecture', 'sport', 'yoga', 'meditation',
  'randonnee', 'photographie', 'art', 'danse', 'theatre', 'nature', 'jardinage', 'bricolage',
  'jeux-video', 'technologie', 'mode', 'shopping', 'gastronomie', 'oenologie', 'cocktails',
  'running', 'natation', 'tennis', 'football', 'basketball', 'volleyball', 'ski', 'surf',
  'escalade', 'velo', 'equitation', 'golf', 'boxe', 'arts-martiaux', 'fitness', 'crossfit',
  'piano', 'guitare', 'chant', 'dessin', 'peinture', 'sculpture', 'ecriture', 'poesie',
  'animaux', 'chiens', 'chats', 'voyages', 'aventure', 'camping', 'plongee', 'voile'
];

const ZODIAC_SIGNS = [
  'belier', 'taureau', 'gemeaux', 'cancer', 'lion', 'vierge',
  'balance', 'scorpion', 'sagittaire', 'capricorne', 'verseau', 'poissons'
];

const BODY_TYPES = ['mince', 'athletique', 'normal', 'quelques-kilos-en-plus', 'rond'];
const EYE_COLORS = ['bleu', 'vert', 'marron', 'noisette', 'gris', 'noir'];
const HAIR_COLORS = ['noir', 'brun', 'chatain', 'blond', 'roux', 'gris', 'blanc'];
const SMOKING = ['non-fumeur', 'fumeur-occasionnel', 'fumeur'];
const DRINKING = ['jamais', 'occasionnellement', 'regulierement', 'sociales'];
const CHILDREN = ['aucun-en-veut', 'aucun-indecis', 'aucun-n-en-veut-pas', 'en-a'];
const PETS = ['aucun', 'chien', 'chat', 'chien-et-chat', 'autres'];
const EDUCATION = ['bac', 'bac+2', 'licence', 'master', 'doctorat', 'autre'];
const DIET_TYPES = ['omnivore', 'vegetarien', 'vegan', 'flexitarien', 'pescetarien'];
const RELIGIONS = ['atheisme', 'agnosticisme', 'catholicisme', 'protestantisme', 'islam', 'judaisme', 'bouddhisme', 'hindouisme', 'spiritualite', 'autre'];
const MARITAL_STATUSES: MaritalStatus[] = ['SINGLE', 'DIVORCED', 'WIDOWED', 'SEPARATED'];

const BIOS_TEMPLATES = [
  "Passionné(e) de {interest1} et {interest2}. J'adore les moments simples de la vie.",
  "Amateur(trice) de {interest1}, je cherche quelqu'un pour partager mes aventures.",
  "{profession} de métier, {interest1} de passion. Sourire garanti !",
  "La vie est trop courte pour ne pas profiter. Fan de {interest1} et {interest2}.",
  "Entre {interest1} et {interest2}, mon cœur balance. Et toi, tu préfères quoi ?",
  "Curieux(se) de nature, j'aime découvrir de nouvelles choses. {interest1} addict !",
  "{interest1} le week-end, {profession} la semaine. Équilibre parfait !",
  "Je cherche quelqu'un pour partager des {interest1} et des fous rires.",
  "Amoureux(se) de la {interest1} et des bonnes discussions autour d'un verre.",
  "Simple, authentique, fan de {interest1}. Le reste, tu le découvriras !",
];

// Photos placeholder - URLs with gender-specific photos
const getMalePhotoUrl = (index: number): string => {
  const photoId = (index % 99) + 1;
  return `https://randomuser.me/api/portraits/men/${photoId}.jpg`;
};

const getFemalePhotoUrl = (index: number): string => {
  const photoId = (index % 99) + 1;
  return `https://randomuser.me/api/portraits/women/${photoId}.jpg`;
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const domains = ['gmail.com', 'yahoo.fr', 'hotmail.fr', 'outlook.com', 'free.fr', 'orange.fr', 'sfr.fr'];
  const cleanFirst = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanLast = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const separator = randomElement(['.', '_', '']);
  const number = randomInt(1, 99);
  return `${cleanFirst}${separator}${cleanLast}${number}@${randomElement(domains)}`;
}

function generateBio(profession: string, interests: string[]): string {
  const template = randomElement(BIOS_TEMPLATES);
  return template
    .replace('{profession}', profession)
    .replace('{interest1}', interests[0] || 'voyage')
    .replace('{interest2}', interests[1] || 'musique');
}

// ==========================================
// MAIN SEED FUNCTION
// ==========================================

async function main() {
  console.log('🚀 Démarrage du seed avec 5000 utilisateurs...');
  console.log('⚠️  Nettoyage complet de la base de données...\n');

  // Nettoyage complet
  console.log('Suppression des données existantes...');
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userStats.deleteMany();
  await prisma.match.deleteMany();
  await prisma.profileView.deleteMany();
  await prisma.dislike.deleteMany();
  await prisma.like.deleteMany();
  await prisma.block.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.notificationSettings.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.globalStats.deleteMany();
  await prisma.appSettings.deleteMany();

  console.log('✅ Base de données nettoyée\n');

  // Hash du mot de passe commun
  console.log('Génération des mots de passe hashés...');
  const defaultHashedPassword = await bcrypt.hash('password123', 12);
  const adminHashedPassword = await bcrypt.hash('admin02000', 12);

  // Créer les paramètres de l'application
  console.log('Création des paramètres application...');
  await prisma.appSettings.create({
    data: {
      id: 'singleton',
      nsfwThreshold: 0.7,
      reportsBeforeAutoSuspend: 5,
      autoApprovePhotos: true, // Auto-approve pour ce seed
      dailyLikesLimit: 50,
      dailyLikesLimitPremium: 999,
      maxPhotosPerUser: 6,
      minAge: 18,
      maxAge: 99,
      emailVerificationRequired: false, // Désactivé pour les tests
      registrationOpen: true,
      maintenanceMode: false,
      premiumEnabled: true,
    }
  });

  // Créer les stats globales
  await prisma.globalStats.create({
    data: {
      id: 'singleton',
      totalUsers: 0,
      totalMatches: 0,
      totalLikes: 0,
    }
  });

  // ==========================================
  // CRÉATION DES UTILISATEURS
  // ==========================================

  const TOTAL_USERS = 5000;
  const BATCH_SIZE = 100;
  const userIds: { id: string; gender: Gender }[] = [];

  console.log(`\n📝 Création de ${TOTAL_USERS} utilisateurs...`);

  // Créer d'abord le compte admin
  console.log('Création du compte admin (florent.lefevre3@free.fr)...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'florent.lefevre3@free.fr',
      name: 'Florent Lefevre',
      hashedPassword: adminHashedPassword,
      age: 35,
      bio: 'Administrateur de la plateforme FlowDating. Passionné de technologie et de rencontres authentiques.',
      location: 'Paris, France',
      profession: 'Développeur',
      gender: 'MALE',
      maritalStatus: 'SINGLE',
      interests: ['technologie', 'voyage', 'musique', 'cinema', 'cuisine'],
      height: 180,
      weight: 75,
      bodyType: 'athletique',
      eyeColor: 'bleu',
      hairColor: 'brun',
      smoking: 'non-fumeur',
      drinking: 'occasionnellement',
      drugs: 'jamais',
      children: 'aucun-en-veut',
      pets: 'chat',
      education: 'master',
      zodiacSign: 'lion',
      dietType: 'omnivore',
      religion: 'agnosticisme',
      department: '75',
      postcode: '75001',
      region: 'Île-de-France',
      primaryAuthMethod: 'EMAIL_PASSWORD',
      accountStatus: 'ACTIVE',
      role: 'ADMIN',
      isOnline: true,
      isPremium: true,
      emailVerified: new Date(),
      lastSeen: new Date()
    }
  });

  userIds.push({ id: adminUser.id, gender: 'MALE' });

  // Créer les photos pour l'admin
  await prisma.photo.createMany({
    data: Array.from({ length: 6 }, (_, i) => ({
      userId: adminUser.id,
      url: getMalePhotoUrl(i),
      isPrimary: i === 0,
      moderationStatus: 'APPROVED',
      moderatedAt: new Date(),
    }))
  });

  console.log('✅ Compte admin créé\n');

  // Créer les autres utilisateurs par batch
  for (let batch = 0; batch < Math.ceil((TOTAL_USERS - 1) / BATCH_SIZE); batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_USERS - 1);
    const batchSize = batchEnd - batchStart;

    process.stdout.write(`\rCréation des utilisateurs ${batchStart + 2} à ${batchEnd + 1}...`);

    const usersToCreate = [];
    const photosToCreate: any[] = [];

    for (let i = 0; i < batchSize; i++) {
      const userIndex = batchStart + i + 1;
      const isMale = userIndex % 2 === 0;
      const gender: Gender = isMale ? 'MALE' : 'FEMALE';
      const firstName = isMale ? randomElement(MALE_FIRST_NAMES) : randomElement(FEMALE_FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const city = randomElement(FRENCH_CITIES);
      const profession = randomElement(PROFESSIONS);
      const userInterests = randomElements(INTERESTS, randomInt(3, 7));
      const age = randomInt(18, 55);

      const userData = {
        email: generateEmail(firstName, lastName, userIndex),
        name: `${firstName} ${lastName}`,
        hashedPassword: defaultHashedPassword,
        age,
        bio: generateBio(profession, userInterests),
        location: `${city.name}, France`,
        profession,
        gender,
        maritalStatus: randomElement(MARITAL_STATUSES),
        interests: userInterests,
        height: isMale ? randomInt(165, 195) : randomInt(155, 180),
        weight: isMale ? randomInt(60, 100) : randomInt(45, 80),
        bodyType: randomElement(BODY_TYPES),
        eyeColor: randomElement(EYE_COLORS),
        hairColor: randomElement(HAIR_COLORS),
        smoking: randomElement(SMOKING),
        drinking: randomElement(DRINKING),
        drugs: 'jamais',
        children: randomElement(CHILDREN),
        pets: randomElement(PETS),
        education: randomElement(EDUCATION),
        zodiacSign: randomElement(ZODIAC_SIGNS),
        dietType: randomElement(DIET_TYPES),
        religion: randomElement(RELIGIONS),
        department: city.department,
        postcode: city.postcode,
        region: city.region,
        primaryAuthMethod: 'EMAIL_PASSWORD' as AuthMethod,
        accountStatus: 'ACTIVE' as AccountStatus,
        role: 'USER' as const,
        isOnline: Math.random() > 0.7,
        isPremium: Math.random() > 0.85,
        emailVerified: new Date(),
        lastSeen: new Date(Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000))
      };

      usersToCreate.push(userData);
    }

    // Créer les utilisateurs du batch
    const createdUsers = await prisma.$transaction(
      usersToCreate.map(userData => prisma.user.create({ data: userData }))
    );

    // Collecter les IDs et préparer les photos
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const isMale = usersToCreate[i].gender === 'MALE';
      userIds.push({ id: user.id, gender: usersToCreate[i].gender });

      // Ajouter 6 photos pour cet utilisateur
      for (let photoIndex = 0; photoIndex < 6; photoIndex++) {
        photosToCreate.push({
          userId: user.id,
          url: isMale ? getMalePhotoUrl(batchStart + i * 6 + photoIndex) : getFemalePhotoUrl(batchStart + i * 6 + photoIndex),
          isPrimary: photoIndex === 0,
          moderationStatus: 'APPROVED',
          moderatedAt: new Date(),
        });
      }
    }

    // Créer les photos du batch
    await prisma.photo.createMany({ data: photosToCreate });
  }

  console.log(`\n✅ ${TOTAL_USERS} utilisateurs créés avec leurs photos\n`);

  // ==========================================
  // CRÉATION DES LIKES
  // ==========================================

  const TOTAL_LIKES = 50000; // 50000 likes aléatoires
  console.log(`💕 Création de ${TOTAL_LIKES} likes aléatoires...`);

  const maleUsers = userIds.filter(u => u.gender === 'MALE');
  const femaleUsers = userIds.filter(u => u.gender === 'FEMALE');

  const likesToCreate: { senderId: string; receiverId: string }[] = [];
  const likeSet = new Set<string>();

  for (let i = 0; i < TOTAL_LIKES; i++) {
    // Les hommes likent des femmes et vice versa
    const isMaleSender = Math.random() > 0.5;
    const sender = isMaleSender ? randomElement(maleUsers) : randomElement(femaleUsers);
    const receiver = isMaleSender ? randomElement(femaleUsers) : randomElement(maleUsers);

    const likeKey = `${sender.id}-${receiver.id}`;
    if (!likeSet.has(likeKey) && sender.id !== receiver.id) {
      likeSet.add(likeKey);
      likesToCreate.push({ senderId: sender.id, receiverId: receiver.id });
    }

    if (i % 10000 === 0 && i > 0) {
      process.stdout.write(`\r${i} likes générés...`);
    }
  }

  // Créer les likes par batch
  const LIKES_BATCH_SIZE = 1000;
  for (let i = 0; i < likesToCreate.length; i += LIKES_BATCH_SIZE) {
    const batch = likesToCreate.slice(i, i + LIKES_BATCH_SIZE);
    await prisma.like.createMany({ data: batch, skipDuplicates: true });
    process.stdout.write(`\r${Math.min(i + LIKES_BATCH_SIZE, likesToCreate.length)} / ${likesToCreate.length} likes créés...`);
  }

  console.log(`\n✅ ${likesToCreate.length} likes créés\n`);

  // ==========================================
  // CRÉATION DES MATCHES (likes mutuels)
  // ==========================================

  console.log('💑 Recherche des matches mutuels...');

  // Trouver les likes mutuels
  const allLikes = await prisma.like.findMany({
    select: { senderId: true, receiverId: true }
  });

  const likeMap = new Map<string, Set<string>>();
  for (const like of allLikes) {
    if (!likeMap.has(like.senderId)) {
      likeMap.set(like.senderId, new Set());
    }
    likeMap.get(like.senderId)!.add(like.receiverId);
  }

  const matchesToCreate: { user1Id: string; user2Id: string }[] = [];
  const matchSet = new Set<string>();

  for (const like of allLikes) {
    // Vérifier si le like est mutuel
    const reciprocalLikes = likeMap.get(like.receiverId);
    if (reciprocalLikes && reciprocalLikes.has(like.senderId)) {
      // C'est un match !
      const [user1Id, user2Id] = [like.senderId, like.receiverId].sort();
      const matchKey = `${user1Id}-${user2Id}`;

      if (!matchSet.has(matchKey)) {
        matchSet.add(matchKey);
        matchesToCreate.push({ user1Id, user2Id });
      }
    }
  }

  // Créer les matches par batch
  const MATCHES_BATCH_SIZE = 500;
  for (let i = 0; i < matchesToCreate.length; i += MATCHES_BATCH_SIZE) {
    const batch = matchesToCreate.slice(i, i + MATCHES_BATCH_SIZE).map(m => ({
      ...m,
      status: 'ACTIVE' as const
    }));
    await prisma.match.createMany({ data: batch, skipDuplicates: true });
    process.stdout.write(`\r${Math.min(i + MATCHES_BATCH_SIZE, matchesToCreate.length)} / ${matchesToCreate.length} matches créés...`);
  }

  console.log(`\n✅ ${matchesToCreate.length} matches créés\n`);

  // ==========================================
  // CRÉATION DES PRÉFÉRENCES
  // ==========================================

  console.log('⚙️  Création des préférences utilisateurs...');

  const preferencesToCreate = userIds.map(user => ({
    userId: user.id,
    minAge: randomInt(18, 30),
    maxAge: randomInt(35, 55),
    maxDistance: randomInt(20, 100),
    gender: user.gender === 'MALE' ? 'FEMALE' as Gender : 'MALE' as Gender,
    lookingFor: randomElement(['SERIOUS_RELATIONSHIP', 'CASUAL', 'FRIENDSHIP', 'MARRIAGE']),
  }));

  for (let i = 0; i < preferencesToCreate.length; i += 500) {
    const batch = preferencesToCreate.slice(i, i + 500);
    await prisma.userPreferences.createMany({ data: batch, skipDuplicates: true });
    process.stdout.write(`\r${Math.min(i + 500, preferencesToCreate.length)} / ${preferencesToCreate.length} préférences créées...`);
  }

  console.log(`\n✅ ${preferencesToCreate.length} préférences créées\n`);

  // ==========================================
  // MISE À JOUR DES STATS GLOBALES
  // ==========================================

  console.log('📊 Mise à jour des statistiques globales...');

  await prisma.globalStats.update({
    where: { id: 'singleton' },
    data: {
      totalUsers: TOTAL_USERS,
      totalMatches: matchesToCreate.length,
      totalLikes: likesToCreate.length,
      lastCalculated: new Date()
    }
  });

  // ==========================================
  // RÉSUMÉ
  // ==========================================

  console.log('\n' + '='.repeat(50));
  console.log('🎉 SEED TERMINÉ AVEC SUCCÈS !');
  console.log('='.repeat(50));
  console.log(`\n📈 Statistiques :`);
  console.log(`   • Utilisateurs créés : ${TOTAL_USERS}`);
  console.log(`   • Photos créées : ${TOTAL_USERS * 6}`);
  console.log(`   • Likes créés : ${likesToCreate.length}`);
  console.log(`   • Matches créés : ${matchesToCreate.length}`);
  console.log(`   • Villes représentées : ${FRENCH_CITIES.length}`);
  console.log(`\n👤 Compte admin :`);
  console.log(`   • Email : florent.lefevre3@free.fr`);
  console.log(`   • Mot de passe : admin02000`);
  console.log(`   • Rôle : ADMIN`);
  console.log(`\n🔐 Tous les autres comptes :`);
  console.log(`   • Mot de passe : password123`);
  console.log('\n✨ La base de données est prête !');
}

main()
  .catch((e) => {
    console.error('\n❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
