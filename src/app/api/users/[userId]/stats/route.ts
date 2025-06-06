// src/app/api/users/[userId]/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth' // Si vous utilisez auth.js v5import { prisma } from '@/lib/db';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // ⚡ AWAIT des params pour Next.js 15
    const { userId } = await params
    
    const session = await auth()  
    
    // Vérification de l'authentification
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    // Vérification que l'utilisateur demande ses propres stats
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 📊 REQUÊTES PARALLÈLES POUR LES STATISTIQUES
    const [
      messagesReceived,
      dailyMessagesReceived,
      matchesCount,
      profileViews,
      dailyProfileViews,
      likesReceived,
      dailyLikesReceived
    ] = await Promise.all([
      // Messages reçus (total)
      prisma.message.count({
        where: {
          receiverId: userId,
          deletedAt: null
        }
      }),
      
      // Messages reçus aujourd'hui
      prisma.message.count({
        where: {
          receiverId: userId,
          deletedAt: null,
          createdAt: {
            gte: startOfDay
          }
        }
      }),
      
      // Matches effectifs (likes réciproques)
      prisma.like.count({
        where: {
          receiverId: userId,
          sender: {
            sentLikes: {
              some: {
                receiverId: userId,
                sender: {
                  receivedLikes: {
                    some: {
                      senderId: userId
                    }
                  }
                }
              }
            }
          }
        }
      }),
      
      // Vues de profil (total)
      prisma.profileView.count({
        where: {
          viewedId: userId
        }
      }),
      
      // Vues de profil aujourd'hui
      prisma.profileView.count({
        where: {
          viewedId: userId,
          createdAt: {
            gte: startOfDay
          }
        }
      }),
      
      // Likes reçus (total)
      prisma.like.count({
        where: {
          receiverId: userId
        }
      }),
      
      // Likes reçus aujourd'hui
      prisma.like.count({
        where: {
          receiverId: userId,
          createdAt: {
            gte: startOfDay
          }
        }
      })
    ])

    const stats = {
      messagesReceived,
      matchesCount,
      profileViews,
      likesReceived,
      dailyStats: {
        messagesReceived: dailyMessagesReceived,
        profileViews: dailyProfileViews,
        likesReceived: dailyLikesReceived,
      }
    }

    // 📝 LOG POUR DEBUGGING
    console.log(`📊 Stats calculées pour ${userId}:`, {
      messagesReceived,
      matchesCount,
      profileViews,
      likesReceived,
      dailyStats: stats.dailyStats
    })

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur lors du calcul des statistiques:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du calcul des statistiques' },
      { status: 500 }
    )
  }
}