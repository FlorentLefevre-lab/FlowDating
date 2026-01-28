/**
 * Unit tests for src/lib/middleware/authorize.ts
 * Tests authentication and authorization middleware functions
 */

import { NextRequest } from 'next/server';

// Mock dependencies
const mockGetServerSession = jest.fn();
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  photo: {
    findUnique: jest.fn(),
  },
  userPreferences: {
    findUnique: jest.fn(),
  },
  like: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('next-auth', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: { secret: 'test-secret' },
}));

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

describe('Authorization Middleware', () => {
  let withAuth: typeof import('@/lib/middleware/authorize').withAuth;
  let withOwnership: typeof import('@/lib/middleware/authorize').withOwnership;
  let withMatchParticipant: typeof import('@/lib/middleware/authorize').withMatchParticipant;
  let withPhotoOwner: typeof import('@/lib/middleware/authorize').withPhotoOwner;
  let withSelfOnly: typeof import('@/lib/middleware/authorize').withSelfOnly;
  let sanitizeRequestBody: typeof import('@/lib/middleware/authorize').sanitizeRequestBody;
  let getResourceIdFromPath: typeof import('@/lib/middleware/authorize').getResourceIdFromPath;
  let FORBIDDEN_BODY_FIELDS: typeof import('@/lib/middleware/authorize').FORBIDDEN_BODY_FIELDS;

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
    expires: '2099-01-01',
  };

  const createMockRequest = (url: string = 'http://localhost:3000/api/test', init?: RequestInit) => {
    return new NextRequest(new URL(url), init);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset all mocks
    mockGetServerSession.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.photo.findUnique.mockReset();
    mockPrisma.like.findUnique.mockReset();
    mockPrisma.like.findMany.mockReset();
    mockPrisma.userPreferences.findUnique.mockReset();

    // Import the module
    const authorizeModule = await import('@/lib/middleware/authorize');
    withAuth = authorizeModule.withAuth;
    withOwnership = authorizeModule.withOwnership;
    withMatchParticipant = authorizeModule.withMatchParticipant;
    withPhotoOwner = authorizeModule.withPhotoOwner;
    withSelfOnly = authorizeModule.withSelfOnly;
    sanitizeRequestBody = authorizeModule.sanitizeRequestBody;
    getResourceIdFromPath = authorizeModule.getResourceIdFromPath;
    FORBIDDEN_BODY_FIELDS = authorizeModule.FORBIDDEN_BODY_FIELDS;
  });

  describe('withAuth', () => {
    it('should call handler when authenticated', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: 'ACTIVE' });

      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const wrappedHandler = withAuth(handler);
      const req = createMockRequest();

      await wrappedHandler(req);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(req, {
        session: mockSession,
        userId: 'user-123',
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler);

      const response = await wrappedHandler(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authentifie');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 401 when session has no user id', async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' }, expires: '2099-01-01' });

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler);

      const response = await wrappedHandler(createMockRequest());

      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 404 when user not found in database', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler);

      const response = await wrappedHandler(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('non trouve');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 403 when account is banned', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: 'BANNED' });

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler);

      const response = await wrappedHandler(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('banni');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 403 when account is deleted', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: 'DELETED' });

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler);

      const response = await wrappedHandler(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('supprime');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should pass session to handler', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: 'ACTIVE' });

      const handler = jest.fn().mockResolvedValue(new Response('ok'));
      const wrappedHandler = withAuth(handler);

      await wrappedHandler(createMockRequest());

      expect(handler.mock.calls[0][1]).toEqual({
        session: mockSession,
        userId: 'user-123',
      });
    });

    it('should return 500 on internal error', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Database error'));

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler);

      const response = await wrappedHandler(createMockRequest());

      expect(response.status).toBe(500);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('withOwnership', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: 'ACTIVE' });
    });

    it('should allow access to own resource', async () => {
      const handler = jest.fn().mockResolvedValue(new Response('ok'));
      const wrappedHandler = withOwnership(handler, 'user', () => 'user-123');

      await wrappedHandler(createMockRequest());

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][1]).toMatchObject({
        resourceId: 'user-123',
        userId: 'user-123',
      });
    });

    it('should return 403 for other user resource', async () => {
      const handler = jest.fn();
      const wrappedHandler = withOwnership(handler, 'user', () => 'other-user-456');

      const response = await wrappedHandler(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('refuse');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 400 for missing resource id', async () => {
      const handler = jest.fn();
      const wrappedHandler = withOwnership(handler, 'user', () => null);

      const response = await wrappedHandler(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('requis');
      expect(handler).not.toHaveBeenCalled();
    });

    describe('photo ownership', () => {
      it('should allow access to own photo', async () => {
        mockPrisma.photo.findUnique.mockResolvedValue({ userId: 'user-123' });

        const handler = jest.fn().mockResolvedValue(new Response('ok'));
        const wrappedHandler = withOwnership(handler, 'photo', () => 'photo-1');

        await wrappedHandler(createMockRequest());

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should deny access to other user photo', async () => {
        mockPrisma.photo.findUnique.mockResolvedValue({ userId: 'other-user' });

        const handler = jest.fn();
        const wrappedHandler = withOwnership(handler, 'photo', () => 'photo-1');

        const response = await wrappedHandler(createMockRequest());

        expect(response.status).toBe(403);
        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('preferences ownership', () => {
      it('should allow access to own preferences', async () => {
        mockPrisma.userPreferences.findUnique.mockResolvedValue({ userId: 'user-123' });

        const handler = jest.fn().mockResolvedValue(new Response('ok'));
        const wrappedHandler = withOwnership(handler, 'preferences', () => 'pref-1');

        await wrappedHandler(createMockRequest());

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    describe('like ownership', () => {
      it('should allow access to own like', async () => {
        mockPrisma.like.findUnique.mockResolvedValue({ senderId: 'user-123' });

        const handler = jest.fn().mockResolvedValue(new Response('ok'));
        const wrappedHandler = withOwnership(handler, 'like', () => 'like-1');

        await wrappedHandler(createMockRequest());

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    describe('match ownership', () => {
      it('should allow access when reciprocal likes exist', async () => {
        mockPrisma.like.findMany.mockResolvedValue([
          { senderId: 'user-123', receiverId: 'match-user' },
          { senderId: 'match-user', receiverId: 'user-123' },
        ]);

        const handler = jest.fn().mockResolvedValue(new Response('ok'));
        const wrappedHandler = withOwnership(handler, 'match', () => 'match-user');

        await wrappedHandler(createMockRequest());

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should deny access when only one like exists', async () => {
        mockPrisma.like.findMany.mockResolvedValue([
          { senderId: 'user-123', receiverId: 'other-user' },
        ]);

        const handler = jest.fn();
        const wrappedHandler = withOwnership(handler, 'match', () => 'other-user');

        const response = await wrappedHandler(createMockRequest());

        expect(response.status).toBe(403);
      });
    });
  });

  describe('withMatchParticipant', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: 'ACTIVE' });
    });

    it('should allow access when valid match exists', async () => {
      mockPrisma.like.findMany.mockResolvedValue([
        { senderId: 'user-123', receiverId: 'matched-user' },
        { senderId: 'matched-user', receiverId: 'user-123' },
      ]);

      const handler = jest.fn().mockResolvedValue(new Response('ok'));
      const wrappedHandler = withMatchParticipant(handler, () => 'matched-user');

      await wrappedHandler(createMockRequest());

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][1]).toMatchObject({
        userId: 'user-123',
        otherUserId: 'matched-user',
      });
    });

    it('should return 403 when no match exists', async () => {
      mockPrisma.like.findMany.mockResolvedValue([]);

      const handler = jest.fn();
      const wrappedHandler = withMatchParticipant(handler, () => 'non-matched-user');

      const response = await wrappedHandler(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Match non valide');
    });

    it('should return 400 for missing target user id', async () => {
      const handler = jest.fn();
      const wrappedHandler = withMatchParticipant(handler, () => null);

      const response = await wrappedHandler(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('requis');
    });

    it('should generate consistent match id', async () => {
      mockPrisma.like.findMany.mockResolvedValue([
        { senderId: 'user-123', receiverId: 'user-456' },
        { senderId: 'user-456', receiverId: 'user-123' },
      ]);

      const handler = jest.fn().mockResolvedValue(new Response('ok'));
      const wrappedHandler = withMatchParticipant(handler, () => 'user-456');

      await wrappedHandler(createMockRequest());

      // Match ID should be consistent regardless of order
      expect(handler.mock.calls[0][1].matchId).toContain('match-');
    });
  });

  describe('sanitizeRequestBody', () => {
    it('should remove forbidden fields', () => {
      const body = {
        name: 'Test',
        forceUserId: 'hacker-id',
        email: 'test@test.com',
        accountStatus: 'ADMIN',
      };

      const sanitized = sanitizeRequestBody(body, FORBIDDEN_BODY_FIELDS);

      expect(sanitized.name).toBe('Test');
      expect(sanitized.email).toBe('test@test.com');
      expect(sanitized).not.toHaveProperty('forceUserId');
      expect(sanitized).not.toHaveProperty('accountStatus');
    });

    it('should preserve allowed fields', () => {
      const body = {
        name: 'Test',
        bio: 'My bio',
        age: 25,
        location: 'Paris',
      };

      const sanitized = sanitizeRequestBody(body, FORBIDDEN_BODY_FIELDS);

      expect(sanitized).toEqual(body);
    });

    it('should handle empty body', () => {
      const sanitized = sanitizeRequestBody({}, FORBIDDEN_BODY_FIELDS);

      expect(sanitized).toEqual({});
    });

    it('should not modify original body', () => {
      const body = {
        name: 'Test',
        forceUserId: 'hacker-id',
      };

      sanitizeRequestBody(body, FORBIDDEN_BODY_FIELDS);

      expect(body.forceUserId).toBe('hacker-id');
    });
  });

  describe('getResourceIdFromPath', () => {
    it('should extract ID from path', () => {
      const req = createMockRequest('http://localhost:3000/api/users/user-123/profile');

      const id = getResourceIdFromPath(req);

      expect(id).toBeDefined();
    });

    it('should handle various path patterns', () => {
      const patterns = [
        'http://localhost:3000/api/profile/photos/photo-123',
        'http://localhost:3000/api/users/user-456/stats',
        'http://localhost:3000/api/matches/match-789',
      ];

      for (const url of patterns) {
        const req = createMockRequest(url);
        const id = getResourceIdFromPath(req);
        expect(id).toBeDefined();
      }
    });
  });

  describe('FORBIDDEN_BODY_FIELDS', () => {
    it('should include security-sensitive fields', () => {
      expect(FORBIDDEN_BODY_FIELDS).toContain('forceUserId');
      expect(FORBIDDEN_BODY_FIELDS).toContain('forceUserEmail');
      expect(FORBIDDEN_BODY_FIELDS).toContain('accountStatus');
      expect(FORBIDDEN_BODY_FIELDS).toContain('hashedPassword');
      expect(FORBIDDEN_BODY_FIELDS).toContain('emailVerified');
    });
  });

  describe('error handling', () => {
    it('should log unauthorized access attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: 'ACTIVE' });

      const handler = jest.fn();
      const wrappedHandler = withOwnership(handler, 'user', () => 'other-user');

      await wrappedHandler(createMockRequest());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY]'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB Error'));

      const handler = jest.fn();
      const wrappedHandler = withAuth(handler);

      const response = await wrappedHandler(createMockRequest());

      expect(response.status).toBe(500);
    });
  });

  describe('withPhotoOwner', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: 'ACTIVE' });
    });

    it('should check photo ownership', async () => {
      mockPrisma.photo.findUnique.mockResolvedValue({ userId: 'user-123' });

      const handler = jest.fn().mockResolvedValue(new Response('ok'));
      const wrappedHandler = withPhotoOwner(handler);

      await wrappedHandler(
        createMockRequest(),
        { params: Promise.resolve({ photoId: 'photo-1' }) }
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('withSelfOnly', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: 'ACTIVE' });
    });

    it('should allow access to own data', async () => {
      const handler = jest.fn().mockResolvedValue(new Response('ok'));
      const wrappedHandler = withSelfOnly(handler);

      await wrappedHandler(
        createMockRequest(),
        { params: Promise.resolve({ userId: 'user-123' }) }
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should deny access to other user data', async () => {
      const handler = jest.fn();
      const wrappedHandler = withSelfOnly(handler);

      const response = await wrappedHandler(
        createMockRequest(),
        { params: Promise.resolve({ userId: 'other-user' }) }
      );

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
