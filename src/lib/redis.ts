// src/lib/redis.ts - Redis optimisé pour environnement multi-instances
import Redis from 'ioredis'

class RedisClient {
  private static instance: Redis | null = null
  private static subscriber: Redis | null = null
  private static publisher: Redis | null = null
  private static isConnected = false
  private static connectionAttempted = false
  private static connectionPromise: Promise<void> | null = null
  private static instanceId = process.env.INSTANCE_ID || 'unknown'
  private static reconnectAttempts = 0
  private static maxReconnectAttempts = 10

  static getInstance(): Redis {
    if (!this.instance && !this.connectionAttempted) {
      this.connectionAttempted = true
      
      console.log(`🔄 [${this.instanceId}] Initialisation Redis...`)
      console.log(`📋 [${this.instanceId}] Configuration:`, {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
        hasPassword: !!process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || '0',
        env: process.env.NODE_ENV
      })

      // Configuration optimisée pour multi-instances
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        
        // Optimisations pour production multi-instances
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: false, // Connexion immédiate pour détecter les erreurs
        connectTimeout: 10000,
        commandTimeout: 5000,
        keepAlive: 30000,
        family: 4,
        db: parseInt(process.env.REDIS_DB || '0'),
        
        // Pool de connexions pour les instances multiples
        enableOfflineQueue: false,
        
        // Retry logic améliorée
        retryDelayOnClusterDown: 300,
        maxRetriesPerRequest: this.maxReconnectAttempts,
        
        // Options spécifiques pour les environnements containerisés
        keyPrefix: process.env.REDIS_KEY_PREFIX || '',
        showFriendlyErrorStack: process.env.NODE_ENV === 'development',
      }

      this.instance = new Redis(redisConfig)

      // Gestion des événements optimisée pour multi-instances
      this.instance.on('connect', () => {
        console.log(`✅ [${this.instanceId}] Redis connecté`)
        this.isConnected = true
        this.reconnectAttempts = 0
      })

      this.instance.on('ready', () => {
        console.log(`🚀 [${this.instanceId}] Redis prêt`)
        this.registerInstancePresence()
      })

      this.instance.on('error', (err) => {
        console.error(`❌ [${this.instanceId}] Erreur Redis:`, err.message)
        this.isConnected = false
        
        // Log des erreurs de connexion spécifiques
        if (err.code === 'ECONNREFUSED') {
          console.error(`🔌 [${this.instanceId}] Redis refuse la connexion - Vérifiez que Redis est démarré`)
        } else if (err.code === 'ENOTFOUND') {
          console.error(`🔍 [${this.instanceId}] Hôte Redis introuvable - Vérifiez REDIS_HOST`)
        } else if (err.code === 'ETIMEDOUT') {
          console.error(`⏰ [${this.instanceId}] Timeout Redis - Possible surcharge réseau`)
        }
        
        this.reconnectAttempts++
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(`💥 [${this.instanceId}] Max tentatives de reconnexion atteint, passage en mode fallback`)
        }
      })

      this.instance.on('close', () => {
        console.log(`🔌 [${this.instanceId}] Connexion Redis fermée`)
        this.isConnected = false
        this.deregisterInstancePresence()
      })

      this.instance.on('reconnecting', (ms) => {
        console.log(`🔄 [${this.instanceId}] Redis reconnexion dans ${ms}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      })

      this.instance.on('end', () => {
        console.log(`🏁 [${this.instanceId}] Connexion Redis terminée`)
        this.isConnected = false
      })

      // Test de connexion forcé
      this.forceTestConnection()
    }

    return this.instance!
  }

  // Client dédié pour les publications (pub/sub)
  static getPublisher(): Redis {
    if (!this.publisher) {
      console.log(`📡 [${this.instanceId}] Création du client Publisher Redis`)
      this.publisher = this.getInstance().duplicate()
      
      this.publisher.on('error', (err) => {
        console.error(`❌ [${this.instanceId}] Erreur Publisher Redis:`, err.message)
      })
    }
    return this.publisher
  }

  // Client dédié pour les souscriptions (pub/sub)
  static getSubscriber(): Redis {
    if (!this.subscriber) {
      console.log(`📡 [${this.instanceId}] Création du client Subscriber Redis`)
      this.subscriber = this.getInstance().duplicate()
      
      this.subscriber.on('error', (err) => {
        console.error(`❌ [${this.instanceId}] Erreur Subscriber Redis:`, err.message)
      })
    }
    return this.subscriber
  }

  private static async forceTestConnection() {
    if (!this.connectionPromise) {
      this.connectionPromise = this.testConnection()
    }
    return this.connectionPromise
  }

  private static async testConnection() {
    try {
      console.log(`🧪 [${this.instanceId}] Test de connexion Redis...`)
      const redis = this.getInstance()
      
      // Test ping/pong
      const pong = await redis.ping()
      console.log(`✅ [${this.instanceId}] Test ping réussi:`, pong)
      
      // Test set/get avec préfixe d'instance
      const testKey = `test:${this.instanceId}:${Date.now()}`
      await redis.set(testKey, `Hello from ${this.instanceId}!`)
      const value = await redis.get(testKey)
      console.log(`📦 [${this.instanceId}] Test cache:`, value)
      
      // Test existence d'autres instances
      const instanceKeys = await redis.keys('instance:*')
      console.log(`👥 [${this.instanceId}] Autres instances détectées:`, instanceKeys.length)
      
      // Nettoyer
      await redis.del(testKey)
      
      this.isConnected = true
      console.log(`🎉 [${this.instanceId}] Redis complètement opérationnel!`)
      
      return true
      
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Test Redis échoué:`, error.message)
      console.log(`💡 [${this.instanceId}] Redis fonctionnera en mode fallback`)
      this.isConnected = false
      return false
    }
  }

  // Enregistrer la présence de cette instance
  private static async registerInstancePresence() {
    try {
      const instanceKey = `instance:${this.instanceId}`
      const instanceData = {
        id: this.instanceId,
        startTime: Date.now(),
        lastSeen: Date.now(),
        color: process.env.INSTANCE_COLOR || '#000000',
        port: process.env.PORT || '3000',
        version: process.env.npm_package_version || 'unknown'
      }
      
      // Enregistrer avec TTL de 60 secondes
      await this.instance?.setex(instanceKey, 60, JSON.stringify(instanceData))
      
      // Programmer le renouvellement automatique
      setInterval(async () => {
        try {
          instanceData.lastSeen = Date.now()
          await this.instance?.setex(instanceKey, 60, JSON.stringify(instanceData))
        } catch (error) {
          console.error(`❌ [${this.instanceId}] Erreur renouvellement présence:`, error)
        }
      }, 30000) // Renouveler toutes les 30 secondes
      
      console.log(`📍 [${this.instanceId}] Instance enregistrée dans Redis`)
      
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur enregistrement instance:`, error)
    }
  }

  // Désenregistrer la présence de cette instance
  private static async deregisterInstancePresence() {
    try {
      const instanceKey = `instance:${this.instanceId}`
      await this.instance?.del(instanceKey)
      console.log(`🗑️ [${this.instanceId}] Instance désenregistrée de Redis`)
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur désenregistrement instance:`, error)
    }
  }

  // Obtenir la liste des instances actives
  static async getActiveInstances(): Promise<any[]> {
    try {
      if (!this.isHealthy()) return []
      
      const instanceKeys = await this.instance?.keys('instance:*') || []
      const instances = []
      
      for (const key of instanceKeys) {
        try {
          const data = await this.instance?.get(key)
          if (data) {
            const instanceData = JSON.parse(data)
            instances.push(instanceData)
          }
        } catch (error) {
          console.error(`❌ Erreur lecture instance ${key}:`, error)
        }
      }
      
      return instances.sort((a, b) => a.startTime - b.startTime)
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur liste instances:`, error)
      return []
    }
  }

  // Vérification de santé améliorée
  static isHealthy(): boolean {
    if (!this.instance || !this.isConnected) {
      return false
    }
    
    // Vérifier l'état de la connexion WebSocket
    try {
      const connectionStatus = (this.instance as any).status
      const isConnectionGood = connectionStatus === 'ready' || connectionStatus === 'connecting'
      
      if (!isConnectionGood) {
        console.log(`⚠️ [${this.instanceId}] Redis status: ${connectionStatus}`)
        return false
      }
      
      return this.reconnectAttempts < this.maxReconnectAttempts
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur vérification santé Redis:`, error)
      return false
    }
  }

  // Méthode pour forcer une reconnexion
  static async forceReconnect(): Promise<boolean> {
    try {
      console.log(`🔄 [${this.instanceId}] Forçage de la reconnexion Redis...`)
      
      if (this.instance) {
        this.instance.disconnect()
      }
      
      this.instance = null
      this.isConnected = false
      this.connectionAttempted = false
      this.connectionPromise = null
      this.reconnectAttempts = 0
      
      // Recréer l'instance
      this.getInstance()
      return await this.testConnection()
      
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur forçage reconnexion:`, error)
      return false
    }
  }

  // Obtenir des statistiques de performance
  static async getStats() {
    try {
      if (!this.isHealthy()) return null
      
      const info = await this.instance?.info()
      const activeInstances = await this.getActiveInstances()
      
      return {
        instanceId: this.instanceId,
        connected: this.isConnected,
        reconnectAttempts: this.reconnectAttempts,
        activeInstances: activeInstances.length,
        instances: activeInstances,
        redisInfo: {
          memory: info?.match(/used_memory_human:(.+)/)?.[1]?.trim(),
          connections: info?.match(/connected_clients:(\d+)/)?.[1],
          commands: info?.match(/total_commands_processed:(\d+)/)?.[1],
          uptime: info?.match(/uptime_in_seconds:(\d+)/)?.[1]
        }
      }
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur stats Redis:`, error)
      return null
    }
  }

  static async disconnect(): Promise<void> {
    console.log(`🔄 [${this.instanceId}] Déconnexion Redis...`)
    
    await this.deregisterInstancePresence()
    
    if (this.publisher) {
      await this.publisher.quit()
      this.publisher = null
    }
    
    if (this.subscriber) {
      await this.subscriber.quit()
      this.subscriber = null
    }
    
    if (this.instance) {
      await this.instance.quit()
      this.instance = null
      this.isConnected = false
      this.connectionAttempted = false
      this.connectionPromise = null
    }
    
    console.log(`✅ [${this.instanceId}] Redis déconnecté`)
  }

  // Méthode de diagnostic pour le debugging
  static getDiagnostics() {
    return {
      instanceId: this.instanceId,
      hasInstance: !!this.instance,
      isConnected: this.isConnected,
      connectionAttempted: this.connectionAttempted,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      hasPublisher: !!this.publisher,
      hasSubscriber: !!this.subscriber,
      status: this.instance ? (this.instance as any).status : 'no-instance',
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
        hasPassword: !!process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || '0'
      }
    }
  }
}

export const redis = RedisClient.getInstance()
export const redisPublisher = () => RedisClient.getPublisher()
export const redisSubscriber = () => RedisClient.getSubscriber()
export const isRedisHealthy = () => RedisClient.isHealthy()
export const disconnectRedis = () => RedisClient.disconnect()
export const getActiveInstances = () => RedisClient.getActiveInstances()
export const getRedisStats = () => RedisClient.getStats()
export const forceRedisReconnect = () => RedisClient.forceReconnect()
export const getRedisDiagnostics = () => RedisClient.getDiagnostics()

export default redis