// src/lib/cache.ts - Redis-backed cache with fallback to memory

import { getRedisClient, isRedisHealthy } from './redis';

interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

// In-memory fallback cache for when Redis is unavailable
interface MemoryCacheItem {
  data: string;
  timestamp: number;
  ttl: number;
}

class MemoryFallbackCache {
  private cache = new Map<string, MemoryCacheItem>();
  private maxSize = 500;

  set(key: string, data: string, ttlSeconds: number): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get(key: string): string | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  keys(pattern: string): string[] {
    const results: string[] = [];
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        results.push(key);
      }
    }
    return results;
  }

  clear(): void {
    this.cache.clear();
  }
}

const memoryFallback = new MemoryFallbackCache();

class CacheManager {
  private defaultTTL = 300; // 5 minutes
  private defaultPrefix = 'app:';
  private useRedis = true;

  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.defaultPrefix;
    return `${finalPrefix}${key}`;
  }

  private async checkRedis(): Promise<boolean> {
    if (!this.useRedis) return false;
    try {
      return await isRedisHealthy();
    } catch {
      return false;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const { ttl = this.defaultTTL, prefix } = options;
    const cacheKey = this.generateKey(key, prefix);
    const serialized = JSON.stringify(value);

    try {
      if (await this.checkRedis()) {
        const redis = getRedisClient();
        await redis.setex(cacheKey, ttl, serialized);
      } else {
        memoryFallback.set(cacheKey, serialized, ttl);
      }
      return true;
    } catch (error) {
      console.error('[Cache] Error setting value:', error);
      // Fallback to memory on error
      memoryFallback.set(cacheKey, serialized, ttl);
      return true;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = unknown>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { prefix } = options;
    const cacheKey = this.generateKey(key, prefix);

    try {
      let data: string | null = null;

      if (await this.checkRedis()) {
        const redis = getRedisClient();
        data = await redis.get(cacheKey);
      } else {
        data = memoryFallback.get(cacheKey);
      }

      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('[Cache] Error getting value:', error);
      // Try memory fallback
      const memData = memoryFallback.get(cacheKey);
      if (memData) {
        try {
          return JSON.parse(memData) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const { prefix } = options;
    const cacheKey = this.generateKey(key, prefix);

    try {
      if (await this.checkRedis()) {
        const redis = getRedisClient();
        await redis.del(cacheKey);
      }
      memoryFallback.delete(cacheKey);
      return true;
    } catch (error) {
      console.error('[Cache] Error deleting value:', error);
      memoryFallback.delete(cacheKey);
      return true;
    }
  }

  /**
   * Invalidate all keys matching a pattern
   * Pattern uses Redis glob-style matching (e.g., "user:123:*")
   */
  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    const { prefix } = options;
    const searchPattern = this.generateKey(pattern, prefix);
    let count = 0;

    try {
      if (await this.checkRedis()) {
        const redis = getRedisClient();
        // Use SCAN for production-safe pattern deletion
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', searchPattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys.length > 0) {
            await redis.del(...keys);
            count += keys.length;
          }
        } while (cursor !== '0');
      }

      // Also invalidate from memory fallback
      const memKeys = memoryFallback.keys(searchPattern);
      for (const key of memKeys) {
        memoryFallback.delete(key);
        count++;
      }

      return count;
    } catch (error) {
      console.error('[Cache] Error invalidating pattern:', error);
      // Try memory fallback only
      const memKeys = memoryFallback.keys(searchPattern);
      for (const key of memKeys) {
        memoryFallback.delete(key);
        count++;
      }
      return count;
    }
  }

  /**
   * Get or set a cached value using a fetcher function
   */
  async getOrSet<T = unknown>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    const { prefix } = options;
    const cacheKey = this.generateKey(key, prefix);

    try {
      if (await this.checkRedis()) {
        const redis = getRedisClient();
        return (await redis.exists(cacheKey)) === 1;
      }
      return memoryFallback.get(cacheKey) !== null;
    } catch {
      return memoryFallback.get(cacheKey) !== null;
    }
  }

  /**
   * Get the TTL of a key in seconds
   */
  async getTTL(key: string, options: CacheOptions = {}): Promise<number> {
    const { prefix } = options;
    const cacheKey = this.generateKey(key, prefix);

    try {
      if (await this.checkRedis()) {
        const redis = getRedisClient();
        return await redis.ttl(cacheKey);
      }
      return -1;
    } catch {
      return -1;
    }
  }

  // ==========================================
  // API Cache Helper Methods (backward compatible)
  // ==========================================

  async cacheUserProfile(userId: string, profileData: unknown): Promise<void> {
    await this.set(`profile:${userId}`, profileData, { prefix: 'api:', ttl: 600 });
  }

  async getUserProfile(userId: string): Promise<unknown | null> {
    return await this.get(`profile:${userId}`, { prefix: 'api:' });
  }

  async cacheDiscoverResults(userId: string, filters: unknown, results: unknown): Promise<void> {
    const filtersKey = JSON.stringify(filters);
    const key = `discover:${userId}:${Buffer.from(filtersKey).toString('base64').slice(0, 20)}`;
    await this.set(key, results, { prefix: 'api:', ttl: 180 });
  }

  async getDiscoverResults(userId: string, filters: unknown): Promise<unknown | null> {
    const filtersKey = JSON.stringify(filters);
    const key = `discover:${userId}:${Buffer.from(filtersKey).toString('base64').slice(0, 20)}`;
    return await this.get(key, { prefix: 'api:' });
  }

  async cacheUserStats(userId: string, stats: unknown): Promise<void> {
    await this.set(`stats:${userId}`, stats, { prefix: 'api:', ttl: 1800 });
  }

  async getUserStats(userId: string): Promise<unknown | null> {
    return await this.get(`stats:${userId}`, { prefix: 'api:' });
  }

  async cacheUserBasicData(userId: string, userData: unknown): Promise<void> {
    await this.set(`user_basic:${userId}`, userData, { prefix: 'api:', ttl: 900 });
  }

  async getUserBasicData(userId: string): Promise<unknown | null> {
    return await this.get(`user_basic:${userId}`, { prefix: 'api:' });
  }

  async cacheUserExclusions(userId: string, exclusions: unknown): Promise<void> {
    await this.set(`exclusions:${userId}`, exclusions, { prefix: 'api:', ttl: 120 });
  }

  async getUserExclusions(userId: string): Promise<unknown | null> {
    return await this.get(`exclusions:${userId}`, { prefix: 'api:' });
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`profile:${userId}*`, { prefix: 'api:' }),
      this.invalidatePattern(`stats:${userId}*`, { prefix: 'api:' }),
      this.invalidatePattern(`user_basic:${userId}*`, { prefix: 'api:' }),
      this.invalidatePattern(`discover:${userId}*`, { prefix: 'api:' }),
      this.invalidatePattern(`exclusions:${userId}*`, { prefix: 'api:' }),
    ]);
  }
}

export const cache = new CacheManager();

// ==========================================
// Specialized Cache Interfaces (backward compatible)
// ==========================================

export const userCache = {
  get: (userId: string) => cache.get(`user:${userId}`, { prefix: 'users:' }),
  set: (userId: string, userData: unknown) => cache.set(`user:${userId}`, userData, { prefix: 'users:', ttl: 900 }),
  delete: (userId: string) => cache.delete(`user:${userId}`, { prefix: 'users:' }),
};

export const sessionCache = {
  get: (sessionId: string) => cache.get(sessionId, { prefix: 'sessions:' }),
  set: (sessionId: string, sessionData: unknown) => cache.set(sessionId, sessionData, { prefix: 'sessions:', ttl: 1800 }),
  delete: (sessionId: string) => cache.delete(sessionId, { prefix: 'sessions:' }),
};

export const emailCache = {
  get: (email: string) => cache.get(email, { prefix: 'email_tokens:' }),
  set: (email: string, token: string) => cache.set(email, token, { prefix: 'email_tokens:', ttl: 3600 }),
  delete: (email: string) => cache.delete(email, { prefix: 'email_tokens:' }),
};

// ==========================================
// API Cache Object (backward compatible)
// ==========================================

export const apiCache = {
  profile: {
    get: (userId: string) => cache.getUserProfile(userId),
    set: (userId: string, data: unknown) => cache.cacheUserProfile(userId, data),
  },

  discover: {
    get: (userId: string, filters: unknown) => cache.getDiscoverResults(userId, filters),
    set: (userId: string, filters: unknown, data: unknown) => cache.cacheDiscoverResults(userId, filters, data),
  },

  stats: {
    get: (userId: string) => cache.getUserStats(userId),
    set: (userId: string, data: unknown) => cache.cacheUserStats(userId, data),
  },

  userBasic: {
    get: (userId: string) => cache.getUserBasicData(userId),
    set: (userId: string, data: unknown) => cache.cacheUserBasicData(userId, data),
  },

  exclusions: {
    get: (userId: string) => cache.getUserExclusions(userId),
    set: (userId: string, data: unknown) => cache.cacheUserExclusions(userId, data),
  },

  invalidateUser: (userId: string) => cache.invalidateUserCache(userId),
};

export default cache;
