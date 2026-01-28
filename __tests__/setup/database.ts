import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

// Create a separate Prisma client for tests
const testDatabaseUrl = process.env.TEST_DATABASE_URL ||
  `file:${path.join(__dirname, '../../prisma/test.db')}`;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl,
    },
  },
  log: process.env.DEBUG_TESTS ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * Setup the test database by running migrations
 */
export async function setupTestDatabase(): Promise<void> {
  const schemaPath = path.join(__dirname, '../../prisma/schema.prisma');

  try {
    // Push schema to test database (creates tables if they don't exist)
    execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss`, {
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
      stdio: process.env.DEBUG_TESTS ? 'inherit' : 'pipe',
    });
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Cleanup and disconnect from test database
 */
export async function cleanupTestDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Clear all data from all tables (respects foreign key constraints)
 * Order matters due to foreign key relationships
 */
export async function clearAllTables(): Promise<void> {
  // Delete in order respecting foreign keys (child tables first)
  await prisma.$transaction([
    // Relations first
    prisma.profileView.deleteMany(),
    prisma.block.deleteMany(),
    prisma.dislike.deleteMany(),
    prisma.like.deleteMany(),

    // User-related tables
    prisma.notificationSettings.deleteMany(),
    prisma.userPreferences.deleteMany(),
    prisma.photo.deleteMany(),

    // Auth tables
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),

    // Main user table last
    prisma.user.deleteMany(),
  ]);
}

/**
 * Create a test user with minimal required fields
 */
export async function createTestUser(overrides: Partial<Parameters<typeof prisma.user.create>[0]['data']> = {}) {
  const defaultData = {
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
    name: 'Test User',
    hashedPassword: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYD7IQUKJVM2', // hashed "password123"
  };

  return prisma.user.create({
    data: {
      ...defaultData,
      ...overrides,
    },
  });
}

/**
 * Create multiple test users
 */
export async function createTestUsers(count: number) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `testuser${i}@test.com`,
      name: `Test User ${i}`,
    });
    users.push(user);
  }
  return users;
}

/**
 * Create a test user with a complete profile
 */
export async function createTestUserWithProfile(
  userOverrides: Partial<Parameters<typeof prisma.user.create>[0]['data']> = {},
  preferencesOverrides: Partial<Parameters<typeof prisma.userPreferences.create>[0]['data']> = {}
) {
  const user = await createTestUser({
    age: 25,
    bio: 'Test bio',
    gender: 'MALE',
    location: 'Paris',
    ...userOverrides,
  });

  const preferences = await prisma.userPreferences.create({
    data: {
      userId: user.id,
      minAge: 18,
      maxAge: 35,
      maxDistance: 50,
      gender: 'FEMALE',
      ...preferencesOverrides,
    },
  });

  return { user, preferences };
}

/**
 * Create a like between two users
 */
export async function createTestLike(senderId: string, receiverId: string) {
  return prisma.like.create({
    data: {
      senderId,
      receiverId,
    },
  });
}

/**
 * Create a mutual match (two likes)
 */
export async function createTestMatch(user1Id: string, user2Id: string) {
  const like1 = await createTestLike(user1Id, user2Id);
  const like2 = await createTestLike(user2Id, user1Id);
  return { like1, like2 };
}

export { testDatabaseUrl };
