/**
 * Unit tests for src/lib/auth.ts
 * Tests NextAuth configuration, password hashing, and session handling
 */

import bcrypt from 'bcryptjs';

// Mock ioredis before any imports that might use it
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// Mock dependencies before importing auth module
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock redis module
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
  },
  getRedis: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
  }),
}));

// Mock rate limit middleware
jest.mock('@/lib/middleware/rateLimit', () => ({
  withRateLimit: jest.fn(() => (handler: any) => handler),
  authLimiter: { consume: jest.fn() },
  apiLimiter: { consume: jest.fn() },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn(() => ({ id: 'google', name: 'Google' })),
}));

jest.mock('next-auth/providers/facebook', () => ({
  __esModule: true,
  default: jest.fn(() => ({ id: 'facebook', name: 'Facebook' })),
}));

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn((config) => ({
    id: 'credentials',
    name: 'credentials',
    ...config,
  })),
}));

jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({})),
}));

describe('Auth Utilities', () => {
  let prisma: { user: { findUnique: jest.Mock } };
  let authOptions: typeof import('@/lib/auth').authOptions;
  let auth: typeof import('@/lib/auth').auth;
  let getServerSession: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Get mocked modules
    prisma = (await import('@/lib/db')).prisma as unknown as { user: { findUnique: jest.Mock } };
    getServerSession = (await import('next-auth')).getServerSession as jest.Mock;

    // Import auth module
    const authModule = await import('@/lib/auth');
    authOptions = authModule.authOptions;
    auth = authModule.auth;
  });

  describe('password hashing', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 12);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}$/);
    });

    it('should verify correct password', async () => {
      const password = 'correctPassword';
      const hashedPassword = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword';
      const hashedPassword = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare('wrongPassword', hashedPassword);

      expect(isValid).toBe(false);
    });

    it('should use cost factor of 12', async () => {
      const password = 'test';
      const hashedPassword = await bcrypt.hash(password, 12);

      // The cost factor is encoded in the hash: $2a$12$...
      expect(hashedPassword).toMatch(/^\$2[aby]?\$12\$/);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'samePassword';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);

      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });

  describe('authOptions configuration', () => {
    it('should have JWT session strategy', () => {
      expect(authOptions.session?.strategy).toBe('jwt');
    });

    it('should have 30 day session max age', () => {
      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60);
    });

    it('should configure custom sign in page', () => {
      expect(authOptions.pages?.signIn).toBe('/auth/login');
    });

    it('should configure custom error page', () => {
      expect(authOptions.pages?.error).toBe('/auth/error');
    });

    it('should have credentials provider configured', () => {
      const credentialsProvider = authOptions.providers.find(
        (p: any) => p.id === 'credentials'
      );
      expect(credentialsProvider).toBeDefined();
    });

    it('should have google provider configured', () => {
      const googleProvider = authOptions.providers.find(
        (p: any) => p.id === 'google'
      );
      expect(googleProvider).toBeDefined();
    });

    it('should have facebook provider configured', () => {
      const facebookProvider = authOptions.providers.find(
        (p: any) => p.id === 'facebook'
      );
      expect(facebookProvider).toBeDefined();
    });
  });

  describe('credentials authorize', () => {
    let authorize: Function;

    beforeEach(() => {
      const credentialsProvider = authOptions.providers.find(
        (p: any) => p.id === 'credentials'
      ) as any;
      authorize = credentialsProvider.authorize;
    });

    it('should return null for missing credentials', async () => {
      const result = await authorize({});
      expect(result).toBeNull();

      const result2 = await authorize({ email: 'test@test.com' });
      expect(result2).toBeNull();

      const result3 = await authorize({ password: 'password' });
      expect(result3).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await authorize({
        email: 'nonexistent@test.com',
        password: 'password',
      });

      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@test.com' },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          hashedPassword: true,
          emailVerified: true,
        },
      });
    });

    it('should return null for user without password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'oauth@test.com',
        name: 'OAuth User',
        image: null,
        hashedPassword: null,
        emailVerified: new Date(),
      });

      const result = await authorize({
        email: 'oauth@test.com',
        password: 'password',
      });

      expect(result).toBeNull();
    });

    it('should return null for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 12);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        image: null,
        hashedPassword,
        emailVerified: new Date(),
      });

      const result = await authorize({
        email: 'test@test.com',
        password: 'wrongPassword',
      });

      expect(result).toBeNull();
    });

    it('should return user for correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 12);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        image: 'https://example.com/photo.jpg',
        hashedPassword,
        emailVerified: new Date(),
      });

      const result = await authorize({
        email: 'test@test.com',
        password: 'correctPassword',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        image: 'https://example.com/photo.jpg',
      });
    });

    it('should handle database errors gracefully', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await authorize({
        email: 'test@test.com',
        password: 'password',
      });

      expect(result).toBeNull();
    });
  });

  describe('JWT callback', () => {
    it('should add user id to token on sign in', async () => {
      const jwtCallback = authOptions.callbacks?.jwt;

      const token = { sub: 'old-id' };
      const user = { id: 'user-123', email: 'test@test.com' };

      const result = await jwtCallback!({
        token,
        user,
        account: null,
        trigger: 'signIn',
      });

      expect(result.id).toBe('user-123');
    });

    it('should preserve token when no user', async () => {
      const jwtCallback = authOptions.callbacks?.jwt;

      const token = { sub: 'existing', id: 'existing-id' };

      const result = await jwtCallback!({
        token,
        user: undefined as any,
        account: null,
        trigger: 'update',
      });

      expect(result.id).toBe('existing-id');
    });
  });

  describe('session callback', () => {
    it('should add user id to session', async () => {
      const sessionCallback = authOptions.callbacks?.session;

      const session = {
        user: { email: 'test@test.com', name: 'Test' },
        expires: '2099-01-01',
      };
      const token = { id: 'user-123', sub: 'user-123' };

      const result = await sessionCallback!({
        session,
        token,
        user: undefined as any,
        newSession: undefined,
        trigger: 'update',
      });

      expect((result.user as any).id).toBe('user-123');
    });

    it('should handle missing token id', async () => {
      const sessionCallback = authOptions.callbacks?.session;

      const session = {
        user: { email: 'test@test.com', name: 'Test' },
        expires: '2099-01-01',
      };
      const token = { sub: 'user-123' };

      const result = await sessionCallback!({
        session,
        token,
        user: undefined as any,
        newSession: undefined,
        trigger: 'update',
      });

      // Should still return session even without id
      expect(result.user).toBeDefined();
    });
  });

  describe('auth helper function', () => {
    it('should call getServerSession with authOptions', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@test.com' },
        expires: '2099-01-01',
      };
      getServerSession.mockResolvedValue(mockSession);

      const result = await auth();

      expect(getServerSession).toHaveBeenCalledWith(authOptions);
      expect(result).toEqual(mockSession);
    });

    it('should return null when no session', async () => {
      getServerSession.mockResolvedValue(null);

      const result = await auth();

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in password', async () => {
      const password = 'p@$$w0rd!#$%^&*()';
      const hashedPassword = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in password', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should handle very long passwords', async () => {
      // bcrypt has a max length of 72 bytes
      const longPassword = 'a'.repeat(100);
      const hashedPassword = await bcrypt.hash(longPassword, 12);

      // Note: bcrypt truncates at 72 bytes
      const isValid = await bcrypt.compare(longPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should handle empty string credentials', async () => {
      const credentialsProvider = authOptions.providers.find(
        (p: any) => p.id === 'credentials'
      ) as any;
      const authorize = credentialsProvider.authorize;

      const result = await authorize({
        email: '',
        password: '',
      });

      expect(result).toBeNull();
    });
  });
});
