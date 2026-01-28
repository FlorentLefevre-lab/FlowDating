/**
 * Integration Tests for Matches API Routes
 * Tests match retrieval and management
 */

import {
  testPrisma,
  createTestUser,
  createTestLike,
  createTestMatch,
  createTestPhoto,
  cleanupTestUsersByEmail,
  createRequest,
  mockAuthSession,
  clearMockSession,
  createAuthenticatedSession,
  generateTestId,
} from './setup';

// Import route handlers (auth module is mocked in jest.integration.setup.ts)
import { GET as matchesGET, POST as matchesPOST } from '../../../app/api/matches/route';

const TEST_EMAIL_PREFIX = 'matches-test';

describe('Matches API Routes', () => {
  let testUser: { id: string; email: string; name: string };
  let matchedUser1: { id: string; email: string; name: string };
  let matchedUser2: { id: string; email: string; name: string };
  let unmatchedUser: { id: string; email: string; name: string };
  let otherUser: { id: string; email: string; name: string };

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
      name: 'Match Test User',
      password: 'Password123!',
      emailVerified: true,
      age: 28,
      location: 'Paris',
      interests: ['music', 'sports'],
    });

    // Create matched users
    matchedUser1 = await createTestUser({
      email: `${TEST_EMAIL_PREFIX}-matched1-${generateTestId()}@test.local`,
      name: 'Matched User 1',
      password: 'Password123!',
      emailVerified: true,
      age: 25,
      location: 'Paris',
      interests: ['music'],
    });

    matchedUser2 = await createTestUser({
      email: `${TEST_EMAIL_PREFIX}-matched2-${generateTestId()}@test.local`,
      name: 'Matched User 2',
      password: 'Password123!',
      emailVerified: true,
      age: 30,
      location: 'Lyon',
      interests: ['sports'],
    });

    // Create unmatched user (only testUser liked them)
    unmatchedUser = await createTestUser({
      email: `${TEST_EMAIL_PREFIX}-unmatched-${generateTestId()}@test.local`,
      name: 'Unmatched User',
      password: 'Password123!',
      emailVerified: true,
      age: 27,
    });

    // Create other user (for testing isolation)
    otherUser = await createTestUser({
      email: `${TEST_EMAIL_PREFIX}-other-${generateTestId()}@test.local`,
      name: 'Other User',
      password: 'Password123!',
      emailVerified: true,
      age: 26,
    });

    // Add photos
    await createTestPhoto(matchedUser1.id, 'https://example.com/matched1.jpg', true);
    await createTestPhoto(matchedUser2.id, 'https://example.com/matched2.jpg', true);

    // Create mutual likes (matches)
    await createTestMatch(testUser.id, matchedUser1.id);
    await createTestMatch(testUser.id, matchedUser2.id);

    // Create one-way like (not a match)
    await createTestLike(testUser.id, unmatchedUser.id);
  });

  // ============================================
  // GET /api/matches
  // ============================================
  describe('GET /api/matches', () => {
    it('should return only own matches', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.matches).toBeDefined();
      expect(Array.isArray(data.matches)).toBe(true);

      // Should have 2 matches
      expect(data.matches.length).toBe(2);

      // Verify matched users
      const matchedIds = data.matches.map((m: any) => m.user.id);
      expect(matchedIds).toContain(matchedUser1.id);
      expect(matchedIds).toContain(matchedUser2.id);
      expect(matchedIds).not.toContain(unmatchedUser.id);
    });

    it('should not return other user matches', async () => {
      // Create a match between other users
      await createTestMatch(otherUser.id, unmatchedUser.id);

      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Should not include matches that don't involve testUser
      const matchedIds = data.matches.map((m: any) => m.user.id);
      expect(matchedIds).not.toContain(otherUser.id);
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession();

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
    });

    it('should include match statistics', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalMatches).toBe(2);
      expect(typeof data.stats.newMatches).toBe('number');
      expect(typeof data.stats.activeConversations).toBe('number');
    });

    it('should include user details in matches', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      data.matches.forEach((match: any) => {
        expect(match.user).toBeDefined();
        expect(match.user.id).toBeDefined();
        expect(match.user.name).toBeDefined();
        expect(match.user.age).toBeDefined();
      });
    });

    it('should include photos in match user data', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      const matchWithPhoto = data.matches.find(
        (m: any) => m.user.id === matchedUser1.id
      );
      expect(matchWithPhoto).toBeDefined();
      expect(matchWithPhoto.user.photo).toBeDefined();
    });

    it('should include compatibility score', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      data.matches.forEach((match: any) => {
        expect(match.compatibility).toBeDefined();
        expect(typeof match.compatibility).toBe('number');
        expect(match.compatibility).toBeGreaterThanOrEqual(0);
        expect(match.compatibility).toBeLessThanOrEqual(100);
      });
    });

    it('should sort matches by date (most recent first)', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.matches.length >= 2) {
        const dates = data.matches.map((m: any) => new Date(m.createdAt).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });

    it('should return empty array for user with no matches', async () => {
      // Create a user with no matches
      const noMatchUser = await createTestUser({
        email: `${TEST_EMAIL_PREFIX}-nomatch-${generateTestId()}@test.local`,
        name: 'No Match User',
        password: 'Password123!',
      });

      mockAuthSession(createAuthenticatedSession(noMatchUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.matches).toEqual([]);
      expect(data.stats.totalMatches).toBe(0);
    });

    it('should include isOnline status for matched users', async () => {
      // Set one matched user as online
      await testPrisma.user.update({
        where: { id: matchedUser1.id },
        data: { isOnline: true, lastSeen: new Date() },
      });

      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      const onlineMatch = data.matches.find(
        (m: any) => m.user.id === matchedUser1.id
      );
      expect(onlineMatch.user.isOnline).toBe(true);
    });

    it('should include lastSeen for matched users', async () => {
      const lastSeenDate = new Date();
      await testPrisma.user.update({
        where: { id: matchedUser1.id },
        data: { lastSeen: lastSeenDate },
      });

      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      const matchWithLastSeen = data.matches.find(
        (m: any) => m.user.id === matchedUser1.id
      );
      expect(matchWithLastSeen.user.lastSeen).toBeDefined();
    });

    it('should calculate this week matches correctly', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(typeof data.stats.thisWeekMatches).toBe('number');
      // Since matches were just created, they should be this week
      expect(data.stats.thisWeekMatches).toBeGreaterThan(0);
    });
  });

  // ============================================
  // POST /api/matches (Create like that could be a match)
  // ============================================
  describe('POST /api/matches', () => {
    it('should create like for target user', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Create a new user who hasn't been liked yet
      const newUser = await createTestUser({
        email: `${TEST_EMAIL_PREFIX}-new-${generateTestId()}@test.local`,
        name: 'New User',
        password: 'Password123!',
      });

      const request = createRequest('/api/matches', {
        method: 'POST',
        body: { targetUserId: newUser.id },
      });

      const response = await matchesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isMatch).toBe(false); // One-way like, not match yet
    });

    it('should create match when mutual like', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Create a user who already liked testUser
      const likerUser = await createTestUser({
        email: `${TEST_EMAIL_PREFIX}-liker-${generateTestId()}@test.local`,
        name: 'Liker User',
        password: 'Password123!',
      });

      // likerUser already likes testUser
      await createTestLike(likerUser.id, testUser.id);

      const request = createRequest('/api/matches', {
        method: 'POST',
        body: { targetUserId: likerUser.id },
      });

      const response = await matchesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isMatch).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', {
        method: 'POST',
        body: { targetUserId: 'non-existent-id' },
      });

      const response = await matchesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('introuvable');
    });

    it('should return 400 if targetUserId is missing', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', {
        method: 'POST',
        body: {},
      });

      const response = await matchesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('requis');
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession();

      const request = createRequest('/api/matches', {
        method: 'POST',
        body: { targetUserId: matchedUser1.id },
      });

      const response = await matchesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
    });

    it('should return 409 for duplicate like', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Create a user and like them first
      const newUser = await createTestUser({
        email: `${TEST_EMAIL_PREFIX}-dup-${generateTestId()}@test.local`,
        name: 'Duplicate Test User',
        password: 'Password123!',
      });

      // First like
      await createTestLike(testUser.id, newUser.id);

      // Try to like again
      const request = createRequest('/api/matches', {
        method: 'POST',
        body: { targetUserId: newUser.id },
      });

      const response = await matchesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('deja');
    });

    it('should return target user info on success', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const newUser = await createTestUser({
        email: `${TEST_EMAIL_PREFIX}-info-${generateTestId()}@test.local`,
        name: 'Info Test User',
        password: 'Password123!',
        age: 25,
        location: 'Marseille',
      });

      await createTestPhoto(newUser.id, 'https://example.com/info-photo.jpg', true);

      const request = createRequest('/api/matches', {
        method: 'POST',
        body: { targetUserId: newUser.id },
      });

      const response = await matchesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.targetUser).toBeDefined();
      expect(data.data.targetUser.id).toBe(newUser.id);
      expect(data.data.targetUser.name).toBe('Info Test User');
    });

    it('should include channel ID when match is created', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const likerUser = await createTestUser({
        email: `${TEST_EMAIL_PREFIX}-channel-${generateTestId()}@test.local`,
        name: 'Channel Test User',
        password: 'Password123!',
      });

      // likerUser already likes testUser
      await createTestLike(likerUser.id, testUser.id);

      const request = createRequest('/api/matches', {
        method: 'POST',
        body: { targetUserId: likerUser.id },
      });

      const response = await matchesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.isMatch).toBe(true);
      expect(data.data.channelId).toBeDefined();
    });
  });

  // ============================================
  // Additional Security Tests
  // ============================================
  describe('Security Tests', () => {
    it('should not leak other users private data', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify no sensitive data is exposed
      data.matches.forEach((match: any) => {
        expect(match.user.hashedPassword).toBeUndefined();
        expect(match.user.password).toBeUndefined();
        expect(match.user.emailVerified).toBeUndefined();
      });
    });

    it('should verify user owns the session', async () => {
      // Create a malicious scenario where session user doesn't exist
      mockAuthSession({
        user: {
          id: 'fake-non-existent-id',
          email: 'fake@test.local',
          name: 'Fake User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const request = createRequest('/api/matches', { method: 'GET' });
      const response = await matchesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should return empty matches for non-existent user
      expect(data.matches).toEqual([]);
    });
  });
});
