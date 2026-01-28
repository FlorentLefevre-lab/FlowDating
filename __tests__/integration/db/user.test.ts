import {
  prisma,
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  createTestUser,
  createTestUsers,
} from '../../setup/database';

describe('User Database Operations', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await clearAllTables();
  });

  describe('create', () => {
    it('should create user with required fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@test.com',
          name: 'Test User',
          hashedPassword: 'hashed_password_123',
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@test.com');
      expect(user.name).toBe('Test User');
      expect(user.hashedPassword).toBe('hashed_password_123');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user with all optional fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'complete@test.com',
          name: 'Complete User',
          hashedPassword: 'hashed_password',
          age: 28,
          bio: 'This is my bio',
          location: 'Paris, France',
          gender: 'MALE',
          maritalStatus: 'SINGLE',
          profession: 'Engineer',
          zodiacSign: 'Leo',
          dietType: 'Vegetarian',
          religion: 'None',
          ethnicity: 'European',
          department: '75',
          postcode: '75001',
          region: 'Ile-de-France',
          interests: ['music', 'sports', 'travel'],
          accountStatus: 'ACTIVE',
        },
      });

      expect(user.age).toBe(28);
      expect(user.bio).toBe('This is my bio');
      expect(user.location).toBe('Paris, France');
      expect(user.gender).toBe('MALE');
      expect(user.maritalStatus).toBe('SINGLE');
      expect(user.interests).toEqual(['music', 'sports', 'travel']);
      expect(user.accountStatus).toBe('ACTIVE');
    });

    it('should set default values correctly', async () => {
      const user = await createTestUser();

      expect(user.accountStatus).toBe('ACTIVE');
      expect(user.primaryAuthMethod).toBe('EMAIL_PASSWORD');
      expect(user.isOnline).toBe(false);
      expect(user.emailVerified).toBeNull();
    });

    it('should enforce unique email constraint', async () => {
      await prisma.user.create({
        data: {
          email: 'duplicate@test.com',
          name: 'First User',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email: 'duplicate@test.com',
            name: 'Second User',
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    });

    it('should handle email case sensitivity', async () => {
      await prisma.user.create({
        data: {
          email: 'Test@Example.com',
          name: 'Test User',
        },
      });

      // Most databases treat email as case-insensitive for uniqueness
      // but this depends on database configuration
      const foundUser = await prisma.user.findUnique({
        where: { email: 'Test@Example.com' },
      });

      expect(foundUser).not.toBeNull();
    });
  });

  describe('read', () => {
    it('should find user by id', async () => {
      const created = await createTestUser({ email: 'findbyid@test.com' });

      const found = await prisma.user.findUnique({
        where: { id: created.id },
      });

      expect(found).not.toBeNull();
      expect(found?.email).toBe('findbyid@test.com');
    });

    it('should find user by email', async () => {
      await createTestUser({ email: 'findbyemail@test.com' });

      const found = await prisma.user.findUnique({
        where: { email: 'findbyemail@test.com' },
      });

      expect(found).not.toBeNull();
      expect(found?.email).toBe('findbyemail@test.com');
    });

    it('should return null for non-existent user', async () => {
      const found = await prisma.user.findUnique({
        where: { id: 'non-existent-id' },
      });

      expect(found).toBeNull();
    });

    it('should include relations when requested', async () => {
      const user = await createTestUser();

      await prisma.photo.create({
        data: {
          userId: user.id,
          url: 'https://example.com/photo.jpg',
          isPrimary: true,
        },
      });

      await prisma.userPreferences.create({
        data: {
          userId: user.id,
          minAge: 20,
          maxAge: 40,
        },
      });

      const found = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          photos: true,
          preferences: true,
        },
      });

      expect(found?.photos).toHaveLength(1);
      expect(found?.photos[0].url).toBe('https://example.com/photo.jpg');
      expect(found?.preferences).not.toBeNull();
      expect(found?.preferences?.minAge).toBe(20);
    });

    it('should filter users by criteria', async () => {
      await createTestUsers(3);
      await prisma.user.create({
        data: {
          email: 'active@test.com',
          name: 'Active User',
          accountStatus: 'ACTIVE',
          gender: 'FEMALE',
          age: 25,
        },
      });

      const activeUsers = await prisma.user.findMany({
        where: {
          accountStatus: 'ACTIVE',
          gender: 'FEMALE',
          age: { gte: 20, lte: 30 },
        },
      });

      expect(activeUsers.length).toBeGreaterThanOrEqual(1);
      expect(activeUsers.every((u) => u.accountStatus === 'ACTIVE')).toBe(true);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const user = await createTestUser();

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: 'Updated Name',
          bio: 'New bio',
          age: 30,
        },
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.bio).toBe('New bio');
      expect(updated.age).toBe(30);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it('should update user status', async () => {
      const user = await createTestUser();

      const suspended = await prisma.user.update({
        where: { id: user.id },
        data: {
          accountStatus: 'SUSPENDED',
          suspensionReason: 'Terms violation',
          suspendedAt: new Date(),
        },
      });

      expect(suspended.accountStatus).toBe('SUSPENDED');
      expect(suspended.suspensionReason).toBe('Terms violation');
      expect(suspended.suspendedAt).toBeInstanceOf(Date);
    });

    it('should update online status', async () => {
      const user = await createTestUser();

      const online = await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastSeen: new Date(),
        },
      });

      expect(online.isOnline).toBe(true);
      expect(online.lastSeen).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        prisma.user.update({
          where: { id: 'non-existent' },
          data: { name: 'New Name' },
        })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const user = await createTestUser();

      await prisma.user.delete({
        where: { id: user.id },
      });

      const found = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete related photos', async () => {
      const user = await createTestUser();

      await prisma.photo.createMany({
        data: [
          { userId: user.id, url: 'photo1.jpg' },
          { userId: user.id, url: 'photo2.jpg' },
        ],
      });

      // Verify photos exist
      const photosBefore = await prisma.photo.findMany({
        where: { userId: user.id },
      });
      expect(photosBefore).toHaveLength(2);

      // Delete user
      await prisma.user.delete({
        where: { id: user.id },
      });

      // Verify photos are deleted
      const photosAfter = await prisma.photo.findMany({
        where: { userId: user.id },
      });
      expect(photosAfter).toHaveLength(0);
    });

    it('should cascade delete related preferences', async () => {
      const user = await createTestUser();

      await prisma.userPreferences.create({
        data: {
          userId: user.id,
          minAge: 18,
          maxAge: 40,
        },
      });

      await prisma.user.delete({
        where: { id: user.id },
      });

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: user.id },
      });
      expect(preferences).toBeNull();
    });

    it('should cascade delete related likes', async () => {
      const [user1, user2] = await createTestUsers(2);

      await prisma.like.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
        },
      });

      await prisma.like.create({
        data: {
          senderId: user2.id,
          receiverId: user1.id,
        },
      });

      // Delete user1
      await prisma.user.delete({
        where: { id: user1.id },
      });

      // All likes involving user1 should be deleted
      const likes = await prisma.like.findMany({
        where: {
          OR: [{ senderId: user1.id }, { receiverId: user1.id }],
        },
      });

      expect(likes).toHaveLength(0);
    });

    it('should cascade delete related sessions', async () => {
      const user = await createTestUser();

      await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: 'test-session-token',
          expires: new Date(Date.now() + 86400000),
        },
      });

      await prisma.user.delete({
        where: { id: user.id },
      });

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(0);
    });

    it('should cascade delete blocks in both directions', async () => {
      const [user1, user2, user3] = await createTestUsers(3);

      // user1 blocks user2
      await prisma.block.create({
        data: {
          blockerId: user1.id,
          blockedId: user2.id,
        },
      });

      // user3 blocks user1
      await prisma.block.create({
        data: {
          blockerId: user3.id,
          blockedId: user1.id,
        },
      });

      await prisma.user.delete({
        where: { id: user1.id },
      });

      const blocks = await prisma.block.findMany({
        where: {
          OR: [{ blockerId: user1.id }, { blockedId: user1.id }],
        },
      });

      expect(blocks).toHaveLength(0);
    });
  });

  describe('authentication fields', () => {
    it('should create user with email verification', async () => {
      const verifiedDate = new Date();
      const user = await prisma.user.create({
        data: {
          email: 'verified@test.com',
          name: 'Verified User',
          emailVerified: verifiedDate,
        },
      });

      expect(user.emailVerified).toEqual(verifiedDate);
    });

    it('should support different auth methods', async () => {
      const googleUser = await prisma.user.create({
        data: {
          email: 'google@test.com',
          name: 'Google User',
          primaryAuthMethod: 'GOOGLE',
        },
      });

      expect(googleUser.primaryAuthMethod).toBe('GOOGLE');
    });

    it('should link external accounts', async () => {
      const user = await createTestUser();

      const account = await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'google-123456',
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      expect(account.provider).toBe('google');
      expect(account.userId).toBe(user.id);

      const userWithAccounts = await prisma.user.findUnique({
        where: { id: user.id },
        include: { accounts: true },
      });

      expect(userWithAccounts?.accounts).toHaveLength(1);
    });
  });

  describe('pagination', () => {
    it('should paginate users with skip and take', async () => {
      await createTestUsers(10);

      const page1 = await prisma.user.findMany({
        take: 3,
        orderBy: { createdAt: 'asc' },
      });

      const page2 = await prisma.user.findMany({
        skip: 3,
        take: 3,
        orderBy: { createdAt: 'asc' },
      });

      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);

      // Pages should have different users
      const page1Ids = page1.map((u) => u.id);
      const page2Ids = page2.map((u) => u.id);
      expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
    });

    it('should count total users', async () => {
      await createTestUsers(5);

      const count = await prisma.user.count();

      expect(count).toBe(5);
    });

    it('should count with filter', async () => {
      await prisma.user.createMany({
        data: [
          { email: 'active1@test.com', accountStatus: 'ACTIVE' },
          { email: 'active2@test.com', accountStatus: 'ACTIVE' },
          { email: 'suspended@test.com', accountStatus: 'SUSPENDED' },
        ],
      });

      const activeCount = await prisma.user.count({
        where: { accountStatus: 'ACTIVE' },
      });

      expect(activeCount).toBe(2);
    });
  });
});
