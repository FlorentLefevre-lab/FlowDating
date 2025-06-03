// src/app/api/discover/route.ts - API Discover corrigée
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// Interface pour les utilisateurs découvrables
interface DiscoverableUser {
  id: string;
  name: string | null;
  email: string;
  age: number | null;
  bio: string | null;
  location: string | null;
  profession: string | null;
  gender: string | null;
  interests: string[];
  photos: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
  compatibility: number;
  memberSince: string;
}

interface DiscoverStats {
  totalUsers: number;
  excludedCount: number;
  discoverableCount: number;
  breakdown: {
    alreadyLiked: number;
    alreadyDisliked: number;
    alreadyMatched: number;
  };
  avgCompatibility: number;
}

interface DiscoverResponse {
  success: boolean;
  users: DiscoverableUser[];
  stats: DiscoverStats;
  currentUser: {
    id: string;
    interests: string[];
    age: number | null;
    location: string | null;
  };
  meta: {
    timestamp: string;
    algorithm: string;
    excludedReasons: {
      matches: number;
      likes: number;
      dislikes: number;
    };
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<DiscoverResponse>> {
  console.log('🔍 API Discover avec filtrage intelligent');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false,
        error: 'Non authentifié',
        users: [],
        stats: {
          totalUsers: 0,
          excludedCount: 0,
          discoverableCount: 0,
          breakdown: { alreadyLiked: 0, alreadyDisliked: 0, alreadyMatched: 0 },
          avgCompatibility: 0
        },
        currentUser: { id: '', interests: [], age: null, location: null },
        meta: {
          timestamp: new Date().toISOString(),
          algorithm: 'none',
          excludedReasons: { matches: 0, likes: 0, dislikes: 0 }
        }
      }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    
    // 1. CORRECTION CRITIQUE : Récupérer l'utilisateur réel par email pour avoir son ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        interests: true, 
        age: true, 
        location: true 
      }
    });

    if (!currentUser) {
      return NextResponse.json({ 
        success: false,
        error: 'Utilisateur introuvable',
        users: [],
        stats: {
          totalUsers: 0,
          excludedCount: 0,
          discoverableCount: 0,
          breakdown: { alreadyLiked: 0, alreadyDisliked: 0, alreadyMatched: 0 },
          avgCompatibility: 0
        },
        currentUser: { id: '', interests: [], age: null, location: null },
        meta: {
          timestamp: new Date().toISOString(),
          algorithm: 'none',
          excludedReasons: { matches: 0, likes: 0, dislikes: 0 }
        }
      }, { status: 404 });
    }

    const currentUserId = currentUser.id;

    // 2. Récupérer tous les utilisateurs qu'on a déjà likés
    const likedUserIds = await prisma.like.findMany({
      where: { senderId: currentUserId },
      select: { receiverId: true }
    });
    const likedIds = likedUserIds.map(like => like.receiverId);

    // 3. Récupérer tous les utilisateurs qu'on a dislikés
    const dislikedUserIds = await prisma.dislike.findMany({
      where: { senderId: currentUserId },
      select: { receiverId: true }
    });
    const dislikedIds = dislikedUserIds.map(dislike => dislike.receiverId);

    // 4. Récupérer les utilisateurs avec qui on a des matchs (likes réciproques)
    const reciprocalLikes = await prisma.$queryRaw`
      SELECT l2."senderId" as matched_user_id
      FROM "Like" l1
      INNER JOIN "Like" l2 
        ON l1."senderId" = l2."receiverId" 
        AND l1."receiverId" = l2."senderId"
      WHERE l1."senderId" = ${currentUserId}
    ` as Array<{ matched_user_id: string }>;
    
    const matchedIds = reciprocalLikes.map(match => match.matched_user_id);

    // 5. Combiner tous les IDs à exclure
    const excludedIds = [
      currentUserId, // Soi-même
      ...likedIds,   // Déjà likés
      ...dislikedIds, // Déjà dislikés
      ...matchedIds   // Déjà matchés
    ];

    console.log('🚫 Utilisateurs exclus:', {
      currentUser: currentUserId,
      liked: likedIds.length,
      disliked: dislikedIds.length,
      matched: matchedIds.length,
      totalExcluded: excludedIds.length
    });

    // 6. Récupérer les utilisateurs découvrables avec leurs photos
    const discoverableUsers = await prisma.user.findMany({
      where: {
        AND: [
          // Exclure tous les IDs identifiés
          { id: { notIn: excludedIds } },
          // Exclure les comptes système
          { email: { not: { endsWith: '@system.local' } } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        gender: true,
        interests: true,
        createdAt: true,
        photos: {
          select: {
            id: true,
            url: true,
            isPrimary: true
          },
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        }
      },
      orderBy: [
        // Priorité aux nouveaux utilisateurs
        { createdAt: 'desc' }
      ],
      take: 50 // Limite raisonnable
    });

    console.log(`✅ ${discoverableUsers.length} utilisateurs découvrables trouvés`);

    // 7. Fonction de calcul de compatibilité améliorée
    const calculateCompatibility = (user: any): number => {
      let score = 0;
      let factors = 0;

      // Centres d'intérêt communs (40% du score)
      if (user.interests?.length && currentUser.interests?.length) {
        const commonInterests = user.interests.filter((interest: string) => 
          currentUser.interests.includes(interest)
        );
        const interestScore = (commonInterests.length / Math.max(user.interests.length, currentUser.interests.length)) * 40;
        score += interestScore;
        factors++;
      }

      // Différence d'âge (30% du score)
      if (user.age && currentUser.age) {
        const ageDiff = Math.abs(user.age - currentUser.age);
        const ageScore = Math.max(0, (10 - ageDiff) / 10) * 30;
        score += ageScore;
        factors++;
      }

      // Proximité géographique (30% du score)
      if (user.location && currentUser.location) {
        // Simple comparaison de ville pour l'exemple
        const sameCity = user.location.toLowerCase().includes(currentUser.location.toLowerCase()) ||
                        currentUser.location.toLowerCase().includes(user.location.toLowerCase());
        if (sameCity) {
          score += 30;
        } else {
          score += 10; // Même région/pays
        }
        factors++;
      }

      // Score minimum pour éviter les 0%
      const finalScore = factors > 0 ? Math.round(score / factors * (factors / 3)) : Math.floor(Math.random() * 30) + 40;
      return Math.max(25, Math.min(99, finalScore)); // Score entre 25% et 99%
    };

    // 8. Enrichir les données avec la compatibilité - FORMAT CORRECT
    const enrichedUsers: DiscoverableUser[] = discoverableUsers.map(user => ({
      id: user.id,
      name: user.name || 'Utilisateur',
      email: user.email,
      age: user.age || 25,
      bio: user.bio || 'Aucune bio disponible',
      location: user.location || 'Location inconnue',
      profession: user.profession || 'Profession inconnue',
      gender: user.gender || 'Non spécifié',
      interests: user.interests || [],
      photos: user.photos.length > 0 ? user.photos : [
        {
          id: 'placeholder',
          url: 'https://via.placeholder.com/400x600/f3f4f6/9ca3af?text=Photo',
          isPrimary: true
        }
      ],
      compatibility: calculateCompatibility(user),
      memberSince: user.createdAt.toISOString()
    }));

    // 9. Trier par compatibilité décroissante, puis par nouveauté
    const sortedUsers = enrichedUsers.sort((a, b) => {
      if (b.compatibility !== a.compatibility) {
        return b.compatibility - a.compatibility;
      }
      return new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime();
    });

    // 10. Statistiques pour debug
    const totalUsersCount = await prisma.user.count();
    const stats: DiscoverStats = {
      totalUsers: totalUsersCount,
      excludedCount: excludedIds.length,
      discoverableCount: discoverableUsers.length,
      breakdown: {
        alreadyLiked: likedIds.length,
        alreadyDisliked: dislikedIds.length,
        alreadyMatched: matchedIds.length
      },
      avgCompatibility: sortedUsers.length > 0 
        ? Math.round(sortedUsers.reduce((sum, u) => sum + u.compatibility, 0) / sortedUsers.length)
        : 0
    };

    return NextResponse.json({
      success: true,
      users: sortedUsers,
      stats,
      currentUser: {
        id: currentUserId,
        interests: currentUser.interests || [],
        age: currentUser.age,
        location: currentUser.location
      },
      meta: {
        timestamp: new Date().toISOString(),
        algorithm: 'compatibility_filtered',
        excludedReasons: {
          matches: matchedIds.length,
          likes: likedIds.length,
          dislikes: dislikedIds.length
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API discover:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur',
      users: [],
      stats: {
        totalUsers: 0,
        excludedCount: 0,
        discoverableCount: 0,
        breakdown: { alreadyLiked: 0, alreadyDisliked: 0, alreadyMatched: 0 },
        avgCompatibility: 0
      },
      currentUser: { id: '', interests: [], age: null, location: null },
      meta: {
        timestamp: new Date().toISOString(),
        algorithm: 'error',
        excludedReasons: { matches: 0, likes: 0, dislikes: 0 }
      }
    }, { status: 500 });
  }
}

// Endpoint POST pour les actions de swipe - CORRIGÉ
export async function POST(request: NextRequest) {
  console.log('💫 API Discover - Action de swipe');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { action, targetUserId, profileId } = body;
    
    // Accepter soit targetUserId soit profileId pour la rétrocompatibilité
    const targetId = targetUserId || profileId;

    if (!action || !targetId) {
      return NextResponse.json({ 
        error: 'Paramètres requis: action, targetUserId (ou profileId)' 
      }, { status: 400 });
    }

    const { prisma } = await import('@/lib/db');
    
    // Récupérer l'utilisateur actuel par email
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const currentUserId = currentUser.id;

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, email: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur cible introuvable' }, { status: 404 });
    }

    switch (action) {
      case 'like':
        // Créer le like
        const like = await prisma.like.upsert({
          where: {
            senderId_receiverId: {
              senderId: currentUserId,
              receiverId: targetUser.id
            }
          },
          update: {},
          create: {
            senderId: currentUserId,
            receiverId: targetUser.id
          }
        });

        // Vérifier si c'est un match (like réciproque)
        const reciprocalLike = await prisma.like.findFirst({
          where: {
            senderId: targetUser.id,
            receiverId: currentUserId
          }
        });

        const isMatch = !!reciprocalLike;

        console.log(`👍 Like envoyé: ${currentUserId} -> ${targetUser.id}`, { isMatch });

        return NextResponse.json({
          success: true,
          action: 'like',
          isMatch,
          targetUser: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email
          },
          message: isMatch ? '🎉 C\'est un match !' : 'Like envoyé'
        });

      case 'dislike':
      case 'pass':
        // Créer le dislike
        await prisma.dislike.upsert({
          where: {
            senderId_receiverId: {
              senderId: currentUserId,
              receiverId: targetUser.id
            }
          },
          update: {},
          create: {
            senderId: currentUserId,
            receiverId: targetUser.id
          }
        });

        console.log(`👎 Dislike/Pass: ${currentUserId} -> ${targetUser.id}`);

        return NextResponse.json({
          success: true,
          action: action,
          message: 'Utilisateur passé'
        });

      case 'super_like':
        // Super like (pour les fonctionnalités premium)
        const superLike = await prisma.like.upsert({
          where: {
            senderId_receiverId: {
              senderId: currentUserId,
              receiverId: targetUser.id
            }
          },
          update: {},
          create: {
            senderId: currentUserId,
            receiverId: targetUser.id
          }
        });

        console.log(`⭐ Super Like: ${currentUserId} -> ${targetUser.id}`);

        return NextResponse.json({
          success: true,
          action: 'super_like',
          message: 'Super Like envoyé !',
          targetUser: {
            id: targetUser.id,
            name: targetUser.name
          }
        });

      default:
        return NextResponse.json({ 
          error: 'Action non supportée' 
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Erreur action discover:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}