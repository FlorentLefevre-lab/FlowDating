import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"

// Chemins publics (sans authentification)
const publicPaths = new Set([
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/verify-email',
  '/auth/reset-password',
  '/api/health',
  '/api/monitoring/health',
  '/api/ping',
  '/debug',
])

function isPublicPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) return true
  if (pathname.startsWith('/api/auth/')) return true
  if (pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.')) return true
  return false
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
}

export default auth((request) => {
  const { pathname } = request.nextUrl

  // Autoriser les chemins publics
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Si pas de session, rediriger vers login
  if (!request.auth) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Protection des routes admin
  if (isAdminPath(pathname)) {
    const role = request.auth.user?.role
    if (!role || (role !== 'ADMIN' && role !== 'MODERATOR')) {
      // Rediriger vers la page d'accueil si pas admin
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Authentifié, continuer
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
