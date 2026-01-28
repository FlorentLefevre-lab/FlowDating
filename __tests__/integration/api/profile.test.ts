/**
 * Integration Tests for Profile API Routes
 * Tests profile retrieval, update, and photo management
 */

import {
  testPrisma,
  createTestUser,
  createTestPhoto,
  cleanupTestUsersByEmail,
  createRequest,
  mockAuthSession,
  clearMockSession,
  createAuthenticatedSession,
  generateTestId,
} from './setup';

// Import route handlers (auth module is mocked in jest.integration.setup.ts)
import { GET as profileGET, PUT as profilePUT } from '../../../app/api/profile/route';
import {
  GET as photosGET,
  POST as photosPOST,
  DELETE as photosDELETE,
} from '../../../app/api/profile/photos/route';

const TEST_EMAIL_PREFIX = 'profile-test';

describe('Profile API Routes', () => {
  let testUser: { id: string; email: string; name: string };

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

    // Create fresh test user for each test
    testUser = await createTestUser({
      email: `${TEST_EMAIL_PREFIX}-${generateTestId()}@test.local`,
      name: 'Profile Test User',
      password: 'Password123!',
      emailVerified: true,
      age: 25,
      bio: 'Test bio',
      location: 'Paris',
      gender: 'MALE',
      interests: ['music', 'sports'],
    });
  });

  // ============================================
  // GET /api/profile
  // ============================================
  describe('GET /api/profile', () => {
    it('should return current user profile when authenticated', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile', { method: 'GET' });
      const response = await profileGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(testUser.id);
      expect(data.email).toBe(testUser.email);
      expect(data.name).toBe('Profile Test User');
      expect(data.age).toBe(25);
      expect(data.bio).toBe('Test bio');
      expect(data.location).toBe('Paris');
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession(); // No authenticated user

      const request = createRequest('/api/profile', { method: 'GET' });
      const response = await profileGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
    });

    it('should include photos in response', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Add photos to user
      await createTestPhoto(testUser.id, 'https://example.com/photo1.jpg', true);
      await createTestPhoto(testUser.id, 'https://example.com/photo2.jpg', false);

      const request = createRequest('/api/profile', { method: 'GET' });
      const response = await profileGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photos).toBeDefined();
      expect(data.photos.length).toBe(2);
      // Primary photo should be first
      expect(data.photos[0].isPrimary).toBe(true);
    });

    it('should include account status in response', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile', { method: 'GET' });
      const response = await profileGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accountStatus).toBeDefined();
      expect(data.accountStatus).toBe('ACTIVE');
    });

    it('should return mapped gender values (French format)', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile', { method: 'GET' });
      const response = await profileGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gender).toBe('homme'); // MALE -> homme
    });
  });

  // ============================================
  // PUT /api/profile
  // ============================================
  describe('PUT /api/profile', () => {
    it('should update profile with valid data', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile', {
        method: 'PUT',
        body: {
          name: 'Updated Name',
          age: 30,
          bio: 'Updated bio',
          location: 'Lyon',
          profession: 'Developer',
        },
      });

      const response = await profilePUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Name');
      expect(data.age).toBe(30);
      expect(data.bio).toBe('Updated bio');
      expect(data.location).toBe('Lyon');
      expect(data.profession).toBe('Developer');

      // Verify in database
      const dbUser = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(dbUser?.name).toBe('Updated Name');
      expect(dbUser?.age).toBe(30);
    });

    it('should return 400 for invalid gender value', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile', {
        method: 'PUT',
        body: {
          gender: 'invalid-gender',
        },
      });

      const response = await profilePUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('gender invalide');
    });

    it('should return 400 for invalid marital status', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile', {
        method: 'PUT',
        body: {
          maritalStatus: 'invalid-status',
        },
      });

      const response = await profilePUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('maritalStatus invalide');
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession();

      const request = createRequest('/api/profile', {
        method: 'PUT',
        body: { name: 'New Name' },
      });

      const response = await profilePUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
    });

    it('should accept valid French gender values', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const genderMappings = [
        { input: 'homme', expected: 'homme' },
        { input: 'femme', expected: 'femme' },
        { input: 'autre', expected: 'autre' },
        { input: 'non-binaire', expected: 'non-binaire' },
      ];

      for (const { input, expected } of genderMappings) {
        const request = createRequest('/api/profile', {
          method: 'PUT',
          body: { gender: input },
        });

        const response = await profilePUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.gender).toBe(expected);
      }
    });

    it('should update interests array', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const newInterests = ['cooking', 'travel', 'photography'];
      const request = createRequest('/api/profile', {
        method: 'PUT',
        body: { interests: newInterests },
      });

      const response = await profilePUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.interests).toEqual(newInterests);
    });

    it('should not modify fields not included in request', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Original values
      const originalBio = testUser.bio || 'Test bio';

      const request = createRequest('/api/profile', {
        method: 'PUT',
        body: { name: 'Only Name Changed' },
      });

      const response = await profilePUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Only Name Changed');
      expect(data.bio).toBe(originalBio);
    });
  });

  // ============================================
  // GET /api/profile/photos
  // ============================================
  describe('GET /api/profile/photos', () => {
    it('should return user photos', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      await createTestPhoto(testUser.id, 'https://example.com/photo1.jpg', true);
      await createTestPhoto(testUser.id, 'https://example.com/photo2.jpg', false);

      const request = createRequest('/api/profile/photos', { method: 'GET' });
      const response = await photosGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photos).toBeDefined();
      expect(data.photos.length).toBe(2);
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession();

      const request = createRequest('/api/profile/photos', { method: 'GET' });
      const response = await photosGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
    });

    it('should return empty array for user with no photos', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile/photos', { method: 'GET' });
      const response = await photosGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photos).toEqual([]);
    });

    it('should order photos with primary first', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Create non-primary first
      await createTestPhoto(testUser.id, 'https://example.com/secondary.jpg', false);
      // Then primary
      await createTestPhoto(testUser.id, 'https://example.com/primary.jpg', true);

      const request = createRequest('/api/profile/photos', { method: 'GET' });
      const response = await photosGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photos[0].isPrimary).toBe(true);
      expect(data.photos[0].url).toContain('primary');
    });
  });

  // ============================================
  // POST /api/profile/photos
  // ============================================
  describe('POST /api/profile/photos', () => {
    it('should upload photo', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile/photos', {
        method: 'POST',
        body: { imageUrl: 'https://example.com/new-photo.jpg' },
      });

      const response = await photosPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.url).toBe('https://example.com/new-photo.jpg');
      expect(data.userId).toBe(testUser.id);
    });

    it('should set first photo as primary', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile/photos', {
        method: 'POST',
        body: { imageUrl: 'https://example.com/first-photo.jpg' },
      });

      const response = await photosPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.isPrimary).toBe(true);
    });

    it('should not set subsequent photos as primary', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Create first photo
      await createTestPhoto(testUser.id, 'https://example.com/first.jpg', true);

      const request = createRequest('/api/profile/photos', {
        method: 'POST',
        body: { imageUrl: 'https://example.com/second-photo.jpg' },
      });

      const response = await photosPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.isPrimary).toBe(false);
    });

    it('should enforce max 6 photos limit', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Create 6 photos
      for (let i = 0; i < 6; i++) {
        await createTestPhoto(testUser.id, `https://example.com/photo${i}.jpg`, i === 0);
      }

      // Try to add 7th photo
      const request = createRequest('/api/profile/photos', {
        method: 'POST',
        body: { imageUrl: 'https://example.com/photo7.jpg' },
      });

      const response = await photosPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Maximum 6 photos');
    });

    it('should return 400 if imageUrl is missing', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile/photos', {
        method: 'POST',
        body: {},
      });

      const response = await photosPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('URL');
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession();

      const request = createRequest('/api/profile/photos', {
        method: 'POST',
        body: { imageUrl: 'https://example.com/photo.jpg' },
      });

      const response = await photosPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
    });
  });

  // ============================================
  // DELETE /api/profile/photos
  // ============================================
  describe('DELETE /api/profile/photos', () => {
    it('should delete own photo', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const photo = await createTestPhoto(testUser.id, 'https://example.com/to-delete.jpg', false);

      const request = createRequest('/api/profile/photos', {
        method: 'DELETE',
        searchParams: { id: photo.id },
      });

      const response = await photosDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('succes');

      // Verify deletion
      const deletedPhoto = await testPrisma.photo.findUnique({
        where: { id: photo.id },
      });
      expect(deletedPhoto).toBeNull();
    });

    it('should promote next photo to primary when deleting primary', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      // Create primary photo
      const primaryPhoto = await createTestPhoto(testUser.id, 'https://example.com/primary.jpg', true);
      // Create secondary photo
      await createTestPhoto(testUser.id, 'https://example.com/secondary.jpg', false);

      const request = createRequest('/api/profile/photos', {
        method: 'DELETE',
        searchParams: { id: primaryPhoto.id },
      });

      await photosDELETE(request);

      // Check that secondary is now primary
      const photos = await testPrisma.photo.findMany({
        where: { userId: testUser.id },
      });

      expect(photos.length).toBe(1);
      expect(photos[0].isPrimary).toBe(true);
    });

    it('should return 404 for non-existent photo', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile/photos', {
        method: 'DELETE',
        searchParams: { id: 'non-existent-photo-id' },
      });

      const response = await photosDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('non trouve');
    });

    it('should return 400 if photo id is missing', async () => {
      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile/photos', {
        method: 'DELETE',
      });

      const response = await photosDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('ID');
    });

    it('should return 401 if not authenticated', async () => {
      clearMockSession();

      const request = createRequest('/api/profile/photos', {
        method: 'DELETE',
        searchParams: { id: 'some-photo-id' },
      });

      const response = await photosDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
    });

    it('should not allow deleting another user photo', async () => {
      const otherUser = await createTestUser({
        email: `${TEST_EMAIL_PREFIX}-other-${generateTestId()}@test.local`,
        name: 'Other User',
        password: 'Password123!',
      });

      const otherUserPhoto = await createTestPhoto(otherUser.id, 'https://example.com/other.jpg', true);

      mockAuthSession(createAuthenticatedSession(testUser));

      const request = createRequest('/api/profile/photos', {
        method: 'DELETE',
        searchParams: { id: otherUserPhoto.id },
      });

      const response = await photosDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('non trouve');
    });
  });
});
