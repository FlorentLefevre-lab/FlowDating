import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminAccess } from '@/lib/admin/auth'
import { AccountStatus, UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  try {
    const { searchParams } = new URL(request.url)

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    // Filtres
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') as AccountStatus | null
    const role = searchParams.get('role') as UserRole | null
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Construction de la requete
    const where: any = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.accountStatus = status
    }

    if (role) {
      where.role = role
    }

    // Execution des requetes en parallele
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          age: true,
          gender: true,
          location: true,
          accountStatus: true,
          role: true,
          isPremium: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              photos: true,
              likesGiven: true,
              likesReceived: true,
              matchesAsUser1: true,
              matchesAsUser2: true,
              reportsReceived: true,
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Formater les donnees
    const formattedUsers = users.map(user => ({
      ...user,
      matchesCount: user._count.matchesAsUser1 + user._count.matchesAsUser2,
      photosCount: user._count.photos,
      likesGivenCount: user._count.likesGiven,
      likesReceivedCount: user._count.likesReceived,
      reportsCount: user._count.reportsReceived,
      _count: undefined,
    }))

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error('[ADMIN USERS] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des utilisateurs' },
      { status: 500 }
    )
  }
}
