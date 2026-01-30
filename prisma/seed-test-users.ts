// prisma/seed-test-users.ts
// Script pour ajouter des utilisateurs de test

import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables d'environnement depuis .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Photos de test (images placeholder)
const testPhotos = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop',
];

const testUsers = [
  {
    email: 'marie.test@flowdating.test',
    name: 'Marie',
    age: 25,
    gender: 'FEMALE' as const,
    bio: 'Passionnée de voyage et de photographie. J\'adore découvrir de nouvelles cultures et cuisines du monde.',
    location: 'Paris',
    profession: 'Photographe',
    interests: ['Voyage', 'Photographie', 'Cuisine', 'Yoga', 'Lecture'],
    height: 165,
    bodyType: 'Athlétique',
    eyeColor: 'Vert',
    hairColor: 'Brun',
  },
  {
    email: 'sophie.test@flowdating.test',
    name: 'Sophie',
    age: 28,
    gender: 'FEMALE' as const,
    bio: 'Médecin le jour, danseuse la nuit ! Je cherche quelqu\'un qui aime rire et profiter de la vie.',
    location: 'Lyon',
    profession: 'Médecin',
    interests: ['Danse', 'Musique', 'Cinéma', 'Sport', 'Gastronomie'],
    height: 170,
    bodyType: 'Mince',
    eyeColor: 'Bleu',
    hairColor: 'Blond',
  },
  {
    email: 'emma.test@flowdating.test',
    name: 'Emma',
    age: 23,
    gender: 'FEMALE' as const,
    bio: 'Étudiante en art, je peins mes émotions et cherche quelqu\'un pour partager mes aventures créatives.',
    location: 'Bordeaux',
    profession: 'Étudiante en Art',
    interests: ['Art', 'Peinture', 'Musées', 'Randonnée', 'Nature'],
    height: 162,
    bodyType: 'Normal',
    eyeColor: 'Marron',
    hairColor: 'Roux',
  },
  {
    email: 'julie.test@flowdating.test',
    name: 'Julie',
    age: 30,
    gender: 'FEMALE' as const,
    bio: 'Entrepreneuse dans la tech. J\'aime les défis et les conversations profondes autour d\'un bon café.',
    location: 'Toulouse',
    profession: 'CEO Startup',
    interests: ['Tech', 'Entrepreneuriat', 'Café', 'Tennis', 'Podcast'],
    height: 168,
    bodyType: 'Athlétique',
    eyeColor: 'Vert',
    hairColor: 'Noir',
  },
  {
    email: 'lea.test@flowdating.test',
    name: 'Léa',
    age: 26,
    gender: 'FEMALE' as const,
    bio: 'Professeure de yoga et passionnée de bien-être. Je cherche une connexion authentique et spirituelle.',
    location: 'Nice',
    profession: 'Professeure de Yoga',
    interests: ['Yoga', 'Méditation', 'Végétarien', 'Plage', 'Spiritualité'],
    height: 172,
    bodyType: 'Mince',
    eyeColor: 'Bleu',
    hairColor: 'Châtain',
  },
  {
    email: 'camille.test@flowdating.test',
    name: 'Camille',
    age: 24,
    gender: 'FEMALE' as const,
    bio: 'Musicienne et amoureuse des animaux. Mon chat est mon meilleur ami mais je cherche un humain aussi !',
    location: 'Marseille',
    profession: 'Musicienne',
    interests: ['Musique', 'Guitare', 'Animaux', 'Concerts', 'Festivals'],
    height: 160,
    bodyType: 'Normal',
    eyeColor: 'Marron',
    hairColor: 'Brun',
  },
];

async function main() {
  console.log('🌱 Début du seeding des utilisateurs de test...\n');

  for (let i = 0; i < testUsers.length; i++) {
    const userData = testUsers[i];
    const photoUrl = testPhotos[i % testPhotos.length];

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`⏭️  ${userData.name} existe déjà, skip...`);
      continue;
    }

    // Créer l'utilisateur avec sa photo
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        age: userData.age,
        gender: userData.gender,
        bio: userData.bio,
        location: userData.location,
        profession: userData.profession,
        interests: userData.interests,
        height: userData.height,
        bodyType: userData.bodyType,
        eyeColor: userData.eyeColor,
        hairColor: userData.hairColor,
        accountStatus: 'ACTIVE',
        isOnline: Math.random() > 0.5, // 50% de chance d'être en ligne
        lastSeen: new Date(),
        emailVerified: new Date(),
        photos: {
          create: {
            url: photoUrl,
            isPrimary: true,
            moderationStatus: 'APPROVED',
          },
        },
        preferences: {
          create: {
            minAge: 20,
            maxAge: 40,
            maxDistance: 100,
            gender: 'MALE',
          },
        },
      },
      include: {
        photos: true,
      },
    });

    console.log(`✅ Créé: ${user.name} (${user.age} ans) - ${user.location}`);
    console.log(`   📷 Photo: ${user.photos[0]?.url.substring(0, 50)}...`);
  }

  console.log('\n🎉 Seeding terminé !');
  console.log(`📊 Total: ${testUsers.length} utilisateurs de test ajoutés`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
