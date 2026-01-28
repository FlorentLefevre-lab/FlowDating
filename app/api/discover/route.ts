// src/app/api/discover/route.ts - VERSION COMPLÈTE DANS UNE SEULE ROUTE
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server';
import { apiCache } from '@/lib/cache';
import { withRateLimit } from '@/lib/middleware/rateLimit';

// ================================
// GET - RÉCUPÉRER LES PROFILS
// ================================

// Rate limited: 30 requests/minute for discovery
async function handleGetDiscover(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 API Discover - GET Profiles');
  
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const url = new URL(request.url);
    
    const filters = {
      minAge: url.searchParams.get('minAge') ? parseInt(url.searchParams.get('minAge')!) : undefined,
      maxAge: url.searchParams.get('maxAge') ? parseInt(url.searchParams.get('maxAge')!) : undefined,
      maxDistance: url.searchParams.get('maxDistance') ? parseInt(url.searchParams.get('maxDistance')!) : undefined,
      gender: url.searchParams.get('gender') || undefined,
      online: url.searchParams.get('online') === 'true'
    };

    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // 1. Récupérer l'utilisateur avec cache
    let currentUser = await apiCache.userBasic.get(session.user.email);
    if (!currentUser) {
      currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, interests: true, age: true, location: true, name: true }
      });
      if (currentUser) {
        await apiCache.userBasic.set(session.user.email, currentUser);
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // 2. Vérifier le cache des résultats de découverte
    const cachedResults = await apiCache.discover.get(currentUser.id, { filters, offset, limit });
    if (cachedResults && cachedResults.length > 0) {
      console.log(`📦 Cache HIT - ${cachedResults.length} profils depuis le cache`);
      return NextResponse.json({
        success: true,
        users: cachedResults,
        meta: {
          responseTime: Date.now() - startTime,
          cacheHit: true,
          source: 'cache'
        }
      });
    }

    // 3. Récupérer les exclusions avec cache
    let exclusions = await apiCache.exclusions.get(currentUser.id);
    if (!exclusions) {
      const [likedUsers, dislikedUsers, matchedUsers] = await Promise.all([
        prisma.like.findMany({
          where: { senderId: currentUser.id },
          select: { receiverId: true }
        }),
        prisma.dislike.findMany({
          where: { senderId: currentUser.id },
          select: { receiverId: true }
        }),
        prisma.$queryRaw<Array<{ receiverId: string }>>`
          SELECT l2."senderId" as "receiverId"
          FROM "likes" l1
          INNER JOIN "likes" l2 
            ON l1."senderId" = l2."receiverId" 
            AND l1."receiverId" = l2."senderId"
          WHERE l1."senderId" = ${currentUser.id}
        `
      ]);

      const excludedIds = [
        currentUser.id,
        ...likedUsers.map(l => l.receiverId),
        ...dislikedUsers.map(d => d.receiverId),
        ...matchedUsers.map(m => m.receiverId)
      ];

      exclusions = { excludedIds: [...new Set(excludedIds)] };
      await apiCache.exclusions.set(currentUser.id, exclusions);
    }

    // 4. Récupérer les utilisateurs découvrables
    const whereConditions: any = {
      AND: [
        { id: { notIn: exclusions.excludedIds } },
        { email: { not: { endsWith: '@system.local' } } }
      ]
    };

    // Appliquer les filtres
    if (filters.minAge || filters.maxAge) {
      whereConditions.AND.push({
        age: {
          ...(filters.minAge && { gte: filters.minAge }),
          ...(filters.maxAge && { lte: filters.maxAge })
        }
      });
    }

    if (filters.gender) {
      whereConditions.AND.push({ gender: filters.gender });
    }

    if (filters.online) {
      whereConditions.AND.push({
        lastSeen: { gte: new Date(Date.now() - 15 * 60 * 1000) }
      });
    }

    const users = await prisma.user.findMany({
      where: whereConditions,
      select: {
        // SECURITY: Do NOT expose email in discover endpoint
        id: true, name: true, age: true, bio: true,
        location: true, profession: true, gender: true, interests: true,
        createdAt: true, lastSeen: true,
        photos: {
          select: { id: true, url: true, isPrimary: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }]
        }
      },
      orderBy: [{ lastSeen: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset
    });

    // 5. Calculer la compatibilité
    const enrichedUsers = users.map(user => {
      let compatibilityScore = 40;

      // Centres d'intérêt communs
      if (user.interests?.length && currentUser.interests?.length) {
        const commonInterests = user.interests.filter(interest => 
          currentUser.interests.includes(interest)
        );
        const interestScore = (commonInterests.length / Math.max(user.interests.length, currentUser.interests.length)) * 40;
        compatibilityScore += interestScore;
      }

      // Différence d'âge
      if (user.age && currentUser.age) {
        const ageDiff = Math.abs(user.age - currentUser.age);
        const ageScore = Math.max(0, (10 - ageDiff) / 10) * 30;
        compatibilityScore += ageScore;
      }

      // Bonus activité récente
      if (user.lastSeen) {
        const daysSinceLastSeen = (Date.now() - new Date(user.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSeen < 1) compatibilityScore += 15;
        else if (daysSinceLastSeen < 7) compatibilityScore += 10;
        else if (daysSinceLastSeen < 30) compatibilityScore += 5;
      }

      const finalScore = Math.round(Math.max(25, Math.min(99, compatibilityScore)));

      return {
        id: user.id,
        name: user.name || 'Utilisateur',
        // SECURITY: email removed - not needed for discover
        age: user.age || 25,
        bio: user.bio,
        location: user.location || 'Lieu non précisé',
        profession: user.profession || 'Profession non précisée',
        gender: user.gender,
        interests: user.interests || [],
        photos: user.photos.length > 0 ? user.photos : [{
          id: 'placeholder',
          url: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&size=400&background=f3f4f6&color=9ca3af`,
          isPrimary: true
        }],
        compatibility: finalScore,
        memberSince: user.createdAt.toISOString(),
        isOnline: user.lastSeen ? (Date.now() - new Date(user.lastSeen).getTime()) < 15 * 60 * 1000 : false
      };
    });

    // 6. Mettre en cache et retourner
    const sortedUsers = enrichedUsers.sort((a, b) => b.compatibility - a.compatibility);
    
    await apiCache.discover.set(currentUser.id, { filters, offset, limit }, sortedUsers);

    console.log(`⚡ ${sortedUsers.length} utilisateurs découvrables | ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      users: sortedUsers,
      meta: {
        responseTime: Date.now() - startTime,
        cacheHit: false,
        source: 'database'
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur API discover GET:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// Export GET with rate limiting (discovery type: 30 requests/minute)
export const GET = withRateLimit('discovery')(handleGetDiscover);

// ================================
// POST - ACTIONS (LIKE, DISLIKE, ETC.)
// ================================

// Rate limited: 30 requests/minute for discovery actions
async function handlePostDiscover(request: NextRequest) {
  const startTime = Date.now();
  console.log('💫 API Discover - POST Action');
  
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { action, targetUserId, metadata } = body;

    if (!action || !targetUserId) {
      return NextResponse.json({ 
        error: 'Paramètres requis: action, targetUserId' 
      }, { status: 400 });
    }

    const { prisma } = await import('@/lib/db');
    
    // Récupérer l'utilisateur actuel
    let currentUser = await apiCache.userBasic.get(session.user.email);
    if (!currentUser) {
      currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true }
      });
      if (currentUser) {
        await apiCache.userBasic.set(session.user.email, currentUser);
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Vérifier l'utilisateur cible
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur cible introuvable' }, { status: 404 });
    }

    // Vérification des limites d'actions (simple)
    const today = new Date().toISOString().split('T')[0];
    const limitKey = `action_limits:${currentUser.id}:${today}`;
    
    let actionCounts = await apiCache.userBasic.get(limitKey) || {
      likes: 0,
      super_likes: 0,
      dislikes: 0
    };

    // Vérifier les limites
    if (action === 'like' && actionCounts.likes >= 100) {
      return NextResponse.json({ error: 'Limite de likes atteinte (100/jour)' }, { status: 429 });
    }
    if (action === 'super_like' && actionCounts.super_likes >= 5) {
      return NextResponse.json({ error: 'Limite de super likes atteinte (5/jour)' }, { status: 429 });
    }

    let result: any = { success: true, action };

    // Traitement de l'action
    switch (action) {
      case 'like':
      case 'super_like':
        // Créer le like (sans le champ isSuperLike qui n'existe pas)
        await prisma.like.upsert({
          where: {
            senderId_receiverId: {
              senderId: currentUser.id,
              receiverId: targetUser.id
            }
          },
          update: {},
          create: {
            senderId: currentUser.id,
            receiverId: targetUser.id
          }
        });

        // TODO: Si vous voulez distinguer les super likes, il faudra :
        // 1. Ajouter le champ isSuperLike dans votre schéma Prisma
        // 2. Ou créer une table separée pour les super_likes
        // 3. Ou ajouter un champ "type" avec enum ('like', 'super_like')

        // Vérifier le match
        const reciprocalLike = await prisma.like.findFirst({
          where: {
            senderId: targetUser.id,
            receiverId: currentUser.id
          }
        });

        result.isMatch = !!reciprocalLike;
        result.message = result.isMatch ? '🎉 C\'est un match !' : `${action === 'super_like' ? 'Super Like' : 'Like'} envoyé`;
        
        // Note: Pour l'instant, les super likes sont traités comme des likes normaux
        if (action === 'super_like') {
          result.message += ' (traité comme un like standard)';
        }
        
        // Mettre à jour le compteur
        actionCounts[action === 'super_like' ? 'super_likes' : 'likes']++;
        await apiCache.userBasic.set(limitKey, actionCounts);
        
        break;

      case 'dislike':
      case 'pass':
        await prisma.dislike.upsert({
          where: {
            senderId_receiverId: {
              senderId: currentUser.id,
              receiverId: targetUser.id
            }
          },
          update: {},
          create: {
            senderId: currentUser.id,
            receiverId: targetUser.id
          }
        });

        result.message = 'Utilisateur passé';
        actionCounts.dislikes++;
        await apiCache.userBasic.set(limitKey, actionCounts);
        break;

      case 'undo':
        // Logique d'annulation simple
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const [lastLike, lastDislike] = await Promise.all([
          prisma.like.findFirst({
            where: { 
              senderId: currentUser.id,
              createdAt: { gte: fiveMinutesAgo }
            },
            orderBy: { createdAt: 'desc' }
          }),
          prisma.dislike.findFirst({
            where: { 
              senderId: currentUser.id,
              createdAt: { gte: fiveMinutesAgo }
            },
            orderBy: { createdAt: 'desc' }
          })
        ]);

        const lastAction = [lastLike, lastDislike]
          .filter(Boolean)
          .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime())[0];

        if (lastAction) {
          if (lastAction === lastLike) {
            await prisma.like.delete({ where: { id: lastAction.id } });
            result.message = 'Like annulé';
          } else {
            await prisma.dislike.delete({ where: { id: lastAction.id } });
            result.message = 'Dislike annulé';
          }
        } else {
          result.success = false;
          result.message = 'Aucune action récente à annuler';
        }
        break;

      default:
        return NextResponse.json({ 
          error: 'Action non supportée. Actions valides: like, super_like, dislike, pass, undo' 
        }, { status: 400 });
    }

    // Invalider le cache après l'action
    await apiCache.invalidateUser(currentUser.id);
    if (result.isMatch) {
      await apiCache.invalidateUser(targetUser.id);
    }

    console.log(`${action}: ${currentUser.id} -> ${targetUser.id} | ${Date.now() - startTime}ms`);

    return NextResponse.json({
      ...result,
      targetUser: { id: targetUser.id, name: targetUser.name },
      responseTime: Date.now() - startTime
    });

  } catch (error: any) {
    console.error('❌ Erreur action discover:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500 });
  }
}

// Export POST with rate limiting (discovery type: 30 requests/minute)
export const POST = withRateLimit('discovery')(handlePostDiscover);

// ================================
// OPTIONS - MÉTRIQUES ET DEBUG
// ================================

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    message: 'API Discover - Version unifiée',
    endpoints: {
      'GET /api/discover': 'Récupérer les profils découvrables',
      'POST /api/discover': 'Effectuer une action (like, dislike, etc.)'
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}