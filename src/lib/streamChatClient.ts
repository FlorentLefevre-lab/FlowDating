// src/lib/streamChatClient.ts - Stream Chat optimisé pour multi-instances
import { StreamChat } from 'stream-chat'
import { cache } from './cache'

class StreamChatManager {
  private static instance: StreamChatManager
  private client: StreamChat | null = null
  private connectionPromise: Promise<void> | null = null
  private currentUserId: string | null = null
  private presenceInterval: NodeJS.Timeout | null = null
  private connectionCheckInterval: NodeJS.Timeout | null = null
  private instanceId = process.env.INSTANCE_ID || 'unknown'
  private isShuttingDown = false

  private constructor() {
    // Gérer la fermeture propre lors du shutdown
    process.on('SIGTERM', () => this.gracefulShutdown())
    process.on('SIGINT', () => this.gracefulShutdown())
  }

  static getInstance(): StreamChatManager {
    if (!StreamChatManager.instance) {
      StreamChatManager.instance = new StreamChatManager()
    }
    return StreamChatManager.instance
  }

  async getClient(userId: string, userData: any, token: string): Promise<StreamChat | null> {
    try {
      // Vérifier si l'utilisateur est déjà connecté sur une autre instance
      const existingConnection = await this.checkExistingConnection(userId)
      if (existingConnection && existingConnection.instanceId !== this.instanceId) {
        console.log(`🔄 [${this.instanceId}] Migration de session depuis ${existingConnection.instanceId}`)
        await this.migrateFromInstance(userId, existingConnection.instanceId)
      }

      // Si on a déjà un client pour cet utilisateur, le retourner
      if (this.client && this.currentUserId === userId) {
        console.log(`✅ [${this.instanceId}] Client existant pour:`, userId)
        await this.updateUserPresence(userId)
        return this.client
      }

      // Si une connexion est en cours, attendre
      if (this.connectionPromise) {
        console.log(`⏳ [${this.instanceId}] Connexion en cours, attente...`)
        await this.connectionPromise
        return this.client
      }

      // Créer la promesse de connexion
      this.connectionPromise = this.connect(userId, userData, token)
      await this.connectionPromise
      this.connectionPromise = null

      return this.client
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur getClient:`, error)
      this.connectionPromise = null
      return null
    }
  }

  private async checkExistingConnection(userId: string): Promise<any> {
    try {
      return await cache.get(`stream_connection:${userId}`, { prefix: 'chat:' })
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur vérification connexion existante:`, error)
      return null
    }
  }

  private async migrateFromInstance(userId: string, fromInstanceId: string): Promise<void> {
    try {
      console.log(`🔄 [${this.instanceId}] Migration session Stream de ${fromInstanceId}`)
      
      // Invalider la connexion sur l'ancienne instance via Redis pub/sub
      await cache.set(`stream_migration:${userId}`, {
        fromInstance: fromInstanceId,
        toInstance: this.instanceId,
        timestamp: Date.now()
      }, { prefix: 'chat:', ttl: 60 })
      
      // Publier l'événement de migration
      const redis = (await import('./redis')).redisPublisher()
      await redis.publish('stream:migration', JSON.stringify({
        userId,
        fromInstance: fromInstanceId,
        toInstance: this.instanceId,
        action: 'disconnect_user'
      }))
      
      console.log(`📡 [${this.instanceId}] Signal de migration envoyé`)
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur migration:`, error)
    }
  }

  private async connect(userId: string, userData: any, token: string): Promise<void> {
    try {
      // Si on a un client avec un autre utilisateur, le déconnecter
      if (this.client && this.currentUserId && this.currentUserId !== userId) {
        console.log(`🔄 [${this.instanceId}] Déconnexion de l'ancien utilisateur:`, this.currentUserId)
        await this.disconnect()
      }

      // Créer ou réutiliser le client
      if (!this.client) {
        this.client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!)
        console.log(`✅ [${this.instanceId}] Client Stream créé`)
      }

      console.log(`🔄 [${this.instanceId}] Connexion Stream Chat pour:`, userId)
      
      // Connecter avec optimisations pour multi-instances
      await this.client.connectUser(
        {
          id: userData.id,
          name: userData.name || 'Utilisateur',
          image: userData.image || undefined,
          // Marquer l'instance pour le debugging
          instance_id: this.instanceId,
          last_seen: new Date().toISOString()
        },
        token
      )

      this.currentUserId = userId
      console.log(`✅ [${this.instanceId}] Utilisateur connecté:`, userId)

      // Enregistrer la connexion dans Redis pour coordination inter-instances
      await this.registerConnection(userId)

      // Activer immédiatement la présence
      await this.setUserOnline()

      // Configurer la maintenance automatique
      this.setupPresenceUpdates()
      this.setupConnectionHandlers()
      this.setupConnectionCheck()
      this.setupMigrationListener()

    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur connexion Stream:`, error)
      // Nettoyer en cas d'erreur
      this.client = null
      this.currentUserId = null
      throw error
    }
  }

  private async registerConnection(userId: string): Promise<void> {
    try {
      const connectionData = {
        userId,
        instanceId: this.instanceId,
        connectedAt: Date.now(),
        lastSeen: Date.now()
      }
      
      await cache.set(`stream_connection:${userId}`, connectionData, {
        prefix: 'chat:',
        ttl: 300 // 5 minutes
      })
      
      console.log(`📍 [${this.instanceId}] Connexion Stream enregistrée pour:`, userId)
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur enregistrement connexion:`, error)
    }
  }

  private async updateUserPresence(userId: string): Promise<void> {
    try {
      const connectionData = await cache.get(`stream_connection:${userId}`, { prefix: 'chat:' })
      if (connectionData) {
        connectionData.lastSeen = Date.now()
        connectionData.instanceId = this.instanceId
        await cache.set(`stream_connection:${userId}`, connectionData, {
          prefix: 'chat:',
          ttl: 300
        })
      }
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur mise à jour présence:`, error)
    }
  }

  private async setUserOnline() {
    if (!this.client || !this.currentUserId) return

    try {
      // Surveiller les channels pour maintenir la présence active
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
      
      console.log(`✅ [${this.instanceId}] Utilisateur marqué comme en ligne (${channels.length} channels surveillés)`)
      
      // Mettre à jour la présence dans Redis
      await this.updateUserPresence(this.currentUserId)
      
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur setUserOnline:`, error)
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
      if (this.client && this.currentUserId && !this.isShuttingDown) {
        try {
          // Méthode optimisée pour maintenir la présence
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
          
          // Mettre à jour dans Redis
          await this.updateUserPresence(this.currentUserId)
          console.log(`🟢 [${this.instanceId}] Présence maintenue active`)
        } catch (error) {
          console.error(`❌ [${this.instanceId}] Erreur maintien présence:`, error)
        }
      }
    }

    // Maintenir immédiatement puis toutes les 25 secondes
    maintainPresence()
    this.presenceInterval = setInterval(maintainPresence, 25000)
    console.log(`⏰ [${this.instanceId}] Maintenance automatique de présence activée (25s)`)
  }

  private setupConnectionHandlers() {
    if (!this.client) return

    try {
      // Gestion simplifiée des événements de connexion
      console.log(`📡 [${this.instanceId}] Configuration surveillance connexion`)
      
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur setup connection handlers:`, error)
    }
  }

  private setupConnectionCheck() {
    // Nettoyer l'ancien interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = null
    }

    // Vérifier la connexion toutes les 10 secondes
    this.connectionCheckInterval = setInterval(() => {
      if (this.client && this.currentUserId && !this.isShuttingDown) {
        const wsConnection = (this.client as any).wsConnection
        const isHealthy = wsConnection?.isHealthy
        const connectionState = wsConnection?.connectionState
        
        console.log(`🔍 [${this.instanceId}] État connexion:`, {
          healthy: isHealthy,
          state: connectionState,
          userId: this.currentUserId
        })
        
        // Si la connexion n'est pas saine, essayer de la récupérer
        if (!isHealthy || connectionState !== 'connected') {
          console.warn(`⚠️ [${this.instanceId}] Connexion dégradée, tentative de récupération...`)
          this.setUserOnline().catch(console.error)
        }
      }
    }, 10000)
  }

  private setupMigrationListener() {
    try {
      const setupListener = async () => {
        const redis = (await import('./redis')).redisSubscriber()
        
        await redis.subscribe('stream:migration', (err) => {
          if (err) {
            console.error(`❌ [${this.instanceId}] Erreur souscription migration:`, err)
            return
          }
          console.log(`📡 [${this.instanceId}] Écoute des migrations Stream`)
        })

        redis.on('message', async (channel, message) => {
          if (channel === 'stream:migration') {
            try {
              const data = JSON.parse(message)
              
              // Si c'est pour cette instance et cet utilisateur
              if (data.fromInstance === this.instanceId && 
                  data.userId === this.currentUserId &&
                  data.action === 'disconnect_user') {
                
                console.log(`🔄 [${this.instanceId}] Réception signal migration pour:`, data.userId)
                await this.disconnect()
              }
            } catch (error) {
              console.error(`❌ [${this.instanceId}] Erreur traitement migration:`, error)
            }
          }
        })
      }

      setupListener().catch(console.error)
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur setup migration listener:`, error)
    }
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true
    console.log(`🔄 [${this.instanceId}] Début de la déconnexion Stream...`)

    // Nettoyer les intervals
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval)
      this.presenceInterval = null
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = null
    }

    // Déenregistrer la connexion
    if (this.currentUserId) {
      try {
        await cache.delete(`stream_connection:${this.currentUserId}`, { prefix: 'chat:' })
        console.log(`🗑️ [${this.instanceId}] Connexion Stream déenregistrée`)
      } catch (error) {
        console.error(`❌ [${this.instanceId}] Erreur déenregistrement:`, error)
      }
    }

    // Déconnecter l'utilisateur
    if (this.client && this.currentUserId) {
      try {
        await this.client.disconnectUser()
        console.log(`✅ [${this.instanceId}] Utilisateur Stream déconnecté:`, this.currentUserId)
      } catch (error) {
        console.error(`❌ [${this.instanceId}] Erreur déconnexion Stream:`, error)
      }
    }

    // Réinitialiser les variables
    this.client = null
    this.currentUserId = null
    this.connectionPromise = null
    this.isShuttingDown = false
    console.log(`✅ [${this.instanceId}] Déconnexion Stream complète`)
  }

  private async gracefulShutdown(): Promise<void> {
    console.log(`🔄 [${this.instanceId}] Arrêt graceful de Stream Chat...`)
    await this.disconnect()
  }

  isConnected(): boolean {
    return !!(this.client && this.currentUserId && this.client.user && !this.isShuttingDown)
  }

  getCurrentUserId(): string | null {
    return this.currentUserId
  }

  getClientInstance(): StreamChat | null {
    return this.client
  }

  // Synchronisation de présence optimisée pour multi-instances
  async syncPresence(): Promise<void> {
    if (!this.client || !this.currentUserId) {
      console.warn(`⚠️ [${this.instanceId}] Impossible de synchroniser: client non connecté`)
      return
    }

    try {
      await this.setUserOnline()
      console.log(`✅ [${this.instanceId}] Présence synchronisée`)
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur synchronisation présence:`, error)
    }
  }

  // Obtenir l'état de présence avec cache distribué
  async getPresenceStatus(userIds: string[]): Promise<Record<string, boolean>> {
    if (!this.client) return {}

    try {
      // Vérifier d'abord le cache distribué
      const cachePromises = userIds.map(id => 
        cache.get(`stream_connection:${id}`, { prefix: 'chat:' })
      )
      const cachedConnections = await Promise.all(cachePromises)
      
      const presence: Record<string, boolean> = {}
      const now = Date.now()
      
      userIds.forEach((userId, index) => {
        const connection = cachedConnections[index]
        // Considérer comme en ligne si vu dans les 2 dernières minutes
        presence[userId] = connection && (now - connection.lastSeen) < 120000
      })

      return presence
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur récupération présence:`, error)
      return {}
    }
  }

  // Diagnostics étendus
  getDebugInfo() {
    const wsConnection = this.client ? (this.client as any).wsConnection : null
    
    return {
      instanceId: this.instanceId,
      hasClient: !!this.client,
      currentUserId: this.currentUserId,
      isConnected: this.isConnected(),
      isShuttingDown: this.isShuttingDown,
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