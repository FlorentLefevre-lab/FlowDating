// prisma/seed-likes.ts
// Script pour créer des likes vers l'utilisateur courant

import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables d'environnement depuis .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_USER_EMAIL = 'florent.lefevre3@free.fr';

async function main() {
  console.log('💖 Création des likes vers', TARGET_USER_EMAIL, '...\n');

  // Trouver l'utilisateur cible
  const targetUser = await prisma.user.findUnique({
    where: { email: TARGET_USER_EMAIL },
  });

  if (!targetUser) {
    console.error('❌ Utilisateur non trouvé:', TARGET_USER_EMAIL);
    process.exit(1);
  }

  console.log(`✅ Utilisateur trouvé: ${targetUser.name} (${targetUser.id})\n`);

  // Trouver toutes les utilisatrices de test
  const testUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: '@flowdating.test' },
      gender: 'FEMALE',
    },
  });

  console.log(`📋 ${testUsers.length} utilisatrices de test trouvées\n`);

  let likesCreated = 0;

  for (const testUser of testUsers) {
    // Vérifier si le like existe déjà
    const existingLike = await prisma.like.findUnique({
      where: {
        senderId_receiverId: {
          senderId: testUser.id,
          receiverId: targetUser.id,
        },
      },
    });

    if (existingLike) {
      console.log(`⏭️  ${testUser.name} a déjà liké ${targetUser.name}, skip...`);
      continue;
    }

    // Créer le like
    await prisma.like.create({
      data: {
        senderId: testUser.id,
        receiverId: targetUser.id,
      },
    });

    console.log(`💖 ${testUser.name} a liké ${targetUser.name} !`);
    likesCreated++;
  }

  console.log(`\n🎉 Terminé ! ${likesCreated} nouveaux likes créés.`);
  console.log(`\n📝 Maintenant, allez sur /discover et likez ces femmes pour créer des matchs !`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
