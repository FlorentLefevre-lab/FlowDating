/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQuery, useInvalidateCache, useMutation } from '@/hooks/useQuery';

// Mock next-auth/react
const mockSession = {
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  },
  expires: '2099-01-01',
};

let mockStatus = 'authenticated';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: mockStatus === 'authenticated' ? mockSession : null,
    status: mockStatus,
  })),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
    mockFetch.mockReset();
  });

  describe('basic functionality', () => {
    it('should return initial loading state', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useQuery('/api/test'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should fetch data on mount when authenticated', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useQuery('/api/test'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should not fetch when not authenticated and requireAuth is true', async () => {
      mockStatus = 'unauthenticated';

      const { result } = renderHook(() => useQuery('/api/test', { requireAuth: true }));

      // Wait a bit to ensure no fetch happens
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch when not authenticated but requireAuth is false', async () => {
      mockStatus = 'unauthenticated';
      const mockData = { public: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useQuery('/api/test', { requireAuth: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useQuery('/api/test', { enabled: false }));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useQuery('/api/test', { retryOnError: false }));

      await waitFor(() => {
        expect(result.current.error).toBe('Erreur 500: Internal Server Error');
      });

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useQuery('/api/test', { retryOnError: false }));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });

    it('should retry on error when retryOnError is true', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useQuery('/api/test', { retryOnError: true }));

      await waitFor(() => {
        expect(result.current.data).toEqual({ success: true });
      }, { timeout: 5000 });
    });
  });

  describe('caching', () => {
    it('should use cached data when available', async () => {
      const mockData = { cached: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      // First render - fetches data
      const { result: result1, unmount } = renderHook(() =>
        useQuery('/api/cached-test', { cache: true, cacheTtl: 60000 })
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockData);
      });

      unmount();
      mockFetch.mockClear();

      // Second render - should use cache
      const { result: result2 } = renderHook(() =>
        useQuery('/api/cached-test', { cache: true, cacheTtl: 60000 })
      );

      await waitFor(() => {
        expect(result2.current.data).toEqual(mockData);
      });

      // Should not have fetched again
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should bypass cache when cache option is false', async () => {
      const mockData = { fresh: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() =>
        useQuery('/api/no-cache-test', { cache: false })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('refetch', () => {
    it('should refetch data when refetch is called', async () => {
      const mockData1 = { version: 1 };
      const mockData2 = { version: 2 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData2,
        });

      const { result } = renderHook(() => useQuery('/api/refetch-test'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });
    });

    it('should set isRefreshing during refetch', async () => {
      let resolveSecondFetch: (value: any) => void;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ initial: true }),
        })
        .mockImplementationOnce(() => new Promise(resolve => {
          resolveSecondFetch = resolve;
        }));

      const { result } = renderHook(() => useQuery('/api/refresh-test'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(true);
      });

      await act(async () => {
        resolveSecondFetch!({
          ok: true,
          json: async () => ({ refreshed: true }),
        });
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });
  });

  describe('polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should poll at specified interval', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      renderHook(() => useQuery('/api/polling-test', { polling: 5000 }));

      // Initial fetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Advance timer again
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should not poll when polling is 0', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      renderHook(() => useQuery('/api/no-polling-test', { polling: 0 }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should still be 1
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should cleanup polling on unmount', async () => {
      jest.useFakeTimers();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const { unmount } = renderHook(() =>
        useQuery('/api/cleanup-test', { polling: 1000 })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not have called after unmount
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });
});

describe('useInvalidateCache', () => {
  it('should return a function', () => {
    const { result } = renderHook(() => useInvalidateCache());
    expect(typeof result.current).toBe('function');
  });

  it('should clear cache when called', async () => {
    const mockData = { data: 'test' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    // First, populate the cache
    const { result: queryResult, unmount } = renderHook(() =>
      useQuery('/api/invalidate-test', { cache: true })
    );

    await waitFor(() => {
      expect(queryResult.current.data).toEqual(mockData);
    });

    unmount();
    mockFetch.mockClear();

    // Invalidate cache
    const { result: invalidateResult } = renderHook(() => useInvalidateCache());
    act(() => {
      invalidateResult.current();
    });

    // Now query again - should fetch fresh
    const { result: queryResult2 } = renderHook(() =>
      useQuery('/api/invalidate-test', { cache: true })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

describe('useMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
  });

  it('should execute mutation function', async () => {
    const mutationFn = jest.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(() => useMutation(mutationFn));

    await act(async () => {
      await result.current.mutate({ data: 'test' });
    });

    expect(mutationFn).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should set isLoading during mutation', async () => {
    let resolveMutation: (value: any) => void;
    const mutationFn = jest.fn().mockImplementation(() =>
      new Promise(resolve => { resolveMutation = resolve; })
    );

    const { result } = renderHook(() => useMutation(mutationFn));

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.mutate({});
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveMutation!({ success: true });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should call onSuccess callback', async () => {
    const onSuccess = jest.fn();
    const mutationFn = jest.fn().mockResolvedValue({ result: 'data' });

    const { result } = renderHook(() =>
      useMutation(mutationFn, { onSuccess })
    );

    await act(async () => {
      await result.current.mutate({});
    });

    expect(onSuccess).toHaveBeenCalledWith({ result: 'data' });
  });

  it('should call onError callback on failure', async () => {
    const onError = jest.fn();
    const error = new Error('Mutation failed');
    const mutationFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() =>
      useMutation(mutationFn, { onError })
    );

    await act(async () => {
      try {
        await result.current.mutate({});
      } catch (e) {
        // Expected error
      }
    });

    expect(onError).toHaveBeenCalledWith(error);
    expect(result.current.error).toBe('Mutation failed');
  });

  it('should invalidate cache when option is set', async () => {
    const mutationFn = jest.fn().mockResolvedValue({ success: true });

    // First populate cache
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ cached: true }),
    });

    const { result: queryResult } = renderHook(() =>
      useQuery('/api/mutation-cache-test', { cache: true })
    );

    await waitFor(() => {
      expect(queryResult.current.data).toBeDefined();
    });

    // Now do mutation with cache invalidation
    const { result } = renderHook(() =>
      useMutation(mutationFn, { invalidateCache: true })
    );

    await act(async () => {
      await result.current.mutate({});
    });

    // Cache should be cleared
    mockFetch.mockClear();

    const { result: queryResult2 } = renderHook(() =>
      useQuery('/api/mutation-cache-test', { cache: true })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
