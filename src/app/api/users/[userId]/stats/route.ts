// src/app/api/users/[userId]/stats/route.ts - Version FLEXIBLE et rétro-compatible
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

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

    // 📅 Calcul des dates pour les stats du jour
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    console.log(`🔄 Calcul des statistiques FLEXIBLES pour l'utilisateur: ${userId}`)

    // 📊 REQUÊTES PARALLÈLES POUR TOUTES LES STATISTIQUES
    const [
      // 🔢 TOTAUX (depuis la création du profil)
      totalMessagesReceived,
      totalMatchesCount, 
      totalProfileViews,
      totalLikesReceived,
      
      // 📅 STATS DU JOUR (pour la page home)
      dailyMessagesReceived,
      dailyProfileViews,
      dailyLikesReceived,
      dailyMatchesCount
    ] = await Promise.all([
      // Messages reçus (TOTAL)
      prisma.message.count({
        where: {
          receiverId: userId,
          deletedAt: null
        }
      }),
      
      // Matches effectifs (TOTAL) - likes réciproques
      prisma.like.count({
        where: {
          receiverId: userId,
          sender: {
            receivedLikes: {
              some: {
                senderId: userId
              }
            }
          }
        }
      }),
      
      // Vues de profil (TOTAL)
      prisma.profileView.count({
        where: {
          viewedId: userId
        }
      }),
      
      // Likes reçus (TOTAL)
      prisma.like.count({
        where: {
          receiverId: userId
        }
      }),

      // Messages reçus (AUJOURD'HUI)
      prisma.message.count({
        where: {
          receiverId: userId,
          deletedAt: null,
          createdAt: {
            gte: startOfDay
          }
        }
      }),
      
      // Vues de profil (AUJOURD'HUI)
      prisma.profileView.count({
        where: {
          viewedId: userId,
          createdAt: {
            gte: startOfDay
          }
        }
      }),
      
      // Likes reçus (AUJOURD'HUI)
      prisma.like.count({
        where: {
          receiverId: userId,
          createdAt: {
            gte: startOfDay
          }
        }
      }),
      
      // Matches du jour (AUJOURD'HUI) - likes réciproques créés aujourd'hui
      prisma.like.count({
        where: {
          receiverId: userId,
          createdAt: {
            gte: startOfDay
          },
          sender: {
            receivedLikes: {
              some: {
                senderId: userId
              }
            }
          }
        }
      })
    ])

    // 📊 STRUCTURE FLEXIBLE - Rétro-compatible ET nouvelles fonctionnalités
    const stats = {
      // 🔄 RÉTRO-COMPATIBILITÉ : Propriétés de niveau racine (stats du jour pour page home)
      messagesReceived: dailyMessagesReceived,
      matchesCount: dailyMatchesCount, 
      profileViews: dailyProfileViews,
      likesReceived: dailyLikesReceived,
      
      // 📅 Stats du jour (explicites)
      dailyStats: {
        messagesReceived: dailyMessagesReceived,
        profileViews: dailyProfileViews,
        likesReceived: dailyLikesReceived,
        matchesCount: dailyMatchesCount
      },
      
      // 🔢 NOUVEAUTÉ : Stats totales
      totalStats: {
        messagesReceived: totalMessagesReceived,
        profileViews: totalProfileViews,
        likesReceived: totalLikesReceived,
        matchesCount: totalMatchesCount
      },
      
      // 📈 Métadonnées utiles
      metadata: {
        userId: userId,
        calculatedAt: new Date().toISOString(),
        startOfDay: startOfDay.toISOString()
      }
    }

    // 📝 LOG DÉTAILLÉ POUR DEBUGGING
    console.log(`📊 Stats FLEXIBLES calculées pour ${userId}:`, {
      '🔄 Rétro-compatible (niveau racine)': {
        messagesReceived: dailyMessagesReceived,
        profileViews: dailyProfileViews,
        likesReceived: dailyLikesReceived,
        matchesCount: dailyMatchesCount
      },
      '📅 Stats du jour': stats.dailyStats,
      '🔢 Stats totales': stats.totalStats
    })

    // ✅ Vérification de cohérence
    const issues = []
    if (totalProfileViews < dailyProfileViews) issues.push('profileViews')
    if (totalLikesReceived < dailyLikesReceived) issues.push('likesReceived')
    if (totalMessagesReceived < dailyMessagesReceived) issues.push('messagesReceived')
    if (totalMatchesCount < dailyMatchesCount) issues.push('matchesCount')
    
    if (issues.length > 0) {
      console.warn(`⚠️ ATTENTION: Incohérence détectée pour ${issues.join(', ')}`, {
        totaux: stats.totalStats,
        jour: stats.dailyStats
      })
    }

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