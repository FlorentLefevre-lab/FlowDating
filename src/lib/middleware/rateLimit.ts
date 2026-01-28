/**
 * Rate Limiting Middleware for API Routes
 *
 * Provides protection against abuse using Redis-backed rate limiting.
 * Different limiters are configured for different route types.
 */

import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { getRedisClient } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Lazy initialization of rate limiters (created on first use)
let authLimiter: RateLimiterRedis | null = null;
let apiLimiter: RateLimiterRedis | null = null;
let discoveryLimiter: RateLimiterRedis | null = null;
let bruteForceLoginLimiter: RateLimiterRedis | null = null;

/**
 * Get or create the auth rate limiter
 * Strict limits for authentication routes
 */
function getAuthLimiter(): RateLimiterRedis {
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
function getApiLimiter(): RateLimiterRedis {
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
function getDiscoveryLimiter(): RateLimiterRedis {
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
function getBruteForceLoginLimiter(): RateLimiterRedis {
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
function getLimiter(type: LimiterType): RateLimiterRedis {
  switch (type) {
    case 'auth':
      return getAuthLimiter();
    case 'discovery':
      return getDiscoveryLimiter();
    case 'api':
    default:
      return getApiLimiter();
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
    const session = await getServerSession(authOptions);
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
      const limiter = getLimiter(type);
      const key = await getClientIdentifier(req);

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
      const limiter = getLimiter(type);
      const key = await getClientIdentifier(req);

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
  const limiter = getBruteForceLoginLimiter();
  const key = `email:${email.toLowerCase()}`;

  try {
    await limiter.consume(key);
    return false; // Not blocked yet
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'msBeforeNext' in error) {
      console.warn(`[BRUTE_FORCE] Email blocked: ${email}`);
      return true; // Blocked
    }
    throw error;
  }
}

/**
 * Check if an email is currently blocked due to too many failed attempts
 *
 * @param email - The email to check
 * @returns true if blocked, false otherwise
 */
export async function isEmailBlocked(email: string): Promise<boolean> {
  const limiter = getBruteForceLoginLimiter();
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
  const limiter = getBruteForceLoginLimiter();
  const key = `email:${email.toLowerCase()}`;

  try {
    await limiter.delete(key);
  } catch (error) {
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
  const limiter = getBruteForceLoginLimiter();
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
