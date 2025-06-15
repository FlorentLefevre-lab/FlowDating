// prisma/seed.ts - Script corrigé pour remplir la BDD PostgreSQL avec 100 utilisateurs
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

// ✅ Utilisation des bonnes valeurs d'enum selon le schéma
const genders = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER'];
const maritalStatuses = ['SINGLE', 'DIVORCED', 'WIDOWED', 'SEPARATED'];

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

// Fonction pour nettoyer seulement les tables qui existent
async function safeDeleteMany(tableName: string, deleteFunction: () => Promise<any>) {
  try {
    await deleteFunction();
    console.log(`✅ Table ${tableName} nettoyée`);
  } catch (error) {
    console.log(`⚠️ Table ${tableName} ignorée (n'existe pas ou erreur)`);
  }
}

async function main() {
  console.log('🌱 Seed de la base de données PostgreSQL avec 100 utilisateurs...');

  try {
    // Générer un mot de passe haché générique pour tous les utilisateurs de test
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    console.log(`🔒 Mot de passe par défaut pour tous les utilisateurs: "${defaultPassword}"`);
    console.log(`🔑 Hash généré: ${hashedPassword.substring(0, 20)}...`);

    // 1. Nettoyer les données existantes (uniquement les tables qui existent)
    console.log('🧹 Nettoyage des données existantes...');
    
    // Suppression dans l'ordre des dépendances
    await safeDeleteMany('profileView', () => prisma.profileView.deleteMany());
    await safeDeleteMany('dislike', () => prisma.dislike.deleteMany());
    await safeDeleteMany('like', () => prisma.like.deleteMany());
    await safeDeleteMany('block', () => prisma.block.deleteMany());
    await safeDeleteMany('photo', () => prisma.photo.deleteMany());
    await safeDeleteMany('userPreferences', () => prisma.userPreferences.deleteMany());
    await safeDeleteMany('notificationSettings', () => prisma.notificationSettings.deleteMany());
    await safeDeleteMany('session', () => prisma.session.deleteMany());
    await safeDeleteMany('account', () => prisma.account.deleteMany());
    await safeDeleteMany('user', () => prisma.user.deleteMany());
    
    console.log('✅ Nettoyage terminé');

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
      const gender = randomChoice(genders);
      const maritalStatus = randomChoice(maritalStatuses);
      const interests = randomChoices(centresInteret, randomInt(3, 8));
      const bio = randomChoice(bios);
      
      try {
        // ✅ Création simplifiée sans logique complexe prisma.user.fields
        const user = await prisma.user.create({
          data: {
            email,
            name,
            hashedPassword, // ✅ Toujours inclus
            age,
            bio,
            location,
            profession,
            gender: gender as any, // Cast pour TypeScript
            maritalStatus: maritalStatus as any,
            interests,
            primaryAuthMethod: 'EMAIL_PASSWORD',
            accountStatus: 'ACTIVE',
            isOnline: false,
            lastSeen: new Date()
          }
        });
        
        users.push(user);
        
        if ((i + 1) % 20 === 0) {
          console.log(`   ✅ ${i + 1}/100 utilisateurs créés...`);
        }
        
      } catch (error) {
        console.log(`⚠️ Erreur création utilisateur ${email}:`, error.message);
        
        // ✅ Fallback avec modèle minimal
        try {
          const user = await prisma.user.create({
            data: {
              email,
              name,
              hashedPassword, // ✅ Toujours inclus même en fallback
              primaryAuthMethod: 'EMAIL_PASSWORD'
            }
          });
          users.push(user);
        } catch (fallbackError) {
          console.log(`❌ Impossible de créer l'utilisateur ${email}:`, fallbackError.message);
        }
      }
    }

    console.log(`✅ ${users.length} utilisateurs créés avec succès`);

    // Vérification des mots de passe
    const usersWithPassword = await prisma.user.count({
      where: {
        hashedPassword: {
          not: null
        }
      }
    });
    
    console.log(`🔑 ${usersWithPassword}/${users.length} utilisateurs ont un mot de passe`);

    // Récupérer tous les IDs des utilisateurs
    const userIds = users.map(user => user.id);

    // 3. Créer des likes aléatoires
    console.log('❤️ Création des likes...');
    
    const targetLikeCount = randomInt(200, 300);
    const likePairs = generateRandomPairs(userIds, targetLikeCount);
    
    const likes = [];
    for (const [senderId, receiverId] of likePairs) {
      try {
        const like = await prisma.like.create({
          data: {
            senderId,
            receiverId
          }
        });
        likes.push(like);
      } catch (error) {
        // Ignore les erreurs de contraintes (doublons, etc.)
      }
    }
    
    console.log(`✅ ${likes.length} likes créés`);

    // 4. Créer des dislikes aléatoires
    console.log('👎 Création des dislikes...');
    
    const targetDislikeCount = randomInt(150, 200);
    // Éviter les paires qui ont déjà des likes
    const existingLikePairs = new Set(likePairs.map(([a, b]) => [a, b].sort().join('-')));
    const dislikePairs = generateRandomPairs(userIds, targetDislikeCount)
      .filter(([a, b]) => !existingLikePairs.has([a, b].sort().join('-')));
    
    const dislikes = [];
    for (const [senderId, receiverId] of dislikePairs) {
      try {
        const dislike = await prisma.dislike.create({
          data: {
            senderId,
            receiverId
          }
        });
        dislikes.push(dislike);
      } catch (error) {
        // Ignore les erreurs de contraintes
      }
    }
    
    console.log(`✅ ${dislikes.length} dislikes créés`);

    // 5. Créer des vues de profil aléatoires
    console.log('👀 Création des vues de profil...');
    
    const targetProfileViewCount = randomInt(300, 500);
    const profileViewPairs = generateRandomPairs(userIds, targetProfileViewCount);
    
    const profileViews = [];
    for (const [viewerId, viewedId] of profileViewPairs) {
      try {
        const profileView = await prisma.profileView.create({
          data: {
            viewerId,
            viewedId
          }
        });
        profileViews.push(profileView);
      } catch (error) {
        // Ignore les erreurs de contraintes
      }
    }
    
    console.log(`✅ ${profileViews.length} vues de profil créées`);

    // 6. Créer quelques photos d'exemple
    console.log('📸 Ajout de photos d\'exemple...');
    
    const photoUsers = users.slice(0, 20); // Photos pour les 20 premiers utilisateurs
    let photoCount = 0;
    
    for (const user of photoUsers) {
      try {
        await prisma.photo.create({
          data: {
            userId: user.id,
            url: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=400&h=400&fit=crop&crop=face`,
            isPrimary: true
          }
        });
        photoCount++;
      } catch (error) {
        // Ignore les erreurs
      }
    }
    
    console.log(`✅ ${photoCount} photos ajoutées`);

    console.log('🎉 Seed terminé avec succès !');
    
    // 7. Afficher un résumé complet
    const finalUserCount = await prisma.user.count();
    const finalLikeCount = await prisma.like.count();
    const finalDislikeCount = await prisma.dislike.count();
    const finalProfileViewCount = await prisma.profileView.count();
    const finalPhotoCount = await prisma.photo.count();
    
    console.log('\n📊 Résumé de la base PostgreSQL :');
    console.log(`   👥 Utilisateurs: ${finalUserCount}`);
    console.log(`   ❤️ Likes: ${finalLikeCount}`);
    console.log(`   👎 Dislikes: ${finalDislikeCount}`);
    console.log(`   👀 Vues de profil: ${finalProfileViewCount}`);
    console.log(`   📸 Photos: ${finalPhotoCount}`);
    
    // Calculer les statistiques des matchs
    try {
      const reciprocalLikes = await prisma.$queryRaw`
        SELECT l1."senderId", l1."receiverId"
        FROM "likes" l1
        INNER JOIN "likes" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
        WHERE l1."senderId" < l1."receiverId"
      `;
      
      console.log(`   💑 Paires avec likes réciproques (matchs): ${(reciprocalLikes as any[]).length}`);
    } catch (error) {
      console.log('⚠️ Impossible de calculer les matchs réciproques');
    }
    
    // Vérification finale des mots de passe
    const finalUsersWithPassword = await prisma.user.count({
      where: {
        hashedPassword: {
          not: null
        }
      }
    });
    
    console.log(`   🔑 Utilisateurs avec mot de passe: ${finalUsersWithPassword}/${finalUserCount}`);
    
    console.log('\n🔐 Informations de connexion :');
    console.log(`   📧 Email: n'importe quel email d'utilisateur (ex: david.martin0@test.com)`);
    console.log(`   🔑 Mot de passe: "${defaultPassword}" (pour tous les utilisateurs)`);
    
    // Afficher quelques emails d'exemple
    const sampleUsers = await prisma.user.findMany({
      select: { email: true, hashedPassword: true },
      take: 5
    });
    
    console.log('\n📧 Exemples d\'emails pour test :');
    sampleUsers.forEach(user => {
      const hasPassword = user.hashedPassword ? '✅' : '❌';
      console.log(`   ${hasPassword} ${user.email}`);
    });
    
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
    console.log('📤 Connexion Prisma fermée');
  });