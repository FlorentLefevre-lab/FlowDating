import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { subDays, startOfDay, endOfDay } from 'date-fns'

export async function GET() {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  try {
    const now = new Date()
    const today = startOfDay(now)
    const weekAgo = subDays(today, 7)
    const monthAgo = subDays(today, 30)

    // Fetch all stats in parallel
    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      activeUsersToday,
      activeUsersWeek,
      totalMatches,
      matchesToday,
      matchesWeek,
      totalLikes,
      likesToday,
      pendingPhotos,
      pendingReports,
      userGrowthData,
      matchesGrowthData
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // New users today
      prisma.user.count({
        where: { createdAt: { gte: today } }
      }),

      // New users this week
      prisma.user.count({
        where: { createdAt: { gte: weekAgo } }
      }),

      // New users this month
      prisma.user.count({
        where: { createdAt: { gte: monthAgo } }
      }),

      // Active users today (logged in today)
      prisma.user.count({
        where: { lastSeen: { gte: today } }
      }),

      // Active users this week
      prisma.user.count({
        where: { lastSeen: { gte: weekAgo } }
      }),

      // Total matches
      prisma.match.count({
        where: { status: 'ACTIVE' }
      }),

      // Matches today
      prisma.match.count({
        where: { createdAt: { gte: today } }
      }),

      // Matches this week
      prisma.match.count({
        where: { createdAt: { gte: weekAgo } }
      }),

      // Total likes
      prisma.like.count(),

      // Likes today
      prisma.like.count({
        where: { createdAt: { gte: today } }
      }),

      // Pending photo moderation
      prisma.photo.count({
        where: { moderationStatus: 'PENDING' }
      }),

      // Pending reports
      prisma.report.count({
        where: { status: 'PENDING' }
      }),

      // User growth last 30 days (grouped by day)
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= ${monthAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // Matches growth last 30 days
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM matches
        WHERE created_at >= ${monthAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `
    ])

    // Calculate retention (simplified - users who came back)
    const day1Retention = totalUsers > 0
      ? Math.round((activeUsersToday / totalUsers) * 100)
      : 0
    const day7Retention = totalUsers > 0
      ? Math.round((activeUsersWeek / totalUsers) * 100)
      : 0

    // Format chart data
    const userGrowth = userGrowthData.map(row => ({
      date: row.date,
      count: Number(row.count)
    }))

    const matchesGrowth = matchesGrowthData.map(row => ({
      date: row.date,
      count: Number(row.count)
    }))

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalUsers,
          newUsersToday,
          newUsersWeek,
          newUsersMonth,
          activeUsersToday,
          activeUsersWeek,
          totalMatches,
          matchesToday,
          matchesWeek,
          totalLikes,
          likesToday,
          pendingPhotos,
          pendingReports
        },
        charts: {
          userGrowth,
          matchesGrowth
        },
        retention: {
          day1: day1Retention,
          day7: day7Retention
        }
      },
      meta: {
        timestamp: now.toISOString(),
        cached: false
      }
    })
  } catch (error) {
    console.error('[ADMIN STATS] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}
