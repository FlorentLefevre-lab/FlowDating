import { createMockUser, MockUser } from '../setup/test-utils';

// Standard test user
export const testUser: MockUser = createMockUser({
  id: 'user-test-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  status: 'ACTIVE',
  emailVerified: new Date('2024-01-01'),
});

// Admin user
export const adminUser: MockUser = createMockUser({
  id: 'user-admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN',
  status: 'ACTIVE',
  emailVerified: new Date('2024-01-01'),
});

// Moderator user
export const moderatorUser: MockUser = createMockUser({
  id: 'user-mod-1',
  email: 'moderator@example.com',
  name: 'Moderator User',
  role: 'MODERATOR',
  status: 'ACTIVE',
  emailVerified: new Date('2024-01-01'),
});

// Unverified user (email not verified)
export const unverifiedUser: MockUser = createMockUser({
  id: 'user-unverified-1',
  email: 'unverified@example.com',
  name: 'Unverified User',
  role: 'USER',
  status: 'ACTIVE',
  emailVerified: null,
});

// Suspended user
export const suspendedUser: MockUser = createMockUser({
  id: 'user-suspended-1',
  email: 'suspended@example.com',
  name: 'Suspended User',
  role: 'USER',
  status: 'SUSPENDED',
  emailVerified: new Date('2024-01-01'),
});

// Deleted user
export const deletedUser: MockUser = createMockUser({
  id: 'user-deleted-1',
  email: 'deleted@example.com',
  name: 'Deleted User',
  role: 'USER',
  status: 'DELETED',
  emailVerified: new Date('2024-01-01'),
});

// User without name
export const anonymousUser: MockUser = createMockUser({
  id: 'user-anon-1',
  email: 'anonymous@example.com',
  name: null,
  role: 'USER',
  status: 'ACTIVE',
  emailVerified: new Date('2024-01-01'),
});

// New user (just created)
export const newUser: MockUser = createMockUser({
  id: 'user-new-1',
  email: 'new@example.com',
  name: 'New User',
  role: 'USER',
  status: 'ACTIVE',
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Collection of users for list tests
export const usersList: MockUser[] = [
  testUser,
  adminUser,
  moderatorUser,
  unverifiedUser,
  suspendedUser,
  createMockUser({
    id: 'user-list-1',
    email: 'user1@example.com',
    name: 'User One',
  }),
  createMockUser({
    id: 'user-list-2',
    email: 'user2@example.com',
    name: 'User Two',
  }),
  createMockUser({
    id: 'user-list-3',
    email: 'user3@example.com',
    name: 'User Three',
  }),
];

// Users for security tests
export const securityTestUsers = {
  // User with XSS attempt in name
  xssUser: createMockUser({
    id: 'user-xss',
    email: 'xss@example.com',
    name: '<script>alert("xss")</script>',
  }),
  // User with SQL injection attempt in email
  sqlInjectionUser: createMockUser({
    id: 'user-sqli',
    email: "'; DROP TABLE users;--@example.com",
    name: 'SQL Injection Test',
  }),
  // User with very long name
  longNameUser: createMockUser({
    id: 'user-long',
    email: 'long@example.com',
    name: 'A'.repeat(1000),
  }),
  // User with special characters
  specialCharsUser: createMockUser({
    id: 'user-special',
    email: 'special@example.com',
    name: '特殊字符用户 <>&"\'',
  }),
};

// Export all users grouped
export const allUsers = {
  testUser,
  adminUser,
  moderatorUser,
  unverifiedUser,
  suspendedUser,
  deletedUser,
  anonymousUser,
  newUser,
  usersList,
  securityTestUsers,
};

export default allUsers;
