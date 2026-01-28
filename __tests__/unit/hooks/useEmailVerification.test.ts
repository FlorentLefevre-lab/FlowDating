/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useEmailVerification } from '@/hooks/useEmailVerification';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next-auth/react
let mockSession: any = null;
let mockStatus = 'loading';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: mockSession,
    status: mockStatus,
  })),
}));

// Mock console
const originalConsoleLog = console.log;

describe('useEmailVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockReset();
    console.log = jest.fn();
    mockSession = null;
    mockStatus = 'loading';
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('loading state', () => {
    it('should return isLoading true when status is loading', () => {
      mockStatus = 'loading';

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.isLoading).toBe(true);
    });

    it('should return isLoading false when authenticated', () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
        },
      };

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.isLoading).toBe(false);
    });

    it('should return isLoading false when unauthenticated', () => {
      mockStatus = 'unauthenticated';
      mockSession = null;

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('email verification status', () => {
    it('should return isVerified true when email is verified', () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
        },
      };

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.isVerified).toBe(true);
    });

    it('should return isVerified false when email is not verified', () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: false,
        },
      };

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.isVerified).toBe(false);
    });

    it('should return isVerified false when emailVerified is undefined', () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.isVerified).toBe(false);
    });

    it('should return isVerified false when no session', () => {
      mockStatus = 'unauthenticated';
      mockSession = null;

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.isVerified).toBe(false);
    });
  });

  describe('redirect behavior', () => {
    it('should redirect to /auth/email-required when email not verified', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: false,
        },
      };

      renderHook(() => useEmailVerification());

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/email-required');
      });
    });

    it('should not redirect when email is verified', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
        },
      };

      renderHook(() => useEmailVerification());

      // Wait a bit to ensure no redirect happens
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should not redirect while loading', async () => {
      mockStatus = 'loading';

      renderHook(() => useEmailVerification());

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should not redirect when unauthenticated', async () => {
      mockStatus = 'unauthenticated';
      mockSession = null;

      renderHook(() => useEmailVerification());

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should log warning when redirecting', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: false,
        },
      };

      renderHook(() => useEmailVerification());

      await waitFor(() => {
        expect(console.log).toHaveBeenCalled();
      });
    });
  });

  describe('session and user data', () => {
    it('should return session when authenticated', () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
        },
      };

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.session).toEqual(mockSession);
    });

    it('should return null session when not authenticated', () => {
      mockStatus = 'unauthenticated';
      mockSession = null;

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.session).toBeNull();
    });

    it('should return user from session', () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true,
      };

      mockStatus = 'authenticated';
      mockSession = { user: mockUser };

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.user).toEqual(mockUser);
    });

    it('should return undefined user when no session', () => {
      mockStatus = 'unauthenticated';
      mockSession = null;

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.user).toBeUndefined();
    });
  });

  describe('return value structure', () => {
    it('should return all expected properties', () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          emailVerified: true,
        },
      };

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isVerified');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('user');
    });
  });

  describe('edge cases', () => {
    it('should handle session with emailVerified as null', () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: null,
        },
      };

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.isVerified).toBe(false);
    });

    it('should handle session with missing user', () => {
      mockStatus = 'authenticated';
      mockSession = {};

      const { result } = renderHook(() => useEmailVerification());

      expect(result.current.isVerified).toBe(false);
      expect(result.current.user).toBeUndefined();
    });

    it('should handle status change from loading to authenticated', async () => {
      mockStatus = 'loading';
      mockSession = null;

      const { result, rerender } = renderHook(() => useEmailVerification());

      expect(result.current.isLoading).toBe(true);

      // Simulate auth completing
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          emailVerified: true,
        },
      };

      rerender();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isVerified).toBe(true);
    });

    it('should handle status change from loading to unauthenticated', () => {
      mockStatus = 'loading';
      mockSession = null;

      const { result, rerender } = renderHook(() => useEmailVerification());

      expect(result.current.isLoading).toBe(true);

      // Simulate auth completing as unauthenticated
      mockStatus = 'unauthenticated';

      rerender();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isVerified).toBe(false);
    });
  });
});
