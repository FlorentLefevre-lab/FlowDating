// lib/clientCache.ts - Cache côté client
class ClientCache {
    private cache = new Map<string, { 
      data: any; 
      timestamp: number; 
      ttl: number 
    }>();
    
    private maxSize = 100; // Limite pour éviter les fuites mémoire
  
    set(key: string, data: any, ttl: number = 300000): void {
      // Nettoyer si trop d'entrées
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
  
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
      
      console.log(`📦 [CLIENT] Cache SET: ${key}`);
    }
  
    get(key: string): any | null {
      const item = this.cache.get(key);
      if (!item) {
        console.log(`❌ [CLIENT] Cache MISS: ${key}`);
        return null;
      }
  
      // Vérifier expiration
      if (Date.now() - item.timestamp > item.ttl) {
        this.cache.delete(key);
        console.log(`⏰ [CLIENT] Cache EXPIRED: ${key}`);
        return null;
      }
  
      console.log(`📦 [CLIENT] Cache HIT: ${key}`);
      return item.data;
    }
  
    invalidate(key: string): void {
      this.cache.delete(key);
      console.log(`🧹 [CLIENT] Cache INVALIDATED: ${key}`);
    }
  
    invalidatePattern(pattern: string): void {
      let count = 0;
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          count++;
        }
      }
      console.log(`🧹 [CLIENT] Cache PATTERN INVALIDATED: ${pattern} (${count} clés)`);
    }
  
    clear(): void {
      this.cache.clear();
      console.log(`🧹 [CLIENT] Cache CLEARED`);
    }
  
    getStats() {
      return {
        size: this.cache.size,
        maxSize: this.maxSize,
        keys: Array.from(this.cache.keys())
      };
    }
  }
  
  // Instance globale pour le cache client
  export const clientCache = new ClientCache();
  
  // API simplifiée
  export const apiCache = {
    // Cache profil
    profile: {
      get: (userId: string) => clientCache.get(`profile:${userId}`),
      set: (userId: string, data: any) => clientCache.set(`profile:${userId}`, data, 10 * 60 * 1000), // 10 min
    },
    
    // Cache découverte
    discover: {
      get: (userId: string, filters: any) => {
        const key = `discover:${userId}:${JSON.stringify(filters)}`;
        return clientCache.get(key);
      },
      set: (userId: string, filters: any, data: any) => {
        const key = `discover:${userId}:${JSON.stringify(filters)}`;
        return clientCache.set(key, data, 5 * 60 * 1000); // 5 min
      },
    },
    
    // Cache statistiques
    stats: {
      get: (userId: string) => clientCache.get(`stats:${userId}`),
      set: (userId: string, data: any) => clientCache.set(`stats:${userId}`, data, 30 * 60 * 1000), // 30 min
    },
    
    // Cache données de base utilisateur
    userBasic: {
      get: (userEmail: string) => clientCache.get(`user_basic:${userEmail}`),
      set: (userEmail: string, data: any) => clientCache.set(`user_basic:${userEmail}`, data, 15 * 60 * 1000), // 15 min
    },
    
    // Cache exclusions
    exclusions: {
      get: (userId: string) => clientCache.get(`exclusions:${userId}`),
      set: (userId: string, data: any) => clientCache.set(`exclusions:${userId}`, data, 5 * 60 * 1000), // 5 min
    },
    
    // Invalidation globale
    invalidateUser: (userId: string) => {
      clientCache.invalidatePattern(userId);
    }
  };
  
  // Export par défaut
  export default clientCache;