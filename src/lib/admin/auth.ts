import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { NextResponse } from 'next/server'
import { hasAdminAccess, isAdmin, isModerator, canPerform, Permission } from './permissions'

export { hasAdminAccess, isAdmin, isModerator, canPerform }
export type { Permission }

/**
 * Vérifie l'accès admin et retourne la session ou une erreur
 */
export async function verifyAdminAccess() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }
  }

  const role = (session.user as any).role as UserRole | undefined

  if (!hasAdminAccess(role)) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }
  }

  return {
    authorized: true,
    session,
    userId: session.user.id,
    role: role!
  }
}

/**
 * Vérifie une permission spécifique
 */
export async function verifyPermission(permission: Permission) {
  const result = await verifyAdminAccess()

  if (!result.authorized) {
    return result
  }

  if (!canPerform(result.role, permission)) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Permission insuffisante' },
        { status: 403 }
      )
    }
  }

  return result
}

/**
 * Récupère les informations admin d'un utilisateur
 */
export async function getAdminUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      accountStatus: true
    }
  })
}

/**
 * Vérifie si un utilisateur peut modifier un autre utilisateur
 */
export function canModifyUser(actorRole: UserRole, targetRole: UserRole): boolean {
  // Admin peut modifier tout le monde sauf les autres admins
  if (actorRole === 'ADMIN') {
    return true
  }

  // Moderator ne peut pas modifier les admins ou autres moderators
  if (actorRole === 'MODERATOR') {
    return targetRole === 'USER'
  }

  return false
}
