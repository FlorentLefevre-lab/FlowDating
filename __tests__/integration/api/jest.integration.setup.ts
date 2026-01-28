/**
 * Jest Setup for Integration Tests
 * This setup is specifically for API integration tests that need real database access
 */

import { PrismaClient } from '@prisma/client';

// Global test prisma client
const globalForPrisma = globalThis as unknown as {
  testPrisma: PrismaClient | undefined;
};

const testPrisma = globalForPrisma.testPrisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
    },
  },
  log: process.env.DEBUG ? ['query', 'info', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.testPrisma = testPrisma;
}

// Global mock session store (shared with setup.ts via globalThis)
interface MockSession {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
  expires: string;
}

const globalMockSessionStore = globalThis as unknown as {
  __mockSession: MockSession | null;
};

if (globalMockSessionStore.__mockSession === undefined) {
  globalMockSessionStore.__mockSession = null;
}

export function setMockSession(session: MockSession | null) {
  globalMockSessionStore.__mockSession = session;
}

export function getMockSession(): MockSession | null {
  return globalMockSessionStore.__mockSession;
}

export function clearMockSession() {
  globalMockSessionStore.__mockSession = null;
}

// Mock the auth module for integration tests
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => {
    const globalStore = globalThis as unknown as { __mockSession: MockSession | null };
    return Promise.resolve(globalStore.__mockSession);
  }),
  authOptions: {},
}));

// Also mock the app alias path
jest.mock('../../../src/lib/auth', () => ({
  auth: jest.fn(() => {
    const globalStore = globalThis as unknown as { __mockSession: MockSession | null };
    return Promise.resolve(globalStore.__mockSession);
  }),
  authOptions: {},
}));

// Mock email module to prevent actual emails being sent
jest.mock('@/lib/email', () => ({
  sendEmailVerification: jest.fn(() => Promise.resolve(true)),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve(true)),
}));

// Mock cache module for tests
jest.mock('@/lib/cache', () => ({
  apiCache: {
    userBasic: {
      get: jest.fn(() => Promise.resolve(null)),
      set: jest.fn(() => Promise.resolve()),
    },
    discover: {
      get: jest.fn(() => Promise.resolve(null)),
      set: jest.fn(() => Promise.resolve()),
    },
    exclusions: {
      get: jest.fn(() => Promise.resolve(null)),
      set: jest.fn(() => Promise.resolve()),
    },
    invalidateUser: jest.fn(() => Promise.resolve()),
  },
}));

// Global setup
beforeAll(async () => {
  // Ensure database connection
  try {
    await testPrisma.$connect();
    console.log('Test database connected');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

// Global teardown
afterAll(async () => {
  await testPrisma.$disconnect();
  console.log('Test database disconnected');
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  clearMockSession();
});

// Export for use in tests
export { testPrisma };
