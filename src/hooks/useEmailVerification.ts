'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useEmailVerification() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    console.log('🛡️ Hook de protection exécuté')
    console.log('Status:', status)
    console.log('Session:', !!session)
    
    if (session) {
      console.log('Email:', session.user?.email)
      console.log('Email vérifié:', !!session.user?.emailVerified)
    }

    // Attendre que la session soit chargée
    if (status === 'loading') {
      console.log('⏳ Chargement de la session...')
      return
    }

    // Si pas connecté, rediriger vers login
    if (!session) {
      console.log('❌ Non connecté, redirection vers login')
      router.push('/auth/login')
      return
    }

    // Vérifier si l'email est vérifié
    if (!session.user.emailVerified) {
      console.log('⚠️ Email non vérifié, redirection vers /auth/email-required')
      router.push('/auth/email-required')
      return
    }

    console.log('✅ Email vérifié, accès autorisé')
  }, [session, status, router])

  return {
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    isVerified: !!session?.user?.emailVerified,
    session,
    user: session?.user
  }
}

// Hook pour les pages qui nécessitent seulement d'être connecté (sans vérification email)
export function useAuthOnly() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      console.log('❌ Non connecté, redirection vers login')
      router.push('/auth/login')
    }
  }, [session, status, router])

  return {
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    session,
    user: session?.user
  }
}