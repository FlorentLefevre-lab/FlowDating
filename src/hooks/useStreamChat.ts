// =====================================================
// src/hooks/useStreamChat.ts - VERSION CORRIGÉE
// =====================================================
import { useEffect, useState, useRef } from 'react'
import { StreamChat } from 'stream-chat'
import { useSession } from 'next-auth/react'
import { streamChatManager } from '@/lib/streamChatClient'

export function useStreamChat() {
  const { data: session, status } = useSession()
  const [client, setClient] = useState<StreamChat | null>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let reconnectTimeout: NodeJS.Timeout | null = null

    const initializeChat = async () => {
      // Si pas authentifié, nettoyer et sortir
      if (status === 'unauthenticated' || !session?.user?.id) {
        if (mounted) {
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
        // ✅ Vérifier mounted avant setState
        if (mounted) {
          setError(null)
        }
        
        // Obtenir le token
        const response = await fetch('/api/chat/stream/token')
        if (!response.ok) {
          throw new Error('Failed to get token')
        }
        
        const { token } = await response.json()
        
        // Se connecter via le manager
        const streamClient = await streamChatManager.getClient(
          session.user.id,
          {
            id: session.user.id,
            name: session.user.name || 'Anonymous',
            image: session.user.image || '/default-avatar.png',
            email: session.user.email,
          },
          token
        )

        // ✅ Vérifier mounted avant setState
        if (mounted && streamClient) {
          console.log('🟢 Client Stream connecté pour:', session.user.id)
          setClient(streamClient)
          setIsConnecting(false)
          
          // ✅ Sync async sans bloquer
          streamChatManager.syncPresence().catch(console.error)
        }
      } catch (error) {
        console.error('❌ Erreur initialisation Stream Chat:', error)
        // ✅ Vérifier mounted avant setState
        if (mounted) {
          setIsConnecting(false)
          setError('Erreur de connexion au chat')
          
          // Réessayer après 5 secondes
          reconnectTimeout = setTimeout(() => {
            if (mounted) {
              console.log('🔄 Tentative de reconnexion...')
              initializeChat()
            }
          }, 5000)
        }
      }
    }

    // Lancer l'initialisation
    initializeChat()

    // Gérer la déconnexion proprement
    return () => {
      mounted = false
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      
      // Note: On ne déconnecte pas ici car le manager gère la connexion
      // La déconnexion se fait quand l'utilisateur se déconnecte de l'app
    }
  }, [session, status])

  // Déconnecter quand l'utilisateur se déconnecte
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔄 Déconnexion de Stream Chat...')
      streamChatManager.disconnect()
    }
  }, [status])

  // ✅ Gérer la visibilité de la page avec debouncing
  useEffect(() => {
    if (!client) return

    let visibilityTimeout: NodeJS.Timeout | null = null

    const handleVisibilityChange = async () => {
      if (!document.hidden && client) {
        // ✅ Debounce pour éviter les appels répétés
        if (visibilityTimeout) clearTimeout(visibilityTimeout)
        visibilityTimeout = setTimeout(async () => {
          try {
            console.log('👁 Page redevenue visible, synchronisation...')
            await streamChatManager.syncPresence()
          } catch (error) {
            console.error('❌ Erreur sync visibilité:', error)
          }
        }, 1000)
      }
    }

    const handleFocus = async () => {
      if (client) {
        // ✅ Debounce pour éviter les appels répétés
        if (visibilityTimeout) clearTimeout(visibilityTimeout)
        visibilityTimeout = setTimeout(async () => {
          try {
            console.log('🎯 Fenêtre focalisée, synchronisation...')
            await streamChatManager.syncPresence()
          } catch (error) {
            console.error('❌ Erreur sync focus:', error)
          }
        }, 1000)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      // ✅ Nettoyer le timeout
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout)
      }
    }
  }, [client])

  // Exposer des méthodes utiles
  const refresh = async () => {
    if (client) {
      try {
        await streamChatManager.syncPresence()
      } catch (error) {
        console.error('❌ Erreur refresh:', error)
      }
    }
  }

  const getDebugInfo = () => {
    return streamChatManager.getDebugInfo()
  }

  return { 
    client, 
    isConnecting, 
    error,
    refresh,
    getDebugInfo,
    isConnected: streamChatManager.isConnected()
  }
}