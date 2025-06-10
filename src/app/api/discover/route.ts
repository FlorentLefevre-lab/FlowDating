// src/app/api/discover/route.ts - API Discover Optimisée Complète
import { auth } from '../../../auth'
import { NextRequest, NextResponse } from 'next/server';

// ================================
// INTERFACES ET TYPES
// ================================

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
  isOnline?: boolean;
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
    responseTime?: number;
    cacheHit?: boolean;
    excludedReasons: {
      matches: number;
      likes: number;
      dislikes: number;
    };
  };
  error?: string;
}

// ================================
// CACHE ET OPTIMISATIONS
// ================================

// Cache des utilisateurs exclus par utilisateur
const userExclusionCache = new Map<string, {
  data: string[];
  timestamp: number;
  ttl: number;
}>();

// Cache des profils populaires
const profileCache = new Map<string, {
  profiles: DiscoverableUser[];
  timestamp: number;
  ttl: number;
}>();

// Métriques de performance
class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics = {
    totalRequests: 0,
    avgResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastHour: [] as number[]
  };

  static getInstance() {
    if (!this.instance) {
      this.instance = new PerformanceTracker();
    }
    return this.instance;
  }

  trackRequest(responseTime: number, cacheHit: boolean) {
    this.metrics.totalRequests++;
    
    if (cacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    // Moyenne mobile des temps de réponse
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
    
    // Suivi dernière heure
    this.metrics.lastHour.push(Date.now());
    this.metrics.lastHour = this.metrics.lastHour.filter(
      time => Date.now() - time < 60 * 60 * 1000
    );
  }

  getStats() {
    return {
      ...this.metrics,
      requestsLastHour: this.metrics.lastHour.length,
      cacheHitRate: this.metrics.totalRequests > 0 
        ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
        : 0
    };
  }
}

// ================================
// FONCTIONS UTILITAIRES OPTIMISÉES
// ================================

// Récupération des utilisateurs exclus avec cache
const getCachedExcludedUsers = async (prisma: any, userId: string): Promise<{
  excludedIds: string[];
  breakdown: { likes: number; dislikes: number; matches: number; }
}> => {
  const cacheKey = `excluded_${userId}`;
  const cached = userExclusionCache.get(cacheKey);
  const now = Date.now();
  
  // Cache valide pendant 5 minutes
  if (cached && (now - cached.timestamp) < cached.ttl) {
    return {
      excludedIds: cached.data,
      breakdown: { likes: 0, dislikes: 0, matches: 0 } // TODO: stocker dans le cache
    };
  }

  // 3 requêtes simples en parallèle pour éviter les erreurs SQL
  const [likedUsers, dislikedUsers, matchedUsers] = await Promise.all([
    // Utilisateurs likés
    prisma.like.findMany({
      where: { senderId: userId },
      select: { receiverId: true }
    }),
    // Utilisateurs dislikés
    prisma.dislike.findMany({
      where: { senderId: userId },
      select: { receiverId: true }
    }),
    // Utilisateurs matchés (likes réciproques) - ✅ REQUÊTE CORRIGÉE
    prisma.$queryRaw`
      SELECT l2."senderId" as "receiverId"
      FROM "likes" l1
      INNER JOIN "likes" l2 
        ON l1."senderId" = l2."receiverId" 
        AND l1."receiverId" = l2."senderId"
      WHERE l1."senderId" = ${userId}
    `
  ]);

  const likedIds = likedUsers.map(like => like.receiverId);
  const dislikedIds = dislikedUsers.map(dislike => dislike.receiverId);
  const matchedIds = (matchedUsers as any[]).map(match => match.receiverId);

  const allExcluded = [
    userId, // Soi-même
    ...likedIds,
    ...dislikedIds,
    ...matchedIds
  ];

  // Déduplication et mise en cache
  const uniqueExcluded = [...new Set(allExcluded)];
  
  userExclusionCache.set(cacheKey, {
    data: uniqueExcluded,
    timestamp: now,
    ttl: 5 * 60 * 1000 // 5 minutes
  });

  console.log(`🚫 Utilisateurs exclus pour ${userId}:`, {
    likes: likedIds.length,
    dislikes: dislikedIds.length,
    matches: matchedIds.length,
    total: uniqueExcluded.length
  });

  return {
    excludedIds: uniqueExcluded,
    breakdown: {
      likes: likedIds.length,
      dislikes: dislikedIds.length,
      matches: matchedIds.length
    }
  };
};

// Récupération des utilisateurs découvrables optimisée
const getDiscoverableUsersOptimized = async (
  prisma: any, 
  excludedIds: string[], 
  currentUser: any,
  offset = 0,
  limit = 50
): Promise<DiscoverableUser[]> => {
  
  // Requête Prisma optimisée avec relations
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { notIn: excludedIds } },
        { email: { not: { endsWith: '@system.local' } } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      age: true,
      bio: true,
      location: true,
      profession: true,
      gender: true,
      interests: true,
      createdAt: true,
      lastSeen: true,
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
      { lastSeen: 'desc' }, // Utilisateurs actifs en premier
      { createdAt: 'desc' }  // Puis nouveaux utilisateurs
    ],
    take: limit,
    skip: offset
  });

  // Calcul de compatibilité côté JavaScript (plus flexible)
  const enrichedUsers = users.map(user => {
    let compatibilityScore = 40; // Score de base

    // Centres d'intérêt communs (40% du score max)
    if (user.interests?.length && currentUser.interests?.length) {
      const commonInterests = user.interests.filter(interest => 
        currentUser.interests.includes(interest)
      );
      const interestScore = (commonInterests.length / Math.max(user.interests.length, currentUser.interests.length)) * 40;
      compatibilityScore += interestScore;
    }

    // Différence d'âge (30% du score max)
    if (user.age && currentUser.age) {
      const ageDiff = Math.abs(user.age - currentUser.age);
      const ageScore = Math.max(0, (10 - ageDiff) / 10) * 30;
      compatibilityScore += ageScore;
    }

    // Bonus activité récente (jusqu'à 15 points)
    if (user.lastSeen) {
      const daysSinceLastSeen = (Date.now() - new Date(user.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSeen < 1) compatibilityScore += 15;
      else if (daysSinceLastSeen < 7) compatibilityScore += 10;
      else if (daysSinceLastSeen < 30) compatibilityScore += 5;
    }

    // Bonus localisation proche
    if (user.location && currentUser.location) {
      const sameLocation = user.location.toLowerCase().includes(currentUser.location.toLowerCase()) ||
                          currentUser.location.toLowerCase().includes(user.location.toLowerCase());
      if (sameLocation) compatibilityScore += 10;
    }

    const finalScore = Math.round(Math.max(25, Math.min(99, compatibilityScore)));

    return {
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
      compatibility: finalScore,
      memberSince: user.createdAt.toISOString(),
      isOnline: user.lastSeen ? (Date.now() - new Date(user.lastSeen).getTime()) < 15 * 60 * 1000 : false // En ligne si vu dans les 15 dernières minutes
    };
  });

  // Tri final par compatibilité décroissante, puis activité
  return enrichedUsers.sort((a, b) => {
    if (b.compatibility !== a.compatibility) {
      return b.compatibility - a.compatibility;
    }
    // Si même compatibilité, favoriser les utilisateurs en ligne
    if (a.isOnline !== b.isOnline) {
      return b.isOnline ? 1 : -1;
    }
    // Sinon par date de création (plus récents en premier)
    return new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime();
  });
};

// Pre-loading asynchrone du batch suivant
const preloadNextBatch = async (prisma: any, userId: string, currentOffset: number) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, interests: true, age: true, location: true }
    });

    if (!currentUser) return;

    const { excludedIds } = await getCachedExcludedUsers(prisma, userId);
    const nextBatch = await getDiscoverableUsersOptimized(
      prisma,
      excludedIds,
      currentUser,
      currentOffset + 50,
      20
    );
    
    // Stocker en cache pour la prochaine requête
    const cacheKey = `${userId}_${currentOffset + 50}`;
    profileCache.set(cacheKey, {
      profiles: nextBatch,
      timestamp: Date.now(),
      ttl: 10 * 60 * 1000 // 10 minutes
    });
    
    console.log(`🔄 Pre-loaded ${nextBatch.length} profiles for user ${userId} at offset ${currentOffset + 50}`);
  } catch (error) {
    console.log('⚠️ Pre-loading failed:', error);
  }
};

// ================================
// API ROUTES PRINCIPALES
// ================================

export async function GET(request: NextRequest): Promise<NextResponse<DiscoverResponse>> {
  const startTime = Date.now();
  const tracker = PerformanceTracker.getInstance();
  
  console.log('🚀 API Discover - Version Optimisée');
  
  try {
    const session = await auth();
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
    const url = new URL(request.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const useCache = url.searchParams.get('cache') !== 'false';
    
    // Vérifier le cache d'abord
    const cacheKey = `${session.user.email}_${offset}`;
    const cached = profileCache.get(cacheKey);
    
    if (useCache && cached && (Date.now() - cached.timestamp) < cached.ttl) {
      const responseTime = Date.now() - startTime;
      tracker.trackRequest(responseTime, true);
      
      console.log(`⚡ Cache HIT! ${responseTime}ms | ${cached.profiles.length} profiles`);
      
      return NextResponse.json({
        success: true,
        users: cached.profiles,
        stats: {
          totalUsers: 0, // Skip pour le cache
          excludedCount: 0,
          discoverableCount: cached.profiles.length,
          breakdown: { alreadyLiked: 0, alreadyDisliked: 0, alreadyMatched: 0 },
          avgCompatibility: cached.profiles.length > 0 
            ? Math.round(cached.profiles.reduce((sum, u) => sum + u.compatibility, 0) / cached.profiles.length)
            : 0
        },
        currentUser: { id: '', interests: [], age: null, location: null }, // Skip pour le cache
        meta: {
          timestamp: new Date().toISOString(),
          algorithm: 'cached_optimized',
          responseTime,
          cacheHit: true,
          excludedReasons: { matches: 0, likes: 0, dislikes: 0 }
        }
      });
    }

    // Récupération de l'utilisateur actuel
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

    // Récupération des utilisateurs exclus et des profils en parallèle
    const { excludedIds, breakdown } = await getCachedExcludedUsers(prisma, currentUser.id);
    const users = await getDiscoverableUsersOptimized(prisma, excludedIds, currentUser, offset, limit);

    // Mise en cache du résultat si ce n'est pas un offset
    if (offset === 0 && useCache) {
      profileCache.set(cacheKey, {
        profiles: users,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5 minutes
      });
    }

    // Pre-loading asynchrone du batch suivant (sans attendre)
    if (users.length > 30 && offset === 0) {
      setImmediate(() => preloadNextBatch(prisma, currentUser.id, offset));
    }

    // Statistiques générales
    const totalUsersCount = await prisma.user.count();

    const stats: DiscoverStats = {
      totalUsers: totalUsersCount,
      excludedCount: excludedIds.length,
      discoverableCount: users.length,
      breakdown: {
        alreadyLiked: breakdown.likes,
        alreadyDisliked: breakdown.dislikes,
        alreadyMatched: breakdown.matches
      },
      avgCompatibility: users.length > 0 
        ? Math.round(users.reduce((sum, u) => sum + u.compatibility, 0) / users.length)
        : 0
    };

    const responseTime = Date.now() - startTime;
    tracker.trackRequest(responseTime, false);

    console.log(`⚡ ${users.length} utilisateurs découvrables (optimisé), ${excludedIds.length} exclus | ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      users,
      stats,
      currentUser: {
        id: currentUser.id,
        interests: currentUser.interests || [],
        age: currentUser.age,
        location: currentUser.location
      },
      meta: {
        timestamp: new Date().toISOString(),
        algorithm: 'optimized_prisma_js',
        responseTime,
        cacheHit: false,
        excludedReasons: {
          matches: breakdown.matches,
          likes: breakdown.likes,
          dislikes: breakdown.dislikes
        }
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ Erreur API discover optimisée (${responseTime}ms):`, error);
    
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
        responseTime,
        excludedReasons: { matches: 0, likes: 0, dislikes: 0 }
      }
    }, { status: 500 });
  }
}

// Endpoint POST pour les actions de swipe (conservé de l'original)
export async function POST(request: NextRequest) {
  console.log('💫 API Discover - Action de swipe');
  
  try {
    const session = await auth();
    
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

    // Invalider le cache après une action
    const cacheKey = `excluded_${currentUserId}`;
    userExclusionCache.delete(cacheKey);

    switch (action) {
      case 'like':
      case 'super_like':
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

        console.log(`${action === 'super_like' ? '⭐' : '👍'} ${action} envoyé: ${currentUserId} -> ${targetUser.id}`, { isMatch });

        return NextResponse.json({
          success: true,
          action: action,
          isMatch,
          targetUser: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email
          },
          message: isMatch ? '🎉 C\'est un match !' : `${action === 'super_like' ? 'Super Like' : 'Like'} envoyé`
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

      default:
        return NextResponse.json({ 
          error: 'Action non supportée. Actions valides: like, super_like, dislike, pass' 
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

// Endpoint pour les métriques de performance et debug
export async function OPTIONS(request: NextRequest) {
  const tracker = PerformanceTracker.getInstance();
  
  return NextResponse.json({
    performance: tracker.getStats(),
    cacheStats: {
      exclusionCacheEntries: userExclusionCache.size,
      profileCacheEntries: profileCache.size,
      memoryUsage: {
        exclusions: JSON.stringify([...userExclusionCache.entries()]).length,
        profiles: JSON.stringify([...profileCache.entries()]).length
      }
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}

// ================================
// WARMUP ET MAINTENANCE
// ================================

// Warmup automatique au démarrage
let isWarmedUp = false;

const warmupCache = async () => {
  if (isWarmedUp) return;
  
  console.log('🔥 Warmup cache en cours...');
  
  try {
    const { prisma } = await import('@/lib/db');
    
    // Récupérer les 10 utilisateurs les plus actifs des dernières 24h
    const activeUsers = await prisma.user.findMany({
      where: { 
        lastSeen: { 
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
        } 
      },
      select: { id: true, email: true },
      orderBy: { lastSeen: 'desc' },
      take: 10
    });
    
    // Pre-charger leur cache d'exclusions
    for (const user of activeUsers) {
      try {
        await getCachedExcludedUsers(prisma, user.id);
      } catch (error) {
        console.log(`⚠️ Warmup failed for user ${user.id}`);
      }
    }
    
    isWarmedUp = true;
    console.log(`🔥 Cache warmup terminé pour ${activeUsers.length} utilisateurs actifs`);
  } catch (error) {
    console.log('⚠️ Warmup failed:', error);
  }
};

// Démarrer le warmup après 5 secondes (uniquement en production)
if (process.env.NODE_ENV === 'production') {
  setTimeout(warmupCache, 5000);
}

// Nettoyage automatique du cache toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleanedExclusions = 0;
  let cleanedProfiles = 0;
  
  // Nettoyage cache exclusions
  for (const [key, data] of userExclusionCache.entries()) {
    if ((now - data.timestamp) > data.ttl) {
      userExclusionCache.delete(key);
      cleanedExclusions++;
    }
  }
  
  // Nettoyage cache profils
  for (const [key, data] of profileCache.entries()) {
    if ((now - data.timestamp) > data.ttl) {
      profileCache.delete(key);
      cleanedProfiles++;
    }
  }
  
  if (cleanedExclusions > 0 || cleanedProfiles > 0) {
    console.log(`🧹 Cache cleanup: ${cleanedExclusions} exclusions, ${cleanedProfiles} profils supprimés`);
  }
}, 5 * 60 * 1000); // Toutes les 5 minutes