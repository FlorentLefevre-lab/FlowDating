import {
  prisma,
  setupTestDatabase,
  cleanupTestDatabase,
  clearAllTables,
  createTestUser,
  createTestUsers,
  createTestLike,
  createTestMatch,
} from '../../setup/database';

describe('Match Database Operations', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await clearAllTables();
  });

  describe('Like Operations', () => {
    it('should create like', async () => {
      const sender = await createTestUser({ email: 'sender@test.com' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });

      const like = await prisma.like.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
        },
      });

      expect(like.id).toBeDefined();
      expect(like.senderId).toBe(sender.id);
      expect(like.receiverId).toBe(receiver.id);
      expect(like.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique sender-receiver pair', async () => {
      const sender = await createTestUser({ email: 'sender2@test.com' });
      const receiver = await createTestUser({ email: 'receiver2@test.com' });

      await createTestLike(sender.id, receiver.id);

      await expect(
        prisma.like.create({
          data: {
            senderId: sender.id,
            receiverId: receiver.id,
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    });

    it('should allow reverse like (different direction)', async () => {
      const user1 = await createTestUser({ email: 'user1@test.com' });
      const user2 = await createTestUser({ email: 'user2@test.com' });

      // user1 likes user2
      const like1 = await createTestLike(user1.id, user2.id);

      // user2 likes user1 (reverse direction)
      const like2 = await createTestLike(user2.id, user1.id);

      expect(like1.id).not.toBe(like2.id);
    });

    it('should delete like', async () => {
      const sender = await createTestUser({ email: 'deleter@test.com' });
      const receiver = await createTestUser({ email: 'deletee@test.com' });

      const like = await createTestLike(sender.id, receiver.id);

      await prisma.like.delete({
        where: { id: like.id },
      });

      const found = await prisma.like.findUnique({
        where: { id: like.id },
      });

      expect(found).toBeNull();
    });

    it('should get likes given by user', async () => {
      const sender = await createTestUser({ email: 'prolific@test.com' });

      for (let i = 0; i < 5; i++) {
        const receiver = await createTestUser({ email: `receiver${i}@test.com` });
        await createTestLike(sender.id, receiver.id);
      }

      const likesGiven = await prisma.like.findMany({
        where: { senderId: sender.id },
        include: { receiver: true },
      });

      expect(likesGiven).toHaveLength(5);
    });

    it('should get likes received by user', async () => {
      const receiver = await createTestUser({ email: 'popular@test.com' });

      for (let i = 0; i < 3; i++) {
        const sender = await createTestUser({ email: `admirer${i}@test.com` });
        await createTestLike(sender.id, receiver.id);
      }

      const likesReceived = await prisma.like.findMany({
        where: { receiverId: receiver.id },
        include: { sender: true },
      });

      expect(likesReceived).toHaveLength(3);
    });
  });

  describe('Dislike Operations', () => {
    it('should create dislike', async () => {
      const sender = await createTestUser({ email: 'disliker@test.com' });
      const receiver = await createTestUser({ email: 'disliked@test.com' });

      const dislike = await prisma.dislike.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
        },
      });

      expect(dislike.id).toBeDefined();
      expect(dislike.senderId).toBe(sender.id);
      expect(dislike.receiverId).toBe(receiver.id);
    });

    it('should enforce unique sender-receiver pair for dislikes', async () => {
      const sender = await createTestUser({ email: 'disliker2@test.com' });
      const receiver = await createTestUser({ email: 'disliked2@test.com' });

      await prisma.dislike.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
        },
      });

      await expect(
        prisma.dislike.create({
          data: {
            senderId: sender.id,
            receiverId: receiver.id,
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    });

    it('should allow both like and dislike to same user over time', async () => {
      // User can change their mind - first dislike, then like
      const sender = await createTestUser({ email: 'indecisive@test.com' });
      const receiver = await createTestUser({ email: 'target@test.com' });

      // First dislike
      const dislike = await prisma.dislike.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
        },
      });

      // Can still like (application logic should handle this)
      const like = await prisma.like.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
        },
      });

      expect(dislike.id).toBeDefined();
      expect(like.id).toBeDefined();
    });
  });

  describe('Match Detection (Mutual Likes)', () => {
    it('should detect mutual like (match)', async () => {
      const user1 = await createTestUser({ email: 'matcher1@test.com' });
      const user2 = await createTestUser({ email: 'matcher2@test.com' });

      // user1 likes user2
      await createTestLike(user1.id, user2.id);

      // Check if user2 already liked user1 (match detection)
      const existingLike = await prisma.like.findUnique({
        where: {
          senderId_receiverId: {
            senderId: user2.id,
            receiverId: user1.id,
          },
        },
      });

      expect(existingLike).toBeNull(); // No match yet

      // user2 likes user1
      await createTestLike(user2.id, user1.id);

      // Now check for match
      const mutualLike = await prisma.like.findUnique({
        where: {
          senderId_receiverId: {
            senderId: user2.id,
            receiverId: user1.id,
          },
        },
      });

      expect(mutualLike).not.toBeNull(); // Match exists!
    });

    it('should query all matches for a user', async () => {
      const user = await createTestUser({ email: 'matchfinder@test.com' });

      // Create 3 mutual matches
      for (let i = 0; i < 3; i++) {
        const matchedUser = await createTestUser({ email: `matched${i}@test.com` });
        await createTestMatch(user.id, matchedUser.id);
      }

      // Create 2 one-sided likes (not matches)
      for (let i = 0; i < 2; i++) {
        const likedUser = await createTestUser({ email: `onesided${i}@test.com` });
        await createTestLike(user.id, likedUser.id);
      }

      // Query: Find all users who have mutual likes with this user
      const matches = await prisma.user.findMany({
        where: {
          AND: [
            // They liked me
            {
              likesGiven: {
                some: {
                  receiverId: user.id,
                },
              },
            },
            // I liked them
            {
              likesReceived: {
                some: {
                  senderId: user.id,
                },
              },
            },
          ],
        },
      });

      expect(matches).toHaveLength(3);
    });

    it('should get match details with user information', async () => {
      const user1 = await createTestUser({
        email: 'matchdetail1@test.com',
        name: 'Alice',
        age: 25,
      });
      const user2 = await createTestUser({
        email: 'matchdetail2@test.com',
        name: 'Bob',
        age: 28,
      });

      await createTestMatch(user1.id, user2.id);

      // Get user2's info for user1's match view
      const matchInfo = await prisma.like.findUnique({
        where: {
          senderId_receiverId: {
            senderId: user1.id,
            receiverId: user2.id,
          },
        },
        include: {
          receiver: {
            include: {
              photos: true,
            },
          },
        },
      });

      expect(matchInfo?.receiver.name).toBe('Bob');
      expect(matchInfo?.receiver.age).toBe(28);
    });
  });

  describe('Unmatch (Delete Match)', () => {
    it('should handle unmatch (delete likes)', async () => {
      const user1 = await createTestUser({ email: 'unmatcher1@test.com' });
      const user2 = await createTestUser({ email: 'unmatcher2@test.com' });

      await createTestMatch(user1.id, user2.id);

      // Unmatch by deleting both likes
      await prisma.like.deleteMany({
        where: {
          OR: [
            { senderId: user1.id, receiverId: user2.id },
            { senderId: user2.id, receiverId: user1.id },
          ],
        },
      });

      // Verify no more likes exist
      const remainingLikes = await prisma.like.findMany({
        where: {
          OR: [
            { senderId: user1.id, receiverId: user2.id },
            { senderId: user2.id, receiverId: user1.id },
          ],
        },
      });

      expect(remainingLikes).toHaveLength(0);
    });

    it('should only delete one direction (unlike)', async () => {
      const user1 = await createTestUser({ email: 'unliker1@test.com' });
      const user2 = await createTestUser({ email: 'unliker2@test.com' });

      await createTestMatch(user1.id, user2.id);

      // User1 unlikes (but doesn't fully unmatch)
      await prisma.like.delete({
        where: {
          senderId_receiverId: {
            senderId: user1.id,
            receiverId: user2.id,
          },
        },
      });

      // User2's like still exists
      const user2Like = await prisma.like.findUnique({
        where: {
          senderId_receiverId: {
            senderId: user2.id,
            receiverId: user1.id,
          },
        },
      });

      expect(user2Like).not.toBeNull();
    });
  });

  describe('Block Operations', () => {
    it('should create block', async () => {
      const blocker = await createTestUser({ email: 'blocker@test.com' });
      const blocked = await createTestUser({ email: 'blocked@test.com' });

      const block = await prisma.block.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
          reason: 'Inappropriate behavior',
        },
      });

      expect(block.blockerId).toBe(blocker.id);
      expect(block.blockedId).toBe(blocked.id);
      expect(block.reason).toBe('Inappropriate behavior');
    });

    it('should block and remove existing match', async () => {
      const user1 = await createTestUser({ email: 'blockremove1@test.com' });
      const user2 = await createTestUser({ email: 'blockremove2@test.com' });

      // Create match
      await createTestMatch(user1.id, user2.id);

      // User1 blocks user2 and removes likes
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
          },
        }),
      ]);

      // Verify block exists and likes are gone
      const block = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: user1.id,
            blockedId: user2.id,
          },
        },
      });

      const likes = await prisma.like.findMany({
        where: {
          OR: [
            { senderId: user1.id, receiverId: user2.id },
            { senderId: user2.id, receiverId: user1.id },
          ],
        },
      });

      expect(block).not.toBeNull();
      expect(likes).toHaveLength(0);
    });

    it('should unblock user', async () => {
      const blocker = await createTestUser({ email: 'unblocker@test.com' });
      const blocked = await createTestUser({ email: 'unblocked@test.com' });

      await prisma.block.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
        },
      });

      await prisma.block.delete({
        where: {
          blockerId_blockedId: {
            blockerId: blocker.id,
            blockedId: blocked.id,
          },
        },
      });

      const block = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: blocker.id,
            blockedId: blocked.id,
          },
        },
      });

      expect(block).toBeNull();
    });

    it('should get all blocked users', async () => {
      const blocker = await createTestUser({ email: 'prolificblocker@test.com' });

      for (let i = 0; i < 4; i++) {
        const blocked = await createTestUser({ email: `blockeduser${i}@test.com` });
        await prisma.block.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
          },
        });
      }

      const blockedUsers = await prisma.block.findMany({
        where: { blockerId: blocker.id },
        include: { blocked: true },
      });

      expect(blockedUsers).toHaveLength(4);
    });
  });

  describe('Match Statistics', () => {
    it('should count likes given', async () => {
      const user = await createTestUser({ email: 'countlikes@test.com' });

      for (let i = 0; i < 10; i++) {
        const receiver = await createTestUser({ email: `likecount${i}@test.com` });
        await createTestLike(user.id, receiver.id);
      }

      const likesGivenCount = await prisma.like.count({
        where: { senderId: user.id },
      });

      expect(likesGivenCount).toBe(10);
    });

    it('should count likes received', async () => {
      const popular = await createTestUser({ email: 'popularcounter@test.com' });

      for (let i = 0; i < 7; i++) {
        const sender = await createTestUser({ email: `likeadmirer${i}@test.com` });
        await createTestLike(sender.id, popular.id);
      }

      const likesReceivedCount = await prisma.like.count({
        where: { receiverId: popular.id },
      });

      expect(likesReceivedCount).toBe(7);
    });

    it('should count matches', async () => {
      const user = await createTestUser({ email: 'countmatches@test.com' });

      // Create 4 matches
      for (let i = 0; i < 4; i++) {
        const matchedUser = await createTestUser({ email: `matchcount${i}@test.com` });
        await createTestMatch(user.id, matchedUser.id);
      }

      // Count by counting mutual likes
      const matchCount = await prisma.like.count({
        where: {
          senderId: user.id,
          receiver: {
            likesGiven: {
              some: {
                receiverId: user.id,
              },
            },
          },
        },
      });

      expect(matchCount).toBe(4);
    });

    it('should get recent matches with timestamp', async () => {
      const user = await createTestUser({ email: 'recentmatches@test.com' });

      for (let i = 0; i < 3; i++) {
        const matchedUser = await createTestUser({ email: `recentmatch${i}@test.com` });
        await createTestMatch(user.id, matchedUser.id);
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Get likes that are mutual, ordered by most recent
      const recentMatches = await prisma.like.findMany({
        where: {
          senderId: user.id,
          receiver: {
            likesGiven: {
              some: {
                receiverId: user.id,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        include: { receiver: true },
        take: 10,
      });

      expect(recentMatches).toHaveLength(3);
      // Most recent should be first
      expect(recentMatches[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        recentMatches[1].createdAt.getTime()
      );
    });
  });
});
