import {
  prisma,
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  createTestUser,
} from '../../setup/database';

describe('Database Transactions', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await clearAllTables();
  });

  describe('Atomic Operations', () => {
    it('should complete transaction atomically', async () => {
      const user = await createTestUser({ email: 'atomic@test.com' });

      // Create user profile with all related data atomically
      const result = await prisma.$transaction([
        prisma.userPreferences.create({
          data: {
            userId: user.id,
            minAge: 20,
            maxAge: 35,
          },
        }),
        prisma.notificationSettings.create({
          data: {
            userId: user.id,
            messageNotifications: true,
          },
        }),
        prisma.photo.create({
          data: {
            userId: user.id,
            url: 'profile.jpg',
            isPrimary: true,
          },
        }),
      ]);

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe(user.id);
      expect(result[1].userId).toBe(user.id);
      expect(result[2].userId).toBe(user.id);
    });

    it('should create match atomically (both likes)', async () => {
      const user1 = await createTestUser({ email: 'txmatch1@test.com' });
      const user2 = await createTestUser({ email: 'txmatch2@test.com' });

      const [like1, like2] = await prisma.$transaction([
        prisma.like.create({
          data: {
            senderId: user1.id,
            receiverId: user2.id,
          },
        }),
        prisma.like.create({
          data: {
            senderId: user2.id,
            receiverId: user1.id,
          },
        }),
      ]);

      expect(like1.senderId).toBe(user1.id);
      expect(like2.senderId).toBe(user2.id);
    });

    it('should block user and remove match atomically', async () => {
      const user1 = await createTestUser({ email: 'txblock1@test.com' });
      const user2 = await createTestUser({ email: 'txblock2@test.com' });

      // Create match first
      await prisma.$transaction([
        prisma.like.create({
          data: { senderId: user1.id, receiverId: user2.id },
        }),
        prisma.like.create({
          data: { senderId: user2.id, receiverId: user1.id },
        }),
      ]);

      // Block and remove match atomically
      await prisma.$transaction([
        prisma.like.deleteMany({
          where: {
            OR: [
              { senderId: user1.id, receiverId: user2.id },
              { senderId: user2.id, receiverId: user1.id },
            ],
          },
        }),
        prisma.block.create({
          data: {
            blockerId: user1.id,
            blockedId: user2.id,
            reason: 'Unwanted contact',
          },
        }),
      ]);

      // Verify both operations completed
      const likes = await prisma.like.findMany({
        where: {
          OR: [
            { senderId: user1.id, receiverId: user2.id },
            { senderId: user2.id, receiverId: user1.id },
          ],
        },
      });

      const block = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: user1.id,
            blockedId: user2.id,
          },
        },
      });

      expect(likes).toHaveLength(0);
      expect(block).not.toBeNull();
    });
  });

  describe('Rollback on Error', () => {
    it('should rollback all operations on error', async () => {
      const user = await createTestUser({ email: 'rollback@test.com' });

      // First create preferences to cause unique constraint violation
      await prisma.userPreferences.create({
        data: { userId: user.id },
      });

      // Transaction that should fail on second operation (duplicate preferences)
      await expect(
        prisma.$transaction([
          prisma.photo.create({
            data: {
              userId: user.id,
              url: 'shouldnotexist.jpg',
            },
          }),
          // This should fail because preferences already exist
          prisma.userPreferences.create({
            data: { userId: user.id },
          }),
        ])
      ).rejects.toThrow();

      // Verify the photo was NOT created (rollback)
      const photos = await prisma.photo.findMany({
        where: {
          userId: user.id,
          url: 'shouldnotexist.jpg',
        },
      });

      expect(photos).toHaveLength(0);
    });

    it('should rollback on constraint violation in multi-step operation', async () => {
      const user1 = await createTestUser({ email: 'rollback1@test.com' });
      const user2 = await createTestUser({ email: 'rollback2@test.com' });

      // Create first like
      await prisma.like.create({
        data: { senderId: user1.id, receiverId: user2.id },
      });

      // Transaction that should fail (duplicate like)
      await expect(
        prisma.$transaction([
          prisma.dislike.create({
            data: { senderId: user1.id, receiverId: user2.id },
          }),
          // This should fail - duplicate like
          prisma.like.create({
            data: { senderId: user1.id, receiverId: user2.id },
          }),
        ])
      ).rejects.toThrow();

      // Verify the dislike was NOT created (rollback)
      const dislikes = await prisma.dislike.findMany({
        where: {
          senderId: user1.id,
          receiverId: user2.id,
        },
      });

      expect(dislikes).toHaveLength(0);
    });
  });

  describe('Interactive Transactions', () => {
    it('should support interactive transaction with logic', async () => {
      const user1 = await createTestUser({ email: 'interactive1@test.com' });
      const user2 = await createTestUser({ email: 'interactive2@test.com' });

      // User2 already likes user1
      await prisma.like.create({
        data: { senderId: user2.id, receiverId: user1.id },
      });

      // Interactive transaction: user1 likes user2, check for match
      const result = await prisma.$transaction(async (tx) => {
        // Create the like
        const like = await tx.like.create({
          data: { senderId: user1.id, receiverId: user2.id },
        });

        // Check if it's a match
        const mutualLike = await tx.like.findUnique({
          where: {
            senderId_receiverId: {
              senderId: user2.id,
              receiverId: user1.id,
            },
          },
        });

        const isMatch = mutualLike !== null;

        return { like, isMatch };
      });

      expect(result.like.senderId).toBe(user1.id);
      expect(result.isMatch).toBe(true);
    });

    it('should handle conditional updates in transaction', async () => {
      const user = await createTestUser({ email: 'conditional@test.com' });

      // Interactive transaction with conditional logic
      const result = await prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
        });

        if (!currentUser) {
          throw new Error('User not found');
        }

        // Only update if account is active
        if (currentUser.accountStatus === 'ACTIVE') {
          const updated = await tx.user.update({
            where: { id: user.id },
            data: {
              bio: 'Updated bio in transaction',
              lastSeen: new Date(),
            },
          });
          return { updated: true, user: updated };
        }

        return { updated: false, user: currentUser };
      });

      expect(result.updated).toBe(true);
      expect(result.user.bio).toBe('Updated bio in transaction');
    });

    it('should abort transaction on thrown error', async () => {
      const user = await createTestUser({ email: 'abort@test.com' });

      // Should abort and rollback
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.photo.create({
            data: {
              userId: user.id,
              url: 'willberolledback.jpg',
            },
          });

          // Intentionally throw error
          throw new Error('Abort transaction');
        })
      ).rejects.toThrow('Abort transaction');

      // Verify photo was not created
      const photos = await prisma.photo.findMany({
        where: { userId: user.id },
      });

      expect(photos).toHaveLength(0);
    });
  });

  describe('Complex Business Operations', () => {
    it('should handle complete user registration atomically', async () => {
      const registrationData = {
        email: 'newuser@test.com',
        name: 'New User',
        hashedPassword: 'hashed_password',
        age: 25,
        gender: 'FEMALE' as const,
      };

      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: registrationData,
        });

        // Create default preferences
        const preferences = await tx.userPreferences.create({
          data: {
            userId: user.id,
            minAge: 18,
            maxAge: 40,
            maxDistance: 50,
          },
        });

        // Create default notification settings
        const notifications = await tx.notificationSettings.create({
          data: {
            userId: user.id,
            messageNotifications: true,
            likeNotifications: true,
            matchNotifications: true,
          },
        });

        return { user, preferences, notifications };
      });

      expect(result.user.email).toBe('newuser@test.com');
      expect(result.preferences.userId).toBe(result.user.id);
      expect(result.notifications.userId).toBe(result.user.id);
    });

    it('should handle account deletion with cleanup atomically', async () => {
      const user = await createTestUser({ email: 'delete@test.com' });
      const otherUser = await createTestUser({ email: 'other@test.com' });

      // Create related data
      await prisma.$transaction([
        prisma.userPreferences.create({ data: { userId: user.id } }),
        prisma.notificationSettings.create({ data: { userId: user.id } }),
        prisma.photo.create({ data: { userId: user.id, url: 'photo.jpg' } }),
        prisma.like.create({ data: { senderId: user.id, receiverId: otherUser.id } }),
        prisma.like.create({ data: { senderId: otherUser.id, receiverId: user.id } }),
        prisma.profileView.create({ data: { viewerId: user.id, viewedId: otherUser.id } }),
      ]);

      // Delete user (cascade should handle related data)
      await prisma.user.delete({
        where: { id: user.id },
      });

      // Verify all related data is gone
      const [preferences, notifications, photos, likes, views] = await Promise.all([
        prisma.userPreferences.findUnique({ where: { userId: user.id } }),
        prisma.notificationSettings.findUnique({ where: { userId: user.id } }),
        prisma.photo.findMany({ where: { userId: user.id } }),
        prisma.like.findMany({
          where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
        }),
        prisma.profileView.findMany({
          where: { OR: [{ viewerId: user.id }, { viewedId: user.id }] },
        }),
      ]);

      expect(preferences).toBeNull();
      expect(notifications).toBeNull();
      expect(photos).toHaveLength(0);
      expect(likes).toHaveLength(0);
      expect(views).toHaveLength(0);
    });

    it('should handle swipe action with match creation', async () => {
      const swiper = await createTestUser({ email: 'swiper@test.com' });
      const target = await createTestUser({ email: 'target@test.com' });

      // Target already liked swiper
      await prisma.like.create({
        data: { senderId: target.id, receiverId: swiper.id },
      });

      // Swipe right (like) and check for match
      const swipeResult = await prisma.$transaction(async (tx) => {
        // Create like
        const like = await tx.like.create({
          data: { senderId: swiper.id, receiverId: target.id },
        });

        // Check for mutual like
        const mutualLike = await tx.like.findUnique({
          where: {
            senderId_receiverId: {
              senderId: target.id,
              receiverId: swiper.id,
            },
          },
        });

        const isMatch = mutualLike !== null;

        // If match, could create a chat channel here
        // For now just return the result
        return {
          like,
          isMatch,
          matchedUser: isMatch ? target : null,
        };
      });

      expect(swipeResult.isMatch).toBe(true);
      expect(swipeResult.matchedUser?.id).toBe(target.id);
    });
  });

  describe('Isolation and Consistency', () => {
    it('should maintain consistency with concurrent operations', async () => {
      const user = await createTestUser({ email: 'concurrent@test.com' });

      // Simulate concurrent profile views from multiple users
      const viewers = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createTestUser({ email: `viewer${i}@test.com` })
        )
      );

      // Create profile views concurrently
      await Promise.all(
        viewers.map((viewer) =>
          prisma.profileView.create({
            data: { viewerId: viewer.id, viewedId: user.id },
          })
        )
      );

      // Count should be accurate
      const viewCount = await prisma.profileView.count({
        where: { viewedId: user.id },
      });

      expect(viewCount).toBe(5);
    });

    it('should handle upsert correctly in transaction', async () => {
      const user = await createTestUser({ email: 'upsert@test.com' });

      // First upsert creates
      const result1 = await prisma.$transaction(async (tx) => {
        return tx.userPreferences.upsert({
          where: { userId: user.id },
          create: { userId: user.id, minAge: 20 },
          update: { minAge: 25 },
        });
      });

      expect(result1.minAge).toBe(20);

      // Second upsert updates
      const result2 = await prisma.$transaction(async (tx) => {
        return tx.userPreferences.upsert({
          where: { userId: user.id },
          create: { userId: user.id, minAge: 20 },
          update: { minAge: 25 },
        });
      });

      expect(result2.minAge).toBe(25);
    });
  });
});
