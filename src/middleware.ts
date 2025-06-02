// ===========================================
// ÉTAPE 14: Middleware Next.js
// FICHIER: src/middleware.ts
// ===========================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Permettre les connexions Socket.io et les fichiers statiques
  if (request.nextUrl.pathname.startsWith('/socket.io/') || 
      request.nextUrl.pathname.startsWith('/_next/') ||
      request.nextUrl.pathname.startsWith('/api/auth/') ||
      request.nextUrl.pathname.startsWith('/favicon.ico') ||
      request.nextUrl.pathname.startsWith('/public/')) {
    return NextResponse.next();
  }

  // Protection des routes de chat
  if (request.nextUrl.pathname.startsWith('/chat')) {
    const token = await getToken({ req: request });
    
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protection des routes protégées (découverte, matches, profil)
  if (request.nextUrl.pathname.startsWith('/discover') ||
      request.nextUrl.pathname.startsWith('/matches') ||
      request.nextUrl.pathname.startsWith('/profile')) {
    const token = await getToken({ req: request });
    
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/chat/:path*', 
    '/discover/:path*',
    '/matches/:path*',
    '/profile/:path*',
    '/socket.io/:path*'
  ],
};