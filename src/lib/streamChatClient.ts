// =====================================================
// src/lib/streamChatClient.ts - VERSION CORRIGÉE ET CONSOLIDÉE
// =====================================================
import { StreamChat, Event, Channel } from 'stream-chat'

// Types pour une meilleure sécurité
interface StreamUserData {
  id: string
  name: string
  image?: string
  email?: string
}

interface ConnectionState {
  isConnected: boolean
  isConnecting: boolean
  connectionId: string | null
  lastError: Error | null
  retryCount: number
}

type UnreadCountListener = (count: number) => void
type ConnectionListener = (state: ConnectionState) => void

// Configuration du retry avec backoff exponentiel
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000,     // 1 seconde
  maxDelay: 30000,     // 30 secondes max
  multiplier: 2,
}

/**
 * Manager singleton pour Stream Chat
 * Gère une seule instance client, la connexion, les événements et le compteur de non-lus
 */
export class StreamChatManager {
  private client: StreamChat | null = null
  private currentUserId: string | null = null
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    connectionId: null,
    lastError: null,
    retryCount: 0,
  }

  // Listeners pour le compteur de non-lus
  private unreadCountListeners: Set<UnreadCountListener> = new Set()
  private connectionListeners: Set<ConnectionListener> = new Set()
  private totalUnreadCount: number = 0

  // Event handlers pour le nettoyage
  private eventHandlers: Map<string, (event: Event) => void> = new Map()

  // Flag pour éviter les connexions multiples
  private connectionPromise: Promise<StreamChat | null> | null = null

  /**
   * Obtient ou crée le client Stream Chat
   * Utilise le pattern singleton pour éviter les instances multiples
   */
  async getClient(
    userId: string,
    userData: StreamUserData,
    token: string
  ): Promise<StreamChat | null> {
    // Si une connexion est déjà en cours, attendre
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    // Si on a déjà un client connecté pour cet utilisateur, le retourner
    if (this.client && this.currentUserId === userId && this.connectionState.isConnected) {
      console.log(`✅ [StreamChat] Client existant pour: ${userId}`)
      return this.client
    }

    // Démarrer une nouvelle connexion
    this.connectionPromise = this.connect(userId, userData, token)

    try {
      const client = await this.connectionPromise
      return client
    } finally {
      this.connectionPromise = null
    }
  }

  /**
   * Connexion avec gestion d'erreurs et retry automatique
   */
  private async connect(
    userId: string,
    userData: StreamUserData,
    token: string
  ): Promise<StreamChat | null> {
    this.updateConnectionState({ isConnecting: true, lastError: null })

    try {
      // Si on a un client existant pour un autre utilisateur, déconnecter d'abord
      if (this.client && this.currentUserId && this.currentUserId !== userId) {
        console.log(`🔄 [StreamChat] Changement d'utilisateur, déconnexion...`)
        await this.disconnect()
      }

      // Créer le client si nécessaire (singleton)
      if (!this.client) {
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
        if (!apiKey) {
          throw new Error('NEXT_PUBLIC_STREAM_API_KEY non configuré')
        }
        this.client = StreamChat.getInstance(apiKey)
        console.log(`✅ [StreamChat] Client créé`)
      }

      // Connecter l'utilisateur
      console.log(`🔄 [StreamChat] Connexion pour: ${userId}`)

      await this.client.connectUser(
        {
          id: userData.id,
          name: userData.name || 'Utilisateur',
          image: userData.image,
        },
        token
      )

      this.currentUserId = userId
      this.updateConnectionState({
        isConnected: true,
        isConnecting: false,
        connectionId: (this.client as any).wsConnection?.connectionID || null,
        retryCount: 0,
      })

      console.log(`✅ [StreamChat] Connecté: ${userId}`)

      // Configurer les event listeners
      this.setupEventListeners()

      // Calculer le compte initial des non-lus
      await this.refreshUnreadCount()

      return this.client
    } catch (error) {
      console.error(`❌ [StreamChat] Erreur de connexion:`, error)

      const err = error instanceof Error ? error : new Error(String(error))
      this.updateConnectionState({
        isConnecting: false,
        isConnected: false,
        lastError: err,
      })

      // Retry avec backoff exponentiel
      if (this.connectionState.retryCount < RETRY_CONFIG.maxRetries) {
        const delay = this.calculateRetryDelay()
        console.log(`🔄 [StreamChat] Retry dans ${delay}ms (tentative ${this.connectionState.retryCount + 1}/${RETRY_CONFIG.maxRetries})`)

        this.updateConnectionState({ retryCount: this.connectionState.retryCount + 1 })

        await new Promise(resolve => setTimeout(resolve, delay))
        return this.connect(userId, userData, token)
      }

      return null
    }
  }

  /**
   * Calcule le délai de retry avec backoff exponentiel
   */
  private calculateRetryDelay(): number {
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.multiplier, this.connectionState.retryCount),
      RETRY_CONFIG.maxDelay
    )
    // Ajouter un peu de jitter pour éviter les tempêtes de reconnexion
    return delay + Math.random() * 1000
  }

  /**
   * Configure les event listeners pour le temps réel
   * IMPORTANT: Utilise les événements WebSocket natifs au lieu du polling
   */
  private setupEventListeners(): void {
    if (!this.client) return

    // Nettoyer les anciens listeners
    this.cleanupEventListeners()

    // Handler pour les nouveaux messages -> met à jour le compteur de non-lus
    const handleNewMessage = (event: Event) => {
      if (event.user?.id !== this.currentUserId) {
        // Nouveau message d'un autre utilisateur -> incrémenter le compteur
        this.totalUnreadCount++
        this.notifyUnreadCountListeners()
      }
    }
    this.client.on('message.new', handleNewMessage)
    this.eventHandlers.set('message.new', handleNewMessage)

    // Handler pour les messages lus -> recalculer le compteur
    const handleMessageRead = () => {
      this.refreshUnreadCount()
    }
    this.client.on('message.read', handleMessageRead)
    this.eventHandlers.set('message.read', handleMessageRead)

    // Handler pour la notification d'ajout à un channel
    const handleAddedToChannel = () => {
      this.refreshUnreadCount()
    }
    this.client.on('notification.added_to_channel', handleAddedToChannel)
    this.eventHandlers.set('notification.added_to_channel', handleAddedToChannel)

    // Handler pour la notification de nouveau message (channels non watchés)
    const handleNotificationNewMessage = () => {
      this.refreshUnreadCount()
    }
    this.client.on('notification.message_new', handleNotificationNewMessage)
    this.eventHandlers.set('notification.message_new', handleNotificationNewMessage)

    // Handler pour les changements de connexion
    const handleConnectionChanged = (event: Event) => {
      const isOnline = event.online ?? false
      this.updateConnectionState({
        isConnected: isOnline,
        connectionId: (this.client as any)?.wsConnection?.connectionID || null,
      })

      if (isOnline) {
        // Reconnecter -> rafraîchir le compteur
        this.refreshUnreadCount()
      }
    }
    this.client.on('connection.changed', handleConnectionChanged)
    this.eventHandlers.set('connection.changed', handleConnectionChanged)

    // Handler pour la récupération de connexion
    const handleConnectionRecovered = () => {
      console.log(`✅ [StreamChat] Connexion récupérée`)
      this.updateConnectionState({ isConnected: true })
      this.refreshUnreadCount()
    }
    this.client.on('connection.recovered', handleConnectionRecovered)
    this.eventHandlers.set('connection.recovered', handleConnectionRecovered)

    console.log(`✅ [StreamChat] Event listeners configurés`)
  }

  /**
   * Nettoie les event listeners pour éviter les fuites mémoire
   */
  private cleanupEventListeners(): void {
    if (!this.client) return

    this.eventHandlers.forEach((handler, eventType) => {
      this.client?.off(eventType as any, handler)
    })
    this.eventHandlers.clear()

    console.log(`🧹 [StreamChat] Event listeners nettoyés`)
  }

  /**
   * Met à jour l'état de connexion et notifie les listeners
   */
  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates }
    this.notifyConnectionListeners()
  }

  /**
   * Rafraîchit le compteur de messages non-lus
   * Utilise l'API Stream optimisée au lieu de queryChannels
   */
  async refreshUnreadCount(): Promise<void> {
    if (!this.client || !this.currentUserId) return

    try {
      // Utiliser la méthode native de Stream pour obtenir le total des non-lus
      const channels = await this.client.queryChannels(
        {
          type: 'messaging',
          members: { $in: [this.currentUserId] }
        },
        { last_message_at: -1 },
        {
          watch: false,  // Ne pas watcher, juste compter
          state: true,   // Inclure l'état pour countUnread
          limit: 100     // Suffisant pour la plupart des cas
        }
      )

      // Calculer le total des non-lus
      let totalUnread = 0
      for (const channel of channels) {
        totalUnread += channel.countUnread()
      }

      if (this.totalUnreadCount !== totalUnread) {
        this.totalUnreadCount = totalUnread
        this.notifyUnreadCountListeners()
      }
    } catch (error) {
      console.error(`❌ [StreamChat] Erreur refresh unread count:`, error)
    }
  }

  /**
   * Notifie tous les listeners du compteur de non-lus
   */
  private notifyUnreadCountListeners(): void {
    this.unreadCountListeners.forEach(listener => {
      try {
        listener(this.totalUnreadCount)
      } catch (error) {
        console.error(`❌ [StreamChat] Erreur listener unread:`, error)
      }
    })
  }

  /**
   * Notifie tous les listeners de l'état de connexion
   */
  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(this.connectionState)
      } catch (error) {
        console.error(`❌ [StreamChat] Erreur listener connection:`, error)
      }
    })
  }

  /**
   * S'abonne aux changements du compteur de non-lus
   * Retourne une fonction de désabonnement
   */
  subscribeToUnreadCount(listener: UnreadCountListener): () => void {
    this.unreadCountListeners.add(listener)
    // Appeler immédiatement avec la valeur actuelle
    listener(this.totalUnreadCount)

    return () => {
      this.unreadCountListeners.delete(listener)
    }
  }

  /**
   * S'abonne aux changements d'état de connexion
   * Retourne une fonction de désabonnement
   */
  subscribeToConnectionState(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener)
    // Appeler immédiatement avec la valeur actuelle
    listener(this.connectionState)

    return () => {
      this.connectionListeners.delete(listener)
    }
  }

  /**
   * Obtient le compteur actuel de non-lus
   */
  getUnreadCount(): number {
    return this.totalUnreadCount
  }

  /**
   * Déconnexion propre
   */
  async disconnect(): Promise<void> {
    console.log(`🔄 [StreamChat] Déconnexion...`)

    // Nettoyer les event listeners AVANT la déconnexion
    this.cleanupEventListeners()

    // Déconnecter l'utilisateur
    if (this.client && this.currentUserId) {
      try {
        await this.client.disconnectUser()
        console.log(`✅ [StreamChat] Déconnecté: ${this.currentUserId}`)
      } catch (error) {
        console.error(`❌ [StreamChat] Erreur déconnexion:`, error)
      }
    }

    // Réinitialiser l'état
    this.currentUserId = null
    this.totalUnreadCount = 0
    this.updateConnectionState({
      isConnected: false,
      isConnecting: false,
      connectionId: null,
      retryCount: 0,
    })

    // Notifier les listeners
    this.notifyUnreadCountListeners()
  }

  /**
   * Vérifie si le client est connecté
   */
  isConnected(): boolean {
    return this.connectionState.isConnected && !!this.client?.user
  }

  /**
   * Obtient l'ID de l'utilisateur courant
   */
  getCurrentUserId(): string | null {
    return this.currentUserId
  }

  /**
   * Obtient l'instance du client (pour les composants qui en ont besoin)
   */
  getClientInstance(): StreamChat | null {
    return this.client
  }

  /**
   * Obtient l'état de connexion
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  /**
   * Synchronise la présence (appelé manuellement si nécessaire)
   * Note: Avec les événements WebSocket, ce n'est plus nécessaire en polling
   */
  async syncPresence(): Promise<void> {
    if (!this.client || !this.currentUserId) return

    try {
      // Simplement actualiser les channels watchés pour maintenir la connexion
      await this.client.queryChannels(
        {
          type: 'messaging',
          members: { $in: [this.currentUserId] }
        },
        { last_message_at: -1 },
        {
          watch: true,
          presence: true,
          limit: 1
        }
      )
    } catch (error) {
      console.error(`❌ [StreamChat] Erreur sync présence:`, error)
    }
  }

  /**
   * Informations de debug
   */
  getDebugInfo() {
    return {
      hasClient: !!this.client,
      currentUserId: this.currentUserId,
      connectionState: this.connectionState,
      unreadCount: this.totalUnreadCount,
      eventHandlersCount: this.eventHandlers.size,
      unreadListenersCount: this.unreadCountListeners.size,
      connectionListenersCount: this.connectionListeners.size,
    }
  }
}

// Export du singleton
export const streamChatManager = new StreamChatManager()

// Export de fonctions utilitaires pour le serveur
export function getServerStreamClient(): StreamChat {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
  const apiSecret = process.env.STREAM_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('Configuration Stream manquante (NEXT_PUBLIC_STREAM_API_KEY ou STREAM_API_SECRET)')
  }

  return StreamChat.getInstance(apiKey, apiSecret)
}

export async function createStreamToken(userId: string): Promise<string> {
  const serverClient = getServerStreamClient()
  return serverClient.createToken(userId)
}
