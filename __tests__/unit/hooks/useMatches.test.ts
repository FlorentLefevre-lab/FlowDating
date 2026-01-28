/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMatches } from '@/hooks/useMatches';

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

// Mock matches data
const mockMatchesResponse = {
  matches: [
    {
      id: 'match-1',
      createdAt: new Date().toISOString(),
      compatibility: 85,
      user: {
        id: 'user-1',
        name: 'Alice',
        age: 28,
        profession: 'Engineer',
        location: 'Paris',
        interests: ['music', 'travel'],
        isOnline: true,
        lastSeen: new Date().toISOString(),
      },
    },
    {
      id: 'match-2',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      compatibility: 72,
      user: {
        id: 'user-2',
        name: 'Bob',
        age: 32,
        profession: 'Designer',
        location: 'Lyon',
        interests: ['art', 'cooking'],
        isOnline: false,
        lastSeen: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      },
    },
    {
      id: 'match-3',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      compatibility: 65,
      user: {
        id: 'user-3',
        name: 'Charlie',
        age: 25,
        profession: 'Marketing',
        location: 'Marseille',
        interests: ['sports'],
        isOnline: false,
        lastSeen: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      },
    },
  ],
  stats: {
    totalMatches: 3,
    newMatches: 1,
    activeConversations: 1,
    dormantMatches: 1,
    averageResponseTime: '2h',
    thisWeekMatches: 1,
  },
};

describe('useMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMatchesResponse,
    });
  });

  describe('initial state and loading', () => {
    it('should return initial loading state', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMatches());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.matches).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch matches on mount when authenticated', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.matches).toHaveLength(3);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/matches', expect.any(Object));
    });

    it('should not fetch when not authenticated', async () => {
      mockStatus = 'unauthenticated';

      renderHook(() => useMatches());

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.error).toBe('Erreur 500: Internal Server Error');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.matches).toEqual([]);
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('match enrichment', () => {
    it('should mark new matches correctly', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First match is from today, should be new
      expect(result.current.matches[0].isNew).toBe(true);
      // Second match is from 7 days ago, should not be new
      expect(result.current.matches[1].isNew).toBe(false);
    });

    it('should assign correct status based on activity', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // User 1 is online, should be active
      expect(result.current.matches[0].status).toBe('active');
      // User 2 last seen 10 days ago, should be dormant
      expect(result.current.matches[1].status).toBe('dormant');
      // User 3 last seen 45 days ago, should be archived
      expect(result.current.matches[2].status).toBe('archived');
    });
  });

  describe('stats', () => {
    it('should return stats from API', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockMatchesResponse.stats);
    });

    it('should calculate filtered stats correctly', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const filteredStats = result.current.getFilteredStats();

      expect(filteredStats.totalMatches).toBe(3);
      expect(filteredStats).toHaveProperty('newMatches');
      expect(filteredStats).toHaveProperty('activeConversations');
      expect(filteredStats).toHaveProperty('dormantMatches');
    });
  });

  describe('filtering', () => {
    it('should filter by status', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ status: 'active' });
      });

      expect(result.current.filteredMatches.every(m => m.status === 'active')).toBe(true);
    });

    it('should filter by new matches', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ status: 'new' });
      });

      expect(result.current.filteredMatches.every(m => m.isNew)).toBe(true);
    });

    it('should filter by timeframe - today', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ timeframe: 'today' });
      });

      // Only today's matches
      expect(result.current.filteredMatches.length).toBeLessThanOrEqual(1);
    });

    it('should filter by timeframe - week', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ timeframe: 'week' });
      });

      // Matches within the last week
      expect(result.current.filteredMatches.length).toBeLessThanOrEqual(2);
    });

    it('should filter by search query - name', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ searchQuery: 'Alice' });
      });

      expect(result.current.filteredMatches).toHaveLength(1);
      expect(result.current.filteredMatches[0].user.name).toBe('Alice');
    });

    it('should filter by search query - profession', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ searchQuery: 'engineer' });
      });

      expect(result.current.filteredMatches).toHaveLength(1);
    });

    it('should filter by search query - location', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ searchQuery: 'paris' });
      });

      expect(result.current.filteredMatches).toHaveLength(1);
    });

    it('should filter by search query - interests', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ searchQuery: 'music' });
      });

      expect(result.current.filteredMatches).toHaveLength(1);
    });

    it('should clear filters', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ status: 'active', searchQuery: 'test' });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.status).toBe('all');
      expect(result.current.filters.searchQuery).toBe('');
    });
  });

  describe('sorting', () => {
    it('should sort by recent (default)', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Default sort is recent descending
      const timestamps = result.current.filteredMatches.map(m => new Date(m.createdAt).getTime());
      expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1]);
    });

    it('should sort by compatibility', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ sortBy: 'compatibility', sortOrder: 'desc' });
      });

      const compatibilities = result.current.filteredMatches.map(m => m.compatibility || 0);
      expect(compatibilities[0]).toBeGreaterThanOrEqual(compatibilities[1]);
    });

    it('should sort by name', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ sortBy: 'name', sortOrder: 'asc' });
      });

      const names = result.current.filteredMatches.map(m => m.user.name);
      expect(names[0].localeCompare(names[1])).toBeLessThanOrEqual(0);
    });

    it('should sort by age', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ sortBy: 'age', sortOrder: 'asc' });
      });

      const ages = result.current.filteredMatches.map(m => m.user.age || 0);
      expect(ages[0]).toBeLessThanOrEqual(ages[1]);
    });

    it('should respect sort order', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ sortBy: 'compatibility', sortOrder: 'asc' });
      });

      const compatibilities = result.current.filteredMatches.map(m => m.compatibility || 0);
      expect(compatibilities[0]).toBeLessThanOrEqual(compatibilities[1]);
    });
  });

  describe('utility functions', () => {
    it('should get match by ID', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const match = result.current.getMatchById('match-1');
      expect(match?.id).toBe('match-1');
    });

    it('should return undefined for non-existent match ID', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const match = result.current.getMatchById('non-existent');
      expect(match).toBeUndefined();
    });

    it('should get match by user ID', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const match = result.current.getMatchByUserId('user-1');
      expect(match?.user.id).toBe('user-1');
    });

    it('should return undefined for non-existent user ID', async () => {
      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const match = result.current.getMatchByUserId('non-existent');
      expect(match).toBeUndefined();
    });
  });

  describe('refresh', () => {
    it('should refresh matches', async () => {
      const updatedMatches = {
        ...mockMatchesResponse,
        matches: [...mockMatchesResponse.matches, {
          id: 'match-4',
          createdAt: new Date().toISOString(),
          compatibility: 90,
          user: {
            id: 'user-4',
            name: 'Diana',
            age: 27,
            isOnline: true,
          },
        }],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMatchesResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedMatches,
        });

      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.matches).toHaveLength(3);
      });

      await act(async () => {
        await result.current.refreshMatches();
      });

      expect(result.current.matches).toHaveLength(4);
    });

    it('should set isRefreshing during refresh', async () => {
      let resolveRefresh: (value: any) => void;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMatchesResponse,
        })
        .mockImplementationOnce(() => new Promise(resolve => {
          resolveRefresh = resolve;
        }));

      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.refreshMatches();
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(true);
      });

      await act(async () => {
        resolveRefresh!({
          ok: true,
          json: async () => mockMatchesResponse,
        });
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('should not refresh while loading', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMatches());

      // Try to refresh while loading
      await act(async () => {
        await result.current.refreshMatches();
      });

      // Should only have one fetch call (the initial load)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should auto refresh when enabled', async () => {
      const { result } = renderHook(() =>
        useMatches({ autoRefresh: true, refreshInterval: 5000 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should not auto refresh when disabled', async () => {
      const { result } = renderHook(() =>
        useMatches({ autoRefresh: false })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should cleanup interval on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useMatches({ autoRefresh: true, refreshInterval: 5000 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not have fetched after unmount
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    it('should handle empty matches array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matches: [],
          stats: {
            totalMatches: 0,
            newMatches: 0,
            activeConversations: 0,
            dormantMatches: 0,
            averageResponseTime: '0h',
            thisWeekMatches: 0,
          },
        }),
      });

      const { result } = renderHook(() => useMatches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.matches).toEqual([]);
      expect(result.current.filteredMatches).toEqual([]);
      expect(result.current.stats.totalMatches).toBe(0);
    });
  });
});
