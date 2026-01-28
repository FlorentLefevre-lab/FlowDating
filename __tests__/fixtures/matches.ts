import { createMockMatch, createMockLike, MockMatch, MockLike } from '../setup/test-utils';
import { testUser, adminUser } from './users';
import { femaleProfile, maleProfile, nonBinaryProfile } from './profiles';

// Active match between test user and female profile
export const activeMatch: MockMatch = createMockMatch({
  id: 'match-active-1',
  user1Id: testUser.id,
  user2Id: femaleProfile.userId,
  status: 'MATCHED',
  matchedAt: new Date('2024-06-15'),
});

// Another active match
export const activeMatch2: MockMatch = createMockMatch({
  id: 'match-active-2',
  user1Id: testUser.id,
  user2Id: nonBinaryProfile.userId,
  status: 'MATCHED',
  matchedAt: new Date('2024-06-20'),
});

// Pending match (one-sided like, not yet mutual)
export const pendingMatch: MockMatch = createMockMatch({
  id: 'match-pending-1',
  user1Id: testUser.id,
  user2Id: maleProfile.userId,
  status: 'PENDING',
  matchedAt: null,
});

// Unmatched (previously matched, now unmatched)
export const unmatchedMatch: MockMatch = createMockMatch({
  id: 'match-unmatched-1',
  user1Id: testUser.id,
  user2Id: 'user-unmatched-1',
  status: 'UNMATCHED',
  matchedAt: new Date('2024-05-01'),
});

// Old match (for testing time-based queries)
export const oldMatch: MockMatch = createMockMatch({
  id: 'match-old-1',
  user1Id: adminUser.id,
  user2Id: femaleProfile.userId,
  status: 'MATCHED',
  matchedAt: new Date('2023-01-15'),
  createdAt: new Date('2023-01-10'),
  updatedAt: new Date('2023-01-15'),
});

// Regular like from test user
export const regularLike: MockLike = createMockLike({
  id: 'like-regular-1',
  fromUserId: testUser.id,
  toUserId: femaleProfile.userId,
  isSuper: false,
});

// Super like from test user
export const superLike: MockLike = createMockLike({
  id: 'like-super-1',
  fromUserId: testUser.id,
  toUserId: nonBinaryProfile.userId,
  isSuper: true,
});

// Like received by test user
export const receivedLike: MockLike = createMockLike({
  id: 'like-received-1',
  fromUserId: maleProfile.userId,
  toUserId: testUser.id,
  isSuper: false,
});

// Super like received by test user
export const receivedSuperLike: MockLike = createMockLike({
  id: 'like-received-super-1',
  fromUserId: femaleProfile.userId,
  toUserId: testUser.id,
  isSuper: true,
});

// Mutual likes (will result in a match)
export const mutualLikes = {
  like1: createMockLike({
    id: 'like-mutual-1',
    fromUserId: testUser.id,
    toUserId: 'user-mutual-target',
    isSuper: false,
  }),
  like2: createMockLike({
    id: 'like-mutual-2',
    fromUserId: 'user-mutual-target',
    toUserId: testUser.id,
    isSuper: false,
  }),
};

// Collection of matches for test user
export const testUserMatches: MockMatch[] = [
  activeMatch,
  activeMatch2,
  pendingMatch,
  unmatchedMatch,
];

// Collection of likes sent by test user
export const testUserSentLikes: MockLike[] = [
  regularLike,
  superLike,
  createMockLike({
    id: 'like-sent-3',
    fromUserId: testUser.id,
    toUserId: 'user-random-1',
    isSuper: false,
  }),
  createMockLike({
    id: 'like-sent-4',
    fromUserId: testUser.id,
    toUserId: 'user-random-2',
    isSuper: false,
  }),
];

// Collection of likes received by test user
export const testUserReceivedLikes: MockLike[] = [
  receivedLike,
  receivedSuperLike,
  createMockLike({
    id: 'like-received-3',
    fromUserId: 'user-random-3',
    toUserId: testUser.id,
    isSuper: false,
  }),
];

// Statistics helper
export const matchStats = {
  totalMatches: testUserMatches.filter((m) => m.status === 'MATCHED').length,
  pendingMatches: testUserMatches.filter((m) => m.status === 'PENDING').length,
  unmatchedCount: testUserMatches.filter((m) => m.status === 'UNMATCHED').length,
  sentLikesCount: testUserSentLikes.length,
  receivedLikesCount: testUserReceivedLikes.length,
  superLikesSent: testUserSentLikes.filter((l) => l.isSuper).length,
  superLikesReceived: testUserReceivedLikes.filter((l) => l.isSuper).length,
};

// Security test matches/likes
export const securityTestMatches = {
  // Match with potentially malicious user IDs
  maliciousIdMatch: createMockMatch({
    id: "match-'; DROP TABLE matches;--",
    user1Id: testUser.id,
    user2Id: "user-<script>alert('xss')</script>",
    status: 'MATCHED',
  }),
};

// Export all matches and likes grouped
export const allMatches = {
  activeMatch,
  activeMatch2,
  pendingMatch,
  unmatchedMatch,
  oldMatch,
  testUserMatches,
};

export const allLikes = {
  regularLike,
  superLike,
  receivedLike,
  receivedSuperLike,
  mutualLikes,
  testUserSentLikes,
  testUserReceivedLikes,
};

export default {
  matches: allMatches,
  likes: allLikes,
  stats: matchStats,
  securityTestMatches,
};
