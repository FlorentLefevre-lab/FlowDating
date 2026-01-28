// =====================================================
// src/hooks/useStreamChat.ts - VERSION CORRIGÉE
// =====================================================
import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react'
import { StreamChat } from 'stream-chat'
import { useSession } from 'next-auth/react'
import { streamChatManager } from '@/lib/streamChatClient'

// Types
interface ConnectionState {
  isConnected: boolean
  isConnecting: boolean
  connectionId: string | null
  lastError: Error | null
  retryCount: number
}

interface UseStreamChatReturn {
  client: StreamChat | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  refresh: () => Promise<void>
  getDebugInfo: () => ReturnType<typeof streamChatManager.getDebugInfo>
}

/**
 * Hook principal pour utiliser Stream Chat
 * Gère la connexion, la déconnexion et l'état
 */
export function useStreamChat(): UseStreamChatReturn {
  const { data: session, status } = useSession()
  const [client, setClient] = useState<StreamChat | null>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Initialisation du chat
  useEffect(() => {
    mountedRef.current = true

    const initializeChat = async () => {
      // Si pas authentifié, nettoyer et sortir
      if (status === 'unauthenticated' || !session?.user?.id) {
        if (mountedRef.current) {
          setClient(null)
          setIsConnecting(false)
          setError(null)
        }
        return
      }

      // Si en cours de chargement de la session, attendre
      if (status === 'loading') {
        return
      }

      try {
        if (mountedRef.current) {
          setError(null)
          setIsConnecting(true)
        }

        // Obtenir le token
        const response = await fetch('/api/chat/stream/token')
        if (!response.ok) {
          throw new Error('Impossible d\'obtenir le token de chat')
        }

        const { token } = await response.json()

        // Se connecter via le manager (gère les retries automatiquement)
        const streamClient = await streamChatManager.getClient(
          session.user.id,
          {
            id: session.user.id,
            name: session.user.name || 'Utilisateur',
            image: session.user.image || undefined,
            email: session.user.email || undefined,
          },
          token
        )

        if (mountedRef.current && streamClient) {
          console.log('✅ [useStreamChat] Client connecté')
          setClient(streamClient)
          setIsConnecting(false)
        }
      } catch (err) {
        console.error('❌ [useStreamChat] Erreur:', err)
        if (mountedRef.current) {
          setIsConnecting(false)
          setError(err instanceof Error ? err.message : 'Erreur de connexion au chat')
        }
      }
    }

    initializeChat()

    return () => {
      mountedRef.current = false
    }
  }, [session, status])

  // Déconnecter quand l'utilisateur se déconnecte
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔄 [useStreamChat] Déconnexion...')
      streamChatManager.disconnect()
      setClient(null)
    }
  }, [status])

  // S'abonner aux changements d'état de connexion
  useEffect(() => {
    const unsubscribe = streamChatManager.subscribeToConnectionState((state: ConnectionState) => {
      if (mountedRef.current) {
        if (state.lastError) {
          setError(state.lastError.message)
        }
      }
    })

    return unsubscribe
  }, [])

  // Gérer la visibilité de la page (sync quand on revient)
  useEffect(() => {
    if (!client) return

    let debounceTimeout: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (!document.hidden && client) {
        // Debounce pour éviter les appels répétés
        if (debounceTimeout) clearTimeout(debounceTimeout)
        debounceTimeout = setTimeout(() => {
          streamChatManager.refreshUnreadCount().catch(console.error)
        }, 1000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (debounceTimeout) clearTimeout(debounceTimeout)
    }
  }, [client])

  // Fonction de refresh manuel
  const refresh = useCallback(async () => {
    if (client) {
      try {
        await streamChatManager.refreshUnreadCount()
      } catch (err) {
        console.error('❌ [useStreamChat] Erreur refresh:', err)
      }
    }
  }, [client])

  // Debug info
  const getDebugInfo = useCallback(() => {
    return streamChatManager.getDebugInfo()
  }, [])

  return {
    client,
    isConnecting,
    isConnected: streamChatManager.isConnected(),
    error,
    refresh,
    getDebugInfo,
  }
}

/**
 * Hook pour obtenir le nombre de messages non-lus
 * Utilise useSyncExternalStore pour une synchronisation optimale avec React
 */
export function useUnreadCount(): number {
  // Utiliser useSyncExternalStore pour une meilleure intégration React 18+
  const subscribe = useCallback((callback: () => void) => {
    return streamChatManager.subscribeToUnreadCount(() => {
      callback()
    })
  }, [])

  const getSnapshot = useCallback(() => {
    return streamChatManager.getUnreadCount()
  }, [])

  const getServerSnapshot = useCallback(() => {
    return 0 // Côté serveur, toujours 0
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Hook pour obtenir l'état de connexion
 */
export function useStreamConnectionState() {
  const [connectionState, setConnectionState] = useState(() =>
    streamChatManager.getConnectionState()
  )

  useEffect(() => {
    const unsubscribe = streamChatManager.subscribeToConnectionState(setConnectionState)
    return unsubscribe
  }, [])

  return connectionState
}

/**
 * Hook pour rafraîchir le compteur de non-lus manuellement
 */
export function useRefreshUnreadCount() {
  return useCallback(async () => {
    await streamChatManager.refreshUnreadCount()
  }, [])
}
