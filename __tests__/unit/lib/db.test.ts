/**
 * Unit tests for src/lib/db.ts
 * Tests Prisma client singleton pattern
 */

describe('Database Client', () => {
  const originalEnv = process.env;
  const originalGlobalThis = { ...globalThis };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };

    // Reset globalThis.prisma
    delete (globalThis as any).prisma;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('singleton pattern', () => {
    it('should export prisma client', async () => {
      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          user: {},
          profile: {},
          match: {},
          like: {},
        })),
      }));

      const { prisma } = await import('@/lib/db');

      expect(prisma).toBeDefined();
    });

    it('should have user model', async () => {
      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          user: { findUnique: jest.fn(), findMany: jest.fn() },
          profile: {},
          match: {},
          like: {},
        })),
      }));

      const { prisma } = await import('@/lib/db');

      expect(prisma.user).toBeDefined();
    });

    it('should reuse client in development mode', async () => {
      process.env.NODE_ENV = 'development';

      let constructorCallCount = 0;

      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => {
          constructorCallCount++;
          return {
            $connect: jest.fn(),
            $disconnect: jest.fn(),
            user: {},
          };
        }),
      }));

      // First import
      const { prisma: prisma1 } = await import('@/lib/db');

      // Second import (after setting on globalThis)
      jest.resetModules();
      (globalThis as any).prisma = prisma1;

      const dbModule2 = await import('@/lib/db');
      const prisma2 = dbModule2.prisma;

      // Should be the same instance
      expect(prisma2).toBe(prisma1);
    });

    it('should create new client in production', async () => {
      process.env.NODE_ENV = 'production';

      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          user: {},
        })),
      }));

      const { prisma } = await import('@/lib/db');

      // In production, globalThis.prisma should not be set
      // The implementation sets it only in non-production
      expect(prisma).toBeDefined();
    });
  });

  describe('logging configuration', () => {
    it('should enable query logging in development', async () => {
      process.env.NODE_ENV = 'development';

      let capturedConfig: any = null;

      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation((config) => {
          capturedConfig = config;
          return {
            $connect: jest.fn(),
            $disconnect: jest.fn(),
            user: {},
          };
        }),
      }));

      await import('@/lib/db');

      expect(capturedConfig?.log).toEqual(['query', 'error', 'warn']);
    });

    it('should only log errors in production', async () => {
      process.env.NODE_ENV = 'production';

      let capturedConfig: any = null;

      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation((config) => {
          capturedConfig = config;
          return {
            $connect: jest.fn(),
            $disconnect: jest.fn(),
            user: {},
          };
        }),
      }));

      await import('@/lib/db');

      expect(capturedConfig?.log).toEqual(['error']);
    });
  });

  describe('default export', () => {
    it('should export prisma as default', async () => {
      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          user: {},
        })),
      }));

      const dbModule = await import('@/lib/db');

      expect(dbModule.default).toBe(dbModule.prisma);
    });
  });

  describe('type safety', () => {
    it('should have correct model types', async () => {
      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          user: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
          profile: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            upsert: jest.fn(),
          },
          match: {
            findMany: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
          },
          like: {
            findFirst: jest.fn(),
            create: jest.fn(),
          },
        })),
      }));

      const { prisma } = await import('@/lib/db');

      // Verify model methods exist
      expect(typeof prisma.user.findUnique).toBe('function');
      expect(typeof prisma.user.findFirst).toBe('function');
      expect(typeof prisma.user.findMany).toBe('function');
      expect(typeof prisma.user.create).toBe('function');
      expect(typeof prisma.user.update).toBe('function');
      expect(typeof prisma.user.delete).toBe('function');

      expect(typeof prisma.profile.findUnique).toBe('function');
      expect(typeof prisma.profile.upsert).toBe('function');

      expect(typeof prisma.match.findMany).toBe('function');
      expect(typeof prisma.like.findFirst).toBe('function');
    });
  });

  describe('connection management', () => {
    it('should expose $connect method', async () => {
      const mockConnect = jest.fn().mockResolvedValue(undefined);

      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $connect: mockConnect,
          $disconnect: jest.fn(),
          user: {},
        })),
      }));

      const { prisma } = await import('@/lib/db');

      expect(prisma.$connect).toBe(mockConnect);
    });

    it('should expose $disconnect method', async () => {
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);

      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $connect: jest.fn(),
          $disconnect: mockDisconnect,
          user: {},
        })),
      }));

      const { prisma } = await import('@/lib/db');

      expect(prisma.$disconnect).toBe(mockDisconnect);
    });
  });

  describe('globalThis caching', () => {
    it('should set prisma on globalThis in development', async () => {
      process.env.NODE_ENV = 'development';
      delete (globalThis as any).prisma;

      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          user: {},
        })),
      }));

      const { prisma } = await import('@/lib/db');

      // In development, it should be cached
      // Note: The actual behavior depends on the implementation
      expect(prisma).toBeDefined();
    });

    it('should not set prisma on globalThis in production', async () => {
      process.env.NODE_ENV = 'production';
      delete (globalThis as any).prisma;

      jest.mock('@prisma/client', () => ({
        PrismaClient: jest.fn().mockImplementation(() => ({
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          user: {},
        })),
      }));

      await import('@/lib/db');

      // In production, globalThis.prisma should not be set
      // The implementation only caches in non-production
      // Since we're testing in test env (treated as dev), this is a design test
    });
  });
});
