// src/app/api/users/[userId]/stats/route.ts - Version sans Message
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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

    console.log(`🔄 Calcul des statistiques (sans messages) pour l'utilisateur: ${userId}`)

    // 📊 REQUÊTES PARALLÈLES - Version simplifiée sans Message
    const [
      // 🔢 TOTAUX (depuis la création du profil)
      totalMatchesCount, 
      totalProfileViews,
      totalLikesReceived,
      
      // 📅 STATS DU JOUR
      dailyProfileViews,
      dailyLikesReceived,
      dailyMatchesCount
    ] = await Promise.all([
      // ✅ Matches effectifs (TOTAL) - Version simplifiée avec queryRaw CORRIGÉE
      prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*) as count
        FROM (
          SELECT DISTINCT l1."senderId", l1."receiverId"
          FROM "likes" l1
          INNER JOIN "likes" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
          WHERE l1."receiverId" = ${userId}
        ) as matches
      `,
      
      // ✅ Vues de profil (TOTAL)
      prisma.profileView.count({
        where: {
          viewedId: userId
        }
      }),
      
      // ✅ Likes reçus (TOTAL)
      prisma.like.count({
        where: {
          receiverId: userId
        }
      }),
      
      // ✅ Vues de profil (AUJOURD'HUI)
      prisma.profileView.count({
        where: {
          viewedId: userId,
          createdAt: {
            gte: startOfDay
          }
        }
      }),
      
      // ✅ Likes reçus (AUJOURD'HUI)
      prisma.like.count({
        where: {
          receiverId: userId,
          createdAt: {
            gte: startOfDay
          }
        }
      }),
      
      // ✅ Matches du jour (AUJOURD'HUI) - Version simplifiée CORRIGÉE
      prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*) as count
        FROM (
          SELECT DISTINCT l1."senderId", l1."receiverId"
          FROM "likes" l1
          INNER JOIN "likes" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
          WHERE l1."receiverId" = ${userId}
            AND l1."createdAt" >= ${startOfDay}
        ) as matches
      `
    ])

    // 📊 Convertir les BigInt en Number pour les matches
    const totalMatches = Number(totalMatchesCount[0].count)
    const dailyMatches = Number(dailyMatchesCount[0].count)
    
    // 📊 STRUCTURE FLEXIBLE - Sans messages
    const stats = {
      // 🔄 RÉTRO-COMPATIBILITÉ : Propriétés de niveau racine (stats du jour)
      messagesReceived: 0, // ⚠️ Désactivé - Message non implémenté
      matchesCount: dailyMatches, 
      profileViews: dailyProfileViews,
      likesReceived: dailyLikesReceived,
      
      // 📅 Stats du jour (explicites)
      dailyStats: {
        messagesReceived: 0, // ⚠️ Désactivé
        profileViews: dailyProfileViews,
        likesReceived: dailyLikesReceived,
        matchesCount: dailyMatches
      },
      
      // 🔢 Stats totales
      totalStats: {
        messagesReceived: 0, // ⚠️ Désactivé
        profileViews: totalProfileViews,
        likesReceived: totalLikesReceived,
        matchesCount: totalMatches
      },
      
      // 📈 Métadonnées
      metadata: {
        userId: userId,
        calculatedAt: new Date().toISOString(),
        startOfDay: startOfDay.toISOString(),
        note: "Messages désactivés - modèle non disponible"
      }
    }

    // 📝 LOG DÉTAILLÉ
    console.log(`📊 Stats calculées pour ${userId} (sans messages):`, {
      '📅 Stats du jour': stats.dailyStats,
      '🔢 Stats totales': stats.totalStats
    })

    // ✅ Vérification de cohérence (sans messages)
    const issues = []
    if (totalProfileViews < dailyProfileViews) issues.push('profileViews')
    if (totalLikesReceived < dailyLikesReceived) issues.push('likesReceived')
    if (totalMatches < dailyMatches) issues.push('matchesCount')
    
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