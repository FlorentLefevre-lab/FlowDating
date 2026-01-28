/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChatModal } from '@/hooks/useChatModal';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('useChatModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('initial state', () => {
    it('should return initial closed state', () => {
      const { result } = renderHook(() => useChatModal());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.targetUserId).toBeNull();
      expect(result.current.targetUserName).toBeNull();
      expect(result.current.matchId).toBeNull();
      expect(result.current.channelId).toBeNull();
      expect(result.current.isCreatingChannel).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return action functions', () => {
      const { result } = renderHook(() => useChatModal());

      expect(typeof result.current.openChat).toBe('function');
      expect(typeof result.current.closeChat).toBe('function');
      expect(typeof result.current.openExistingChannel).toBe('function');
    });
  });

  describe('openChat', () => {
    it('should create channel and open modal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channelId: 'channel-123' }),
      });

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-456', 'match-789', 'Alice');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.channelId).toBe('channel-123');
      expect(result.current.targetUserId).toBe('user-456');
      expect(result.current.targetUserName).toBe('Alice');
      expect(result.current.matchId).toBe('match-789');
      expect(result.current.error).toBeNull();
    });

    it('should call create-channel API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channelId: 'channel-123' }),
      });

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-456', 'match-789');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/chat/create-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-456', matchId: 'match-789' }),
      });
    });

    it('should set isCreatingChannel during channel creation', async () => {
      let resolvePromise: (value: any) => void;
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useChatModal());

      act(() => {
        result.current.openChat('user-456', 'match-789');
      });

      await waitFor(() => {
        expect(result.current.isCreatingChannel).toBe(true);
      });

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ channelId: 'channel-123' }),
        });
      });

      await waitFor(() => {
        expect(result.current.isCreatingChannel).toBe(false);
      });
    });

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Channel creation failed' }),
      });

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-456', 'match-789');
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.error).toBe('Channel creation failed');
      expect(result.current.isCreatingChannel).toBe(false);
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-456', 'match-789');
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should handle error without message', async () => {
      mockFetch.mockRejectedValueOnce({ code: 'ERROR' });

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-456', 'match-789');
      });

      expect(result.current.error).toBe('Erreur inconnue');
    });

    it('should work without targetUserName', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channelId: 'channel-123' }),
      });

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-456', 'match-789');
      });

      expect(result.current.targetUserName).toBeNull();
    });

    it('should preserve error state before clearing for new request', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'First error' }),
      });

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-1', 'match-1');
      });

      expect(result.current.error).toBe('First error');

      // Second call starts - error should be cleared
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channelId: 'channel-new' }),
      });

      await act(async () => {
        await result.current.openChat('user-2', 'match-2');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('closeChat', () => {
    it('should reset all state when closing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channelId: 'channel-123' }),
      });

      const { result } = renderHook(() => useChatModal());

      // First open chat
      await act(async () => {
        await result.current.openChat('user-456', 'match-789', 'Alice');
      });

      expect(result.current.isOpen).toBe(true);

      // Then close it
      act(() => {
        result.current.closeChat();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.targetUserId).toBeNull();
      expect(result.current.targetUserName).toBeNull();
      expect(result.current.matchId).toBeNull();
      expect(result.current.channelId).toBeNull();
      expect(result.current.isCreatingChannel).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should clear error on close', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Some error' }),
      });

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-456', 'match-789');
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.closeChat();
      });

      expect(result.current.error).toBeNull();
    });

    it('should be idempotent when already closed', () => {
      const { result } = renderHook(() => useChatModal());

      act(() => {
        result.current.closeChat();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('openExistingChannel', () => {
    it('should open modal with existing channel ID', () => {
      const { result } = renderHook(() => useChatModal());

      act(() => {
        result.current.openExistingChannel('channel-existing', 'Bob');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.channelId).toBe('channel-existing');
      expect(result.current.targetUserName).toBe('Bob');
      expect(result.current.targetUserId).toBeNull();
      expect(result.current.matchId).toBeNull();
      expect(result.current.isCreatingChannel).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should work without targetUserName', () => {
      const { result } = renderHook(() => useChatModal());

      act(() => {
        result.current.openExistingChannel('channel-existing');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.channelId).toBe('channel-existing');
      expect(result.current.targetUserName).toBeNull();
    });

    it('should not make API call', () => {
      const { result } = renderHook(() => useChatModal());

      act(() => {
        result.current.openExistingChannel('channel-existing');
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should clear previous error when opening existing channel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Previous error' }),
      });

      const { result } = renderHook(() => useChatModal());

      // Create error state
      await act(async () => {
        await result.current.openChat('user-456', 'match-789');
      });

      expect(result.current.error).toBe('Previous error');

      // Open existing channel - should clear error
      act(() => {
        result.current.openExistingChannel('channel-existing');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('state transitions', () => {
    it('should handle open -> close -> open cycle', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ channelId: 'channel-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ channelId: 'channel-2' }),
        });

      const { result } = renderHook(() => useChatModal());

      // First open
      await act(async () => {
        await result.current.openChat('user-1', 'match-1');
      });

      expect(result.current.channelId).toBe('channel-1');

      // Close
      act(() => {
        result.current.closeChat();
      });

      expect(result.current.isOpen).toBe(false);

      // Open again
      await act(async () => {
        await result.current.openChat('user-2', 'match-2');
      });

      expect(result.current.channelId).toBe('channel-2');
    });

    it('should handle switching from new channel to existing channel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channelId: 'channel-new' }),
      });

      const { result } = renderHook(() => useChatModal());

      // Open new chat
      await act(async () => {
        await result.current.openChat('user-1', 'match-1', 'Alice');
      });

      expect(result.current.channelId).toBe('channel-new');
      expect(result.current.matchId).toBe('match-1');

      // Switch to existing channel
      act(() => {
        result.current.openExistingChannel('channel-existing', 'Bob');
      });

      expect(result.current.channelId).toBe('channel-existing');
      expect(result.current.matchId).toBeNull();
      expect(result.current.targetUserName).toBe('Bob');
    });
  });

  describe('console logging', () => {
    it('should log when creating channel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ channelId: 'channel-123' }),
      });

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-456', 'match-789', 'Alice');
      });

      expect(console.log).toHaveBeenCalled();
    });

    it('should log error on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useChatModal());

      await act(async () => {
        await result.current.openChat('user-456', 'match-789');
      });

      expect(console.error).toHaveBeenCalled();
    });
  });
});
