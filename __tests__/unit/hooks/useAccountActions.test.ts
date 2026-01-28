/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAccountActions } from '@/hooks/useAccountActions';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useAccountActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockPush.mockReset();
  });

  describe('initial state', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useAccountActions());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.suspendAccount).toBe('function');
      expect(typeof result.current.reactivateAccount).toBe('function');
      expect(typeof result.current.checkAccountStatus).toBe('function');
    });
  });

  describe('suspendAccount', () => {
    it('should call POST /api/user/suspend-account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Account suspended' }),
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        await result.current.suspendAccount({ reason: 'test' });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/user/suspend-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'test' }),
      });
    });

    it('should set loading state during suspension', async () => {
      let resolvePromise: (value: any) => void;
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useAccountActions());

      act(() => {
        result.current.suspendAccount();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return result on success', async () => {
      const mockResponse = { success: true, message: 'Account suspended' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAccountActions());

      let response: any;
      await act(async () => {
        response = await result.current.suspendAccount();
      });

      expect(response).toEqual(mockResponse);
    });

    it('should handle error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid request' }),
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        try {
          await result.current.suspendAccount();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Invalid request');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        try {
          await result.current.suspendAccount();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Network failed');
    });

    it('should call without data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        await result.current.suspendAccount();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/user/suspend-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
    });
  });

  describe('reactivateAccount', () => {
    it('should call PUT /api/user/suspend-account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Account reactivated' }),
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        await result.current.reactivateAccount();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/user/suspend-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    });

    it('should redirect to /home after successful reactivation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        await result.current.reactivateAccount();
      });

      expect(mockPush).toHaveBeenCalledWith('/home');
    });

    it('should not redirect on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Failed' }),
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        try {
          await result.current.reactivateAccount();
        } catch (e) {
          // Expected
        }
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should set loading state during reactivation', async () => {
      let resolvePromise: (value: any) => void;
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useAccountActions());

      act(() => {
        result.current.reactivateAccount();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('checkAccountStatus', () => {
    it('should call GET /api/user/suspend-account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'active' }),
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        await result.current.checkAccountStatus();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/user/suspend-account', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    });

    it('should return status data', async () => {
      const mockStatus = {
        status: 'suspended',
        suspendedAt: '2024-01-01',
        reason: 'User request'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const { result } = renderHook(() => useAccountActions());

      let response: any;
      await act(async () => {
        response = await result.current.checkAccountStatus();
      });

      expect(response).toEqual(mockStatus);
    });

    it('should handle error when checking status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        try {
          await result.current.checkAccountStatus();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Unauthorized');
    });

    it('should set loading state during status check', async () => {
      let resolvePromise: (value: any) => void;
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useAccountActions());

      act(() => {
        result.current.checkAccountStatus();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ status: 'active' }),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle non-JSON error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Not JSON'); },
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        try {
          await result.current.suspendAccount();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Erreur 500');
    });

    it('should clear error before new request', async () => {
      // First request fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'First error' }),
      });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        try {
          await result.current.suspendAccount();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('First error');

      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.suspendAccount();
      });

      expect(result.current.error).toBeNull();
    });

    it('should throw error for calling code to handle', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Test error' }),
      });

      const { result } = renderHook(() => useAccountActions());

      await expect(
        act(async () => {
          await result.current.suspendAccount();
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple sequential calls', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ action: 'suspend' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'suspended' }),
        });

      const { result } = renderHook(() => useAccountActions());

      await act(async () => {
        await result.current.suspendAccount();
        await result.current.checkAccountStatus();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
