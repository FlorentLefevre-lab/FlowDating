/**
 * Test Setup for API Integration Tests
 * Provides utilities for mocking authentication, creating test data, and cleaning up
 */

import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Singleton Prisma client for tests
const globalForPrisma = globalThis as unknown as {
  testPrisma: PrismaClient | undefined;
};

export const testPrisma = globalForPrisma.testPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.testPrisma = testPrisma;

// Mock session type
export interface MockSession {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
  expires: string;
}

// Global mock session store (shared with jest.integration.setup.ts via globalThis)
const globalMockSessionStore = globalThis as unknown as {
  __mockSession: MockSession | null;
};

if (globalMockSessionStore.__mockSession === undefined) {
  globalMockSessionStore.__mockSession = null;
}

/**
 * Mock the auth() function to return a specific session
 */
export function mockAuthSession(session: MockSession | null) {
  globalMockSessionStore.__mockSession = session;
}

/**
 * Get the current mock session (used by mocked auth())
 */
export function getMockSession(): MockSession | null {
  return globalMockSessionStore.__mockSession;
}

/**
 * Clear the mock session
 */
export function clearMockSession() {
  globalMockSessionStore.__mockSession = null;
}

/**
 * Create an authenticated mock session for a user
 */
export function createAuthenticatedSession(user: {
  id: string;
  email: string;
  name: string;
}): MockSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create a NextRequest with the given options
 */
export function createRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options;

  const fullUrl = new URL(url, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]) => {
    fullUrl.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl.toString(), requestInit);
}

/**
 * Test user factory - creates a user with hashed password
 */
export async function createTestUser(data: {
  email: string;
  name: string;
  password?: string;
  emailVerified?: boolean;
  age?: number;
  bio?: string;
  location?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NON_BINARY';
  interests?: string[];
}): Promise<{
  id: string;
  email: string;
  name: string;
  hashedPassword: string | null;
  bio?: string | null;
}> {
  const hashedPassword = data.password
    ? await bcrypt.hash(data.password, 12)
    : null;

  const user = await testPrisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      hashedPassword,
      emailVerified: data.emailVerified ? new Date() : null,
      age: data.age,
      bio: data.bio,
      location: data.location,
      gender: data.gender,
      interests: data.interests || [],
    },
    select: {
      id: true,
      email: true,
      name: true,
      hashedPassword: true,
      bio: true,
    },
  });

  return user as {
    id: string;
    email: string;
    name: string;
    hashedPassword: string | null;
    bio?: string | null;
  };
}

/**
 * Create a like between two users
 */
export async function createTestLike(senderId: string, receiverId: string) {
  return testPrisma.like.create({
    data: {
      senderId,
      receiverId,
    },
  });
}

/**
 * Create a dislike between two users
 */
export async function createTestDislike(senderId: string, receiverId: string) {
  return testPrisma.dislike.create({
    data: {
      senderId,
      receiverId,
    },
  });
}

/**
 * Create a mutual match (both users liked each other)
 */
export async function createTestMatch(userId1: string, userId2: string) {
  await testPrisma.like.createMany({
    data: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 },
    ],
  });
}

/**
 * Create a block between two users
 */
export async function createTestBlock(blockerId: string, blockedId: string, reason?: string) {
  return testPrisma.block.create({
    data: {
      blockerId,
      blockedId,
      reason,
    },
  });
}

/**
 * Create a photo for a user
 */
export async function createTestPhoto(userId: string, url: string, isPrimary = false) {
  return testPrisma.photo.create({
    data: {
      userId,
      url,
      isPrimary,
    },
  });
}

/**
 * Create user preferences
 */
export async function createTestUserPreferences(
  userId: string,
  prefs: {
    minAge?: number;
    maxAge?: number;
    maxDistance?: number;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NON_BINARY' | 'ALL';
  } = {}
) {
  return testPrisma.userPreferences.create({
    data: {
      userId,
      minAge: prefs.minAge ?? 18,
      maxAge: prefs.maxAge ?? 35,
      maxDistance: prefs.maxDistance ?? 50,
      gender: prefs.gender,
    },
  });
}

/**
 * Clean up test data - removes all test users and related data
 */
export async function cleanupTestData() {
  // Delete in order respecting foreign key constraints
  await testPrisma.profileView.deleteMany({});
  await testPrisma.block.deleteMany({});
  await testPrisma.dislike.deleteMany({});
  await testPrisma.like.deleteMany({});
  await testPrisma.photo.deleteMany({});
  await testPrisma.userPreferences.deleteMany({});
  await testPrisma.notificationSettings.deleteMany({});
  await testPrisma.session.deleteMany({});
  await testPrisma.account.deleteMany({});
  await testPrisma.user.deleteMany({});
}

/**
 * Clean up specific test users by email pattern
 */
export async function cleanupTestUsersByEmail(emailPattern: string) {
  // First, clean up tokens related to test emails
  try {
    await (testPrisma as any).passwordResetToken?.deleteMany({
      where: { email: { contains: emailPattern } },
    });
  } catch (e) {
    // Model might not exist
  }

  try {
    await (testPrisma as any).emailVerificationToken?.deleteMany({
      where: { email: { contains: emailPattern } },
    });
  } catch (e) {
    // Model might not exist
  }

  const users = await testPrisma.user.findMany({
    where: {
      email: {
        contains: emailPattern,
      },
    },
    select: { id: true, email: true },
  });

  const userIds = users.map((u) => u.id);
  const userEmails = users.map((u) => u.email);

  if (userIds.length === 0) return;

  await testPrisma.profileView.deleteMany({
    where: {
      OR: [{ viewerId: { in: userIds } }, { viewedId: { in: userIds } }],
    },
  });

  await testPrisma.block.deleteMany({
    where: {
      OR: [{ blockerId: { in: userIds } }, { blockedId: { in: userIds } }],
    },
  });

  await testPrisma.dislike.deleteMany({
    where: {
      OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }],
    },
  });

  await testPrisma.like.deleteMany({
    where: {
      OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }],
    },
  });

  await testPrisma.photo.deleteMany({
    where: { userId: { in: userIds } },
  });

  await testPrisma.userPreferences.deleteMany({
    where: { userId: { in: userIds } },
  });

  await testPrisma.notificationSettings.deleteMany({
    where: { userId: { in: userIds } },
  });

  await testPrisma.session.deleteMany({
    where: { userId: { in: userIds } },
  });

  await testPrisma.account.deleteMany({
    where: { userId: { in: userIds } },
  });

  await testPrisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
}

/**
 * Rate limit tracking for tests
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function mockRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (existing && existing.resetAt > now) {
    existing.count++;
    return existing.count <= limit;
  }

  rateLimitStore.set(key, {
    count: 1,
    resetAt: now + windowMs,
  });
  return true;
}

export function clearRateLimitStore() {
  rateLimitStore.clear();
}

/**
 * Parse JSON response body
 */
export async function parseResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

/**
 * Assert response status and return parsed body
 */
export async function expectStatus<T>(
  response: Response,
  expectedStatus: number
): Promise<T> {
  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. Body: ${body}`
    );
  }
  return parseResponse<T>(response);
}

// Unique ID generator for test isolation
let testIdCounter = 0;
export function generateTestId(): string {
  return `test-${Date.now()}-${++testIdCounter}`;
}

// Generate unique test email
export function generateTestEmail(): string {
  return `test-${generateTestId()}@test.local`;
}
