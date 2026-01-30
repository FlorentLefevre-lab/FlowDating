// prisma/create-matches.ts
// Script pour créer des matchs à partir des likes mutuels

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_USER_EMAIL = 'florent.lefevre3@free.fr';

async function main() {
  console.log('💕 Création des matchs pour', TARGET_USER_EMAIL, '...\n');

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

  let matchesCreated = 0;

  for (const testUser of testUsers) {
    // Déterminer user1Id et user2Id (user1Id doit être < user2Id pour éviter les doublons)
    const [user1Id, user2Id] = [targetUser.id, testUser.id].sort();

    // Vérifier si le match existe déjà
    const existingMatch = await prisma.match.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
    });

    if (existingMatch) {
      console.log(`⏭️  Match avec ${testUser.name} existe déjà, skip...`);
      continue;
    }

    // Créer le match
    await prisma.match.create({
      data: {
        user1Id,
        user2Id,
        status: 'ACTIVE',
      },
    });

    console.log(`🎉 Match créé entre ${targetUser.name} et ${testUser.name} !`);
    matchesCreated++;
  }

  console.log(`\n✨ Terminé ! ${matchesCreated} nouveaux matchs créés.`);
  console.log(`\n📝 Allez sur /matches pour voir vos matchs !`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
