// prisma/seed.ts - Script simplifié avec 4 utilisateurs
import { config } from 'dotenv';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
config({ path: envPath });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed de la base de données avec 4 utilisateurs...');

  const hashedPassword = await bcrypt.hash('password123', 12);

  // Nettoyage
  console.log('Nettoyage...');
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

  // Création des 4 utilisateurs
  console.log('Création des utilisateurs...');

  const homme1 = await prisma.user.create({
    data: {
      email: 'florian.andre@test.com',
      name: 'Florian Andre',
      hashedPassword,
      age: 28,
      bio: 'Passionné de voyages et de cuisine. J\'adore découvrir de nouvelles cultures.',
      location: 'Paris, France',
      profession: 'Développeur web',
      gender: 'MALE',
      maritalStatus: 'SINGLE',
      interests: ['voyage', 'cuisine', 'technologie', 'cinema', 'musique'],
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
      primaryAuthMethod: 'EMAIL_PASSWORD',
      accountStatus: 'ACTIVE',
      isOnline: true,
      lastSeen: new Date()
    }
  });

  const homme2 = await prisma.user.create({
    data: {
      email: 'thomas.martin@test.com',
      name: 'Thomas Martin',
      hashedPassword,
      age: 32,
      bio: 'Amateur de sport et de bonne musique. Toujours partant pour une aventure.',
      location: 'Lyon, France',
      profession: 'Ingénieur',
      gender: 'MALE',
      maritalStatus: 'SINGLE',
      interests: ['sport', 'musique', 'randonnée', 'lecture', 'yoga'],
      height: 175,
      weight: 70,
      bodyType: 'normal',
      eyeColor: 'marron',
      hairColor: 'noir',
      smoking: 'fumeur-occasionnel',
      drinking: 'sociales',
      drugs: 'jamais',
      children: 'aucun-indecis',
      pets: 'chien',
      education: 'licence',
      zodiacSign: 'scorpion',
      dietType: 'flexitarien',
      religion: 'atheisme',
      primaryAuthMethod: 'EMAIL_PASSWORD',
      accountStatus: 'ACTIVE',
      isOnline: false,
      lastSeen: new Date()
    }
  });

  const femme1 = await prisma.user.create({
    data: {
      email: 'elise.dupont@test.com',
      name: 'Elise Dupont',
      hashedPassword,
      age: 26,
      bio: 'Créative et curieuse, j\'aime l\'art sous toutes ses formes.',
      location: 'Paris, France',
      profession: 'Designer UX/UI',
      gender: 'FEMALE',
      maritalStatus: 'SINGLE',
      interests: ['art', 'design', 'photographie', 'voyage', 'danse'],
      height: 165,
      weight: 55,
      bodyType: 'mince',
      eyeColor: 'vert',
      hairColor: 'chatain',
      smoking: 'non-fumeur',
      drinking: 'occasionnellement',
      drugs: 'jamais',
      children: 'aucun-en-veut',
      pets: 'aucun',
      education: 'master',
      zodiacSign: 'balance',
      dietType: 'vegetarien',
      religion: 'spiritualite',
      primaryAuthMethod: 'EMAIL_PASSWORD',
      accountStatus: 'ACTIVE',
      isOnline: true,
      lastSeen: new Date()
    }
  });

  const femme2 = await prisma.user.create({
    data: {
      email: 'marie.leroy@test.com',
      name: 'Marie Leroy',
      hashedPassword,
      age: 29,
      bio: 'Médecin passionnée par mon métier. J\'aime les soirées tranquilles et les bons livres.',
      location: 'Lyon, France',
      profession: 'Médecin',
      gender: 'FEMALE',
      maritalStatus: 'SINGLE',
      interests: ['lecture', 'cinema', 'yoga', 'cuisine', 'nature'],
      height: 170,
      weight: 60,
      bodyType: 'normal',
      eyeColor: 'noisette',
      hairColor: 'blond',
      smoking: 'non-fumeur',
      drinking: 'jamais',
      drugs: 'jamais',
      children: 'aucun-en-veut',
      pets: 'chat',
      education: 'doctorat',
      zodiacSign: 'vierge',
      dietType: 'omnivore',
      religion: 'catholicisme',
      primaryAuthMethod: 'EMAIL_PASSWORD',
      accountStatus: 'ACTIVE',
      isOnline: false,
      lastSeen: new Date()
    }
  });

  console.log('4 utilisateurs créés');

  // Photos
  console.log('Ajout des photos...');
  await prisma.photo.createMany({
    data: [
      { userId: homme1.id, url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', isPrimary: true },
      { userId: homme2.id, url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face', isPrimary: true },
      { userId: femme1.id, url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face', isPrimary: true },
      { userId: femme2.id, url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face', isPrimary: true },
    ]
  });

  // Likes mutuels (tout le monde s'aime)
  console.log('Création des likes mutuels...');

  // Elise <-> Florian
  await prisma.like.create({ data: { senderId: femme1.id, receiverId: homme1.id } });
  await prisma.like.create({ data: { senderId: homme1.id, receiverId: femme1.id } });

  // Elise <-> Thomas
  await prisma.like.create({ data: { senderId: femme1.id, receiverId: homme2.id } });
  await prisma.like.create({ data: { senderId: homme2.id, receiverId: femme1.id } });

  // Marie <-> Florian
  await prisma.like.create({ data: { senderId: femme2.id, receiverId: homme1.id } });
  await prisma.like.create({ data: { senderId: homme1.id, receiverId: femme2.id } });

  // Marie <-> Thomas
  await prisma.like.create({ data: { senderId: femme2.id, receiverId: homme2.id } });
  await prisma.like.create({ data: { senderId: homme2.id, receiverId: femme2.id } });

  // Matchs
  console.log('Création des matchs...');

  // Elise <-> Florian
  await prisma.match.create({
    data: {
      user1Id: femme1.id < homme1.id ? femme1.id : homme1.id,
      user2Id: femme1.id < homme1.id ? homme1.id : femme1.id,
      status: 'ACTIVE'
    }
  });

  // Elise <-> Thomas
  await prisma.match.create({
    data: {
      user1Id: femme1.id < homme2.id ? femme1.id : homme2.id,
      user2Id: femme1.id < homme2.id ? homme2.id : femme1.id,
      status: 'ACTIVE'
    }
  });

  // Marie <-> Florian
  await prisma.match.create({
    data: {
      user1Id: femme2.id < homme1.id ? femme2.id : homme1.id,
      user2Id: femme2.id < homme1.id ? homme1.id : femme2.id,
      status: 'ACTIVE'
    }
  });

  // Marie <-> Thomas
  await prisma.match.create({
    data: {
      user1Id: femme2.id < homme2.id ? femme2.id : homme2.id,
      user2Id: femme2.id < homme2.id ? homme2.id : femme2.id,
      status: 'ACTIVE'
    }
  });

  // Préférences
  console.log('Création des préférences...');
  await prisma.userPreferences.createMany({
    data: [
      { userId: homme1.id, minAge: 20, maxAge: 35, maxDistance: 50, gender: 'FEMALE', lookingFor: 'SERIOUS_RELATIONSHIP' },
      { userId: homme2.id, minAge: 22, maxAge: 38, maxDistance: 100, gender: 'FEMALE', lookingFor: 'SERIOUS_RELATIONSHIP' },
      { userId: femme1.id, minAge: 25, maxAge: 40, maxDistance: 50, gender: 'MALE', lookingFor: 'SERIOUS_RELATIONSHIP' },
      { userId: femme2.id, minAge: 28, maxAge: 42, maxDistance: 100, gender: 'MALE', lookingFor: 'MARRIAGE' },
    ]
  });

  console.log('\n=== RÉSUMÉ ===');
  console.log('Utilisateurs: 4 (2 hommes, 2 femmes)');
  console.log('Matchs: 4 (chaque femme matche avec chaque homme)');
  console.log('\nComptes de test:');
  console.log('  - florian.andre@test.com (Homme)');
  console.log('  - thomas.martin@test.com (Homme)');
  console.log('  - elise.dupont@test.com (Femme)');
  console.log('  - marie.leroy@test.com (Femme)');
  console.log('\nMot de passe: password123');
  console.log('\nBase de données prête !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
