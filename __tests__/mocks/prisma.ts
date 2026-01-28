import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>();

// Reset mock before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Type for the mocked Prisma client
export type MockPrismaClient = DeepMockProxy<PrismaClient>;

// Mock the db module
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: prismaMock,
  prisma: prismaMock,
}));

// Helper to setup common mock returns
export function setupPrismaMock() {
  // User model defaults
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.findFirst.mockResolvedValue(null);
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.user.create.mockImplementation(async (args) => ({
    id: `user-${Date.now()}`,
    email: args.data.email as string,
    name: (args.data.name as string) || null,
    emailVerified: null,
    image: null,
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    password: null,
  }));

  // Profile model defaults
  prismaMock.profile.findUnique.mockResolvedValue(null);
  prismaMock.profile.findFirst.mockResolvedValue(null);
  prismaMock.profile.findMany.mockResolvedValue([]);

  // Match model defaults
  prismaMock.match.findUnique.mockResolvedValue(null);
  prismaMock.match.findFirst.mockResolvedValue(null);
  prismaMock.match.findMany.mockResolvedValue([]);

  // Like model defaults
  prismaMock.like.findUnique.mockResolvedValue(null);
  prismaMock.like.findFirst.mockResolvedValue(null);
  prismaMock.like.findMany.mockResolvedValue([]);

  return prismaMock;
}

// Export the mock for direct use in tests
export default prismaMock;
