// lib/cache.ts - Système de cache optimisé pour multi-instances
import redis, { isRedisHealthy } from './redis'

interface CacheOptions {
  ttl?: number
  prefix?: string
  localCache?: boolean // Nouveau: autoriser le cache local pour certaines données
}

// Cache en mémoire TRÈS LIMITÉ - uniquement pour des données statiques
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private maxSize = 20 // Très réduit pour éviter les incohérences

  set(key: string, data: any, ttlSeconds: number = 300): void {
    // En production, PAS de cache mémoire pour éviter les incohérences
    if (process.env.NODE_ENV === 'production') return
    
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    })
  }

  get(key: string): any | null {
    // En production, toujours retourner null pour forcer Redis
    if (process.env.NODE_ENV === 'production') return null
    
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

const memoryCache = new MemoryCache()

class CacheManager {
  private defaultTTL = 300
  private defaultPrefix = 'app:'
  private instanceId = process.env.INSTANCE_ID || 'unknown'
  private pubSubChannel = 'cache:invalidate'

  constructor() {
    this.setupCacheInvalidationListener()
  }

  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.defaultPrefix
    return `${finalPrefix}${key}`
  }

  private serialize(data: any): string {
    try {
      return JSON.stringify({
        data,
        instanceId: this.instanceId,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur sérialisation cache:`, error)
      throw new Error('Impossible de sérialiser les données')
    }
  }

  private deserialize(data: string): any {
    try {
      const parsed = JSON.parse(data)
      return parsed.data || parsed // Compatibilité avec ancien format
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur désérialisation cache:`, error)
      return null
    }
  }

  // Écouter les événements d'invalidation cache des autres instances
  private setupCacheInvalidationListener() {
    if (!isRedisHealthy()) return

    try {
      const subscriber = redis.duplicate()
      
      subscriber.subscribe(this.pubSubChannel, (err) => {
        if (err) {
          console.error(`❌ [${this.instanceId}] Erreur souscription Redis:`, err)
          return
        }
        console.log(`📡 [${this.instanceId}] Écoute des invalidations cache`)
      })

      subscriber.on('message', (channel, message) => {
        if (channel === this.pubSubChannel) {
          try {
            const { pattern, prefix, sourceInstance } = JSON.parse(message)
            
            // Ne pas traiter nos propres événements
            if (sourceInstance === this.instanceId) return
            
            console.log(`🧹 [${this.instanceId}] Invalidation reçue de ${sourceInstance}: ${prefix}${pattern}`)
            
            // Invalider le cache mémoire local
            if (pattern.includes('*')) {
              memoryCache.invalidatePattern(pattern.replace('*', ''))
            } else {
              memoryCache.delete(this.generateKey(pattern, prefix))
            }
          } catch (error) {
            console.error(`❌ [${this.instanceId}] Erreur traitement invalidation:`, error)
          }
        }
      })
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur setup listener cache:`, error)
    }
  }

  // Publier un événement d'invalidation aux autres instances
  private async publishInvalidation(pattern: string, prefix?: string) {
    if (!isRedisHealthy()) return

    try {
      const message = JSON.stringify({
        pattern,
        prefix,
        sourceInstance: this.instanceId,
        timestamp: Date.now()
      })
      
      await redis.publish(this.pubSubChannel, message)
      console.log(`📡 [${this.instanceId}] Invalidation publiée: ${prefix}${pattern}`)
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur publication invalidation:`, error)
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    const { ttl = this.defaultTTL, prefix, localCache = false } = options
    const cacheKey = this.generateKey(key, prefix)
    const serializedValue = this.serialize(value)

    try {
      if (isRedisHealthy()) {
        await redis.setex(cacheKey, ttl, serializedValue)
        console.log(`📦 [${this.instanceId}] Redis SET: ${cacheKey} (TTL: ${ttl}s)`)
        return true
      }
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur Redis SET, fallback mémoire:`, error)
    }

    // Fallback mémoire SEULEMENT si autorisé et en développement
    if (localCache && process.env.NODE_ENV === 'development') {
      memoryCache.set(cacheKey, value, ttl)
      console.log(`🧠 [${this.instanceId}] Cache mémoire SET: ${cacheKey} (TTL: ${ttl}s)`)
    }
    return true
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { prefix } = options
    const cacheKey = this.generateKey(key, prefix)

    // TOUJOURS essayer Redis en premier
    try {
      if (isRedisHealthy()) {
        const value = await redis.get(cacheKey)
        if (value) {
          const deserializedValue = this.deserialize(value)
          console.log(`📦 [${this.instanceId}] Redis HIT: ${cacheKey}`)
          return deserializedValue
        }
      }
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur Redis GET:`, error)
    }

    // Fallback mémoire SEULEMENT en développement
    if (process.env.NODE_ENV === 'development') {
      const memoryValue = memoryCache.get(cacheKey)
      if (memoryValue) {
        console.log(`🧠 [${this.instanceId}] Cache mémoire HIT: ${cacheKey}`)
        return memoryValue
      }
    }

    console.log(`❌ [${this.instanceId}] Cache MISS: ${cacheKey}`)
    return null
  }

  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const { prefix } = options
    const cacheKey = this.generateKey(key, prefix)

    try {
      if (isRedisHealthy()) {
        await redis.del(cacheKey)
        console.log(`🗑️ [${this.instanceId}] Redis DELETE: ${cacheKey}`)
      }
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur Redis DELETE:`, error)
    }

    // Publier l'invalidation aux autres instances
    await this.publishInvalidation(key, prefix)

    // Nettoyer le cache mémoire local
    memoryCache.delete(cacheKey)
    return true
  }

  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    const { prefix } = options
    const searchPattern = this.generateKey(pattern, prefix) + '*'
    let deletedCount = 0

    try {
      if (isRedisHealthy()) {
        const keys = await redis.keys(searchPattern)
        if (keys.length > 0) {
          deletedCount = await redis.del(...keys)
          console.log(`🧹 [${this.instanceId}] Redis PATTERN DELETE: ${searchPattern} (${deletedCount} clés)`)
        }
      }
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Erreur Redis PATTERN DELETE:`, error)
    }

    // Publier l'invalidation aux autres instances
    await this.publishInvalidation(pattern + '*', prefix)

    // Nettoyer le cache mémoire local
    memoryCache.invalidatePattern(pattern)
    return deletedCount
  }

  async getOrSet<T = any>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options)
    if (cached !== null) {
      return cached
    }

    console.log(`🔄 [${this.instanceId}] Cache MISS - Exécution fetcher pour: ${key}`)
    const value = await fetcher()
    await this.set(key, value, options)
    return value
  }

  // ========================================
  // MÉTHODES API CACHE (optimisées pour multi-instances)
  // ========================================

  async cacheUserProfile(userId: string, profileData: any): Promise<void> {
    const key = `profile:${userId}`
    await this.set(key, profileData, { 
      prefix: 'api:', 
      ttl: 600,
      localCache: false // JAMAIS en cache local pour les profils
    })
    console.log(`📦 [${this.instanceId}] Profil utilisateur mis en cache:`, userId)
  }

  async getUserProfile(userId: string): Promise<any | null> {
    const key = `profile:${userId}`
    const cached = await this.get(key, { prefix: 'api:' })
    if (cached) {
      console.log(`📦 [${this.instanceId}] Cache HIT - Profil:`, userId)
    }
    return cached
  }

  async cacheDiscoverResults(userId: string, filters: any, results: any): Promise<void> {
    const filtersKey = JSON.stringify(filters)
    const key = `discover:${userId}:${Buffer.from(filtersKey).toString('base64').slice(0, 20)}`
    
    await this.set(key, results, {
      prefix: 'api:',
      ttl: 180, // Réduit à 3 minutes pour la fraîcheur des résultats
      localCache: false
    })
    console.log(`📦 [${this.instanceId}] Résultats découverte mis en cache pour:`, userId)
  }

  async getDiscoverResults(userId: string, filters: any): Promise<any | null> {
    const filtersKey = JSON.stringify(filters)
    const key = `discover:${userId}:${Buffer.from(filtersKey).toString('base64').slice(0, 20)}`
    
    const cached = await this.get(key, { prefix: 'api:' })
    if (cached) {
      console.log(`📦 [${this.instanceId}] Cache HIT - Découverte:`, userId)
    }
    return cached
  }

  async cacheUserStats(userId: string, stats: any): Promise<void> {
    const key = `stats:${userId}`
    await this.set(key, stats, {
      prefix: 'api:',
      ttl: 1800,
      localCache: false // Stats importantes, pas de cache local
    })
    console.log(`📦 [${this.instanceId}] Stats utilisateur mises en cache:`, userId)
  }

  async getUserStats(userId: string): Promise<any | null> {
    const key = `stats:${userId}`
    const cached = await this.get(key, { prefix: 'api:' })
    if (cached) {
      console.log(`📦 [${this.instanceId}] Cache HIT - Stats:`, userId)
    }
    return cached
  }

  async cacheUserBasicData(userId: string, userData: any): Promise<void> {
    const key = `user_basic:${userId}`
    await this.set(key, userData, {
      prefix: 'api:',
      ttl: 900,
      localCache: false
    })
  }

  async getUserBasicData(userId: string): Promise<any | null> {
    const key = `user_basic:${userId}`
    return await this.get(key, { prefix: 'api:' })
  }

  async cacheUserExclusions(userId: string, exclusions: any): Promise<void> {
    const key = `exclusions:${userId}`
    await this.set(key, exclusions, {
      prefix: 'api:',
      ttl: 120, // Très court car change souvent
      localCache: false
    })
  }

  async getUserExclusions(userId: string): Promise<any | null> {
    const key = `exclusions:${userId}`
    return await this.get(key, { prefix: 'api:' })
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`profile:${userId}`, { prefix: 'api:' }),
      this.invalidatePattern(`stats:${userId}`, { prefix: 'api:' }),
      this.invalidatePattern(`user_basic:${userId}`, { prefix: 'api:' }),
      this.invalidatePattern(`discover:${userId}`, { prefix: 'api:' }),
      this.invalidatePattern(`exclusions:${userId}`, { prefix: 'api:' })
    ])
    console.log(`🧹 [${this.instanceId}] Cache utilisateur invalidé:`, userId)
  }
}

// Instance principale du cache
export const cache = new CacheManager()

// Caches spécialisés (toujours via Redis en production)
export const userCache = {
  get: (userId: string) => cache.get(`user:${userId}`, { prefix: 'users:', localCache: false }),
  set: (userId: string, userData: any) => cache.set(`user:${userId}`, userData, { prefix: 'users:', ttl: 900, localCache: false }),
  delete: (userId: string) => cache.delete(`user:${userId}`, { prefix: 'users:' }),
}

export const sessionCache = {
  get: (sessionId: string) => cache.get(sessionId, { prefix: 'sessions:', localCache: false }),
  set: (sessionId: string, sessionData: any) => cache.set(sessionId, sessionData, { prefix: 'sessions:', ttl: 1800, localCache: false }),
  delete: (sessionId: string) => cache.delete(sessionId, { prefix: 'sessions:' }),
}

export const emailCache = {
  get: (email: string) => cache.get(email, { prefix: 'email_tokens:', localCache: false }),
  set: (email: string, token: string) => cache.set(email, token, { prefix: 'email_tokens:', ttl: 3600, localCache: false }),
  delete: (email: string) => cache.delete(email, { prefix: 'email_tokens:' }),
}

// API Cache optimisée (pas de cache local)
export const apiCache = {
  profile: {
    get: (userId: string) => cache.getUserProfile(userId),
    set: (userId: string, data: any) => cache.cacheUserProfile(userId, data),
  },
  
  discover: {
    get: (userId: string, filters: any) => cache.getDiscoverResults(userId, filters),
    set: (userId: string, filters: any, data: any) => cache.cacheDiscoverResults(userId, filters, data),
  },
  
  stats: {
    get: (userId: string) => cache.getUserStats(userId),
    set: (userId: string, data: any) => cache.cacheUserStats(userId, data),
  },
  
  userBasic: {
    get: (userId: string) => cache.getUserBasicData(userId),
    set: (userId: string, data: any) => cache.cacheUserBasicData(userId, data),
  },
  
  exclusions: {
    get: (userId: string) => cache.getUserExclusions(userId),
    set: (userId: string, data: any) => cache.cacheUserExclusions(userId, data),
  },
  
  invalidateUser: (userId: string) => cache.invalidateUserCache(userId),
}

export default cache