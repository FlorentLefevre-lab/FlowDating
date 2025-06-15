// prisma/seed.ts - Script pour remplir la BDD PostgreSQL avec 100 utilisateurs et des données aléatoires
import { PrismaClient } from '@prisma/client';
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

const genres = ['Homme', 'Femme', 'Non-binaire', 'Autre'];

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

    // 1. Nettoyer les données existantes
    console.log('🧹 Nettoyage des données existantes...');
    await prisma.message.deleteMany();
    await prisma.dislike.deleteMany();
    await prisma.like.deleteMany();
    await prisma.profileView.deleteMany();
    await prisma.photo.deleteMany();
    await prisma.userPreferences.deleteMany();
    // Ne pas supprimer les utilisateurs car ils peuvent être liés à NextAuth

    // 2. Créer 100 utilisateurs de test
    console.log('👥 Création de 100 utilisateurs...');
    
    const users = [];
    
    for (let i = 0; i < 100; i++) {
      const prenom = randomChoice(prenoms);
      const nom = randomChoice(noms);
      const email = `${prenom.toLowerCase()}.${nom.toLowerCase()}${i}@test.com`;
      const name = `${prenom} ${nom}`;
      const age = randomInt(18, 50);
      const profession = randomChoice(professions);
      const location = `${randomChoice(villes)}, France`;
      const gender = randomChoice(genres);
      const interests = randomChoices(centresInteret, randomInt(3, 8));
      const bio = randomChoice(bios);
      
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          age,
          bio,
          location,
          profession,
          gender,
          interests,
          hashedPassword
        },
        create: {
          email,
          name,
          age,
          bio,
          location,
          profession,
          gender,
          interests,
          hashedPassword,
          primaryAuthMethod: 'EMAIL_PASSWORD'
        }
      });
      
      users.push(user);
    }

    console.log(`✅ ${users.length} utilisateurs créés`);

    // Récupérer tous les IDs des utilisateurs
    const userIds = users.map(user => user.id);

    // 3. Créer des likes aléatoires (environ 200-300 likes)
    console.log('❤️ Création des likes...');
    
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
    console.log('👎 Création des dislikes...');
    
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

    // 5. Créer des matchs (likes réciproques) - environ 50-80 matchs
    console.log('💕 Création des matchs (likes réciproques)...');
    
    const matchCount = randomInt(50, 80);
    const matchPairs = generateRandomPairs(userIds, matchCount);
    
    // Filtrer les paires qui n'ont pas déjà de likes ou dislikes
    const existingPairs = new Set([
      ...likePairs.map(([a, b]) => [a, b].sort().join('-')),
      ...dislikePairs.map(([a, b]) => [a, b].sort().join('-'))
    ]);
    
    const filteredMatchPairs = matchPairs.filter(([a, b]) => {
      const pairKey = [a, b].sort().join('-');
      return !existingPairs.has(pairKey);
    });
    
    const matchLikes = [];
    for (const [user1, user2] of filteredMatchPairs) {
      // Créer les deux likes réciproques pour former un match
      const like1 = await prisma.like.create({
        data: {
          senderId: user1,
          receiverId: user2
        }
      });
      
      const like2 = await prisma.like.create({
        data: {
          senderId: user2,
          receiverId: user1
        }
      });
      
      matchLikes.push(like1, like2);
    }
    
    console.log(`✅ ${filteredMatchPairs.length} matchs créés (${matchLikes.length} likes réciproques)`);

    // 6. Créer quelques messages entre les utilisateurs qui ont des matchs
    console.log('💬 Création des messages de test...');
    
    const messages = [];
    const messageTemplates = [
      'Salut ! Comment ça va ? 😊',
      'Hey ! Sympa ton profil !',
      'Bonjour ! Ça va bien et toi ?',
      'Coucou ! Tu fais quoi de beau ?',
      'Hello ! On a des goûts similaires on dirait 😄',
      'Salut ! Tu habites dans quelle partie de la ville ?',
      'Hey ! Fan de [intérêt] aussi à ce que je vois !',
      'Bonjour ! Tu as l\'air intéressant(e) 😊',
      'Coucou ! Envie de discuter ?',
      'Hello ! Beau sourire sur tes photos ! 😍'
    ];
    
    // Créer des messages pour environ 30% des matchs
    const messagesToCreate = Math.floor(filteredMatchPairs.length * 0.3);
    const selectedPairs = randomChoices(filteredMatchPairs, messagesToCreate);
    
    for (const [user1, user2] of selectedPairs) {
      // 1-3 messages par conversation
      const messageCount = randomInt(1, 3);
      let currentSender = user1;
      let currentReceiver = user2;
      
      for (let i = 0; i < messageCount; i++) {
        const message = await prisma.message.create({
          data: {
            content: randomChoice(messageTemplates),
            senderId: currentSender,
            receiverId: currentReceiver
          }
        });
        messages.push(message);
        
        // Alterner l'expéditeur pour simuler une conversation
        [currentSender, currentReceiver] = [currentReceiver, currentSender];
      }
    }
    
    console.log(`✅ ${messages.length} messages créés`);

    // 7. Créer des vues de profil aléatoires
    console.log('👀 Création des vues de profil...');
    
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

    console.log('🎉 Seed terminé avec succès !');
    
    // 8. Afficher un résumé complet
    const finalUserCount = await prisma.user.count();
    const finalLikeCount = await prisma.like.count();
    const finalDislikeCount = await prisma.dislike.count();
    const finalMessageCount = await prisma.message.count();
    const finalProfileViewCount = await prisma.profileView.count();
    
    console.log('\n📊 Résumé de la base PostgreSQL :');
    console.log(`   👥 Utilisateurs: ${finalUserCount}`);
    console.log(`   ❤️ Likes: ${finalLikeCount}`);
    console.log(`   👎 Dislikes: ${finalDislikeCount}`);
    console.log(`   💕 Matchs (likes réciproques): ${filteredMatchPairs.length}`);
    console.log(`   💬 Messages: ${finalMessageCount}`);
    console.log(`   👀 Vues de profil: ${finalProfileViewCount}`);
    
    // Calculer les statistiques des matchs
    const reciprocalLikes = await prisma.$queryRaw`
      SELECT l1."senderId", l1."receiverId"
      FROM "Like" l1
      INNER JOIN "Like" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
      WHERE l1."senderId" < l1."receiverId"
    `;
    
    console.log(`   💑 Paires avec likes réciproques: ${(reciprocalLikes as any[]).length}`);
    
    console.log('\n🔐 Informations de connexion :');
    console.log(`   📧 Email: n'importe quel email d'utilisateur (ex: david.martin0@test.com)`);
    console.log(`   🔑 Mot de passe: "${defaultPassword}" (pour tous les utilisateurs)`);
    
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