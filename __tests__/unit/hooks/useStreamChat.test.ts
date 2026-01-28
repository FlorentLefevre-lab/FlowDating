/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStreamChat } from '@/hooks/useStreamChat';

// Mock next-auth/react
let mockSession: any = null;
let mockStatus = 'loading';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: mockSession,
    status: mockStatus,
  })),
}));

// Mock streamChatManager
const mockStreamClient = {
  user: { id: 'user-123' },
};

const mockStreamChatManager = {
  getClient: jest.fn().mockResolvedValue(mockStreamClient),
  disconnect: jest.fn(),
  syncPresence: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(false),
  getDebugInfo: jest.fn().mockReturnValue({ connected: false }),
};

jest.mock('@/lib/streamChatClient', () => ({
  streamChatManager: mockStreamChatManager,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('useStreamChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockStreamChatManager.getClient.mockReset().mockResolvedValue(mockStreamClient);
    mockStreamChatManager.disconnect.mockReset();
    mockStreamChatManager.syncPresence.mockReset().mockResolvedValue(undefined);
    mockStreamChatManager.isConnected.mockReset().mockReturnValue(false);
    mockStreamChatManager.getDebugInfo.mockReset().mockReturnValue({ connected: false });

    console.log = jest.fn();
    console.error = jest.fn();

    mockSession = null;
    mockStatus = 'loading';
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('initial state', () => {
    it('should return initial connecting state when loading', () => {
      mockStatus = 'loading';

      const { result } = renderHook(() => useStreamChat());

      expect(result.current.client).toBeNull();
      expect(result.current.isConnecting).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should return disconnected state when unauthenticated', async () => {
      mockStatus = 'unauthenticated';
      mockSession = null;

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
      });

      expect(result.current.client).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('authentication flow', () => {
    it('should initialize chat when authenticated', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'stream-token-123' }),
      });

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should call token API with correct endpoint', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'stream-token-123' }),
      });

      renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat/stream/token');
      });
    });

    it('should pass user data to streamChatManager', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'stream-token-123' }),
      });

      renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(mockStreamChatManager.getClient).toHaveBeenCalledWith(
          'user-123',
          {
            id: 'user-123',
            name: 'Test User',
            image: 'https://example.com/avatar.jpg',
            email: 'test@example.com',
          },
          'stream-token-123'
        );
      });
    });

    it('should use default avatar when no image', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: null,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'stream-token-123' }),
      });

      renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(mockStreamChatManager.getClient).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            image: '/default-avatar.png',
          }),
          'stream-token-123'
        );
      });
    });

    it('should use Anonymous when no name', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          id: 'user-123',
          name: null,
          email: 'test@example.com',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'stream-token-123' }),
      });

      renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(mockStreamChatManager.getClient).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            name: 'Anonymous',
          }),
          'stream-token-123'
        );
      });
    });
  });

  describe('error handling', () => {
    it('should handle token fetch failure', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.error).toBe('Erreur de connexion au chat');
      });

      expect(result.current.client).toBeNull();
    });

    it('should handle streamChatManager error', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token' }),
      });

      mockStreamChatManager.getClient.mockRejectedValueOnce(new Error('Connection failed'));

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.error).toBe('Erreur de connexion au chat');
      });
    });

    it('should attempt reconnection after error', async () => {
      jest.useFakeTimers();

      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'token' }),
        });

      renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance timer for reconnection (5 seconds)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });

  describe('disconnect on logout', () => {
    it('should disconnect when status changes to unauthenticated', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token' }),
      });

      const { rerender } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(mockStreamChatManager.getClient).toHaveBeenCalled();
      });

      // Simulate logout
      mockStatus = 'unauthenticated';
      mockSession = null;

      rerender();

      await waitFor(() => {
        expect(mockStreamChatManager.disconnect).toHaveBeenCalled();
      });
    });
  });

  describe('refresh function', () => {
    it('should call syncPresence when refresh is called', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token' }),
      });

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockStreamChatManager.syncPresence).toHaveBeenCalled();
    });

    it('should not throw when refresh is called without client', async () => {
      mockStatus = 'unauthenticated';
      mockSession = null;

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.client).toBeNull();
      });

      // Should not throw
      await act(async () => {
        await result.current.refresh();
      });

      expect(mockStreamChatManager.syncPresence).not.toHaveBeenCalled();
    });

    it('should handle refresh error gracefully', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token' }),
      });

      mockStreamChatManager.syncPresence.mockRejectedValueOnce(new Error('Sync failed'));

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      // Should not throw
      await act(async () => {
        await result.current.refresh();
      });

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getDebugInfo function', () => {
    it('should return debug info from manager', async () => {
      const debugInfo = { connected: true, userId: 'user-123' };
      mockStreamChatManager.getDebugInfo.mockReturnValue(debugInfo);

      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token' }),
      });

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      const info = result.current.getDebugInfo();
      expect(info).toEqual(debugInfo);
    });
  });

  describe('isConnected', () => {
    it('should return connection status from manager', async () => {
      mockStreamChatManager.isConnected.mockReturnValue(true);

      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token' }),
      });

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('visibility handling', () => {
    it('should sync presence on visibility change', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token' }),
      });

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      mockStreamChatManager.syncPresence.mockClear();

      // Simulate visibility change
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false,
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Wait for debounced sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(mockStreamChatManager.syncPresence).toHaveBeenCalled();
    });

    it('should sync presence on window focus', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token' }),
      });

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      mockStreamChatManager.syncPresence.mockClear();

      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // Wait for debounced sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(mockStreamChatManager.syncPresence).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup on unmount', async () => {
      jest.useFakeTimers();

      mockStatus = 'authenticated';
      mockSession = {
        user: { id: 'user-123', name: 'Test' },
      };

      // Make fetch hang to trigger cleanup during reconnection
      mockFetch.mockResolvedValueOnce({ ok: false });

      const { unmount } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      unmount();

      // Advance timers - reconnection should not happen
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should only have been called once (the initial attempt)
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('session without user id', () => {
    it('should not initialize when session has no user id', async () => {
      mockStatus = 'authenticated';
      mockSession = {
        user: {
          name: 'Test',
          email: 'test@example.com',
        },
      };

      const { result } = renderHook(() => useStreamChat());

      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.client).toBeNull();
    });
  });
});
