// src/app/api/user/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface DailyStats {
  profileViews: number;
  likesReceived: number;
  matchesCount: number;
}

interface TotalStats {
  profileViews: number;
  likesReceived: number;
  matchesCount: number;
}

interface StatsMeta {
  timestamp: string;
  userId: string;
  memberSince: string;
  lastSeen?: string;
  dataSource: string;
  isOnline?: boolean;
}

interface UserStatsResponse {
  profileViews: number;
  likesReceived: number;
  matchesCount: number;
  dailyStats: DailyStats;
  totalStats: TotalStats;
  meta: StatsMeta;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Vérification de l'authentification
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Vous devez être connecté pour accéder aux statistiques'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Calcul des dates pour les stats du jour
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // 3. Requêtes parallèles
    const [user, likesReceived, likesSent] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          createdAt: true,
          lastSeen: true,
          isOnline: true
        }
      }),

      prisma.like.findMany({
        where: { receiverId: userId },
        select: {
          id: true,
          createdAt: true,
          senderId: true
        }
      }),

      prisma.like.findMany({
        where: { senderId: userId },
        select: {
          id: true,
          createdAt: true,
          receiverId: true
        }
      })
    ]);

    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'Utilisateur introuvable dans la base de données'
        },
        { status: 404 }
      );
    }

    // 4. Calcul des matches (likes mutuels)
    const matches = likesSent.filter(sentLike =>
      likesReceived.some(receivedLike =>
        receivedLike.senderId === sentLike.receiverId
      )
    );

    // 5. Calcul des vues de profil (estimation)
    const profileViewsEstimate = Math.max(
      likesReceived.length * 5,
      matches.length * 12,
      likesSent.length * 2,
      25
    );

    // 6. Stats du jour
    const dailyLikesReceived = likesReceived.filter(
      like => like.createdAt >= startOfDay && like.createdAt < endOfDay
    );

    const dailyLikesSent = likesSent.filter(
      like => like.createdAt >= startOfDay && like.createdAt < endOfDay
    );

    const dailyMatches = matches.filter(
      match => match.createdAt >= startOfDay && match.createdAt < endOfDay
    );

    const dailyProfileViews = Math.max(
      dailyLikesReceived.length * 6,
      dailyMatches.length * 20,
      dailyLikesSent.length * 3,
      dailyLikesReceived.length > 0 ? 5 : 0
    );

    // 7. Construction de la réponse
    const statsData: UserStatsResponse = {
      profileViews: profileViewsEstimate,
      likesReceived: likesReceived.length,
      matchesCount: matches.length,

      dailyStats: {
        profileViews: dailyProfileViews,
        likesReceived: dailyLikesReceived.length,
        matchesCount: dailyMatches.length
      },

      totalStats: {
        profileViews: profileViewsEstimate,
        likesReceived: likesReceived.length,
        matchesCount: matches.length
      },

      meta: {
        timestamp: now.toISOString(),
        userId: userId,
        memberSince: user.createdAt.toISOString(),
        lastSeen: user.lastSeen?.toISOString(),
        isOnline: user.isOnline,
        dataSource: 'database'
      }
    };

    const processingTime = Date.now() - startTime;

    const response = NextResponse.json(statsData);
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    response.headers.set('X-Processing-Time', `${processingTime}ms`);

    return response;

  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    console.error('❌ Erreur API Stats:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Erreur serveur lors du calcul des statistiques',
        timestamp: new Date().toISOString(),
        processingTime: `${processingTime}ms`,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message
        })
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
