// prisma/seed-20-users-with-photos.ts
// Script pour créer 20 utilisatrices avec 6 photos chacune + likes vers l'utilisateur cible

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_USER_EMAIL = 'florent.lefevre3@free.fr';

// Photos Unsplash de femmes (variées)
const photoUrls = [
  // Set 1
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop',
  // Set 2
  'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400&h=600&fit=crop',
  // Set 3
  'https://images.unsplash.com/photo-1491349174775-aaafddd81942?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=400&h=600&fit=crop',
  // Set 4
  'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1515023115689-589c33041d3c?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1464863979621-258859e62245?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1523264653568-53d67a18afc6?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1499887142886-791eca5918cd?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop',
  // Set 5
  'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1548142813-c348350df52b?w=400&h=600&fit=crop',
  // Set 6 - extras
  'https://images.unsplash.com/photo-1592621385612-4d7129426394?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1597223557154-721c1cecc4b0?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1601288496920-b6154fe3626a?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1558898479-33c0057a5d12?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1569124589354-615739ae007b?w=400&h=600&fit=crop',
];

// Données des 20 utilisatrices
const testUsers = [
  {
    name: 'Amélie',
    age: 26,
    bio: 'Architecte passionnée par le design et les voyages. J\'adore les brunchs du dimanche et les longues balades en ville.',
    location: 'Paris',
    profession: 'Architecte',
    interests: ['Architecture', 'Voyage', 'Design', 'Brunch', 'Photographie'],
    height: 168,
    bodyType: 'Mince',
    eyeColor: 'Vert',
    hairColor: 'Châtain',
  },
  {
    name: 'Charlotte',
    age: 29,
    bio: 'Médecin urgentiste le jour, passionnée de cuisine le soir. Je cherche quelqu\'un pour partager mes aventures culinaires.',
    location: 'Lyon',
    profession: 'Médecin',
    interests: ['Cuisine', 'Vin', 'Randonnée', 'Cinéma', 'Lecture'],
    height: 165,
    bodyType: 'Athlétique',
    eyeColor: 'Bleu',
    hairColor: 'Blond',
  },
  {
    name: 'Inès',
    age: 24,
    bio: 'Étudiante en droit international, rêveuse et globe-trotteuse. Fan de jazz et de soirées impro.',
    location: 'Bordeaux',
    profession: 'Étudiante en Droit',
    interests: ['Jazz', 'Voyages', 'Théâtre', 'Danse', 'Langues'],
    height: 170,
    bodyType: 'Normal',
    eyeColor: 'Marron',
    hairColor: 'Noir',
  },
  {
    name: 'Manon',
    age: 31,
    bio: 'Cheffe de projet digital, amoureuse des animaux et de la nature. Mon chien est mon meilleur ami !',
    location: 'Nantes',
    profession: 'Chef de Projet',
    interests: ['Tech', 'Nature', 'Animaux', 'Running', 'Yoga'],
    height: 163,
    bodyType: 'Mince',
    eyeColor: 'Noisette',
    hairColor: 'Roux',
  },
  {
    name: 'Chloé',
    age: 27,
    bio: 'Photographe freelance, je capture les moments de vie. Toujours partante pour une aventure spontanée.',
    location: 'Marseille',
    profession: 'Photographe',
    interests: ['Photo', 'Art', 'Voyages', 'Surf', 'Musique'],
    height: 172,
    bodyType: 'Athlétique',
    eyeColor: 'Bleu',
    hairColor: 'Châtain',
  },
  {
    name: 'Pauline',
    age: 25,
    bio: 'Développeuse web passionnée de jeux vidéo et de manga. Geek assumée cherche partenaire de co-op !',
    location: 'Toulouse',
    profession: 'Développeuse Web',
    interests: ['Gaming', 'Manga', 'Tech', 'Escape Game', 'Café'],
    height: 160,
    bodyType: 'Normal',
    eyeColor: 'Marron',
    hairColor: 'Brun',
  },
  {
    name: 'Anaïs',
    age: 28,
    bio: 'Danseuse professionnelle, je vis pour la scène. Je cherche quelqu\'un qui aime bouger et profiter de la vie.',
    location: 'Nice',
    profession: 'Danseuse',
    interests: ['Danse', 'Fitness', 'Plage', 'Musique', 'Festival'],
    height: 167,
    bodyType: 'Athlétique',
    eyeColor: 'Vert',
    hairColor: 'Blond',
  },
  {
    name: 'Clara',
    age: 30,
    bio: 'Avocate spécialisée en droit de la famille. Je cherche l\'équilibre entre travail intense et moments de détente.',
    location: 'Lille',
    profession: 'Avocate',
    interests: ['Lecture', 'Vin', 'Théâtre', 'Équitation', 'Voyage'],
    height: 175,
    bodyType: 'Mince',
    eyeColor: 'Gris',
    hairColor: 'Noir',
  },
  {
    name: 'Zoé',
    age: 23,
    bio: 'Étudiante en art, je peins mes émotions sur toile. Bohème dans l\'âme, je cherche une belle connexion.',
    location: 'Montpellier',
    profession: 'Artiste Peintre',
    interests: ['Art', 'Peinture', 'Musées', 'Vintage', 'Musique'],
    height: 162,
    bodyType: 'Normal',
    eyeColor: 'Marron',
    hairColor: 'Châtain',
  },
  {
    name: 'Lucie',
    age: 32,
    bio: 'Restauratrice, j\'ai ouvert mon propre bistrot il y a 2 ans. Passionnée par la gastronomie française.',
    location: 'Strasbourg',
    profession: 'Restauratrice',
    interests: ['Gastronomie', 'Vin', 'Marché', 'Jardinage', 'Convivialité'],
    height: 164,
    bodyType: 'Normal',
    eyeColor: 'Bleu',
    hairColor: 'Blond',
  },
  {
    name: 'Margot',
    age: 26,
    bio: 'Journaliste culture, je suis toujours à la recherche de la prochaine expo ou du concert à ne pas manquer.',
    location: 'Paris',
    profession: 'Journaliste',
    interests: ['Culture', 'Musique', 'Écriture', 'Cinéma', 'Podcasts'],
    height: 169,
    bodyType: 'Mince',
    eyeColor: 'Vert',
    hairColor: 'Roux',
  },
  {
    name: 'Alice',
    age: 27,
    bio: 'Vétérinaire en clinique, les animaux sont ma passion. Je rêve d\'une maison à la campagne avec plein de chats.',
    location: 'Rennes',
    profession: 'Vétérinaire',
    interests: ['Animaux', 'Nature', 'Randonnée', 'Jardinage', 'Cuisine'],
    height: 166,
    bodyType: 'Normal',
    eyeColor: 'Noisette',
    hairColor: 'Châtain',
  },
  {
    name: 'Léonie',
    age: 29,
    bio: 'Coach sportive et nutritionniste, j\'aide les gens à se sentir bien dans leur corps. Positive et énergique !',
    location: 'Lyon',
    profession: 'Coach Sportive',
    interests: ['Sport', 'Nutrition', 'Bien-être', 'Voyage', 'Développement personnel'],
    height: 171,
    bodyType: 'Athlétique',
    eyeColor: 'Bleu',
    hairColor: 'Blond',
  },
  {
    name: 'Camille',
    age: 25,
    bio: 'Designeuse UX/UI, je crée des interfaces qui font du bien. Fan de minimalisme et de design scandinave.',
    location: 'Nantes',
    profession: 'UX Designer',
    interests: ['Design', 'Tech', 'Minimalisme', 'Café', 'Podcast'],
    height: 165,
    bodyType: 'Mince',
    eyeColor: 'Marron',
    hairColor: 'Noir',
  },
  {
    name: 'Élise',
    age: 28,
    bio: 'Professeure de français à l\'étranger, je reviens de 3 ans au Japon. Passionnée par les cultures du monde.',
    location: 'Toulouse',
    profession: 'Professeure',
    interests: ['Langues', 'Voyage', 'Lecture', 'Japon', 'Thé'],
    height: 163,
    bodyType: 'Normal',
    eyeColor: 'Vert',
    hairColor: 'Brun',
  },
  {
    name: 'Nina',
    age: 24,
    bio: 'Musicienne, je joue du violon dans un orchestre. La musique classique est ma vie, mais j\'aime aussi le rock !',
    location: 'Paris',
    profession: 'Musicienne',
    interests: ['Musique', 'Concerts', 'Opéra', 'Piano', 'Ballet'],
    height: 168,
    bodyType: 'Mince',
    eyeColor: 'Bleu',
    hairColor: 'Noir',
  },
  {
    name: 'Sarah',
    age: 30,
    bio: 'Entrepreneuse dans la mode éthique, je crois en un monde plus responsable. Optimiste et déterminée.',
    location: 'Bordeaux',
    profession: 'Entrepreneuse',
    interests: ['Mode', 'Écologie', 'Business', 'Yoga', 'Méditation'],
    height: 174,
    bodyType: 'Mince',
    eyeColor: 'Marron',
    hairColor: 'Châtain',
  },
  {
    name: 'Jade',
    age: 26,
    bio: 'Infirmière de nuit, je vis un peu décalée mais j\'adore mon métier. Fan de séries et de soirées gaming.',
    location: 'Marseille',
    profession: 'Infirmière',
    interests: ['Séries', 'Gaming', 'Cinéma', 'Plage', 'Cuisine'],
    height: 161,
    bodyType: 'Normal',
    eyeColor: 'Vert',
    hairColor: 'Blond',
  },
  {
    name: 'Romane',
    age: 27,
    bio: 'Sommelière dans un restaurant étoilé, le vin n\'a plus de secret pour moi. Épicurienne dans l\'âme.',
    location: 'Dijon',
    profession: 'Sommelière',
    interests: ['Vin', 'Gastronomie', 'Voyage', 'Oenologie', 'Histoire'],
    height: 167,
    bodyType: 'Normal',
    eyeColor: 'Noisette',
    hairColor: 'Châtain',
  },
  {
    name: 'Lou',
    age: 23,
    bio: 'Étudiante en psychologie, curieuse de tout et de tous. Je cherche quelqu\'un d\'authentique et bienveillant.',
    location: 'Montpellier',
    profession: 'Étudiante',
    interests: ['Psychologie', 'Lecture', 'Méditation', 'Plage', 'Écriture'],
    height: 164,
    bodyType: 'Mince',
    eyeColor: 'Bleu',
    hairColor: 'Blond',
  },
];

async function main() {
  console.log('🌱 Création de 20 utilisatrices avec 6 photos chacune...\n');

  // Trouver l'utilisateur cible
  const targetUser = await prisma.user.findUnique({
    where: { email: TARGET_USER_EMAIL },
  });

  if (!targetUser) {
    console.error('❌ Utilisateur cible non trouvé:', TARGET_USER_EMAIL);
    process.exit(1);
  }

  console.log(`✅ Utilisateur cible: ${targetUser.name} (${targetUser.id})\n`);

  let usersCreated = 0;
  let likesCreated = 0;

  for (let i = 0; i < testUsers.length; i++) {
    const userData = testUsers[i];
    const email = `${userData.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}${i + 1}@flowdating.test`;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⏭️  ${userData.name} existe déjà, création du like...`);

      // Créer le like si pas déjà fait
      const existingLike = await prisma.like.findUnique({
        where: {
          senderId_receiverId: {
            senderId: existingUser.id,
            receiverId: targetUser.id,
          },
        },
      });

      if (!existingLike) {
        await prisma.like.create({
          data: {
            senderId: existingUser.id,
            receiverId: targetUser.id,
          },
        });
        likesCreated++;
        console.log(`   💖 Like créé: ${userData.name} -> ${targetUser.name}`);
      }
      continue;
    }

    // Sélectionner 6 photos pour cette utilisatrice (rotation dans le tableau)
    const userPhotos = [];
    for (let j = 0; j < 6; j++) {
      const photoIndex = (i * 6 + j) % photoUrls.length;
      userPhotos.push({
        url: photoUrls[photoIndex],
        isPrimary: j === 0,
        moderationStatus: 'APPROVED',
      });
    }

    // Créer l'utilisatrice avec ses 6 photos
    const user = await prisma.user.create({
      data: {
        email,
        name: userData.name,
        age: userData.age,
        gender: 'FEMALE',
        bio: userData.bio,
        location: userData.location,
        profession: userData.profession,
        interests: userData.interests,
        height: userData.height,
        bodyType: userData.bodyType,
        eyeColor: userData.eyeColor,
        hairColor: userData.hairColor,
        accountStatus: 'ACTIVE',
        isOnline: Math.random() > 0.5,
        lastSeen: new Date(),
        emailVerified: new Date(),
        photos: {
          create: userPhotos,
        },
        preferences: {
          create: {
            minAge: 25,
            maxAge: 45,
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
    console.log(`   📷 ${user.photos.length} photos ajoutées`);
    usersCreated++;

    // Créer le like vers l'utilisateur cible
    await prisma.like.create({
      data: {
        senderId: user.id,
        receiverId: targetUser.id,
      },
    });
    likesCreated++;
    console.log(`   💖 Like créé: ${user.name} -> ${targetUser.name}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 TERMINÉ !');
  console.log(`   👩 ${usersCreated} nouvelles utilisatrices créées`);
  console.log(`   📷 ${usersCreated * 6} photos ajoutées`);
  console.log(`   💖 ${likesCreated} likes créés vers ${targetUser.name}`);
  console.log('='.repeat(50));
  console.log('\n📝 Allez sur /discover pour voir ces profils et créer des matchs !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
