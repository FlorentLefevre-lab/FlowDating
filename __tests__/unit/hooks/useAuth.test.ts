/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

// Mock next-auth/react
const mockSession = {
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg',
  },
  expires: '2099-01-01',
};

let mockSessionData: any = mockSession;
let mockStatus = 'authenticated';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: mockSessionData,
    status: mockStatus,
  })),
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionData = mockSession;
    mockStatus = 'authenticated';
  });

  describe('session state', () => {
    it('should return session when authenticated', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should return null session when unauthenticated', () => {
      mockSessionData = null;
      mockStatus = 'unauthenticated';

      const { result } = renderHook(() => useAuth());

      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('loading state', () => {
    it('should return isLoading true when status is loading', () => {
      mockStatus = 'loading';

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isReady).toBe(false);
    });

    it('should return isLoading false when authenticated', () => {
      mockStatus = 'authenticated';

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isReady).toBe(true);
    });

    it('should return isLoading false when unauthenticated', () => {
      mockStatus = 'unauthenticated';
      mockSessionData = null;

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isReady).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when session exists', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should return false when session is null', () => {
      mockSessionData = null;
      mockStatus = 'unauthenticated';

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return false when session is undefined', () => {
      mockSessionData = undefined;
      mockStatus = 'unauthenticated';

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('user object', () => {
    it('should return user from session', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.user?.id).toBe('user-123');
      expect(result.current.user?.name).toBe('Test User');
      expect(result.current.user?.email).toBe('test@example.com');
    });

    it('should return undefined user when no session', () => {
      mockSessionData = null;
      mockStatus = 'unauthenticated';

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeUndefined();
    });
  });

  describe('status', () => {
    it('should return authenticated status', () => {
      mockStatus = 'authenticated';

      const { result } = renderHook(() => useAuth());

      expect(result.current.status).toBe('authenticated');
    });

    it('should return unauthenticated status', () => {
      mockStatus = 'unauthenticated';
      mockSessionData = null;

      const { result } = renderHook(() => useAuth());

      expect(result.current.status).toBe('unauthenticated');
    });

    it('should return loading status', () => {
      mockStatus = 'loading';

      const { result } = renderHook(() => useAuth());

      expect(result.current.status).toBe('loading');
    });
  });

  describe('isReady', () => {
    it('should return false when loading', () => {
      mockStatus = 'loading';

      const { result } = renderHook(() => useAuth());

      expect(result.current.isReady).toBe(false);
    });

    it('should return true when authenticated', () => {
      mockStatus = 'authenticated';

      const { result } = renderHook(() => useAuth());

      expect(result.current.isReady).toBe(true);
    });

    it('should return true when unauthenticated', () => {
      mockStatus = 'unauthenticated';
      mockSessionData = null;

      const { result } = renderHook(() => useAuth());

      expect(result.current.isReady).toBe(true);
    });
  });

  describe('return value structure', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('status');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isReady');
    });
  });

  describe('edge cases', () => {
    it('should handle session with minimal user data', () => {
      mockSessionData = {
        user: { id: 'minimal-user' },
        expires: '2099-01-01',
      };
      mockStatus = 'authenticated';

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.id).toBe('minimal-user');
    });

    it('should handle session with empty user object', () => {
      mockSessionData = {
        user: {},
        expires: '2099-01-01',
      };
      mockStatus = 'authenticated';

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({});
    });
  });
});
