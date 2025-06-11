// src/middleware.ts - Version optimisée
import { auth } from "./auth";
import { NextResponse } from "next/server";

// 🚀 CACHE POUR ÉVITER LES RECALCULS
const routeCache = new Map<string, 'protected' | 'public' | 'api-protected' | 'static'>();

function getRouteType(pathname: string): 'protected' | 'public' | 'api-protected' | 'static' {
  // Vérifier le cache d'abord
  if (routeCache.has(pathname)) {
    return routeCache.get(pathname)!;
  }

  let routeType: 'protected' | 'public' | 'api-protected' | 'static';

  // Fichiers statiques
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api/auth') ||
      pathname.includes('.') ||
      pathname.startsWith('/favicon')) {
    routeType = 'static';
  }
  // Routes API protégées
  else if (['/api/profile', '/api/matches', '/api/chat', '/api/user', '/api/discover'].some(route => pathname.startsWith(route))) {
    routeType = 'api-protected';
  }
  // Routes protégées
  else if (['/home', '/profile', '/dashboard', '/matches', '/discover', '/chat', '/settings', '/messages', '/premium'].some(route => pathname.startsWith(route))) {
    routeType = 'protected';
  }
  // Routes publiques
  else if (['/auth/login', '/auth/register', '/auth/error', '/auth/verify-email', '/'].some(route => pathname === route || pathname.startsWith(route))) {
    routeType = 'public';
  }
  // Défaut
  else {
    routeType = 'protected'; // Par sécurité, toute nouvelle route est protégée par défaut
  }

  // Mettre en cache (limiter la taille du cache)
  if (routeCache.size < 100) {
    routeCache.set(pathname, routeType);
  }

  return routeType;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const routeType = getRouteType(pathname);

  // Headers de sécurité communs
  const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
  };

  // 🚀 GESTION OPTIMISÉE PAR TYPE DE ROUTE
  switch (routeType) {
    case 'static':
      return NextResponse.next();

    case 'api-protected':
      if (!isLoggedIn) {
        console.log(`🚫 API non autorisée: ${pathname}`);
        return NextResponse.json(
          { error: 'Non autorisé', code: 'UNAUTHORIZED', timestamp: Date.now() },
          { status: 401, headers: securityHeaders }
        );
      }
      // 🔐 Ajouter l'user ID dans les headers pour les APIs
      const response = NextResponse.next();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      response.headers.set('X-User-ID', req.auth?.user?.id || '');
      return response;

    case 'protected':
      if (!isLoggedIn) {
        const loginUrl = new URL('/auth/login', req.nextUrl.origin);
        loginUrl.searchParams.set('callbackUrl', pathname);
        console.log(`🚫 Accès refusé à ${pathname}`);
        return NextResponse.redirect(loginUrl);
      }
      
      // 🏠 Gestion spéciale pour la route racine
      if (pathname === '/') {
        console.log(`🏠 Redirection racine vers /home`);
        return NextResponse.redirect(new URL('/home', req.nextUrl.origin));
      }
      
      const protectedResponse = NextResponse.next();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        protectedResponse.headers.set(key, value);
      });
      return protectedResponse;

    case 'public':
      // 🔄 Éviter l'accès aux pages d'auth si déjà connecté
      if (isLoggedIn && pathname.startsWith('/auth/') && 
          !['error', 'logout', 'email-required'].some(route => pathname.includes(route))) {
        console.log(`🏠 Redirection depuis ${pathname} vers /home`);
        return NextResponse.redirect(new URL('/home', req.nextUrl.origin));
      }
      
      // Gestion spéciale de la racine pour les non-connectés
      if (pathname === '/' && !isLoggedIn) {
        console.log(`🏠 Accès autorisé à la page publique`);
        return NextResponse.next();
      }
      
      return NextResponse.next();

    default:
      // Route inconnue - protection par défaut
      if (!isLoggedIn) {
        const loginUrl = new URL('/auth/login', req.nextUrl.origin);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
  }
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)'],
};