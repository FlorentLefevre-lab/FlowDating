import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminAccess, canModifyUser } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/logging'
import { AccountStatus, UserRole, AdminActionType } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        photos: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            url: true,
            isPrimary: true,
            moderationStatus: true,
            moderatedAt: true,
            moderationNote: true,
            nsfwScore: true,
            autoFlagged: true,
            createdAt: true,
          }
        },
        preferences: true,
        stats: true,
        reportsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            category: true,
            description: true,
            status: true,
            createdAt: true,
            reporter: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        actionsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            actionType: true,
            details: true,
            createdAt: true,
            admin: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        _count: {
          select: {
            likesGiven: true,
            likesReceived: true,
            matchesAsUser1: true,
            matchesAsUser2: true,
            blocksGiven: true,
            blocksReceived: true,
            reportsReceived: true,
            reportsSubmitted: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouve' },
        { status: 404 }
      )
    }

    // Formater les donnees
    const formattedUser = {
      ...user,
      hashedPassword: undefined,
      matchesCount: user._count.matchesAsUser1 + user._count.matchesAsUser2,
      _count: {
        ...user._count,
        matches: user._count.matchesAsUser1 + user._count.matchesAsUser2,
      }
    }

    return NextResponse.json({ user: formattedUser })
  } catch (error) {
    console.error('[ADMIN USER DETAIL] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation de l\'utilisateur' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { action, reason, duration, newRole } = body

    // Recuperer l'utilisateur cible
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, accountStatus: true, email: true, name: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouve' },
        { status: 404 }
      )
    }

    // Verifier les permissions
    if (!canModifyUser(authResult.role, targetUser.role)) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas modifier cet utilisateur' },
        { status: 403 }
      )
    }

    let updateData: any = {}
    let actionType: AdminActionType | null = null
    let details: any = { reason }

    switch (action) {
      case 'suspend':
        const suspendedUntil = duration
          ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
          : null
        updateData = {
          accountStatus: 'SUSPENDED' as AccountStatus,
          suspensionReason: reason,
          suspendedAt: new Date(),
          suspendedUntil,
        }
        actionType = 'USER_SUSPENDED'
        details.duration = duration
        details.suspendedUntil = suspendedUntil
        break

      case 'ban':
        updateData = {
          accountStatus: 'BANNED' as AccountStatus,
          suspensionReason: reason,
          suspendedAt: new Date(),
        }
        actionType = 'USER_BANNED'
        break

      case 'unban':
        updateData = {
          accountStatus: 'ACTIVE' as AccountStatus,
          suspensionReason: null,
          suspendedAt: null,
          suspendedUntil: null,
        }
        actionType = 'USER_UNBANNED'
        break

      case 'changeRole':
        if (!newRole || !['USER', 'MODERATOR', 'ADMIN'].includes(newRole)) {
          return NextResponse.json(
            { error: 'Role invalide' },
            { status: 400 }
          )
        }
        // Seul un admin peut changer les roles
        if (authResult.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Seul un admin peut changer les roles' },
            { status: 403 }
          )
        }
        updateData = { role: newRole as UserRole }
        actionType = 'ROLE_CHANGED'
        details.oldRole = targetUser.role
        details.newRole = newRole
        break

      default:
        return NextResponse.json(
          { error: 'Action non reconnue' },
          { status: 400 }
        )
    }

    // Mettre a jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        accountStatus: true,
        role: true,
        suspensionReason: true,
        suspendedAt: true,
        suspendedUntil: true,
      }
    })

    // Logger l'action
    if (actionType) {
      await logAdminAction({
        adminId: authResult.userId,
        targetUserId: id,
        actionType,
        details,
      })
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Action "${action}" effectuee avec succes`
    })
  } catch (error) {
    console.error('[ADMIN USER ACTION] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'action sur l\'utilisateur' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await verifyAdminAccess()
  if (!authResult.authorized) {
    return authResult.error
  }

  // Seul un admin peut supprimer des utilisateurs
  if (authResult.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Seul un admin peut supprimer des utilisateurs' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params

    // Recuperer l'utilisateur cible
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, name: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouve' },
        { status: 404 }
      )
    }

    // Un admin ne peut pas se supprimer lui-meme
    if (targetUser.id === authResult.userId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 403 }
      )
    }

    // Un admin ne peut pas supprimer un autre admin
    if (targetUser.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer un autre admin' },
        { status: 403 }
      )
    }

    // Supprimer l'utilisateur (les relations sont en cascade)
    await prisma.user.delete({
      where: { id }
    })

    // Logger l'action
    await logAdminAction({
      adminId: authResult.userId,
      targetUserId: id,
      actionType: 'USER_DELETED',
      details: {
        deletedEmail: targetUser.email,
        deletedName: targetUser.name,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Utilisateur supprime avec succes'
    })
  } catch (error) {
    console.error('[ADMIN USER DELETE] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'utilisateur' },
      { status: 500 }
    )
  }
}
