import {
  prisma,
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  createTestUser,
  createTestUserWithProfile,
} from '../../setup/database';
import { Gender } from '@prisma/client';

describe('Profile Database Operations', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await clearAllTables();
  });

  describe('User Profile Fields', () => {
    it('should update user profile information', async () => {
      const user = await createTestUser();

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          age: 28,
          bio: 'Looking for meaningful connections',
          gender: 'FEMALE',
          maritalStatus: 'SINGLE',
          location: 'Lyon, France',
          profession: 'Designer',
          interests: ['art', 'travel', 'food'],
        },
      });

      expect(updated.age).toBe(28);
      expect(updated.bio).toBe('Looking for meaningful connections');
      expect(updated.gender).toBe('FEMALE');
      expect(updated.maritalStatus).toBe('SINGLE');
      expect(updated.interests).toEqual(['art', 'travel', 'food']);
    });

    it('should handle all gender enum values', async () => {
      const genders: Gender[] = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY', 'ALL'];

      for (const gender of genders) {
        const user = await prisma.user.create({
          data: {
            email: `gender-${gender.toLowerCase()}@test.com`,
            gender,
          },
        });
        expect(user.gender).toBe(gender);
      }
    });

    it('should handle empty arrays for interests', async () => {
      const user = await createTestUser({ interests: [] });

      expect(user.interests).toEqual([]);
    });

    it('should update geographic information', async () => {
      const user = await createTestUser();

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          department: '69',
          postcode: '69001',
          region: 'Auvergne-Rhone-Alpes',
        },
      });

      expect(updated.department).toBe('69');
      expect(updated.postcode).toBe('69001');
      expect(updated.region).toBe('Auvergne-Rhone-Alpes');
    });
  });

  describe('User Preferences', () => {
    it('should create user preferences', async () => {
      const user = await createTestUser();

      const preferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          minAge: 22,
          maxAge: 35,
          maxDistance: 100,
          gender: 'FEMALE',
          lookingFor: 'SERIOUS_RELATIONSHIP',
        },
      });

      expect(preferences.minAge).toBe(22);
      expect(preferences.maxAge).toBe(35);
      expect(preferences.maxDistance).toBe(100);
      expect(preferences.gender).toBe('FEMALE');
    });

    it('should use default preference values', async () => {
      const user = await createTestUser();

      const preferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
        },
      });

      expect(preferences.minAge).toBe(18);
      expect(preferences.maxAge).toBe(35);
      expect(preferences.maxDistance).toBe(50);
    });

    it('should enforce one preference per user', async () => {
      const user = await createTestUser();

      await prisma.userPreferences.create({
        data: { userId: user.id },
      });

      await expect(
        prisma.userPreferences.create({
          data: { userId: user.id },
        })
      ).rejects.toThrow(/unique constraint/i);
    });

    it('should update existing preferences', async () => {
      const { user, preferences } = await createTestUserWithProfile();

      const updated = await prisma.userPreferences.update({
        where: { id: preferences.id },
        data: {
          minAge: 25,
          maxAge: 40,
        },
      });

      expect(updated.minAge).toBe(25);
      expect(updated.maxAge).toBe(40);
    });

    it('should upsert preferences', async () => {
      const user = await createTestUser();

      // First upsert creates
      const created = await prisma.userPreferences.upsert({
        where: { userId: user.id },
        create: { userId: user.id, minAge: 20 },
        update: { minAge: 25 },
      });
      expect(created.minAge).toBe(20);

      // Second upsert updates
      const updated = await prisma.userPreferences.upsert({
        where: { userId: user.id },
        create: { userId: user.id, minAge: 20 },
        update: { minAge: 25 },
      });
      expect(updated.minAge).toBe(25);
    });
  });

  describe('Photos', () => {
    it('should create photo for user', async () => {
      const user = await createTestUser();

      const photo = await prisma.photo.create({
        data: {
          userId: user.id,
          url: 'https://cloudinary.com/photo1.jpg',
          isPrimary: true,
        },
      });

      expect(photo.id).toBeDefined();
      expect(photo.url).toBe('https://cloudinary.com/photo1.jpg');
      expect(photo.isPrimary).toBe(true);
    });

    it('should create multiple photos for user', async () => {
      const user = await createTestUser();

      await prisma.photo.createMany({
        data: [
          { userId: user.id, url: 'photo1.jpg', isPrimary: true },
          { userId: user.id, url: 'photo2.jpg', isPrimary: false },
          { userId: user.id, url: 'photo3.jpg', isPrimary: false },
        ],
      });

      const photos = await prisma.photo.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(photos).toHaveLength(3);
      expect(photos.filter((p) => p.isPrimary)).toHaveLength(1);
    });

    it('should allow multiple primary photos (application should enforce)', async () => {
      // Note: Database doesn't enforce single primary, application logic should
      const user = await createTestUser();

      await prisma.photo.createMany({
        data: [
          { userId: user.id, url: 'photo1.jpg', isPrimary: true },
          { userId: user.id, url: 'photo2.jpg', isPrimary: true },
        ],
      });

      const primaryPhotos = await prisma.photo.findMany({
        where: { userId: user.id, isPrimary: true },
      });

      // Database allows multiple primaries
      expect(primaryPhotos.length).toBe(2);
    });

    it('should delete individual photo', async () => {
      const user = await createTestUser();

      const photo = await prisma.photo.create({
        data: {
          userId: user.id,
          url: 'deleteme.jpg',
        },
      });

      await prisma.photo.delete({
        where: { id: photo.id },
      });

      const found = await prisma.photo.findUnique({
        where: { id: photo.id },
      });

      expect(found).toBeNull();
    });

    it('should get user with photos', async () => {
      const user = await createTestUser();

      await prisma.photo.createMany({
        data: [
          { userId: user.id, url: 'photo1.jpg' },
          { userId: user.id, url: 'photo2.jpg' },
        ],
      });

      const userWithPhotos = await prisma.user.findUnique({
        where: { id: user.id },
        include: { photos: true },
      });

      expect(userWithPhotos?.photos).toHaveLength(2);
    });

    it('should order photos by creation date', async () => {
      const user = await createTestUser();

      // Create photos with delays to ensure different timestamps
      await prisma.photo.create({
        data: { userId: user.id, url: 'first.jpg' },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await prisma.photo.create({
        data: { userId: user.id, url: 'second.jpg' },
      });

      const photos = await prisma.photo.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(photos[0].url).toBe('first.jpg');
      expect(photos[1].url).toBe('second.jpg');
    });
  });

  describe('Notification Settings', () => {
    it('should create notification settings', async () => {
      const user = await createTestUser();

      const settings = await prisma.notificationSettings.create({
        data: {
          userId: user.id,
          messageNotifications: true,
          likeNotifications: false,
          matchNotifications: true,
        },
      });

      expect(settings.messageNotifications).toBe(true);
      expect(settings.likeNotifications).toBe(false);
      expect(settings.matchNotifications).toBe(true);
    });

    it('should use default notification values', async () => {
      const user = await createTestUser();

      const settings = await prisma.notificationSettings.create({
        data: { userId: user.id },
      });

      expect(settings.messageNotifications).toBe(true);
      expect(settings.likeNotifications).toBe(true);
      expect(settings.matchNotifications).toBe(true);
    });
  });

  describe('Profile Views', () => {
    it('should record profile view', async () => {
      const viewer = await createTestUser({ email: 'viewer@test.com' });
      const viewed = await createTestUser({ email: 'viewed@test.com' });

      const view = await prisma.profileView.create({
        data: {
          viewerId: viewer.id,
          viewedId: viewed.id,
        },
      });

      expect(view.viewerId).toBe(viewer.id);
      expect(view.viewedId).toBe(viewed.id);
      expect(view.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique viewer-viewed pair', async () => {
      const viewer = await createTestUser({ email: 'viewer2@test.com' });
      const viewed = await createTestUser({ email: 'viewed2@test.com' });

      await prisma.profileView.create({
        data: {
          viewerId: viewer.id,
          viewedId: viewed.id,
        },
      });

      await expect(
        prisma.profileView.create({
          data: {
            viewerId: viewer.id,
            viewedId: viewed.id,
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    });

    it('should get users who viewed profile', async () => {
      const viewed = await createTestUser({ email: 'popular@test.com' });
      const viewer1 = await createTestUser({ email: 'viewer1@test.com' });
      const viewer2 = await createTestUser({ email: 'viewer2@test.com' });

      await prisma.profileView.createMany({
        data: [
          { viewerId: viewer1.id, viewedId: viewed.id },
          { viewerId: viewer2.id, viewedId: viewed.id },
        ],
      });

      const views = await prisma.profileView.findMany({
        where: { viewedId: viewed.id },
        include: { viewer: true },
      });

      expect(views).toHaveLength(2);
      expect(views.map((v) => v.viewer.email)).toContain('viewer1@test.com');
    });

    it('should count profile views', async () => {
      const viewed = await createTestUser({ email: 'countme@test.com' });

      for (let i = 0; i < 5; i++) {
        const viewer = await createTestUser({ email: `viewcount${i}@test.com` });
        await prisma.profileView.create({
          data: {
            viewerId: viewer.id,
            viewedId: viewed.id,
          },
        });
      }

      const viewCount = await prisma.profileView.count({
        where: { viewedId: viewed.id },
      });

      expect(viewCount).toBe(5);
    });
  });

  describe('Discovery Query', () => {
    it('should find profiles matching preferences', async () => {
      // Create profiles with different characteristics
      await prisma.user.createMany({
        data: [
          { email: 'match1@test.com', gender: 'FEMALE', age: 25, accountStatus: 'ACTIVE' },
          { email: 'match2@test.com', gender: 'FEMALE', age: 28, accountStatus: 'ACTIVE' },
          { email: 'nomatch1@test.com', gender: 'MALE', age: 25, accountStatus: 'ACTIVE' },
          { email: 'nomatch2@test.com', gender: 'FEMALE', age: 45, accountStatus: 'ACTIVE' },
          { email: 'suspended@test.com', gender: 'FEMALE', age: 25, accountStatus: 'SUSPENDED' },
        ],
      });

      const matches = await prisma.user.findMany({
        where: {
          gender: 'FEMALE',
          age: { gte: 20, lte: 30 },
          accountStatus: 'ACTIVE',
        },
      });

      expect(matches).toHaveLength(2);
      expect(matches.every((u) => u.gender === 'FEMALE')).toBe(true);
      expect(matches.every((u) => u.age! >= 20 && u.age! <= 30)).toBe(true);
    });

    it('should exclude blocked users from discovery', async () => {
      const searcher = await createTestUser({ email: 'searcher@test.com' });
      const blockedUser = await createTestUser({ email: 'blocked@test.com', gender: 'FEMALE' });
      const normalUser = await createTestUser({ email: 'normal@test.com', gender: 'FEMALE' });

      // Searcher blocks blockedUser
      await prisma.block.create({
        data: {
          blockerId: searcher.id,
          blockedId: blockedUser.id,
        },
      });

      // Get blocked user IDs
      const blockedIds = await prisma.block
        .findMany({
          where: { blockerId: searcher.id },
          select: { blockedId: true },
        })
        .then((blocks) => blocks.map((b) => b.blockedId));

      // Discovery query excluding blocks
      const discoverable = await prisma.user.findMany({
        where: {
          id: {
            not: searcher.id,
            notIn: blockedIds,
          },
          gender: 'FEMALE',
        },
      });

      expect(discoverable.map((u) => u.email)).toContain('normal@test.com');
      expect(discoverable.map((u) => u.email)).not.toContain('blocked@test.com');
    });

    it('should exclude users who blocked the searcher', async () => {
      const searcher = await createTestUser({ email: 'searcherblocked@test.com' });
      const blockerUser = await createTestUser({ email: 'blocker@test.com', gender: 'FEMALE' });
      const normalUser2 = await createTestUser({ email: 'normal2@test.com', gender: 'FEMALE' });

      // blockerUser blocks searcher
      await prisma.block.create({
        data: {
          blockerId: blockerUser.id,
          blockedId: searcher.id,
        },
      });

      // Get IDs of users who blocked the searcher
      const blockerIds = await prisma.block
        .findMany({
          where: { blockedId: searcher.id },
          select: { blockerId: true },
        })
        .then((blocks) => blocks.map((b) => b.blockerId));

      const discoverable = await prisma.user.findMany({
        where: {
          id: {
            not: searcher.id,
            notIn: blockerIds,
          },
          gender: 'FEMALE',
        },
      });

      expect(discoverable.map((u) => u.email)).toContain('normal2@test.com');
      expect(discoverable.map((u) => u.email)).not.toContain('blocker@test.com');
    });

    it('should exclude already liked/disliked users', async () => {
      const searcher = await createTestUser({ email: 'searcher3@test.com' });
      const likedUser = await createTestUser({ email: 'liked@test.com', gender: 'FEMALE' });
      const dislikedUser = await createTestUser({ email: 'disliked@test.com', gender: 'FEMALE' });
      const freshUser = await createTestUser({ email: 'fresh@test.com', gender: 'FEMALE' });

      await prisma.like.create({
        data: { senderId: searcher.id, receiverId: likedUser.id },
      });

      await prisma.dislike.create({
        data: { senderId: searcher.id, receiverId: dislikedUser.id },
      });

      const likedIds = await prisma.like
        .findMany({
          where: { senderId: searcher.id },
          select: { receiverId: true },
        })
        .then((likes) => likes.map((l) => l.receiverId));

      const dislikedIds = await prisma.dislike
        .findMany({
          where: { senderId: searcher.id },
          select: { receiverId: true },
        })
        .then((dislikes) => dislikes.map((d) => d.receiverId));

      const excludeIds = [...likedIds, ...dislikedIds, searcher.id];

      const discoverable = await prisma.user.findMany({
        where: {
          id: { notIn: excludeIds },
          gender: 'FEMALE',
        },
      });

      expect(discoverable.map((u) => u.email)).toContain('fresh@test.com');
      expect(discoverable.map((u) => u.email)).not.toContain('liked@test.com');
      expect(discoverable.map((u) => u.email)).not.toContain('disliked@test.com');
    });
  });
});
