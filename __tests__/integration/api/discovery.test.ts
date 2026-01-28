/**
 * Integration Tests for Discovery API Routes
 * Tests profile discovery, filtering, and like/dislike actions
 */

import {
  testPrisma,
  createTestUser,
  createTestLike,
  createTestDislike,
  createTestBlock,
  createTestPhoto,
  createTestUserPreferences,
  cleanupTestUsersByEmail,
  createRequest,
  mockAuthSession,
  clearMockSession,
  createAuthenticatedSession,
  generateTestId,
} from './setup';

// Import route handlers (auth and cache modules are mocked in jest.integration.setup.ts)
import { GET as discoverGET, POST as discoverPOST } from '../../../app/api/discover/route';
import { POST as likesPOST } from '../../../app/api/likes/route';

const TEST_EMAIL_PREFIX = 'discovery-test';

describe('Discovery API Routes', () => {
  let testUser: { id: string; email: string; name: string };
  let targetUser1: { id: string; email: string; name: string };
  let targetUser2: { id: string; email: string; name: string };
  let targetUser3: { id: string; email: string; name: string };

  beforeAll(async () => {
    await cleanupTestUsersByEmail(TEST_EMAIL_PREFIX);
  });

  afterAll(async () => {
    await cleanupTestUsersByEmail(TEST_EMAIL_PREFIX);
    clearMockSession();
  });

  beforeEach(async () => {
    clearMockSession();
    jest.clearAllMocks();

    // Clean up previous test data
    await cleanupTestUsersByEmail(TEST_EMAIL_PREFIX);

    // Create main test user
    testUser = await createTestUser({
      email: `${TEST_EMAIL_PREFIX}-main-${generateTestId()}@test.local`,
      name: 'Discovery Test User',
      password: 'Password123!',
      emailVerified: true,
      age: 28,
      location: 'Paris',
      gender: 'MALE',
      interests: ['music', 'sports', 'travel'],
    });

    // Create target users for discovery
    targetUser1 = await createTestUser({
      email: `${TEST_EMAIL_PREFIX}-target1-${generateTestId()}@test.local`,
      name: 'Target User 1',
      password: 'Password123!',
      emailVerified: true,
      age: 25,
      location: 'Paris',
      gender: 'FEMALE',
      interests: ['music', 'cooking'],
    });

    targetUser2 = await createTestUser({
      email: `${TEST_EMAIL_PREFIX}-target2-${generateTestId()}@test.local`,
      name: 'Target User 2',
      password: 'Password123!',
      emailVerified: true,
      age: 30,
      location: 'Lyon',
      gender: 'FEMALE',
      interests: ['sports', 'photography'],
    });

    targetUser3 = await createTestUser({
      email: `${TEST_EMAIL_PREFIX}-target3-${generateTestId()}@test.local`,
      name: 'Target User 3',
      password: 'Password123!',
      emailVerified: true,
      age: 22,
      location: 'Marseille',
      gender: 'MALE',
      interests: ['travel', 'gaming'],
    });

    // Add photos for more realistic testing
    await createTestPhoto(targetUser1.id, 'https://example.com/target1.jpg', true);
    await createTestPhoto(targetUser2.id, 'https://example.com/target2.jpg', true);
  });

  // ============================================
  // GET /api/discover
  // ============================================
  describe('GET /api/discover', () => {
    it('should return filtered profiles', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', { method: 'GET' });
      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.users).toBeDefined();
      expect(Array.isArray(data.users)).toBe(true);
      // Should not include the current user
      const userIds = data.users.map((u: any) => u.id);
      expect(userIds).not.toContain(testUser.id);
    });

    it('should exclude already liked users', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Like target user 1
      await createTestLike(testUser.id, targetUser1.id);

      const request = createRequest('/api/discover', { method: 'GET' });
      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const userIds = data.users.map((u: any) => u.id);
      expect(userIds).not.toContain(targetUser1.id);
    });

    it('should exclude already disliked users', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Dislike target user 2
      await createTestDislike(testUser.id, targetUser2.id);

      const request = createRequest('/api/discover', { method: 'GET' });
      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const userIds = data.users.map((u: any) => u.id);
      expect(userIds).not.toContain(targetUser2.id);
    });

    it('should exclude blocked users', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Block target user 3
      await createTestBlock(testUser.id, targetUser3.id, 'Test block');

      const request = createRequest('/api/discover', { method: 'GET' });
      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const userIds = data.users.map((u: any) => u.id);
      expect(userIds).not.toContain(targetUser3.id);
    });

    it('should respect age filters', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', {
        method: 'GET',
        searchParams: {
          minAge: '24',
          maxAge: '27',
        },
      });

      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Only targetUser1 (age 25) should be in range
      const ages = data.users.map((u: any) => u.age);
      ages.forEach((age: number) => {
        expect(age).toBeGreaterThanOrEqual(24);
        expect(age).toBeLessThanOrEqual(27);
      });
    });

    it('should respect gender filter', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', {
        method: 'GET',
        searchParams: {
          gender: 'FEMALE',
        },
      });

      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.users.forEach((user: any) => {
        expect(user.gender).toBe('FEMALE');
      });
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession();

      const request = createRequest('/api/discover', { method: 'GET' });
      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
    });

    it('should include compatibility score', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', { method: 'GET' });
      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.users.forEach((user: any) => {
        expect(user.compatibility).toBeDefined();
        expect(typeof user.compatibility).toBe('number');
        expect(user.compatibility).toBeGreaterThanOrEqual(0);
        expect(user.compatibility).toBeLessThanOrEqual(100);
      });
    });

    it('should respect limit parameter', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', {
        method: 'GET',
        searchParams: { limit: '1' },
      });

      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users.length).toBeLessThanOrEqual(1);
    });

    it('should respect offset parameter for pagination', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // First request without offset
      const request1 = createRequest('/api/discover', {
        method: 'GET',
        searchParams: { limit: '1', offset: '0' },
      });
      const response1 = await discoverGET(request1);
      const data1 = await response1.json();

      // Second request with offset
      const request2 = createRequest('/api/discover', {
        method: 'GET',
        searchParams: { limit: '1', offset: '1' },
      });
      const response2 = await discoverGET(request2);
      const data2 = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      if (data1.users.length > 0 && data2.users.length > 0) {
        expect(data1.users[0].id).not.toBe(data2.users[0].id);
      }
    });

    it('should include isOnline status', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Update target user to be online
      await testPrisma.user.update({
        where: { id: targetUser1.id },
        data: { lastSeen: new Date(), isOnline: true },
      });

      const request = createRequest('/api/discover', { method: 'GET' });
      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.users.forEach((user: any) => {
        expect(typeof user.isOnline).toBe('boolean');
      });
    });

    it('should exclude system users', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Create a system user
      await testPrisma.user.create({
        data: {
          email: 'system@system.local',
          name: 'System User',
        },
      });

      const request = createRequest('/api/discover', { method: 'GET' });
      const response = await discoverGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const emails = data.users.map((u: any) => u.email);
      expect(emails).not.toContain('system@system.local');
    });
  });

  // ============================================
  // POST /api/likes
  // ============================================
  describe('POST /api/likes', () => {
    it('should create like', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: targetUser1.id,
          action: 'like',
        },
      });

      const response = await likesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('like');

      // Verify in database
      const like = await testPrisma.like.findUnique({
        where: {
          senderId_receiverId: {
            senderId: testUser.id,
            receiverId: targetUser1.id,
          },
        },
      });
      expect(like).not.toBeNull();
    });

    it('should create dislike', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: targetUser2.id,
          action: 'dislike',
        },
      });

      const response = await likesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('dislike');

      // Verify in database
      const dislike = await testPrisma.dislike.findUnique({
        where: {
          senderId_receiverId: {
            senderId: testUser.id,
            receiverId: targetUser2.id,
          },
        },
      });
      expect(dislike).not.toBeNull();
    });

    it('should detect and create match on mutual like', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Target user already likes test user
      await createTestLike(targetUser1.id, testUser.id);

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: targetUser1.id,
          action: 'like',
        },
      });

      const response = await likesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isMatch).toBe(true);
      expect(data.message).toContain('match');
    });

    it('should return 404 for non-existent user', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: 'non-existent-user-id',
          action: 'like',
        },
      });

      const response = await likesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('non trouve');
    });

    it('should return 400 for self-like', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: testUser.id, // Self-like
          action: 'like',
        },
      });

      const response = await likesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('soi-meme');
    });

    it('should return 400 for missing action', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: targetUser1.id,
          // action missing
        },
      });

      const response = await likesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('manquantes');
    });

    it('should return 400 for invalid action', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: targetUser1.id,
          action: 'invalid-action',
        },
      });

      const response = await likesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('invalide');
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession();

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: targetUser1.id,
          action: 'like',
        },
      });

      const response = await likesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('autorise');
    });

    it('should return 400 for duplicate like', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Create initial like
      await createTestLike(testUser.id, targetUser1.id);

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: targetUser1.id,
          action: 'like',
        },
      });

      const response = await likesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('deja effectuee');
    });

    it('should record profile view when liking', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/likes', {
        method: 'POST',
        body: {
          toUserId: targetUser1.id,
          action: 'like',
        },
      });

      await likesPOST(request);

      // Verify profile view was recorded
      const profileView = await testPrisma.profileView.findUnique({
        where: {
          viewerId_viewedId: {
            viewerId: testUser.id,
            viewedId: targetUser1.id,
          },
        },
      });
      expect(profileView).not.toBeNull();
    });
  });

  // ============================================
  // POST /api/discover (Actions - like, dislike, etc.)
  // ============================================
  describe('POST /api/discover (Actions)', () => {
    it('should handle like action', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', {
        method: 'POST',
        body: {
          action: 'like',
          targetUserId: targetUser1.id,
        },
      });

      const response = await discoverPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('like');
    });

    it('should handle dislike/pass action', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', {
        method: 'POST',
        body: {
          action: 'dislike',
          targetUserId: targetUser1.id,
        },
      });

      const response = await discoverPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for missing parameters', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', {
        method: 'POST',
        body: {
          // Missing action and targetUserId
        },
      });

      const response = await discoverPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('requis');
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession();

      const request = createRequest('/api/discover', {
        method: 'POST',
        body: {
          action: 'like',
          targetUserId: targetUser1.id,
        },
      });

      const response = await discoverPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
    });

    it('should detect match on mutual like via discover endpoint', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Target already likes test user
      await createTestLike(targetUser1.id, testUser.id);

      const request = createRequest('/api/discover', {
        method: 'POST',
        body: {
          action: 'like',
          targetUserId: targetUser1.id,
        },
      });

      const response = await discoverPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isMatch).toBe(true);
    });

    it('should return 404 for non-existent target user', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', {
        method: 'POST',
        body: {
          action: 'like',
          targetUserId: 'non-existent-id',
        },
      });

      const response = await discoverPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('introuvable');
    });

    it('should return 400 for invalid action', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/discover', {
        method: 'POST',
        body: {
          action: 'invalid-action',
          targetUserId: targetUser1.id,
        },
      });

      const response = await discoverPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('non support');
    });
  });
});
