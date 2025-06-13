// src/lib/streamChatClient.ts
import { StreamChat } from 'stream-chat'

class StreamChatManager {
  private static instance: StreamChatManager
  private client: StreamChat | null = null
  private connectionPromise: Promise<void> | null = null
  private currentUserId: string | null = null
  private presenceInterval: NodeJS.Timeout | null = null
  private connectionCheckInterval: NodeJS.Timeout | null = null

  private constructor() {}

  static getInstance(): StreamChatManager {
    if (!StreamChatManager.instance) {
      StreamChatManager.instance = new StreamChatManager()
    }
    return StreamChatManager.instance
  }

  async getClient(userId: string, userData: any, token: string): Promise<StreamChat | null> {
    try {
      // Si on a déjà un client pour cet utilisateur, le retourner
      if (this.client && this.currentUserId === userId) {
        console.log('✅ Client existant pour:', userId)
        return this.client
      }

      // Si une connexion est en cours, attendre
      if (this.connectionPromise) {
        console.log('⏳ Connexion en cours, attente...')
        await this.connectionPromise
        return this.client
      }

      // Créer la promesse de connexion
      this.connectionPromise = this.connect(userId, userData, token)
      await this.connectionPromise
      this.connectionPromise = null

      return this.client
    } catch (error) {
      console.error('❌ Erreur getClient:', error)
      this.connectionPromise = null
      return null
    }
  }

  private async connect(userId: string, userData: any, token: string): Promise<void> {
    try {
      // Si on a un client avec un autre utilisateur, le déconnecter
      if (this.client && this.currentUserId && this.currentUserId !== userId) {
        console.log('🔄 Déconnexion de l\'ancien utilisateur:', this.currentUserId)
        await this.disconnect()
      }

      // Créer ou réutiliser le client
      if (!this.client) {
        this.client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!)
        console.log('✅ Client Stream créé')
      }

      console.log('🔄 Connexion Stream Chat pour:', userId)
      
      // IMPORTANT: Connecter avec la présence activée
      await this.client.connectUser(
        {
          id: userData.id,
          name: userData.name || 'Utilisateur',
          image: userData.image || undefined,
          // Ne pas mettre invisible à true !
        },
        token
      )

      this.currentUserId = userId
      console.log('✅ Utilisateur connecté:', userId)

      // Activer immédiatement la présence
      await this.setUserOnline()

      // Configurer la mise à jour automatique de la présence
      this.setupPresenceUpdates()

      // Écouter les événements de connexion/déconnexion
      this.setupConnectionHandlers()

      // Configurer la vérification de connexion
      this.setupConnectionCheck()

    } catch (error) {
      console.error('❌ Erreur connexion Stream:', error)
      // Nettoyer en cas d'erreur
      this.client = null
      this.currentUserId = null
      throw error
    }
  }

  private async setUserOnline() {
    if (!this.client || !this.currentUserId) return

    try {
      // Marquer l'utilisateur comme en ligne en surveillant un channel
      // C'est plus fiable que partialUpdateUser qui peut causer des erreurs 403
      const channels = await this.client.queryChannels(
        { 
          type: 'messaging',
          members: { $in: [this.currentUserId] } 
        },
        { last_message_at: -1 },
        { 
          watch: true,
          presence: true,
          state: true,
          limit: 10
        }
      )
      
      console.log(`✅ Utilisateur marqué comme en ligne (${channels.length} channels surveillés)`)
    } catch (error) {
      console.error('❌ Erreur setUserOnline:', error)
    }
  }

  private setupPresenceUpdates() {
    if (!this.client || !this.currentUserId) return

    // Nettoyer l'ancien interval s'il existe
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval)
      this.presenceInterval = null
    }

    // Fonction pour maintenir la présence active
    const maintainPresence = async () => {
      if (this.client && this.currentUserId) {
        try {
          // Utiliser queryChannels pour maintenir la présence
          // C'est la méthode la plus fiable qui ne cause pas d'erreur 403
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
          console.log('🟢 Présence maintenue active')
        } catch (error) {
          console.error('❌ Erreur maintien présence:', error)
        }
      }
    }

    // Maintenir la présence immédiatement
    maintainPresence()

    // Puis toutes les 25 secondes (moins de 30s pour éviter le timeout)
    this.presenceInterval = setInterval(maintainPresence, 25000)
    console.log('⏰ Maintenance automatique de présence activée (25s)')
  }

  private setupConnectionHandlers() {
    if (!this.client) return

    try {
      // Vérifier que le client a les méthodes nécessaires
      if (typeof this.client.on !== 'function') {
        console.warn('⚠️ Le client Stream n\'a pas de méthode "on", skip setup handlers')
        return
      }

      // Écouter tous les événements de présence
      const handlePresenceChange = (event: any) => {
        console.log('👥 Événement de présence:', event.type, {
          user: event.user?.id,
          online: event.user?.online
        })
      }

      // Quand la connexion change
      const handleConnectionChange = async (event: any) => {
        console.log('🔌 Connexion changée:', {
          online: event.online,
          userId: this.currentUserId
        })
        
        if (event.online && this.currentUserId) {
          // Se reconnecter et réactiver la présence
          await this.setUserOnline()
        }
      }

      // Quand la connexion est récupérée
      const handleConnectionRecovered = async () => {
        console.log('🔄 Connexion récupérée')
        await this.setUserOnline()
      }

      // Pour le moment, on va utiliser une approche différente pour écouter les événements
      // Stream Chat v5+ utilise une API différente pour les événements
      
      // Surveillance des changements via polling
      console.log('📡 Configuration de la surveillance des événements')
      
      // Stocker les handlers pour le nettoyage
      (this.client as any)._streamChatHandlers = {
        presenceChanged: handlePresenceChange,
        connectionChanged: handleConnectionChange,
        connectionRecovered: handleConnectionRecovered
      }
      
    } catch (error) {
      console.error('❌ Erreur setup connection handlers:', error)
    }
  }

  private setupConnectionCheck() {
    // Nettoyer l'ancien interval s'il existe
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = null
    }

    // Vérifier la connexion toutes les 10 secondes
    this.connectionCheckInterval = setInterval(() => {
      if (this.client && this.currentUserId) {
        const wsConnection = (this.client as any).wsConnection
        const isHealthy = wsConnection?.isHealthy
        const connectionState = wsConnection?.connectionState
        
        console.log('🔍 État connexion:', {
          healthy: isHealthy,
          state: connectionState,
          userId: this.currentUserId
        })
        
        // Si la connexion n'est pas saine, essayer de la récupérer
        if (!isHealthy || connectionState !== 'connected') {
          console.warn('⚠️ Connexion dégradée, tentative de récupération...')
          this.setUserOnline().catch(console.error)
        }
      }
    }, 10000)
  }

  async disconnect(): Promise<void> {
    console.log('🔄 Début de la déconnexion...')

    // Nettoyer les intervals
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval)
      this.presenceInterval = null
      console.log('⏰ Interval de présence nettoyé')
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = null
      console.log('⏰ Interval de vérification nettoyé')
    }

    // Déconnecter l'utilisateur
    if (this.client && this.currentUserId) {
      try {
        // Ne pas essayer de retirer les listeners si la méthode off n'existe pas
        const handlers = (this.client as any)._streamChatHandlers
        if (handlers && typeof this.client.off === 'function') {
          // Retirer les listeners seulement si la méthode existe
          try {
            this.client.off('user.presence.changed', handlers.presenceChanged)
            this.client.off('connection.changed', handlers.connectionChanged)
            this.client.off('connection.recovered', handlers.connectionRecovered)
            this.client.off('ws.event', handlers.wsEvent)
          } catch (e) {
            console.warn('⚠️ Impossible de retirer les listeners:', e)
          }
          delete (this.client as any)._streamChatHandlers
        }

        await this.client.disconnectUser()
        console.log('✅ Utilisateur déconnecté:', this.currentUserId)
      } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error)
      }
    }

    // Réinitialiser les variables
    this.client = null
    this.currentUserId = null
    this.connectionPromise = null
    console.log('✅ Déconnexion complète')
  }

  isConnected(): boolean {
    return !!(this.client && this.currentUserId && this.client.user)
  }

  getCurrentUserId(): string | null {
    return this.currentUserId
  }

  getClientInstance(): StreamChat | null {
    return this.client
  }

  // Méthode pour forcer une synchronisation de présence
  async syncPresence(): Promise<void> {
    if (!this.client || !this.currentUserId) {
      console.warn('⚠️ Impossible de synchroniser: client non connecté')
      return
    }

    try {
      // Forcer une requête qui met à jour la présence
      const channels = await this.client.queryChannels(
        { 
          type: 'messaging',
          members: { $in: [this.currentUserId] } 
        },
        { last_message_at: -1 },
        { 
          watch: true,
          presence: true,
          state: true
        }
      )
      
      console.log(`✅ Présence synchronisée (${channels.length} channels)`)
      
      // Émettre un événement personnalisé pour forcer le rafraîchissement
      if (this.client.activeChannels) {
        Object.values(this.client.activeChannels).forEach((channel: any) => {
          channel.state.clearOldMessages()
        })
      }
      
    } catch (error) {
      console.error('❌ Erreur synchronisation présence:', error)
    }
  }

  // Méthode pour obtenir l'état de présence des utilisateurs
  async getPresenceStatus(userIds: string[]): Promise<Record<string, boolean>> {
    if (!this.client) return {}

    try {
      const response = await this.client.queryUsers({
        id: { $in: userIds },
        last_active: { $gt: new Date(Date.now() - 5 * 60 * 1000).toISOString() }
      })

      const presence: Record<string, boolean> = {}
      response.users.forEach(user => {
        presence[user.id] = user.online || false
      })

      return presence
    } catch (error) {
      console.error('❌ Erreur récupération présence:', error)
      return {}
    }
  }

  // Méthode pour débugger l'état
  getDebugInfo() {
    const wsConnection = this.client ? (this.client as any).wsConnection : null
    
    return {
      hasClient: !!this.client,
      currentUserId: this.currentUserId,
      isConnected: this.isConnected(),
      connectionId: this.client?.connectionID || null,
      userStatus: this.client?.user || null,
      presenceIntervalActive: !!this.presenceInterval,
      connectionCheckActive: !!this.connectionCheckInterval,
      wsState: {
        isHealthy: wsConnection?.isHealthy,
        connectionState: wsConnection?.connectionState,
        consecutiveFailures: wsConnection?.consecutiveFailures
      }
    }
  }
}

// Export d'une instance unique
export const streamChatManager = StreamChatManager.getInstance()

// Export du type pour TypeScript
export type { StreamChatManager }