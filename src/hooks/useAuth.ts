'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth(redirectTo = '/auth/login') {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Encore en chargement

    if (!session) {
      router.push(redirectTo)
    }
  }, [session, status, router, redirectTo])

  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    user: session?.user,
  }
}

// Hook pour les pages qui nécessitent d'être déconnecté
export function useGuestOnly(redirectTo = '/profile') {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (session) {
      router.push(redirectTo)
    }
  }, [session, status, router, redirectTo])

  return {
    session,
    status,
    isLoading: status === 'loading',
  }
}