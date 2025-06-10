// prisma/seed.ts - Script pour remplir la BDD PostgreSQL avec 100 utilisateurs et des données aléatoires
import { PrismaClient, Gender, AuthMethod, MaritalStatus, AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Données pour générer des utilisateurs variés
const prenoms = [
  'David', 'Alice', 'Marie', 'Pierre', 'Sarah', 'Thomas', 'Emma', 'Lucas', 'Léa', 'Antoine',
  'Chloé', 'Nicolas', 'Camille', 'Julien', 'Manon', 'Alexandre', 'Sophie', 'Maxime', 'Clara', 'Romain',
  'Julie', 'Benjamin', 'Laura', 'Quentin', 'Morgane', 'Valentin', 'Océane', 'Hugo', 'Mathilde', 'Paul',
  'Anaïs', 'Kevin', 'Inès', 'Florian', 'Eva', 'Arthur', 'Jade', 'Louis', 'Amandine', 'Simon',
  'Pauline', 'Clément', 'Lola', 'Baptiste', 'Elise', 'Théo', 'Marion', 'Adrien', 'Justine', 'Fabien'
];

const noms = [
  'Martin', 'Dupont', 'Leroy', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Garcia', 'David',
  'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Andre', 'Lefevre', 'Mercier', 'Durand',
  'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin',
  'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont',
  'Lopez', 'Fontaine', 'Chevalier', 'Robin', 'Masson', 'Sanchez', 'Gerard', 'Nguyen', 'Boyer', 'Denis'
];

const villes = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
  'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne',
  'Clermont-Ferrand', 'Aix-en-Provence', 'Brest', 'Limoges', 'Tours', 'Amiens', 'Perpignan', 'Metz', 'Besançon', 'Orléans'
];

const professions = [
  'Ingénieur logiciel', 'Designer UX/UI', 'Chef cuisinier', 'Médecin', 'Professeur', 'Avocat', 'Architecte',
  'Journaliste', 'Photographe', 'Marketing', 'Consultant', 'Infirmier', 'Comptable', 'Artiste', 'Musicien',
  'Vétérinaire', 'Pharmacien', 'Psychologue', 'Entrepreneur', 'Commercial', 'Développeur web', 'Data scientist',
  'Chef de projet', 'Graphiste', 'Traducteur', 'Kinésithérapeute', 'Banquier', 'Agent immobilier', 'Policier', 'Pompier'
];

const centresInteret = [
  'technologie', 'voyages', 'cuisine', 'sport', 'lecture', 'cinéma', 'musique', 'art', 'photographie', 'danse',
  'randonnée', 'yoga', 'fitness', 'jardinage', 'mode', 'vin', 'gaming', 'théâtre', 'peinture', 'course à pied',
  'natation', 'ski', 'surf', 'escalade', 'méditation', 'astronomie', 'histoire', 'science', 'littérature', 'bénévolat'
];

const genderValues = [Gender.MALE, Gender.FEMALE, Gender.OTHER, Gender.NON_BINARY];
const maritalStatusValues = [MaritalStatus.SINGLE, MaritalStatus.IN_RELATIONSHIP, MaritalStatus.DIVORCED, MaritalStatus.WIDOWED];

const bios = [
  'Passionné(e) de découvertes et d\'aventures',
  'À la recherche de moments authentiques',
  'Créatif(ve) dans l\'âme, curieux/se de nature',
  'Amateur/rice de bons moments entre amis',
  'Toujours partant(e) pour de nouvelles expériences',
  'Fan de voyages et de cultures différentes',
  'Adore les soirées cocooning comme les sorties animées',
  'Passionné(e) par mon métier et la vie en général',
  'À l\'écoute, bienveillant(e) et spontané(e)',
  'Epicurien(ne) qui profite de chaque instant'
];

// Fonction utilitaire pour générer des nombres aléatoires
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Fonction pour choisir un élément aléatoire dans un tableau
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Fonction pour choisir plusieurs éléments aléatoires dans un tableau
function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Fonction pour générer des paires aléatoires sans doublons
function generateRandomPairs(userIds: string[], count: number): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const usedPairs = new Set<string>();
  
  while (pairs.length < count && pairs.length < (userIds.length * (userIds.length - 1)) / 2) {
    const user1 = randomChoice(userIds);
    const user2 = randomChoice(userIds);
    
    if (user1 === user2) continue;
    
    const pairKey = [user1, user2].sort().join('-');
    if (usedPairs.has(pairKey)) continue;
    
    usedPairs.add(pairKey);
    pairs.push([user1, user2]);
  }
  
  return pairs;
}

async function main() {
  console.log('🌱 Seed de la base de données PostgreSQL avec 100 utilisateurs...');

  try {
    // Générer un mot de passe haché générique pour tous les utilisateurs de test
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    console.log(`🔒 Mot de passe par défaut pour tous les utilisateurs: "${defaultPassword}"`);

    // 1. Nettoyer TOUTES les données existantes
    console.log('🧹 Nettoyage complet de la base de données...');
    
    // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
    await prisma.dislike.deleteMany();
    console.log('  ✓ Dislikes supprimés');
    
    await prisma.like.deleteMany();
    console.log('  ✓ Likes supprimés');
    
    await prisma.profileView.deleteMany();
    console.log('  ✓ Vues de profil supprimées');
    
    await prisma.photo.deleteMany();
    console.log('  ✓ Photos supprimées');
    
    await prisma.userPreferences.deleteMany();
    console.log('  ✓ Préférences supprimées');
    
    await prisma.notificationSettings.deleteMany();
    console.log('  ✓ Paramètres de notification supprimés');
    
    await prisma.block.deleteMany();
    console.log('  ✓ Blocages supprimés');
    
    // Supprimer les sessions et comptes NextAuth
    await prisma.session.deleteMany();
    console.log('  ✓ Sessions supprimées');
    
    await prisma.account.deleteMany();
    console.log('  ✓ Comptes supprimés');
    
    // Maintenant on peut supprimer tous les utilisateurs
    await prisma.user.deleteMany();
    console.log('  ✓ Utilisateurs supprimés');
    
    console.log('✅ Base de données complètement nettoyée');

    // 2. Créer 100 utilisateurs de test
    console.log('\n👥 Création de 100 utilisateurs...');
    console.log('✉️ Tous les emails seront marqués comme vérifiés');
    
    const users = [];
    
    for (let i = 0; i < 100; i++) {
      const prenom = randomChoice(prenoms);
      const nom = randomChoice(noms);
      const email = `${prenom.toLowerCase()}.${nom.toLowerCase()}${i}@test.com`;
      const name = `${prenom} ${nom}`;
      const age = randomInt(18, 50);
      const profession = randomChoice(professions);
      const location = `${randomChoice(villes)}, France`;
      
      const gender = randomChoice(genderValues);
      const maritalStatus = Math.random() > 0.5 ? randomChoice(maritalStatusValues) : null;
      
      const interests = randomChoices(centresInteret, randomInt(3, 8));
      const bio = randomChoice(bios);
      
      const user = await prisma.user.create({
        data: {
          email,
          name,
          age,
          bio,
          location,
          profession,
          gender,
          maritalStatus,
          interests,
          hashedPassword,
          emailVerified: new Date(),
          primaryAuthMethod: AuthMethod.EMAIL_PASSWORD,
          accountStatus: AccountStatus.ACTIVE, // ✅ Tous les comptes sont ACTIFS
          isOnline: Math.random() > 0.7, // 30% des utilisateurs en ligne
          lastSeen: new Date(Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000)) // Dernière vue dans les 7 derniers jours
        }
      });
      
      users.push(user);
      
      // Créer des préférences par défaut pour chaque utilisateur
      await prisma.userPreferences.create({
        data: {
          userId: user.id,
          minAge: Math.max(18, age - 10),
          maxAge: Math.min(50, age + 10),
          maxDistance: randomInt(20, 100),
          gender: randomChoice(genderValues),
          lookingFor: randomChoice(['relation sérieuse', 'amitié', 'rencontres décontractées', 'à voir'])
        }
      });

      // Créer des paramètres de notification par défaut
      await prisma.notificationSettings.create({
        data: {
          userId: user.id,
          messageNotifications: Math.random() > 0.2,
          likeNotifications: Math.random() > 0.1,
          matchNotifications: true,
          soundEnabled: Math.random() > 0.3,
          vibrationEnabled: Math.random() > 0.4,
          quietHoursStart: randomChoice(['22:00', '23:00', '00:00', null]),
          quietHoursEnd: randomChoice(['07:00', '08:00', '09:00', null])
        }
      });

      // Créer 1-3 photos pour chaque utilisateur
      const photoCount = randomInt(1, 3);
      for (let j = 0; j < photoCount; j++) {
        await prisma.photo.create({
          data: {
            userId: user.id,
            url: `/photos/${user.id}-${j + 1}.jpg`,
            isPrimary: j === 0,
            alt: `Photo ${j + 1} de ${user.name}`
          }
        });
      }
      
      // Afficher la progression
      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ ${i + 1} utilisateurs créés avec leurs données...`);
      }
    }

    console.log(`✅ ${users.length} utilisateurs créés avec emails vérifiés, préférences, notifications et photos`);

    // Récupérer tous les IDs des utilisateurs
    const userIds = users.map(user => user.id);

    // 3. Créer des likes aléatoires (environ 200-300 likes)
    console.log('\n❤️ Création des likes...');
    
    const targetLikeCount = randomInt(200, 300);
    const likePairs = generateRandomPairs(userIds, targetLikeCount);
    
    const likes = [];
    for (const [senderId, receiverId] of likePairs) {
      const like = await prisma.like.create({
        data: {
          senderId,
          receiverId
        }
      });
      likes.push(like);
    }
    
    console.log(`✅ ${likes.length} likes créés`);

    // 4. Créer des dislikes aléatoires (environ 150-200 dislikes)
    console.log('\n👎 Création des dislikes...');
    
    const targetDislikeCount = randomInt(150, 200);
    const existingLikePairs = new Set(likePairs.map(([a, b]) => [a, b].sort().join('-')));
    
    // Générer des paires pour les dislikes en évitant celles qui ont déjà des likes
    const dislikePairs: Array<[string, string]> = [];
    const usedDislikePairs = new Set<string>();
    
    while (dislikePairs.length < targetDislikeCount) {
      const user1 = randomChoice(userIds);
      const user2 = randomChoice(userIds);
      
      if (user1 === user2) continue;
      
      const pairKey = [user1, user2].sort().join('-');
      if (usedDislikePairs.has(pairKey) || existingLikePairs.has(pairKey)) continue;
      
      usedDislikePairs.add(pairKey);
      dislikePairs.push([user1, user2]);
    }
    
    const dislikes = [];
    for (const [senderId, receiverId] of dislikePairs) {
      const dislike = await prisma.dislike.create({
        data: {
          senderId,
          receiverId
        }
      });
      dislikes.push(dislike);
    }
    
    console.log(`✅ ${dislikes.length} dislikes créés`);

    // 5. Créer des matchs à partir des likes existants
    console.log('\n💕 Création de matchs à partir des likes existants...');
    
    // Sélectionner aléatoirement 30-50% des likes pour créer des matchs
    const matchPercentage = randomInt(30, 50) / 100;
    const potentialMatches = randomChoices(likes, Math.floor(likes.length * matchPercentage));
    
    let matchesCreated = 0;
    const matchedPairs = new Set<string>();
    
    for (const like of potentialMatches) {
      const pairKey = [like.senderId, like.receiverId].sort().join('-');
      
      // Vérifier si on n'a pas déjà créé ce match
      if (matchedPairs.has(pairKey)) continue;
      
      // Vérifier si le like réciproque n'existe pas déjà
      const reciprocalExists = await prisma.like.findFirst({
        where: {
          senderId: like.receiverId,
          receiverId: like.senderId
        }
      });
      
      if (!reciprocalExists) {
        // Créer le like réciproque pour former un match
        await prisma.like.create({
          data: {
            senderId: like.receiverId,
            receiverId: like.senderId
          }
        });
        matchesCreated++;
        matchedPairs.add(pairKey);
      }
    }
    
    console.log(`✅ ${matchesCreated} nouveaux matchs créés à partir des likes existants`);
    
    // 6. Créer des matchs supplémentaires directs (50-80 matchs au total)
    console.log('\n💕 Création de matchs supplémentaires...');
    
    const targetTotalMatches = randomInt(50, 80);
    const additionalMatchesNeeded = Math.max(0, targetTotalMatches - matchesCreated);
    
    if (additionalMatchesNeeded > 0) {
      const matchPairs = generateRandomPairs(userIds, additionalMatchesNeeded);
      
      // Filtrer les paires qui n'ont pas déjà de likes ou dislikes
      const existingPairs = new Set([
        ...likePairs.map(([a, b]) => [a, b].sort().join('-')),
        ...dislikePairs.map(([a, b]) => [a, b].sort().join('-')),
        ...Array.from(matchedPairs)
      ]);
      
      const filteredMatchPairs = matchPairs.filter(([a, b]) => {
        const pairKey = [a, b].sort().join('-');
        return !existingPairs.has(pairKey);
      });
      
      let additionalMatchesCreated = 0;
      for (const [user1, user2] of filteredMatchPairs) {
        // Créer les deux likes réciproques pour former un match
        await prisma.like.create({
          data: {
            senderId: user1,
            receiverId: user2
          }
        });
        
        await prisma.like.create({
          data: {
            senderId: user2,
            receiverId: user1
          }
        });
        
        additionalMatchesCreated++;
        matchedPairs.add([user1, user2].sort().join('-'));
      }
      
      console.log(`✅ ${additionalMatchesCreated} matchs supplémentaires créés`);
      matchesCreated += additionalMatchesCreated;
    }
    
    console.log(`✅ TOTAL: ${matchesCreated} matchs (likes réciproques) dans la base`);

    // 7. Créer des vues de profil aléatoires
    console.log('\n👀 Création des vues de profil...');
    
    const targetProfileViewCount = randomInt(300, 500);
    const profileViewPairs = generateRandomPairs(userIds, targetProfileViewCount);
    
    const profileViews = [];
    for (const [viewerId, viewedId] of profileViewPairs) {
      const profileView = await prisma.profileView.create({
        data: {
          viewerId,
          viewedId
        }
      });
      profileViews.push(profileView);
    }
    
    console.log(`✅ ${profileViews.length} vues de profil créées`);

    // 8. Créer quelques blocages aléatoires
    console.log('\n🚫 Création des blocages...');
    
    const targetBlockCount = randomInt(20, 40);
    const blockPairs = generateRandomPairs(userIds, targetBlockCount);
    
    const blocks = [];
    for (const [blockerId, blockedId] of blockPairs) {
      const block = await prisma.block.create({
        data: {
          blockerId,
          blockedId,
          reason: randomChoice(['Comportement inapproprié', 'Spam', 'Faux profil', 'Harcèlement', 'Autre'])
        }
      });
      blocks.push(block);
    }
    
    console.log(`✅ ${blocks.length} blocages créés`);

    console.log('\n🎉 Seed terminé avec succès !');
    
    // 9. Afficher un résumé complet
    const finalUserCount = await prisma.user.count();
    const finalLikeCount = await prisma.like.count();
    const finalDislikeCount = await prisma.dislike.count();
    const finalProfileViewCount = await prisma.profileView.count();
    const finalBlockCount = await prisma.block.count();
    const finalPhotoCount = await prisma.photo.count();
    const verifiedEmailCount = await prisma.user.count({
      where: { emailVerified: { not: null } }
    });
    
    // Calculer les vraies statistiques des matchs
    const realMatches = await prisma.$queryRaw<Array<{count: bigint}>>`
      SELECT COUNT(*) as count
      FROM (
        SELECT DISTINCT l1."senderId", l1."receiverId"
        FROM "Like" l1
        INNER JOIN "Like" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
        WHERE l1."senderId" < l1."receiverId"
      ) as matches
    `;
    
    const matchCount = Number(realMatches[0].count);
    
    console.log('\n📊 Résumé de la base PostgreSQL :');
    console.log(`   👥 Utilisateurs: ${finalUserCount}`);
    console.log(`   ✉️ Emails vérifiés: ${verifiedEmailCount}/${finalUserCount}`);
    console.log(`   📸 Photos: ${finalPhotoCount}`);
    console.log(`   ❤️ Likes: ${finalLikeCount}`);
    console.log(`   👎 Dislikes: ${finalDislikeCount}`);
    console.log(`   💕 Matchs (likes réciproques): ${matchCount}`);
    console.log(`   👀 Vues de profil: ${finalProfileViewCount}`);
    console.log(`   🚫 Blocages: ${finalBlockCount}`);
    
    // Afficher quelques utilisateurs exemples
    const exampleUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('\n🔐 Informations de connexion :');
    console.log(`   📧 Exemples d'emails :`);
    exampleUsers.forEach((user, index) => {
      console.log(`      ${index + 1}. ${user.email}`);
    });
    console.log(`   🔑 Mot de passe: "${defaultPassword}" (pour tous les utilisateurs)`);
    console.log(`   ✅ Tous les emails sont pré-vérifiés`);
    
    console.log('\n✨ Base de données prête pour les tests !');

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });