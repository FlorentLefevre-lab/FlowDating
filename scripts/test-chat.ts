// ===========================================
// ÉTAPE 17: Script de Test
// FICHIER: scripts/test-chat.ts
// ===========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testChatSystem() {
  try {
    console.log('🧪 Test du système de messagerie...');

    // 1. Récupérer deux utilisateurs pour créer un match
    const users = await prisma.user.findMany({
      take: 2,
      select: { id: true, name: true, email: true }
    });

    if (users.length < 2) {
      console.log('❌ Pas assez d\'utilisateurs pour tester (minimum 2)');
      console.log('💡 Créez au moins 2 utilisateurs dans votre application d\'abord');
      console.log('📝 Vous pouvez vous inscrire via /auth/register');
      return;
    }

    console.log('👥 Utilisateurs trouvés:', users.map(u => u.name));

    // 2. Vérifier si un match existe déjà entre ces utilisateurs
    const existingMatch = await prisma.match.findFirst({
      where: {
        AND: [
          { users: { some: { id: users[0].id } } },
          { users: { some: { id: users[1].id } } }
        ]
      }
    });

    let match;
    if (existingMatch) {
      console.log('♻️  Match existant trouvé:', existingMatch.id);
      match = existingMatch;
    } else {
      // 3. Créer un match entre ces utilisateurs
      match = await prisma.match.create({
        data: {
          users: {
            connect: [
              { id: users[0].id },
              { id: users[1].id }
            ]
          }
        },
        include: {
          users: {
            select: { id: true, name: true }
          }
        }
      });
      console.log('💕 Nouveau match créé:', match.id);
    }

    // 4. Créer quelques messages de test
    const existingMessages = await prisma.message.count({
      where: { matchId: match.id }
    });

    if (existingMessages === 0) {
      const messages = await Promise.all([
        prisma.message.create({
          data: {
            content: 'Salut ! Comment ça va ?',
            senderId: users[0].id,
            receiverId: users[1].id,
            matchId: match.id
          }
        }),
        prisma.message.create({
          data: {
            content: 'Salut ! Ça va bien et toi ?',
            senderId: users[1].id,
            receiverId: users[0].id,
            matchId: match.id
          }
        }),
        prisma.message.create({
          data: {
            content: 'Super ! Tu fais quoi ce soir ?',
            senderId: users[0].id,
            receiverId: users[1].id,
            matchId: match.id
          }
        })
      ]);
      console.log('💬 Messages de test créés:', messages.length);
    } else {
      console.log('💬 Messages existants:', existingMessages);
    }

    // 5. Tester la récupération des matches avec messages
    const matchesWithMessages = await prisma.match.findMany({
      where: {
        users: {
          some: { id: users[0].id }
        }
      },
      include: {
        users: {
          select: { id: true, name: true, image: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    console.log('📊 Matches avec messages:', matchesWithMessages.length);

    // 6. Tester le comptage des messages non lus
    const unreadCount = await prisma.message.count({
      where: {
        matchId: match.id,
        receiverId: users[1].id,
        readAt: null
      }
    });

    console.log('📬 Messages non lus pour', users[1].name + ':', unreadCount);

    // 7. Tester l'API des matches
    console.log('\n🔗 Test des API routes...');
    
    // Note: En environnement de test, on ne peut pas facilement tester les API routes
    // car elles nécessitent une session NextAuth. On affiche juste les URLs à tester.
    
    console.log('📍 URLs à tester manuellement dans votre navigateur :');
    console.log('   - http://localhost:3000/api/matches');
    console.log('   - http://localhost:3000/api/messages?matchId=' + match.id);
    console.log('   - http://localhost:3000/chat');

    console.log('\n🎉 Test du système de messagerie réussi !');
    console.log('💡 Prochaines étapes :');
    console.log('   1. Démarrez le serveur : npm run dev');
    console.log('   2. Connectez-vous avec un des utilisateurs test');
    console.log('   3. Allez sur /chat pour voir vos matches');
    console.log('   4. Testez l\'envoi de messages en temps réel');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.log('\n🔧 Vérifications à faire :');
    console.log('   - PostgreSQL est-il démarré ?');
    console.log('   - La variable DATABASE_URL est-elle correcte ?');
    console.log('   - Avez-vous exécuté : npx prisma migrate dev ?');
    console.log('   - Avez-vous exécuté : npx prisma generate ?');
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour nettoyer les données de test
async function cleanupTestData() {
  try {
    console.log('🧹 Nettoyage des données de test...');
    
    // Supprimer tous les messages
    const deletedMessages = await prisma.message.deleteMany({});
    console.log('🗑️  Messages supprimés:', deletedMessages.count);
    
    // Supprimer tous les matches
    const deletedMatches = await prisma.match.deleteMany({});
    console.log('🗑️  Matches supprimés:', deletedMatches.count);
    
    console.log('✅ Données de test nettoyées');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction pour afficher des statistiques
async function showStats() {
  try {
    console.log('📊 Statistiques de la base de données :');
    
    const userCount = await prisma.user.count();
    const matchCount = await prisma.match.count();
    const messageCount = await prisma.message.count();
    
    console.log(`👥 Utilisateurs: ${userCount}`);
    console.log(`💕 Matches: ${matchCount}`);
    console.log(`💬 Messages: ${messageCount}`);
    
    if (messageCount > 0) {
      const unreadMessages = await prisma.message.count({
        where: { readAt: null }
      });
      console.log(`📬 Messages non lus: ${unreadMessages}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage des stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    cleanupTestData();
  } else if (args.includes('--stats')) {
    showStats();
  } else {
    testChatSystem();
  }
}

export { testChatSystem, cleanupTestData, showStats };