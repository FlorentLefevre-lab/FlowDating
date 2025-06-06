'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface AuthGuardProps {
  children: ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Attendre le chargement

    if (requireAuth && status === 'unauthenticated') {
      console.log('🚫 Accès refusé - redirection vers:', redirectTo)
      router.push(redirectTo)
      return
    }

    if (!requireAuth && status === 'authenticated') {
      console.log('✅ Utilisateur connecté - redirection vers /profile')
      router.push('/profile')
      return
    }
  }, [session, status, router, requireAuth, redirectTo])

  // Afficher un loader pendant la vérification
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💖</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  // Si l'authentification est requise mais l'utilisateur n'est pas connecté
  if (requireAuth && status === 'unauthenticated') {
    return null // La redirection est en cours
  }

  // Si l'authentification n'est pas requise mais l'utilisateur est connecté
  if (!requireAuth && status === 'authenticated') {
    return null // La redirection est en cours
  }

  // Afficher le contenu si les conditions sont remplies
  return <>{children}</>
}