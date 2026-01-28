import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import userEvent from '@testing-library/user-event';

// Types for mock data
export interface MockUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: Date;
  updatedAt: Date;
}

export interface MockProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  birthDate: Date;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';
  interestedIn: ('MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER')[];
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  isComplete: boolean;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockMatch {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'PENDING' | 'MATCHED' | 'UNMATCHED';
  matchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockLike {
  id: string;
  fromUserId: string;
  toUserId: string;
  isSuper: boolean;
  createdAt: Date;
}

// Factory functions for creating mock data
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const now = new Date();
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: `test-${Math.random().toString(36).substr(2, 5)}@example.com`,
    name: 'Test User',
    emailVerified: now,
    image: null,
    role: 'USER',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockProfile(overrides: Partial<MockProfile> = {}): MockProfile {
  const now = new Date();
  const birthDate = new Date();
  birthDate.setFullYear(birthDate.getFullYear() - 25);

  return {
    id: `profile-${Math.random().toString(36).substr(2, 9)}`,
    userId: `user-${Math.random().toString(36).substr(2, 9)}`,
    firstName: 'Test',
    lastName: 'User',
    bio: 'This is a test bio',
    birthDate,
    gender: 'MALE',
    interestedIn: ['FEMALE'],
    location: 'Paris, France',
    latitude: 48.8566,
    longitude: 2.3522,
    photos: [],
    isComplete: true,
    lastActive: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockMatch(overrides: Partial<MockMatch> = {}): MockMatch {
  const now = new Date();
  return {
    id: `match-${Math.random().toString(36).substr(2, 9)}`,
    user1Id: `user-${Math.random().toString(36).substr(2, 9)}`,
    user2Id: `user-${Math.random().toString(36).substr(2, 9)}`,
    status: 'MATCHED',
    matchedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockLike(overrides: Partial<MockLike> = {}): MockLike {
  const now = new Date();
  return {
    id: `like-${Math.random().toString(36).substr(2, 9)}`,
    fromUserId: `user-${Math.random().toString(36).substr(2, 9)}`,
    toUserId: `user-${Math.random().toString(36).substr(2, 9)}`,
    isSuper: false,
    createdAt: now,
    ...overrides,
  };
}

// Session helper
export function createMockSession(overrides: Partial<Session> = {}): Session {
  const user = createMockUser();
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

// Providers wrapper
interface AllProvidersProps {
  children: ReactNode;
  session?: Session | null;
}

function AllProviders({ children, session = null }: AllProvidersProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null;
}

function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { session = null, ...renderOptions } = options;

  const user = userEvent.setup();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders session={session}>{children}</AllProviders>
  );

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };

// Override render with custom render
export { customRender as render };

// Utility for waiting
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock API response helpers
export function createApiResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

export function createApiError(message: string, status = 400) {
  return {
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
  };
}
