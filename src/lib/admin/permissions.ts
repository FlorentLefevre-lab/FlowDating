import { UserRole } from '@prisma/client'

// Définition des permissions par rôle
export const PERMISSIONS = {
  MODERATOR: [
    'view_dashboard',
    'view_users',
    'moderate_photos',
    'manage_reports',
    'view_logs'
  ],
  ADMIN: [
    'view_dashboard',
    'view_users',
    'manage_users',
    'moderate_photos',
    'manage_reports',
    'view_logs',
    'change_roles',
    'manage_settings',
    'delete_users',
    'ban_users'
  ]
} as const

export type Permission = typeof PERMISSIONS.ADMIN[number]

/**
 * Vérifie si un rôle a une permission spécifique
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (role === 'ADMIN') {
    return PERMISSIONS.ADMIN.includes(permission)
  }
  if (role === 'MODERATOR') {
    return PERMISSIONS.MODERATOR.includes(permission as any)
  }
  return false
}

/**
 * Vérifie si un rôle peut effectuer une action
 */
export function canPerform(role: UserRole | undefined, action: Permission): boolean {
  if (!role || role === 'USER') return false
  return hasPermission(role, action)
}

/**
 * Vérifie si le rôle est admin
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'ADMIN'
}

/**
 * Vérifie si le rôle est au moins modérateur
 */
export function isModerator(role: UserRole | undefined): boolean {
  return role === 'MODERATOR' || role === 'ADMIN'
}

/**
 * Vérifie si le rôle a accès à l'interface admin
 */
export function hasAdminAccess(role: UserRole | undefined): boolean {
  return isModerator(role)
}
