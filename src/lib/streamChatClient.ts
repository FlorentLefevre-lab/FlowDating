// =====================================================
// src/lib/streamChatClient.ts - VERSION SANS PROBLÈME DE TYPES
// =====================================================
import { StreamChat } from 'stream-chat'

export class StreamChatManager {
  private client: StreamChat | null = null
  private currentUserId: string | null = null
  private presenceInterval: NodeJS.Timeout | null = null

  async getClient(userId: string, userData: any, token: string): Promise<StreamChat | null> {
    try {
      // Si on a déjà un client pour cet utilisateur, le retourner
      if (this.client && this.currentUserId === userId) {
        console.log(`✅ Client existant pour:`, userId)
        return this.client
      }

      // Créer le client
      if (!this.client) {
        this.client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!)
        console.log(`✅ Client Stream créé`)
      }

      console.log(`🔄 Connexion Stream Chat pour:`, userId)
      
      // Connecter l'utilisateur
      await this.client.connectUser(
        {
          id: userData.id,
          name: userData.name || 'Utilisateur',
          image: userData.image || undefined,
          last_seen: new Date().toISOString()
        },
        token
      )

      this.currentUserId = userId
      console.log(`✅ Utilisateur connecté:`, userId)

      // Démarrer la maintenance de présence
      this.setupPresenceUpdates()

      return this.client
    } catch (error) {
      console.error(`❌ Erreur getClient:`, error)
      return null
    }
  }

  private setupPresenceUpdates() {
    if (!this.client || !this.currentUserId) return

    // Nettoyer l'ancien interval
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval)
    }

    // Maintenir la présence toutes les 30 secondes
    this.presenceInterval = setInterval(async () => {
      if (this.client && this.currentUserId) {
        try {
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
          console.log(`🟢 Présence maintenue`)
        } catch (error) {
          console.error(`❌ Erreur présence:`, error)
        }
      }
    }, 30000)
  }

  async disconnect(): Promise<void> {
    console.log(`🔄 Déconnexion Stream...`)

    // Nettoyer l'interval
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval)
      this.presenceInterval = null
    }

    // Déconnecter l'utilisateur
    if (this.client && this.currentUserId) {
      try {
        await this.client.disconnectUser()
        console.log(`✅ Utilisateur déconnecté:`, this.currentUserId)
      } catch (error) {
        console.error(`❌ Erreur déconnexion:`, error)
      }
    }

    // Réinitialiser
    this.client = null
    this.currentUserId = null
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

  async syncPresence(): Promise<void> {
    if (!this.client || !this.currentUserId) return

    try {
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
      console.log(`✅ Présence synchronisée`)
    } catch (error) {
      console.error(`❌ Erreur sync présence:`, error)
    }
  }

  getDebugInfo() {
    return {
      hasClient: !!this.client,
      currentUserId: this.currentUserId,
      isConnected: this.isConnected(),
      connectionId: this.client?.connectionID || null,
      userStatus: this.client?.user || null,
      presenceIntervalActive: !!this.presenceInterval
    }
  }
}

// ✅ EXPORT SIMPLE ET DIRECT
export const streamChatManager = new StreamChatManager()