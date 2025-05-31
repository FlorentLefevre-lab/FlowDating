import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Logique supplémentaire si nécessaire
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Définir quelles routes nécessitent une authentification
        const { pathname } = req.nextUrl
        
        // Routes publiques
        if (pathname.startsWith('/auth/') || 
            pathname === '/' || 
            pathname.startsWith('/api/auth/')) {
          return true
        }
        
        // Routes protégées nécessitent un token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Correspond à tous les chemins sauf :
     * - api/auth (routes d'authentification)
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'image)
     * - favicon.ico (favicon)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}