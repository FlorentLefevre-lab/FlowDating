// lib/cache.ts - Cache client simple mais efficace
class ClientCache {
    private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
    private maxSize = 50; // Limite de taille
  
    set(key: string, data: any, ttlMs: number = 300000) { // 5min par défaut
      // Nettoyer si trop gros
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
  
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlMs
      });
    }
  
    get(key: string): any | null {
      const item = this.cache.get(key);
      if (!item) return null;
  
      // Vérifier expiration
      if (Date.now() - item.timestamp > item.ttl) {
        this.cache.delete(key);
        return null;
      }
  
      return item.data;
    }
  
    invalidate(pattern: string) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }
  
    clear() {
      this.cache.clear();
    }
  }
  
  export const clientCache = new ClientCache();