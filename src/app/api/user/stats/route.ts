// src/app/api/user/stats/route.ts - Version avec cache Redis
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis'; // Votre client Redis existant

// Types pour les statistiques
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
  cacheHit?: boolean;
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
    console.log('📊 === API STATS - DÉBUT ===');

    // 1. Vérification de l'authentification
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ API Stats - Non authentifié');
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Vous devez être connecté pour accéder aux statistiques'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log('👤 API Stats - User ID:', userId);

    // 2. 🔥 VÉRIFIER LE CACHE REDIS D'ABORD
    const cacheKey = `user:stats:${userId}`;
    const cacheTtl = 30; // 30 secondes
    
    try {
      const cachedStats = await redis.get(cacheKey);
      if (cachedStats) {
        console.log('🎯 === CACHE REDIS HIT ===');
        console.log('⚡ Stats depuis le cache Redis');
        
        const parsedStats = JSON.parse(cachedStats);
        parsedStats.meta.cacheHit = true;
        parsedStats.meta.dataSource = 'redis-cache';
        
        const response = NextResponse.json(parsedStats);
        response.headers.set('X-Cache-Status', 'HIT');
        response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
        
        console.log('📤 Stats depuis cache Redis envoyées');
        return response;
      }
    } catch (cacheError) {
      console.warn('⚠️ Erreur cache Redis:', cacheError);
      // Continuer sans cache
    }

    console.log('❌ Cache Redis MISS - Calcul depuis DB');

    // 3. Calcul des dates pour les stats du jour
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    console.log('📅 Période du jour:', { startOfDay, endOfDay });

    // 4. Requêtes parallèles pour optimiser les performances
    const [user, likesReceived, likesSent] = await Promise.all([
      // Données utilisateur de base
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          createdAt: true,
          lastSeen: true,
          isOnline: true
        }
      }),

      // Likes reçus (avec date pour stats du jour)
      prisma.like.findMany({
        where: { receiverId: userId },
        select: {
          id: true,
          createdAt: true,
          senderId: true
        }
      }),

      // Likes envoyés (pour calculer les matches)
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
      console.log('❌ API Stats - Utilisateur introuvable');
      return NextResponse.json(
        { 
          error: 'User not found',
          message: 'Utilisateur introuvable dans la base de données'
        },
        { status: 404 }
      );
    }

    console.log('📊 Données récupérées:', {
      likesReceived: likesReceived.length,
      likesSent: likesSent.length
    });

    // 5. Calcul des matches (likes mutuels)
    const matches = likesSent.filter(sentLike => 
      likesReceived.some(receivedLike => 
        receivedLike.senderId === sentLike.receiverId
      )
    );

    console.log('💕 Matches calculés:', matches.length);

    // 6. Calcul des vues de profil (estimation intelligente)
    const profileViewsEstimate = Math.max(
      likesReceived.length * 5,    // 1 like ≈ 5 vues
      matches.length * 12,         // 1 match ≈ 12 vues
      likesSent.length * 2,        // Activité = plus de visibilité
      25 // Minimum de base
    );

    // 7. Stats du jour (dernières 24h)
    const dailyLikesReceived = likesReceived.filter(
      like => like.createdAt >= startOfDay && like.createdAt < endOfDay
    );
    
    const dailyLikesSent = likesSent.filter(
      like => like.createdAt >= startOfDay && like.createdAt < endOfDay
    );
    
    const dailyMatches = matches.filter(
      match => match.createdAt >= startOfDay && match.createdAt < endOfDay
    );

    // Estimation des vues quotidiennes
    const dailyProfileViews = Math.max(
      dailyLikesReceived.length * 6,   // Plus de vues par like récent
      dailyMatches.length * 20,        // Beaucoup de vues par match récent
      dailyLikesSent.length * 3,       // Activité génère des vues
      dailyLikesReceived.length > 0 ? 5 : 0 // Minimum si activité
    );

    // 8. Construction de la réponse structurée
    const statsData: UserStatsResponse = {
      // Structure rétro-compatible (racine)
      profileViews: profileViewsEstimate,
      likesReceived: likesReceived.length,
      matchesCount: matches.length,

      // Stats détaillées du jour
      dailyStats: {
        profileViews: dailyProfileViews,
        likesReceived: dailyLikesReceived.length,
        matchesCount: dailyMatches.length
      },

      // Stats totales (explicites)
      totalStats: {
        profileViews: profileViewsEstimate,
        likesReceived: likesReceived.length,
        matchesCount: matches.length
      },

      // Métadonnées
      meta: {
        timestamp: now.toISOString(),
        userId: userId,
        memberSince: user.createdAt.toISOString(),
        lastSeen: user.lastSeen?.toISOString(),
        isOnline: user.isOnline,
        dataSource: 'database',
        cacheHit: false
      }
    };

    // 9. 🔥 METTRE EN CACHE REDIS
    try {
      await redis.setex(cacheKey, cacheTtl, JSON.stringify(statsData));
      console.log(`💾 === CACHE REDIS SET ===`);
      console.log(`🔑 Clé: ${cacheKey}`);
      console.log(`⏱️ TTL: ${cacheTtl}s`);
    } catch (cacheError) {
      console.warn('⚠️ Erreur sauvegarde cache Redis:', cacheError);
      // Continuer sans cache
    }

    const processingTime = Date.now() - startTime;

    console.log('✅ API Stats - Calculs terminés:', {
      processingTime: `${processingTime}ms`,
      dailyStats: statsData.dailyStats,
      totalStats: statsData.totalStats,
      profileViews: statsData.profileViews
    });

    // 10. Réponse avec headers optimisés
    const response = NextResponse.json(statsData);
    
    // Headers de cache pour des données temps-réel
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    response.headers.set('X-Processing-Time', `${processingTime}ms`);
    response.headers.set('X-Data-Source', 'database');
    response.headers.set('X-Cache-Status', 'MISS');
    response.headers.set('X-User-Id', userId);
    response.headers.set('X-Stats-Version', '1.3');
    response.headers.set('X-Total-Likes', likesReceived.length.toString());
    response.headers.set('X-Total-Matches', matches.length.toString());

    console.log('📤 API Stats - Réponse envoyée avec succès');
    return response;

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ === API STATS - ERREUR ===');
    console.error('❌ Erreur:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Temps écoulé:', `${processingTime}ms`);
    
    // Log détaillé pour le debug
    if (error.code) {
      console.error('❌ Code erreur Prisma:', error.code);
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Erreur serveur lors du calcul des statistiques',
        timestamp: new Date().toISOString(),
        processingTime: `${processingTime}ms`,
        // Détails d'erreur seulement en développement
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          code: error.code,
          stack: error.stack
        })
      },
      { status: 500 }
    );
  }
}

// Méthode OPTIONS pour CORS (si nécessaire)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // Cache preflight 24h
    },
  });
}