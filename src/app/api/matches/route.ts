// src/app/api/matches/route.ts - API pour récupérer les matchs
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// Interfaces pour les matchs
interface MatchUser {
  id: string;
  name: string;
  email: string;
  age: number | null;
  bio: string | null;
  location: string | null;
  profession: string | null;
  interests: string[];
  gender: string | null;
  photos: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
}

interface Match {
  id: string;
  user: MatchUser;
  matchedAt: string;
  lastMessageAt?: string;
  lastMessage?: {
    content: string;
    senderId: string;
  };
  messageCount: number;
  isOnline?: boolean;
  compatibility?: number;
}

interface MatchStats {
  totalMatches: number;
  newMatches: number;
  activeConversations: number;
  responseRate: number;
}

interface MatchesResponse {
  success: boolean;
  matches: Match[];
  stats: MatchStats;
  currentUser: {
    id: string;
    interests: string[];
  };
  meta: {
    timestamp: string;
    algorithm: string;
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<MatchesResponse>> {
  console.log('💕 API Matches - Récupération des likes réciproques');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false,
        error: 'Non authentifié',
        matches: [],
        stats: {
          totalMatches: 0,
          newMatches: 0,
          activeConversations: 0,
          responseRate: 0
        },
        currentUser: { id: '', interests: [] },
        meta: {
          timestamp: new Date().toISOString(),
          algorithm: 'none'
        }
      }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    
    // Récupérer l'utilisateur actuel par email
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        interests: true 
      }
    });

    if (!currentUser) {
      return NextResponse.json({ 
        success: false,
        error: 'Utilisateur introuvable',
        matches: [],
        stats: {
          totalMatches: 0,
          newMatches: 0,
          activeConversations: 0,
          responseRate: 0
        },
        currentUser: { id: '', interests: [] },
        meta: {
          timestamp: new Date().toISOString(),
          algorithm: 'none'
        }
      }, { status: 404 });
    }

    const currentUserId = currentUser.id;

    // 1. Récupérer tous les likes réciproques (matchs)
    const reciprocalLikes = await prisma.$queryRaw`
      SELECT 
        l1."receiverId" as matched_user_id,
        l1."createdAt" as match_date,
        l2."createdAt" as their_like_date
      FROM "Like" l1
      INNER JOIN "Like" l2 
        ON l1."senderId" = l2."receiverId" 
        AND l1."receiverId" = l2."senderId"
      WHERE l1."senderId" = ${currentUserId}
      ORDER BY l1."createdAt" DESC
    ` as Array<{ 
      matched_user_id: string; 
      match_date: Date;
      their_like_date: Date;
    }>;

    console.log(`💕 ${reciprocalLikes.length} matchs trouvés`);

    if (reciprocalLikes.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        stats: {
          totalMatches: 0,
          newMatches: 0,
          activeConversations: 0,
          responseRate: 0
        },
        currentUser: {
          id: currentUserId,
          interests: currentUser.interests || []
        },
        meta: {
          timestamp: new Date().toISOString(),
          algorithm: 'reciprocal_likes'
        }
      });
    }

    const matchedUserIds = reciprocalLikes.map(match => match.matched_user_id);

    // 2. Récupérer les détails des utilisateurs matchés avec leurs photos
    const matchedUsers = await prisma.user.findMany({
      where: {
        id: { in: matchedUserIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        interests: true,
        gender: true,
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
      }
    });

    // 3. Récupérer les statistiques de messages pour chaque match
    const messageStats = await Promise.all(
      matchedUserIds.map(async (userId) => {
        // Compter les messages entre les deux utilisateurs
        const messageCount = await prisma.message.count({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: userId },
              { senderId: userId, receiverId: currentUserId }
            ]
          }
        });

        // Récupérer le dernier message
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: userId },
              { senderId: userId, receiverId: currentUserId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            senderId: true,
            createdAt: true
          }
        });

        return {
          userId,
          messageCount,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt
          } : null
        };
      })
    );

    // 4. Fonction de calcul de compatibilité (similaire à discover)
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

      // Score minimum pour les matchs (ils se sont déjà likés !)
      const finalScore = factors > 0 ? Math.round(score / factors * 2.5) : Math.floor(Math.random() * 30) + 60;
      return Math.max(60, Math.min(99, finalScore)); // Score entre 60% et 99% pour les matchs
    };

    // 5. Construire les objets Match complets
    const matches: Match[] = reciprocalLikes.map(reciprocalLike => {
      const user = matchedUsers.find(u => u.id === reciprocalLike.matched_user_id);
      const stats = messageStats.find(s => s.userId === reciprocalLike.matched_user_id);
      
      if (!user) return null;

      // Adapter les photos (compatibilité avec l'interface frontend)
      const matchUser: MatchUser = {
        id: user.id,
        name: user.name || 'Utilisateur',
        email: user.email,
        age: user.age,
        bio: user.bio,
        location: user.location,
        profession: user.profession,
        interests: user.interests || [],
        gender: user.gender,
        photos: user.photos.length > 0 ? user.photos : [
          {
            id: 'placeholder',
            url: 'https://via.placeholder.com/400x600/f3f4f6/9ca3af?text=Photo',
            isPrimary: true
          }
        ]
      };

      return {
        id: `match_${currentUserId}_${user.id}`, // ID unique pour le match
        user: matchUser,
        matchedAt: reciprocalLike.match_date.toISOString(),
        lastMessageAt: stats?.lastMessage?.createdAt.toISOString(),
        lastMessage: stats?.lastMessage ? {
          content: stats.lastMessage.content,
          senderId: stats.lastMessage.senderId
        } : undefined,
        messageCount: stats?.messageCount || 0,
        isOnline: false, // TODO: implémenter le statut en ligne
        compatibility: calculateCompatibility(user)
      };
    }).filter(Boolean) as Match[];

    // 6. Calculer les statistiques
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const stats: MatchStats = {
      totalMatches: matches.length,
      newMatches: matches.filter(match => 
        new Date(match.matchedAt).getTime() > oneDayAgo.getTime()
      ).length,
      activeConversations: matches.filter(match => match.messageCount > 0).length,
      responseRate: matches.length > 0 
        ? Math.round((matches.filter(match => match.messageCount > 0).length / matches.length) * 100)
        : 0
    };

    console.log('📊 Statistiques matchs:', stats);

    return NextResponse.json({
      success: true,
      matches,
      stats,
      currentUser: {
        id: currentUserId,
        interests: currentUser.interests || []
      },
      meta: {
        timestamp: new Date().toISOString(),
        algorithm: 'reciprocal_likes'
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API matches:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur',
      matches: [],
      stats: {
        totalMatches: 0,
        newMatches: 0,
        activeConversations: 0,
        responseRate: 0
      },
      currentUser: { id: '', interests: [] },
      meta: {
        timestamp: new Date().toISOString(),
        algorithm: 'error'
      }
    }, { status: 500 });
  }
}