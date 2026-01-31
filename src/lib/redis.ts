// src/lib/redis.ts - Redis connection with support for standard Redis and Upstash

import Redis from 'ioredis';

// Singleton instance
let redisInstance: Redis | null = null;

// Connection configuration
interface RedisConfig {
  url?: string;
  maxRetriesPerRequest?: number;
  retryDelayMs?: number;
  connectTimeoutMs?: number;
  enableReadyCheck?: boolean;
}

const defaultConfig: RedisConfig = {
  maxRetriesPerRequest: 3,
  retryDelayMs: 100,
  connectTimeoutMs: 10000,
  enableReadyCheck: true,
};

/**
 * Creates a Redis connection based on environment configuration
 * Supports both standard Redis (REDIS_URL) and Upstash REST API
 */
function createRedisClient(config: RedisConfig = {}): Redis {
  const mergedConfig = { ...defaultConfig, ...config };
  const redisUrl = config.url || process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('[Redis] No REDIS_URL found, using localhost:6379');
  }

  const client = new Redis(redisUrl || 'redis://localhost:6379', {
    maxRetriesPerRequest: mergedConfig.maxRetriesPerRequest,
    retryStrategy: (times: number) => {
      if (times > 10) {
        console.error('[Redis] Max retries reached, giving up');
        return null;
      }
      const delay = Math.min(times * mergedConfig.retryDelayMs!, 3000);
      console.warn(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
      return delay;
    },
    connectTimeout: mergedConfig.connectTimeoutMs,
    enableReadyCheck: mergedConfig.enableReadyCheck,
    lazyConnect: true,
  });

  // Event handlers for connection state
  client.on('connect', () => {
    console.log('[Redis] Connecting...');
  });

  client.on('ready', () => {
    console.log('[Redis] Connection established and ready');
  });

  client.on('error', (error: Error) => {
    console.error('[Redis] Connection error:', error.message);
  });

  client.on('close', () => {
    console.log('[Redis] Connection closed');
  });

  client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  return client;
}

/**
 * Get the singleton Redis instance
 * Creates a new connection if one doesn't exist
 */
export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = createRedisClient();
  }
  return redisInstance;
}

/**
 * Initialize the Redis connection
 * Call this at application startup
 */
export async function initRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.connect();
    // Test the connection
    await client.ping();
    console.log('[Redis] Initialization successful');
    return true;
  } catch (error) {
    console.error('[Redis] Initialization failed:', error);
    return false;
  }
}

/**
 * Close the Redis connection
 * Call this when shutting down the application
 */
export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    console.log('[Redis] Connection closed gracefully');
  }
}

/**
 * Check if Redis is connected and healthy
 * Returns false if Redis is not available (never throws)
 * Will attempt to connect if not yet connected (lazyConnect)
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = getRedisClient();

    // If status is 'wait' (lazyConnect), try to connect
    if (client.status === 'wait') {
      try {
        await client.connect();
      } catch (connectError) {
        console.warn('[Redis] Failed to connect:', connectError);
        return false;
      }
    }

    // Check if client is in a usable state
    if (client.status !== 'ready' && client.status !== 'connect') {
      return false;
    }

    const result = await Promise.race([
      client.ping(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timeout')), 1000)
      )
    ]);
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Get Redis connection status
 */
export function getRedisStatus(): string {
  if (!redisInstance) {
    return 'not_initialized';
  }
  return redisInstance.status;
}

// Export the Redis class for type usage
export { Redis };

// Default export is the getter function
export default getRedisClient;
