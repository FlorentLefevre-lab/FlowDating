// src/app/api/matches/route.ts - API pour récupérer les matchs
import { auth } from '../../../auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db' // ✅ Import corrigé

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
    // ✅ CORRECTION: auth() appelé dans le handler, pas au niveau du module
    const session = await auth();
    
    if (!session?.user?.id) {
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

    // Récupérer l'utilisateur actuel directement par ID (plus efficace)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    // 1. Récupérer tous les likes réciproques (matchs) - VERSION CORRIGÉE ✅
    const reciprocalLikes = await prisma.$queryRaw`
      SELECT 
        l1."receiverId" as matched_user_id,
        l1."createdAt" as match_date,
        l2."createdAt" as their_like_date
      FROM "likes" l1
      INNER JOIN "likes" l2 
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
        lastSeen: true, // ✅ Ajouté pour le statut en ligne
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

    // 3. ⚠️ Messages désactivés - Le modèle Message n'existe pas dans le schéma
    // Simulation des statistiques de messages pour l'instant
    const messageStats = matchedUserIds.map(userId => ({
      userId,
      messageCount: 0, // ⚠️ Temporaire - messages non implémentés
      lastMessage: null
    }));

    console.log('⚠️ Messages désactivés - modèle Message non disponible dans le schéma');

    // 4. Fonction de calcul de compatibilité (similaire à discover)
    const calculateCompatibility = (user: any): number => {
      let score = 40; // Score de base plus élevé pour les matchs

      // Centres d'intérêt communs (40% du score)
      if (user.interests?.length && currentUser.interests?.length) {
        const commonInterests = user.interests.filter((interest: string) => 
          currentUser.interests.includes(interest)
        );
        const interestScore = (commonInterests.length / Math.max(user.interests.length, currentUser.interests.length)) * 40;
        score += interestScore;
      }

      // Bonus activité récente (jusqu'à 15 points)
      if (user.lastSeen) {
        const daysSinceLastSeen = (Date.now() - new Date(user.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSeen < 1) score += 15;
        else if (daysSinceLastSeen < 7) score += 10;
        else if (daysSinceLastSeen < 30) score += 5;
      }

      // Score minimum pour les matchs (ils se sont déjà likés !)
      const finalScore = Math.max(65, Math.min(99, Math.round(score))); // Score entre 65% et 99% pour les matchs
      return finalScore;
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
        lastMessageAt: undefined, // ⚠️ Messages non implémentés
        lastMessage: undefined,   // ⚠️ Messages non implémentés
        messageCount: stats?.messageCount || 0,
        isOnline: user.lastSeen ? (Date.now() - new Date(user.lastSeen).getTime()) < 15 * 60 * 1000 : false, // ✅ Statut en ligne basé sur lastSeen
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
      activeConversations: 0, // ⚠️ Messages non implémentés - toujours 0
      responseRate: 0 // ⚠️ Messages non implémentés - toujours 0
    };

    console.log('📊 Statistiques matchs:', stats);
    console.log(`✅ ${matches.length} matchs formatés avec compatibilité calculée`);

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