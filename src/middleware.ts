// src/middleware.ts
import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  
  console.log(`🔍 Middleware: ${pathname}, Auth: ${isLoggedIn}`);

  // Ignorer les fichiers statiques et les routes API spéciales
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Routes qui nécessitent une authentification
  const protectedRoutes = ['/dashboard', '/profile', '/matches', '/discover', '/chat', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Routes API protégées
  const protectedApiRoutes = ['/api/profile', '/api/matches', '/api/chat', '/api/user'];
  const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));

  // Routes publiques
  const publicRoutes = ['/auth/', '/'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Gestion des routes API protégées
  if (isProtectedApiRoute && !isLoggedIn) {
    console.log(`🚫 API non autorisée: ${pathname}`);
    return NextResponse.json(
      { error: 'Non autorisé', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Redirection si pas connecté sur route protégée
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/auth/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    console.log(`🔄 Redirection vers login: ${loginUrl}`);
    return NextResponse.redirect(loginUrl);
  }

  // Redirection si connecté sur page auth (sauf error et logout)
  if (isLoggedIn && pathname.startsWith('/auth/') && 
      !['error', 'logout'].some(route => pathname.includes(route))) {
    console.log(`🏠 Redirection vers dashboard`);
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin));
  }

  // Route racine - redirection intelligente
  if (pathname === '/') {
    const targetUrl = isLoggedIn ? '/dashboard' : '/auth/login';
    console.log(`🏠 Redirection racine vers: ${targetUrl}`);
    return NextResponse.redirect(new URL(targetUrl, req.nextUrl.origin));
  }

  // Ajouter des headers de sécurité
  const response = NextResponse.next();
  
  // Headers de sécurité pour les routes protégées
  if (isProtectedRoute || isProtectedApiRoute) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  return response;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any file with an extension
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*))',
  ],
};