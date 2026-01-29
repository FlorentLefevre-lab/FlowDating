import { prisma } from '@/lib/db'
import { AdminActionType } from '@prisma/client'
import { headers } from 'next/headers'

interface LogActionParams {
  adminId: string
  targetUserId?: string
  actionType: AdminActionType
  details?: Record<string, any>
}

/**
 * Enregistre une action admin dans les logs
 */
export async function logAdminAction({
  adminId,
  targetUserId,
  actionType,
  details
}: LogActionParams) {
  try {
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ||
                      headersList.get('x-real-ip') ||
                      'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    return await prisma.adminLog.create({
      data: {
        adminId,
        targetUserId,
        actionType,
        details: details || {},
        ipAddress,
        userAgent
      }
    })
  } catch (error) {
    console.error('[ADMIN LOG] Erreur lors de la création du log:', error)
    // Ne pas bloquer l'action si le log échoue
    return null
  }
}

/**
 * Récupère les logs admin avec pagination et filtres
 */
export async function getAdminLogs({
  page = 1,
  limit = 50,
  adminId,
  targetUserId,
  actionType,
  startDate,
  endDate
}: {
  page?: number
  limit?: number
  adminId?: string
  targetUserId?: string
  actionType?: AdminActionType
  startDate?: Date
  endDate?: Date
}) {
  const where: any = {}

  if (adminId) where.adminId = adminId
  if (targetUserId) where.targetUserId = targetUserId
  if (actionType) where.actionType = actionType

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        admin: {
          select: { id: true, name: true, email: true }
        },
        targetUser: {
          select: { id: true, name: true, email: true }
        }
      }
    }),
    prisma.adminLog.count({ where })
  ])

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}
