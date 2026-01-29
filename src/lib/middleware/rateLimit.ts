/**
 * Rate Limiting Middleware for API Routes
 *
 * Provides protection against abuse using Redis-backed rate limiting.
 * Falls back to memory-based rate limiting when Redis is unavailable.
 * Different limiters are configured for different route types.
 */

import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes, RateLimiterAbstract } from 'rate-limiter-flexible';
import { getRedisClient, isRedisHealthy } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// Flag to track if Redis is available
let redisAvailable: boolean | null = null;
let lastRedisCheck = 0;
const REDIS_CHECK_INTERVAL = 30000; // Check every 30 seconds

// Lazy initialization of rate limiters (created on first use)
let authLimiter: RateLimiterAbstract | null = null;
let apiLimiter: RateLimiterAbstract | null = null;
let discoveryLimiter: RateLimiterAbstract | null = null;
let bruteForceLoginLimiter: RateLimiterAbstract | null = null;

// Memory-based fallback limiters
let memoryAuthLimiter: RateLimiterMemory | null = null;
let memoryApiLimiter: RateLimiterMemory | null = null;
let memoryDiscoveryLimiter: RateLimiterMemory | null = null;
let memoryBruteForceLimiter: RateLimiterMemory | null = null;

/**
 * Check if Redis is available (with caching)
 */
async function checkRedisAvailable(): Promise<boolean> {
  const now = Date.now();
  if (redisAvailable !== null && now - lastRedisCheck < REDIS_CHECK_INTERVAL) {
    return redisAvailable;
  }

  try {
    redisAvailable = await isRedisHealthy();
    lastRedisCheck = now;
    if (!redisAvailable && process.env.NODE_ENV === 'development') {
      console.warn('[RATE_LIMIT] Redis unavailable, using memory fallback');
    }
  } catch {
    redisAvailable = false;
    lastRedisCheck = now;
  }

  return redisAvailable;
}

/**
 * Get or create memory-based auth rate limiter (fallback)
 */
function getMemoryAuthLimiter(): RateLimiterMemory {
  if (!memoryAuthLimiter) {
    memoryAuthLimiter = new RateLimiterMemory({
      keyPrefix: 'rl:auth',
      points: 5,
      duration: 60,
      blockDuration: 300,
    });
  }
  return memoryAuthLimiter;
}

/**
 * Get or create memory-based API rate limiter (fallback)
 */
function getMemoryApiLimiter(): RateLimiterMemory {
  if (!memoryApiLimiter) {
    memoryApiLimiter = new RateLimiterMemory({
      keyPrefix: 'rl:api',
      points: 100,
      duration: 60,
    });
  }
  return memoryApiLimiter;
}

/**
 * Get or create memory-based discovery rate limiter (fallback)
 */
function getMemoryDiscoveryLimiter(): RateLimiterMemory {
  if (!memoryDiscoveryLimiter) {
    memoryDiscoveryLimiter = new RateLimiterMemory({
      keyPrefix: 'rl:discovery',
      points: 30,
      duration: 60,
    });
  }
  return memoryDiscoveryLimiter;
}

/**
 * Get or create memory-based brute force limiter (fallback)
 */
function getMemoryBruteForceLimiter(): RateLimiterMemory {
  if (!memoryBruteForceLimiter) {
    memoryBruteForceLimiter = new RateLimiterMemory({
      keyPrefix: 'rl:bruteforce',
      points: 5,
      duration: 15 * 60,
      blockDuration: 15 * 60,
    });
  }
  return memoryBruteForceLimiter;
}

/**
 * Get or create the auth rate limiter
 * Strict limits for authentication routes
 */
function getAuthLimiter(useMemory = false): RateLimiterAbstract {
  if (useMemory) {
    return getMemoryAuthLimiter();
  }
  if (!authLimiter) {
    authLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: 'rl:auth',
      points: 5,           // 5 requests
      duration: 60,        // per minute
      blockDuration: 300,  // blocked for 5 minutes if exceeded
    });
  }
  return authLimiter;
}

/**
 * Get or create the general API rate limiter
 * Standard limits for most API routes
 */
function getApiLimiter(useMemory = false): RateLimiterAbstract {
  if (useMemory) {
    return getMemoryApiLimiter();
  }
  if (!apiLimiter) {
    apiLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: 'rl:api',
      points: 100,         // 100 requests
      duration: 60,        // per minute
    });
  }
  return apiLimiter;
}

/**
 * Get or create the discovery rate limiter
 * Moderate limits for discovery/likes to prevent abuse
 */
function getDiscoveryLimiter(useMemory = false): RateLimiterAbstract {
  if (useMemory) {
    return getMemoryDiscoveryLimiter();
  }
  if (!discoveryLimiter) {
    discoveryLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: 'rl:discovery',
      points: 30,          // 30 requests
      duration: 60,        // per minute
    });
  }
  return discoveryLimiter;
}

/**
 * Get or create the brute force login protection limiter
 * Tracks failed login attempts by email
 */
function getBruteForceLoginLimiter(useMemory = false): RateLimiterAbstract {
  if (useMemory) {
    return getMemoryBruteForceLimiter();
  }
  if (!bruteForceLoginLimiter) {
    bruteForceLoginLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: 'rl:bruteforce',
      points: 5,           // 5 failed attempts
      duration: 15 * 60,   // per 15 minutes
      blockDuration: 15 * 60, // blocked for 15 minutes
    });
  }
  return bruteForceLoginLimiter;
}

export type LimiterType = 'auth' | 'api' | 'discovery';

/**
 * Get the appropriate limiter based on type
 */
function getLimiter(type: LimiterType, useMemory = false): RateLimiterAbstract {
  switch (type) {
    case 'auth':
      return getAuthLimiter(useMemory);
    case 'discovery':
      return getDiscoveryLimiter(useMemory);
    case 'api':
    default:
      return getApiLimiter(useMemory);
  }
}

/**
 * Get limiter points configuration
 */
function getLimiterPoints(type: LimiterType): number {
  switch (type) {
    case 'auth':
      return 5;
    case 'discovery':
      return 30;
    case 'api':
    default:
      return 100;
  }
}

/**
 * Extract client identifier from request
 * Prefers user ID from session, falls back to IP address
 */
async function getClientIdentifier(req: NextRequest): Promise<string> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return `user:${session.user.id}`;
    }
  } catch {
    // Session check failed, fall back to IP
  }

  // Get IP from various headers (proxies, load balancers)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }

  // Fall back to unknown (Next.js doesn't always provide IP)
  return 'ip:unknown';
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(
  response: NextResponse,
  rateLimitRes: RateLimiterRes,
  points: number
): void {
  response.headers.set('X-RateLimit-Limit', String(points));
  response.headers.set('X-RateLimit-Remaining', String(rateLimitRes.remainingPoints));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitRes.msBeforeNext / 1000)));
}

/**
 * Create a 429 Too Many Requests response
 */
function createRateLimitResponse(rateLimitRes: RateLimiterRes, points: number): NextResponse {
  const retryAfter = Math.ceil(rateLimitRes.msBeforeNext / 1000);

  return NextResponse.json(
    {
      error: 'Trop de requetes',
      message: 'Veuillez patienter avant de reessayer',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(points),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(retryAfter),
      },
    }
  );
}

/**
 * Rate limiting middleware wrapper
 * Wraps a route handler with rate limiting protection
 * Falls back to memory-based rate limiting when Redis is unavailable
 *
 * @param type - The type of rate limiter to use ('auth', 'api', or 'discovery')
 * @returns A higher-order function that wraps route handlers
 *
 * @example
 * // Apply to a route handler
 * export const POST = withRateLimit('auth')(async (req) => {
 *   // Your handler code
 *   return NextResponse.json({ success: true });
 * });
 */
export function withRateLimit(type: LimiterType = 'api') {
  const points = getLimiterPoints(type);

  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const key = await getClientIdentifier(req);

      // Check if Redis is available
      const useMemory = !(await checkRedisAvailable());
      const limiter = getLimiter(type, useMemory);

      try {
        const rateLimitRes = await limiter.consume(key);
        const response = await handler(req);
        addRateLimitHeaders(response, rateLimitRes, points);
        return response;
      } catch (error) {
        // Rate limit exceeded
        if (error instanceof Error && 'msBeforeNext' in error) {
          console.warn(`[RATE_LIMIT] Exceeded for ${key} on ${type} limiter`);
          return createRateLimitResponse(error as unknown as RateLimiterRes, points);
        }

        // Check if it's a RateLimiterRes rejection
        if (typeof error === 'object' && error !== null && 'msBeforeNext' in error) {
          console.warn(`[RATE_LIMIT] Exceeded for ${key} on ${type} limiter`);
          return createRateLimitResponse(error as RateLimiterRes, points);
        }

        // Redis connection error - fallback to memory limiter and retry
        if (error instanceof Error && (
          error.message.includes('MaxRetriesPerRequestError') ||
          error.message.includes('Connection is closed') ||
          error.message.includes('ECONNREFUSED')
        )) {
          console.warn('[RATE_LIMIT] Redis error, falling back to memory limiter');
          redisAvailable = false;
          lastRedisCheck = Date.now();

          try {
            const memoryLimiter = getLimiter(type, true);
            const rateLimitRes = await memoryLimiter.consume(key);
            const response = await handler(req);
            addRateLimitHeaders(response, rateLimitRes, points);
            return response;
          } catch (memoryError) {
            if (typeof memoryError === 'object' && memoryError !== null && 'msBeforeNext' in memoryError) {
              return createRateLimitResponse(memoryError as RateLimiterRes, points);
            }
            throw memoryError;
          }
        }

        // Unexpected error - log and re-throw
        console.error('[RATE_LIMIT] Unexpected error:', error);
        throw error;
      }
    };
  };
}

/**
 * Rate limiting middleware with context support
 * For use with withAuth or other context-providing middleware
 */
export function withRateLimitAndContext<T>(type: LimiterType = 'api') {
  const points = getLimiterPoints(type);

  return (handler: (req: NextRequest, context: T) => Promise<NextResponse>) => {
    return async (req: NextRequest, context: T): Promise<NextResponse> => {
      const key = await getClientIdentifier(req);
      const useMemory = !(await checkRedisAvailable());
      const limiter = getLimiter(type, useMemory);

      try {
        const rateLimitRes = await limiter.consume(key);
        const response = await handler(req, context);
        addRateLimitHeaders(response, rateLimitRes, points);
        return response;
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'msBeforeNext' in error) {
          console.warn(`[RATE_LIMIT] Exceeded for ${key} on ${type} limiter`);
          return createRateLimitResponse(error as RateLimiterRes, points);
        }

        // Redis connection error - fallback to memory limiter
        if (error instanceof Error && (
          error.message.includes('MaxRetriesPerRequestError') ||
          error.message.includes('Connection is closed') ||
          error.message.includes('ECONNREFUSED')
        )) {
          console.warn('[RATE_LIMIT] Redis error, falling back to memory limiter');
          redisAvailable = false;

          try {
            const memoryLimiter = getLimiter(type, true);
            const rateLimitRes = await memoryLimiter.consume(key);
            const response = await handler(req, context);
            addRateLimitHeaders(response, rateLimitRes, points);
            return response;
          } catch (memoryError) {
            if (typeof memoryError === 'object' && memoryError !== null && 'msBeforeNext' in memoryError) {
              return createRateLimitResponse(memoryError as RateLimiterRes, points);
            }
            throw memoryError;
          }
        }

        console.error('[RATE_LIMIT] Unexpected error:', error);
        throw error;
      }
    };
  };
}

/**
 * Brute force protection for login
 * Call this on failed login attempts to track by email
 *
 * @param email - The email that failed to login
 * @returns true if the email should be blocked, false otherwise
 */
export async function trackFailedLogin(email: string): Promise<boolean> {
  const useMemory = !(await checkRedisAvailable());
  const limiter = getBruteForceLoginLimiter(useMemory);
  const key = `email:${email.toLowerCase()}`;

  try {
    await limiter.consume(key);
    return false; // Not blocked yet
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'msBeforeNext' in error) {
      console.warn(`[BRUTE_FORCE] Email blocked: ${email}`);
      return true; // Blocked
    }

    // Redis error - try memory fallback
    if (error instanceof Error && (
      error.message.includes('MaxRetriesPerRequestError') ||
      error.message.includes('Connection is closed')
    )) {
      redisAvailable = false;
      const memoryLimiter = getBruteForceLoginLimiter(true);
      try {
        await memoryLimiter.consume(key);
        return false;
      } catch (memErr) {
        if (typeof memErr === 'object' && memErr !== null && 'msBeforeNext' in memErr) {
          return true;
        }
      }
    }
    // In case of error, allow login attempt (fail open for usability)
    console.error('[BRUTE_FORCE] Error tracking failed login:', error);
    return false;
  }
}

/**
 * Check if an email is currently blocked due to too many failed attempts
 *
 * @param email - The email to check
 * @returns true if blocked, false otherwise
 */
export async function isEmailBlocked(email: string): Promise<boolean> {
  const useMemory = !(await checkRedisAvailable());
  const limiter = getBruteForceLoginLimiter(useMemory);
  const key = `email:${email.toLowerCase()}`;

  try {
    const res = await limiter.get(key);
    if (res !== null && res.remainingPoints <= 0) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Reset failed login attempts for an email (call on successful login)
 *
 * @param email - The email to reset
 */
export async function resetFailedLoginAttempts(email: string): Promise<void> {
  const useMemory = !(await checkRedisAvailable());
  const limiter = getBruteForceLoginLimiter(useMemory);
  const key = `email:${email.toLowerCase()}`;

  try {
    await limiter.delete(key);
  } catch (error) {
    // If Redis failed, try memory fallback
    if (!useMemory) {
      try {
        const memoryLimiter = getBruteForceLoginLimiter(true);
        await memoryLimiter.delete(key);
      } catch {
        // Ignore - not critical
      }
    }
    console.error('[BRUTE_FORCE] Failed to reset attempts:', error);
  }
}

/**
 * Get remaining login attempts for an email
 *
 * @param email - The email to check
 * @returns Number of remaining attempts, or null if no attempts recorded
 */
export async function getRemainingLoginAttempts(email: string): Promise<number | null> {
  const useMemory = !(await checkRedisAvailable());
  const limiter = getBruteForceLoginLimiter(useMemory);
  const key = `email:${email.toLowerCase()}`;

  try {
    const res = await limiter.get(key);
    if (res === null) {
      return 5; // Max attempts if no record
    }
    return res.remainingPoints;
  } catch {
    return null;
  }
}

// Re-export types for convenience
export type { RateLimiterRes };
