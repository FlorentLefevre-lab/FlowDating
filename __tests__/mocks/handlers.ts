import { http, HttpResponse } from 'msw';
import { createMockUser, createMockProfile, createMockMatch, createMockLike } from '../setup/test-utils';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

// Mock data stores
let mockUsers = [createMockUser({ id: 'user-1', email: 'user1@example.com' })];
let mockProfiles = [createMockProfile({ userId: 'user-1' })];
let mockMatches: ReturnType<typeof createMockMatch>[] = [];
let mockLikes: ReturnType<typeof createMockLike>[] = [];

// Auth handlers
const authHandlers = [
  // Login
  http.post(`${baseUrl}/api/auth/callback/credentials`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        user: mockUsers[0],
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Register
  http.post(`${baseUrl}/api/auth/register`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string; name?: string };
    const { email, password, name } = body;

    if (!email || !password) {
      return HttpResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (mockUsers.some((u) => u.email === email)) {
      return HttpResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    const newUser = createMockUser({ email, name: name || null });
    mockUsers.push(newUser);

    return HttpResponse.json({ user: newUser }, { status: 201 });
  }),

  // Session
  http.get(`${baseUrl}/api/auth/session`, () => {
    return HttpResponse.json({
      user: {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'Test User',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }),

  // Logout
  http.post(`${baseUrl}/api/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Forgot password
  http.post(`${baseUrl}/api/auth/forgot-password`, async ({ request }) => {
    const body = await request.json() as { email?: string };
    const { email } = body;

    if (!email) {
      return HttpResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ success: true });
  }),

  // Reset password
  http.post(`${baseUrl}/api/auth/reset-password`, async ({ request }) => {
    const body = await request.json() as { token?: string; password?: string };
    const { token, password } = body;

    if (!token || !password) {
      return HttpResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ success: true });
  }),

  // Verify email
  http.post(`${baseUrl}/api/auth/verify-email`, async ({ request }) => {
    const body = await request.json() as { token?: string };
    const { token } = body;

    if (!token) {
      return HttpResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ success: true });
  }),
];

// Profile handlers
const profileHandlers = [
  // Get current user profile
  http.get(`${baseUrl}/api/profile`, () => {
    const profile = mockProfiles[0];
    if (!profile) {
      return HttpResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json(profile);
  }),

  // Update profile
  http.put(`${baseUrl}/api/profile`, async ({ request }) => {
    const updates = await request.json() as Partial<ReturnType<typeof createMockProfile>>;
    const profileIndex = mockProfiles.findIndex((p) => p.userId === 'user-1');

    if (profileIndex === -1) {
      return HttpResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    mockProfiles[profileIndex] = {
      ...mockProfiles[profileIndex],
      ...updates,
      updatedAt: new Date(),
    };

    return HttpResponse.json(mockProfiles[profileIndex]);
  }),

  // Create profile
  http.post(`${baseUrl}/api/profile`, async ({ request }) => {
    const body = await request.json() as Partial<ReturnType<typeof createMockProfile>>;
    const newProfile = createMockProfile({ ...body, userId: 'user-1' });
    mockProfiles.push(newProfile);
    return HttpResponse.json(newProfile, { status: 201 });
  }),

  // Get user profile by ID
  http.get(`${baseUrl}/api/users/:userId`, ({ params }) => {
    const { userId } = params;
    const profile = mockProfiles.find((p) => p.userId === userId);

    if (!profile) {
      return HttpResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(profile);
  }),

  // Upload photo
  http.post(`${baseUrl}/api/profile/photos`, async () => {
    const photoUrl = `https://example.com/photos/${Date.now()}.jpg`;
    return HttpResponse.json({ url: photoUrl }, { status: 201 });
  }),

  // Delete photo
  http.delete(`${baseUrl}/api/profile/photos/:photoId`, () => {
    return HttpResponse.json({ success: true });
  }),
];

// Match handlers
const matchHandlers = [
  // Get matches
  http.get(`${baseUrl}/api/matches`, () => {
    return HttpResponse.json(mockMatches);
  }),

  // Create match (like)
  http.post(`${baseUrl}/api/likes`, async ({ request }) => {
    const body = await request.json() as { toUserId?: string; isSuper?: boolean };
    const { toUserId, isSuper = false } = body;

    if (!toUserId) {
      return HttpResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    const like = createMockLike({
      fromUserId: 'user-1',
      toUserId,
      isSuper,
    });
    mockLikes.push(like);

    // Check if there's a mutual like
    const mutualLike = mockLikes.find(
      (l) => l.fromUserId === toUserId && l.toUserId === 'user-1'
    );

    if (mutualLike) {
      const match = createMockMatch({
        user1Id: 'user-1',
        user2Id: toUserId,
        status: 'MATCHED',
        matchedAt: new Date(),
      });
      mockMatches.push(match);
      return HttpResponse.json({ like, match }, { status: 201 });
    }

    return HttpResponse.json({ like }, { status: 201 });
  }),

  // Unmatch
  http.delete(`${baseUrl}/api/matches/:matchId`, ({ params }) => {
    const { matchId } = params;
    const matchIndex = mockMatches.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) {
      return HttpResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    mockMatches[matchIndex].status = 'UNMATCHED';
    return HttpResponse.json({ success: true });
  }),
];

// Discover handlers
const discoverHandlers = [
  http.get(`${baseUrl}/api/discover`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // Return profiles excluding the current user
    const profiles = mockProfiles
      .filter((p) => p.userId !== 'user-1')
      .slice(0, limit);

    return HttpResponse.json(profiles);
  }),
];

// Stats handlers (for useStats hook)
let mockAccountStatus: 'active' | 'suspended' = 'active';

const statsHandlers = [
  // User stats
  http.get(`${baseUrl}/api/user/stats`, () => {
    return HttpResponse.json({
      profileViews: 150,
      likesReceived: 45,
      matchesCount: 12,
      dailyStats: {
        profileViews: 25,
        likesReceived: 8,
        matchesCount: 2,
      },
      totalStats: {
        profileViews: 500,
        likesReceived: 120,
        matchesCount: 30,
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId: 'user-1',
        memberSince: '2024-01-01',
        lastSeen: new Date().toISOString(),
        isOnline: true,
        dataSource: 'database',
        cacheHit: false,
      },
    });
  }),
];

// Account handlers (for useAccountActions hook)
const accountHandlers = [
  // Suspend account
  http.post(`${baseUrl}/api/user/suspend-account`, async ({ request }) => {
    const body = await request.json() as { reason?: string };
    mockAccountStatus = 'suspended';
    return HttpResponse.json({
      success: true,
      message: 'Account suspended',
      reason: body.reason,
    });
  }),

  // Reactivate account
  http.put(`${baseUrl}/api/user/suspend-account`, () => {
    mockAccountStatus = 'active';
    return HttpResponse.json({
      success: true,
      message: 'Account reactivated',
    });
  }),

  // Check account status
  http.get(`${baseUrl}/api/user/suspend-account`, () => {
    return HttpResponse.json({
      status: mockAccountStatus,
      suspendedAt: mockAccountStatus === 'suspended' ? new Date().toISOString() : null,
    });
  }),
];

// Chat handlers (for useChatModal and useStreamChat hooks)
const chatHandlers = [
  // Create chat channel
  http.post(`${baseUrl}/api/chat/create-channel`, async ({ request }) => {
    const body = await request.json() as { userId?: string; matchId?: string };
    const { userId, matchId } = body;

    if (!userId || !matchId) {
      return HttpResponse.json(
        { error: 'userId and matchId are required' },
        { status: 400 }
      );
    }

    const channelId = `channel-${userId}-${matchId}`;
    return HttpResponse.json({ channelId });
  }),

  // Get Stream chat token
  http.get(`${baseUrl}/api/chat/stream/token`, () => {
    return HttpResponse.json({
      token: 'mock-stream-token-' + Date.now(),
    });
  }),
];

// All handlers combined
export const handlers = [
  ...authHandlers,
  ...profileHandlers,
  ...matchHandlers,
  ...discoverHandlers,
  ...statsHandlers,
  ...accountHandlers,
  ...chatHandlers,
];

// Helper to reset mock data between tests
export function resetMockData() {
  mockUsers = [createMockUser({ id: 'user-1', email: 'user1@example.com' })];
  mockProfiles = [createMockProfile({ userId: 'user-1' })];
  mockMatches = [];
  mockLikes = [];
  mockAccountStatus = 'active';
}

// Export individual handler groups for selective use
export { authHandlers, profileHandlers, matchHandlers, discoverHandlers, statsHandlers, accountHandlers, chatHandlers };
