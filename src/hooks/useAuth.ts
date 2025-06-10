// src/hooks/useAuth.ts
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function useAuth(requireAuth: boolean = true) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Chargement en cours

    if (requireAuth && !session) {
      router.push('/auth/login')
    } else if (!requireAuth && session) {
      router.push('/dashboard')
    }
  }, [session, status, requireAuth, router])

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    user: session?.user
  }
}