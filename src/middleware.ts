// src/middleware.ts
import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;
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

  // ✅ ROUTES PROTÉGÉES - Nécessitent une authentification
  const protectedRoutes = ['/home', '/profile', '/dashboard', '/matches', '/discover', '/chat', '/settings', '/messages', '/premium'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Routes API protégées
  const protectedApiRoutes = ['/api/profile', '/api/matches', '/api/chat', '/api/user'];
  const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));

  // ✅ ROUTES PUBLIQUES - Accessibles sans authentification
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/error', '/auth/verify-email', '/'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));

  // Gestion des routes API protégées
  if (isProtectedApiRoute && !isLoggedIn) {
    console.log(`🚫 API non autorisée: ${pathname}`);
    return NextResponse.json(
      { error: 'Non autorisé', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // ✅ PROTECTION PRINCIPALE - Redirection si pas connecté sur route protégée
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/auth/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    console.log(`🚫 Accès refusé à ${pathname} - redirection vers login`);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ ÉVITER L'ACCÈS AUX PAGES D'AUTH SI DÉJÀ CONNECTÉ
  if (isLoggedIn && pathname.startsWith('/auth/') && 
      !['error', 'logout'].some(route => pathname.includes(route))) {
    console.log(`🏠 Utilisateur connecté - redirection depuis ${pathname} vers /home`);
    return NextResponse.redirect(new URL('/home', req.nextUrl.origin));
  }

  // ✅ GESTION DE LA ROUTE RACINE
  if (pathname === '/') {
    if (isLoggedIn) {
      // ✅ CHANGEMENT: Utilisateur connecté -> rediriger vers /home
      console.log(`🏠 Utilisateur connecté - redirection racine vers /home`);
      return NextResponse.redirect(new URL('/home', req.nextUrl.origin));
    } else {
      // Utilisateur non connecté -> permettre l'accès à la page publique
      console.log(`🏠 Accès autorisé à la page publique`);
      return NextResponse.next();
    }
  }

  // ✅ CORRECTION: Éviter la redirection en boucle pour /home
  if (pathname === '/home' && isLoggedIn) {
    console.log(`✅ Utilisateur connecté sur /home - accès autorisé`);
    return NextResponse.next();
  }

  // ✅ PAGES PUBLIQUES - Permettre l'accès
  if (isPublicRoute) {
    console.log(`✅ Accès autorisé à la page publique: ${pathname}`);
    return NextResponse.next();
  }

  // ✅ AUTRES PAGES - Vérifier l'authentification
  if (!isLoggedIn && !isPublicRoute) {
    console.log(`🚫 Page non autorisée: ${pathname} - redirection vers login`);
    const loginUrl = new URL('/auth/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
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