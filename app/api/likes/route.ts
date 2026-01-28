// src/app/api/likes/route.ts
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withRateLimit } from '@/lib/middleware/rateLimit'

// Rate limited: 30 requests/minute for likes
async function handlePostLikes(request: NextRequest) {
  try {
    // Récupérer la session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Trouver l'utilisateur par email
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const { toUserId, action } = await request.json();
    const fromUserId = currentUser.id;

    console.log('💖 API POST /likes - Début');
    console.log('🎯 Action:', action, 'de', currentUser.name, 'vers utilisateur:', toUserId);

    // Vérifications de base
    if (!toUserId || !action) {
      return NextResponse.json(
        { error: 'Données manquantes (toUserId ou action)' }, 
        { status: 400 }
      );
    }

    if (!['like', 'dislike'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide. Utilisez "like" ou "dislike"' }, 
        { status: 400 }
      );
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { error: 'Impossible de se liker soi-même' }, 
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, name: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur cible non trouvé' }, 
        { status: 404 }
      );
    }

    console.log('👤 Cible:', targetUser.name);

    // Vérifier si une action existe déjà
    const [existingLike, existingDislike] = await Promise.all([
      prisma.like.findUnique({
        where: {
          senderId_receiverId: { senderId: fromUserId, receiverId: toUserId }
        }
      }),
      prisma.dislike.findUnique({
        where: {
          senderId_receiverId: { senderId: fromUserId, receiverId: toUserId }
        }
      })
    ]);

    if (existingLike || existingDislike) {
      console.log('⚠️ Action déjà effectuée');
      return NextResponse.json(
        { error: 'Action déjà effectuée sur ce profil' }, 
        { status: 400 }
      );
    }

    // Marquer le profil comme vu
    await prisma.profileView.upsert({
      where: {
        viewerId_viewedId: { viewerId: fromUserId, viewedId: toUserId }
      },
      update: {},
      create: {
        viewerId: fromUserId,
        viewedId: toUserId
      }
    });

    let isMatch = false;
    let matchId = null;

    if (action === 'like') {
      // Créer le like
      await prisma.like.create({
        data: { 
          senderId: fromUserId, 
          receiverId: toUserId 
        }
      });

      console.log('👍 Like enregistré');

      // Vérifier si c'est un match mutuel
      const mutualLike = await prisma.like.findUnique({
        where: {
          senderId_receiverId: { senderId: toUserId, receiverId: fromUserId }
        }
      });

      if (mutualLike) {
        // C'est un match ! Créer dans la table Match
        // user1Id doit être < user2Id pour éviter les doublons
        const [user1Id, user2Id] = [fromUserId, toUserId].sort();

        const match = await prisma.match.create({
          data: {
            user1Id,
            user2Id,
            status: 'ACTIVE'
          },
          include: {
            user1: {
              select: {
                id: true,
                name: true,
                photos: {
                  where: { isPrimary: true },
                  take: 1
                }
              }
            },
            user2: {
              select: {
                id: true,
                name: true,
                photos: {
                  where: { isPrimary: true },
                  take: 1
                }
              }
            }
          }
        });

        isMatch = true;
        matchId = match.id;
        console.log('🎉 MATCH créé !', matchId);
        console.log('💕 Entre:', currentUser.name, 'et', targetUser.name);
      }

    } else if (action === 'dislike') {
      // Créer le dislike
      await prisma.dislike.create({
        data: { 
          senderId: fromUserId, 
          receiverId: toUserId 
        }
      });
      console.log('👎 Dislike enregistré');
    }

    return NextResponse.json({
      success: true,
      action,
      isMatch,
      matchId,
      message: isMatch 
        ? `🎉 C'est un match avec ${targetUser.name} !` 
        : `${action === 'like' ? '👍' : '👎'} Action enregistrée`
    });

  } catch (error) {
    console.error('❌ Erreur /api/likes:', error);
    return NextResponse.json({
      error: 'Erreur serveur interne',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

// Export with rate limiting (discovery type: 30 requests/minute)
export const POST = withRateLimit('discovery')(handlePostLikes)