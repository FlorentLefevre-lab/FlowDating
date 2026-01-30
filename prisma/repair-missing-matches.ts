// prisma/repair-missing-matches.ts
// Script pour détecter et créer les matchs manquants à partir des likes mutuels

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche des likes mutuels sans match correspondant...\n');

  // Récupérer tous les likes
  const allLikes = await prisma.like.findMany({
    include: {
      sender: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
    },
  });

  console.log(`📊 Total de likes en base: ${allLikes.length}\n`);

  // Créer un Set pour recherche rapide des likes (senderId -> receiverId)
  const likeSet = new Set<string>();
  for (const like of allLikes) {
    likeSet.add(`${like.senderId}->${like.receiverId}`);
  }

  // Trouver les likes mutuels
  const mutualLikes: Array<{ user1: any; user2: any }> = [];
  const processedPairs = new Set<string>();

  for (const like of allLikes) {
    // Vérifier si le like inverse existe
    const reverseKey = `${like.receiverId}->${like.senderId}`;
    if (likeSet.has(reverseKey)) {
      // Créer une clé unique pour la paire (triée pour éviter les doublons)
      const [id1, id2] = [like.senderId, like.receiverId].sort();
      const pairKey = `${id1}-${id2}`;

      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);
        mutualLikes.push({
          user1: like.sender,
          user2: like.receiver,
        });
      }
    }
  }

  console.log(`💕 Likes mutuels trouvés: ${mutualLikes.length}\n`);

  if (mutualLikes.length === 0) {
    console.log('✅ Aucun like mutuel trouvé, rien à réparer.');
    return;
  }

  let matchesCreated = 0;
  let matchesExisting = 0;

  for (const { user1, user2 } of mutualLikes) {
    // Déterminer user1Id et user2Id (user1Id doit être < user2Id)
    const [user1Id, user2Id] = [user1.id, user2.id].sort();

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
      console.log(`✅ Match existe déjà: ${user1.name} <-> ${user2.name}`);
      matchesExisting++;
    } else {
      // Créer le match manquant
      await prisma.match.create({
        data: {
          user1Id,
          user2Id,
          status: 'ACTIVE',
        },
      });
      console.log(`🎉 Match CRÉÉ: ${user1.name} <-> ${user2.name}`);
      matchesCreated++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RÉSUMÉ:');
  console.log(`   - Likes mutuels analysés: ${mutualLikes.length}`);
  console.log(`   - Matchs déjà existants: ${matchesExisting}`);
  console.log(`   - Matchs créés: ${matchesCreated}`);
  console.log('='.repeat(50));

  if (matchesCreated > 0) {
    console.log(`\n🔧 ${matchesCreated} match(s) manquant(s) ont été réparés !`);
  } else {
    console.log('\n✅ Tous les likes mutuels ont leur match correspondant.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
