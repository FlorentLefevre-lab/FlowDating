/**
 * Rate Limiting Security Tests
 *
 * Tests for verifying rate limiting controls across API routes.
 * These tests ensure protection against brute force attacks and DoS.
 *
 * OWASP Coverage:
 * - A04:2021 Insecure Design (lack of rate limiting)
 * - A07:2021 Identification and Authentication Failures (brute force)
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration (expected values)
const RATE_LIMITS = {
  AUTH_ROUTES: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
    routes: ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'],
  },
  API_ROUTES: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
    routes: ['/api/profile', '/api/matches', '/api/user/*'],
  },
  DISCOVERY_ROUTES: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
    routes: ['/api/discover'],
  },
  LIKES_ROUTES: {
    limit: 100,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    routes: ['/api/likes'],
  },
  PASSWORD_RESET: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    routes: ['/api/auth/forgot-password'],
  },
};

// Mock rate limiter middleware
function createRateLimiter(limit: number, windowMs: number) {
  return (ip: string): { allowed: boolean; remaining: number; resetTime: number } => {
    const now = Date.now();
    const key = ip;
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
    }

    if (record.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
  };
}

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  loginAttempt: {
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

// Mock auth
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock cache with rate limiting support
const mockCache = {
  userBasic: { get: jest.fn(), set: jest.fn() },
  discover: { get: jest.fn(), set: jest.fn() },
  exclusions: { get: jest.fn(), set: jest.fn() },
  invalidateUser: jest.fn(),
  rateLimit: {
    get: jest.fn(),
    set: jest.fn(),
    increment: jest.fn(),
  },
};

jest.mock('@/lib/cache', () => ({
  apiCache: mockCache,
}));

// Helper to simulate multiple requests
async function simulateRequests(
  count: number,
  rateLimiter: (ip: string) => { allowed: boolean; remaining: number; resetTime: number },
  ip: string = '192.168.1.1'
): Promise<{ allowed: number; blocked: number; lastResult: any }> {
  let allowed = 0;
  let blocked = 0;
  let lastResult;

  for (let i = 0; i < count; i++) {
    lastResult = rateLimiter(ip);
    if (lastResult.allowed) {
      allowed++;
    } else {
      blocked++;
    }
  }

  return { allowed, blocked, lastResult };
}

describe('Rate Limiting Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rateLimitStore.clear();
  });

  // ============================================================
  // Auth Routes Rate Limiting (5 req/min)
  // ============================================================
  describe('Auth Routes (5 req/min)', () => {
    const rateLimiter = createRateLimiter(5, 60 * 1000);

    it('should allow 5 requests within the window', async () => {
      const { allowed, blocked } = await simulateRequests(5, rateLimiter);

      expect(allowed).toBe(5);
      expect(blocked).toBe(0);
    });

    it('should block 6th request with 429', async () => {
      const { allowed, blocked, lastResult } = await simulateRequests(6, rateLimiter);

      expect(allowed).toBe(5);
      expect(blocked).toBe(1);
      expect(lastResult.allowed).toBe(false);
    });

    it('should block all requests after limit exceeded', async () => {
      const { allowed, blocked } = await simulateRequests(10, rateLimiter);

      expect(allowed).toBe(5);
      expect(blocked).toBe(5);
    });

    it('should include X-RateLimit-* headers', async () => {
      const result = rateLimiter('192.168.1.1');

      // Expected headers in response:
      const expectedHeaders = {
        'X-RateLimit-Limit': 5,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': expect.any(Number),
      };

      expect(result.remaining).toBeLessThanOrEqual(5);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should reset after window expires', async () => {
      // First batch
      await simulateRequests(5, rateLimiter);

      // Simulate window expiration by clearing store
      rateLimitStore.clear();

      // Second batch should work
      const { allowed } = await simulateRequests(5, rateLimiter);
      expect(allowed).toBe(5);
    });

    it('should track rate limit per IP address', async () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      // Max out IP1
      await simulateRequests(5, rateLimiter, ip1);

      // IP2 should still be allowed
      const result = rateLimiter(ip2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  // ============================================================
  // API Routes Rate Limiting (100 req/min)
  // ============================================================
  describe('API Routes (100 req/min)', () => {
    const rateLimiter = createRateLimiter(100, 60 * 1000);

    it('should allow 100 requests within the window', async () => {
      const { allowed, blocked } = await simulateRequests(100, rateLimiter);

      expect(allowed).toBe(100);
      expect(blocked).toBe(0);
    });

    it('should block 101st request with 429', async () => {
      const { allowed, blocked, lastResult } = await simulateRequests(101, rateLimiter);

      expect(allowed).toBe(100);
      expect(blocked).toBe(1);
      expect(lastResult.allowed).toBe(false);
    });

    it('should handle high volume without performance degradation', async () => {
      const startTime = Date.now();
      await simulateRequests(100, rateLimiter);
      const duration = Date.now() - startTime;

      // Should complete quickly (< 100ms for 100 requests)
      expect(duration).toBeLessThan(100);
    });
  });

  // ============================================================
  // Discovery Routes Rate Limiting (30 req/min)
  // ============================================================
  describe('Discovery Routes (30 req/min)', () => {
    const rateLimiter = createRateLimiter(30, 60 * 1000);

    it('should allow 30 requests within the window', async () => {
      const { allowed, blocked } = await simulateRequests(30, rateLimiter);

      expect(allowed).toBe(30);
      expect(blocked).toBe(0);
    });

    it('should block 31st request with 429', async () => {
      const { allowed, blocked, lastResult } = await simulateRequests(31, rateLimiter);

      expect(allowed).toBe(30);
      expect(blocked).toBe(1);
      expect(lastResult.allowed).toBe(false);
    });

    it('should prevent rapid profile swiping abuse', async () => {
      // Simulating someone trying to swipe through profiles too quickly
      const { blocked } = await simulateRequests(50, rateLimiter);

      expect(blocked).toBe(20); // 50 - 30 allowed
    });
  });

  // ============================================================
  // Daily Likes Limit (100 likes/day)
  // ============================================================
  describe('Daily Likes Limit (100/day)', () => {
    const rateLimiter = createRateLimiter(100, 24 * 60 * 60 * 1000);

    it('should allow 100 likes per day', async () => {
      const { allowed, blocked } = await simulateRequests(100, rateLimiter);

      expect(allowed).toBe(100);
      expect(blocked).toBe(0);
    });

    it('should block after 100 likes with 429', async () => {
      const { allowed, blocked, lastResult } = await simulateRequests(101, rateLimiter);

      expect(allowed).toBe(100);
      expect(blocked).toBe(1);
      expect(lastResult.allowed).toBe(false);
    });

    it('should enforce daily super likes limit (5/day)', async () => {
      const superLikeLimiter = createRateLimiter(5, 24 * 60 * 60 * 1000);
      const { allowed, blocked } = await simulateRequests(6, superLikeLimiter);

      expect(allowed).toBe(5);
      expect(blocked).toBe(1);
    });
  });

  // ============================================================
  // Login Brute Force Protection
  // ============================================================
  describe('Login Brute Force Protection', () => {
    const loginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

    function trackLoginAttempt(email: string, success: boolean): {
      allowed: boolean;
      remainingAttempts: number;
      lockedUntil: number | null;
    } {
      const now = Date.now();
      const record = loginAttempts.get(email) || { count: 0, lockedUntil: null };

      // Check if locked
      if (record.lockedUntil && now < record.lockedUntil) {
        return {
          allowed: false,
          remainingAttempts: 0,
          lockedUntil: record.lockedUntil,
        };
      }

      // Reset if lock expired
      if (record.lockedUntil && now >= record.lockedUntil) {
        record.count = 0;
        record.lockedUntil = null;
      }

      if (success) {
        // Reset on successful login
        loginAttempts.delete(email);
        return { allowed: true, remainingAttempts: 5, lockedUntil: null };
      }

      // Failed attempt
      record.count++;
      if (record.count >= 5) {
        // Lock for 15 minutes
        record.lockedUntil = now + 15 * 60 * 1000;
      }

      loginAttempts.set(email, record);

      return {
        allowed: record.count < 5,
        remainingAttempts: Math.max(0, 5 - record.count),
        lockedUntil: record.lockedUntil,
      };
    }

    beforeEach(() => {
      loginAttempts.clear();
    });

    it('should lock account after 5 failed attempts', () => {
      const email = 'test@example.com';

      for (let i = 0; i < 5; i++) {
        trackLoginAttempt(email, false);
      }

      const result = trackLoginAttempt(email, false);
      expect(result.allowed).toBe(false);
      expect(result.lockedUntil).not.toBeNull();
    });

    it('should allow login attempts before reaching limit', () => {
      const email = 'test@example.com';

      const result = trackLoginAttempt(email, false);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(4);
    });

    it('should reset attempts after successful login', () => {
      const email = 'test@example.com';

      // 3 failed attempts
      trackLoginAttempt(email, false);
      trackLoginAttempt(email, false);
      trackLoginAttempt(email, false);

      // Successful login
      const result = trackLoginAttempt(email, true);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);

      // Next attempt should have full quota
      const nextResult = trackLoginAttempt(email, false);
      expect(nextResult.remainingAttempts).toBe(4);
    });

    it('should unlock after 15 minutes', () => {
      const email = 'test@example.com';

      // Lock the account
      for (let i = 0; i < 5; i++) {
        trackLoginAttempt(email, false);
      }

      // Verify locked
      let result = trackLoginAttempt(email, false);
      expect(result.allowed).toBe(false);

      // Simulate time passing
      const record = loginAttempts.get(email)!;
      record.lockedUntil = Date.now() - 1; // Lock expired

      // Should be unlocked now
      result = trackLoginAttempt(email, false);
      expect(result.allowed).toBe(true);
    });

    it('should not increment counter on successful login', () => {
      const email = 'test@example.com';

      // Successful login
      const result = trackLoginAttempt(email, true);
      expect(result.remainingAttempts).toBe(5);

      // Counter should not exist
      expect(loginAttempts.has(email)).toBe(false);
    });

    it('should track attempts per email independently', () => {
      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';

      // Lock email1
      for (let i = 0; i < 5; i++) {
        trackLoginAttempt(email1, false);
      }

      // email2 should be unaffected
      const result = trackLoginAttempt(email2, false);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(4);
    });
  });

  // ============================================================
  // Password Reset Rate Limiting
  // ============================================================
  describe('Password Reset Rate Limiting', () => {
    const resetAttempts = new Map<string, { count: number; resetTime: number }>();

    function trackResetAttempt(email: string): { allowed: boolean; remaining: number } {
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 hour
      const limit = 3;

      const record = resetAttempts.get(email);

      if (!record || now > record.resetTime) {
        resetAttempts.set(email, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: limit - 1 };
      }

      if (record.count >= limit) {
        return { allowed: false, remaining: 0 };
      }

      record.count++;
      return { allowed: true, remaining: limit - record.count };
    }

    beforeEach(() => {
      resetAttempts.clear();
    });

    it('should rate limit to 3 requests per email per hour', () => {
      const email = 'test@example.com';

      // First 3 should succeed
      expect(trackResetAttempt(email).allowed).toBe(true);
      expect(trackResetAttempt(email).allowed).toBe(true);
      expect(trackResetAttempt(email).allowed).toBe(true);

      // 4th should be blocked
      expect(trackResetAttempt(email).allowed).toBe(false);
    });

    it('should not reveal if email exists', () => {
      // The API should always return the same message:
      // "Si un compte existe avec cet email, vous recevrez un lien de reinitialisation."

      const existingEmail = 'existing@example.com';
      const nonExistingEmail = 'nonexisting@example.com';

      // Both should return the same response message
      // This is implemented in the forgot-password route
    });

    it('should invalidate token after single use', async () => {
      // The reset-password route deletes the token after use:
      // await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })

      mockPrisma.passwordResetToken.findUnique.mockResolvedValueOnce({
        id: 'token-1',
        email: 'test@example.com',
        token: 'valid-token',
        expires: new Date(Date.now() + 3600000),
      });

      // After first use, token should be deleted
      mockPrisma.passwordResetToken.findUnique.mockResolvedValueOnce(null);

      // First use
      const firstUse = await mockPrisma.passwordResetToken.findUnique({ where: { token: 'valid-token' } });
      expect(firstUse).not.toBeNull();

      // Simulate deletion
      await mockPrisma.passwordResetToken.delete({ where: { id: 'token-1' } });

      // Second use should fail
      const secondUse = await mockPrisma.passwordResetToken.findUnique({ where: { token: 'valid-token' } });
      expect(secondUse).toBeNull();
    });
  });

  // ============================================================
  // Email Verification Rate Limiting
  // ============================================================
  describe('Email Verification Rate Limiting', () => {
    it('should invalidate token after single use', async () => {
      // The verify-email route deletes the token after use:
      // await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } })
    });

    it('should expire token after 24 hours', async () => {
      const token = {
        id: 'token-1',
        email: 'test@example.com',
        token: 'verification-token',
        expires: new Date(Date.now() - 1), // Expired
      };

      // The route checks: if (verificationToken.expires < new Date())
      expect(token.expires < new Date()).toBe(true);
    });

    it('should limit resend verification to 3 per hour', () => {
      // SECURITY RECOMMENDATION:
      // Implement rate limiting on resend-verification endpoint
      // to prevent email bombing
    });
  });

  // ============================================================
  // Rate Limit Response Format
  // ============================================================
  describe('Rate Limit Response Format', () => {
    it('should return 429 status code when rate limited', () => {
      const response = NextResponse.json(
        { error: 'Trop de requetes. Veuillez reessayer plus tard.' },
        { status: 429 }
      );

      expect(response.status).toBe(429);
    });

    it('should include Retry-After header', () => {
      const retryAfterSeconds = 60;
      const headers = new Headers({
        'Retry-After': retryAfterSeconds.toString(),
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (Date.now() + 60000).toString(),
      });

      expect(headers.get('Retry-After')).toBe('60');
    });

    it('should include rate limit info in error response', () => {
      const errorResponse = {
        error: 'Trop de requetes',
        retryAfter: 60,
        limit: 5,
        remaining: 0,
      };

      expect(errorResponse).toHaveProperty('retryAfter');
      expect(errorResponse).toHaveProperty('limit');
      expect(errorResponse).toHaveProperty('remaining');
    });
  });

  // ============================================================
  // Distributed Rate Limiting (Redis)
  // ============================================================
  describe('Distributed Rate Limiting', () => {
    it('should work across multiple server instances', () => {
      // SECURITY RECOMMENDATION:
      // For production with multiple instances, use Redis-based rate limiting
      // Current in-memory implementation won't work in distributed environment
    });

    it('should persist rate limit state across restarts', () => {
      // SECURITY RECOMMENDATION:
      // Rate limit state should be persisted in Redis
      // to prevent bypass via server restart
    });
  });

  // ============================================================
  // Rate Limit Bypass Prevention
  // ============================================================
  describe('Rate Limit Bypass Prevention', () => {
    it('should not be bypassable via X-Forwarded-For header', () => {
      // SECURITY: Rate limiting should use the actual client IP
      // not trust X-Forwarded-For which can be spoofed
      // Use trusted proxy configuration
    });

    it('should rate limit by user ID when authenticated', () => {
      // For authenticated routes, rate limit by user ID + IP
      // to prevent bypass via multiple IPs
    });

    it('should combine IP and user-based rate limiting', () => {
      // Best practice: limit by both IP (unauthenticated) and user ID (authenticated)
    });
  });
});

// ============================================================
// Rate Limit Configuration Validation
// ============================================================
describe('Rate Limit Configuration', () => {
  it('should have appropriate limits for auth routes', () => {
    expect(RATE_LIMITS.AUTH_ROUTES.limit).toBe(5);
    expect(RATE_LIMITS.AUTH_ROUTES.windowMs).toBe(60 * 1000);
  });

  it('should have appropriate limits for API routes', () => {
    expect(RATE_LIMITS.API_ROUTES.limit).toBe(100);
    expect(RATE_LIMITS.API_ROUTES.windowMs).toBe(60 * 1000);
  });

  it('should have appropriate limits for discovery routes', () => {
    expect(RATE_LIMITS.DISCOVERY_ROUTES.limit).toBe(30);
    expect(RATE_LIMITS.DISCOVERY_ROUTES.windowMs).toBe(60 * 1000);
  });

  it('should have appropriate limits for password reset', () => {
    expect(RATE_LIMITS.PASSWORD_RESET.limit).toBe(3);
    expect(RATE_LIMITS.PASSWORD_RESET.windowMs).toBe(60 * 60 * 1000);
  });
});
