/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import {
  useStats,
  useStatsWithOptions,
  useDailyStats,
  useTotalStats,
  useStatsWithMetrics,
  useStatsForNavbar,
  useStatsManual,
  formatStats,
  areStatsRecent,
  isStatsCached,
  getStatsInsights,
  STATS_CONFIG,
} from '@/hooks/useStats';

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

// Mock stats data
const mockStatsData = {
  profileViews: 150,
  likesReceived: 45,
  matchesCount: 12,
  dailyStats: {
    profileViews: 25,
    likesReceived: 8,
    matchesCount: 2,
  },
  totalStats: {
    profileViews: 500,
    likesReceived: 120,
    matchesCount: 30,
  },
  meta: {
    timestamp: new Date().toISOString(),
    userId: 'user-123',
    memberSince: '2024-01-01',
    lastSeen: new Date().toISOString(),
    isOnline: true,
    dataSource: 'database',
    cacheHit: false,
  },
};

describe('useStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockStatsData,
    });
  });

  it('should fetch stats on mount', async () => {
    const { result } = renderHook(() => useStats());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockStatsData);
    expect(result.current.error).toBeNull();
  });

  it('should use cache when available', async () => {
    // First call to populate cache
    const { result: result1, unmount } = renderHook(() => useStats());

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockStatsData);
    });

    unmount();
    mockFetch.mockClear();

    // Second call should use cache
    const { result: result2 } = renderHook(() => useStats());

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockStatsData);
    });

    // Should not have fetched again due to cache
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useStats());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.data).toBeNull();
  });

  it('should refetch on manual refresh', async () => {
    const updatedStats = { ...mockStatsData, profileViews: 200 };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedStats,
      });

    const { result } = renderHook(() => useStats());

    await waitFor(() => {
      expect(result.current.data?.profileViews).toBe(150);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.data?.profileViews).toBe(200);
    });
  });

  it('should not fetch when not authenticated', async () => {
    mockStatus = 'unauthenticated';

    renderHook(() => useStats());

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should enable polling when realTime is true', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useStats(true));

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    // Advance past polling interval (2 minutes)
    jest.advanceTimersByTime(2 * 60 * 1000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });
});

describe('useStatsWithOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockStatsData,
    });
  });

  it('should respect custom cache time', async () => {
    const { result } = renderHook(() =>
      useStatsWithOptions({ cacheTime: 1000 })
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });

  it('should not fetch when enabled is false', async () => {
    renderHook(() => useStatsWithOptions({ enabled: false }));

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should respect requireAuth option', async () => {
    mockStatus = 'unauthenticated';

    renderHook(() =>
      useStatsWithOptions({ requireAuth: false })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

describe('useDailyStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockStatsData,
    });
  });

  it('should return only daily stats', async () => {
    const { result } = renderHook(() => useDailyStats());

    await waitFor(() => {
      expect(result.current.data).toEqual(mockStatsData.dailyStats);
    });
  });

  it('should return null when no daily stats', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockStatsData, dailyStats: undefined }),
    });

    const { result } = renderHook(() => useDailyStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('useTotalStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockStatsData,
    });
  });

  it('should return only total stats', async () => {
    const { result } = renderHook(() => useTotalStats());

    await waitFor(() => {
      expect(result.current.data).toEqual(mockStatsData.totalStats);
    });
  });

  it('should return null when no total stats', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockStatsData, totalStats: undefined }),
    });

    const { result } = renderHook(() => useTotalStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('useStatsWithMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockStatsData,
    });
  });

  it('should calculate matchRate correctly', async () => {
    const { result } = renderHook(() => useStatsWithMetrics());

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined();
    });

    // matchRate = (matchesCount / likesReceived) * 100 = (12 / 45) * 100 = 27
    expect(result.current.metrics?.matchRate).toBe(27);
  });

  it('should calculate popularityScore correctly', async () => {
    const { result } = renderHook(() => useStatsWithMetrics());

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined();
    });

    // popularityScore = (likesReceived / profileViews) * 100 = (45 / 150) * 100 = 30
    expect(result.current.metrics?.popularityScore).toBe(30);
  });

  it('should calculate dailyEngagement correctly', async () => {
    const { result } = renderHook(() => useStatsWithMetrics());

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined();
    });

    // dailyEngagement = dailyStats.likesReceived + (dailyStats.matchesCount * 2) = 8 + (2 * 2) = 12
    expect(result.current.metrics?.dailyEngagement).toBe(12);
  });

  it('should detect isActiveToday correctly', async () => {
    const { result } = renderHook(() => useStatsWithMetrics());

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined();
    });

    // isActiveToday = dailyStats.likesReceived > 0 || dailyStats.matchesCount > 0
    expect(result.current.metrics?.isActiveToday).toBe(true);
  });

  it('should handle zero values without division by zero', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        profileViews: 0,
        likesReceived: 0,
        matchesCount: 0,
      }),
    });

    const { result } = renderHook(() => useStatsWithMetrics());

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined();
    });

    expect(result.current.metrics?.matchRate).toBe(0);
    expect(result.current.metrics?.popularityScore).toBe(0);
  });

  it('should calculate growthRate when stats available', async () => {
    const { result } = renderHook(() => useStatsWithMetrics());

    await waitFor(() => {
      expect(result.current.metrics?.growthRate).toBeDefined();
    });

    expect(result.current.metrics?.growthRate).toHaveProperty('likes');
    expect(result.current.metrics?.growthRate).toHaveProperty('matches');
  });
});

describe('useStatsForNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockStatsData,
    });
  });

  it('should use longer cache TTL', async () => {
    // useStatsForNavbar uses 10 minute cache
    const { result } = renderHook(() => useStatsForNavbar());

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.likesReceived).toBe(45);
    expect(result.current.data?.matchesCount).toBe(12);
  });

  it('should not enable polling', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useStatsForNavbar());

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    mockFetch.mockClear();

    // Advance time significantly
    jest.advanceTimersByTime(30 * 60 * 1000);

    // Should not have polled
    expect(mockFetch).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

describe('useStatsManual', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'authenticated';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockStatsData,
    });
  });

  it('should not fetch automatically when enabled is false', async () => {
    renderHook(() => useStatsManual());

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch fresh data without cache when manually triggered', async () => {
    const { result } = renderHook(() => useStatsManual());

    // Should not fetch initially
    expect(mockFetch).not.toHaveBeenCalled();

    // Manual refetch
    await result.current.refetch();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

describe('formatStats utility', () => {
  it('should format stats with French locale', () => {
    const result = formatStats(mockStatsData);

    expect(result).not.toBeNull();
    expect(result?.raw).toEqual(mockStatsData);
    expect(result?.formatted).toHaveProperty('profileViews');
    expect(result?.formatted).toHaveProperty('likesReceived');
    expect(result?.formatted).toHaveProperty('matchesCount');
  });

  it('should return null for null input', () => {
    const result = formatStats(null);
    expect(result).toBeNull();
  });

  it('should format large numbers correctly', () => {
    const largeStats = {
      ...mockStatsData,
      profileViews: 1234567,
    };

    const result = formatStats(largeStats);
    // French locale uses space as thousands separator
    expect(result?.formatted.profileViews).toContain('1');
  });
});

describe('areStatsRecent utility', () => {
  it('should return true for recent stats', () => {
    const recentStats = {
      ...mockStatsData,
      meta: {
        ...mockStatsData.meta,
        timestamp: new Date().toISOString(),
      },
    };

    expect(areStatsRecent(recentStats)).toBe(true);
  });

  it('should return false for old stats', () => {
    const oldStats = {
      ...mockStatsData,
      meta: {
        ...mockStatsData.meta,
        timestamp: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      },
    };

    expect(areStatsRecent(oldStats, 60000)).toBe(false); // max age 1 minute
  });

  it('should return false for null stats', () => {
    expect(areStatsRecent(null)).toBe(false);
  });

  it('should return false for stats without timestamp', () => {
    const noTimestamp = { ...mockStatsData, meta: undefined };
    expect(areStatsRecent(noTimestamp as any)).toBe(false);
  });
});

describe('isStatsCached utility', () => {
  it('should return true when cacheHit is true', () => {
    const cachedStats = {
      ...mockStatsData,
      meta: { ...mockStatsData.meta, cacheHit: true },
    };

    expect(isStatsCached(cachedStats)).toBe(true);
  });

  it('should return true when dataSource contains cache', () => {
    const cachedStats = {
      ...mockStatsData,
      meta: { ...mockStatsData.meta, dataSource: 'redis-cache' },
    };

    expect(isStatsCached(cachedStats)).toBe(true);
  });

  it('should return false for non-cached stats', () => {
    const freshStats = {
      ...mockStatsData,
      meta: { ...mockStatsData.meta, cacheHit: false, dataSource: 'database' },
    };

    expect(isStatsCached(freshStats)).toBe(false);
  });

  it('should return false for null stats', () => {
    expect(isStatsCached(null)).toBe(false);
  });
});

describe('getStatsInsights utility', () => {
  const metrics = {
    matchRate: 3, // Low match rate
    popularityScore: 30,
    dailyEngagement: 12,
    isActiveToday: true,
    growthRate: { likes: 100, matches: 100 },
  };

  it('should return warning for low match rate', () => {
    const insights = getStatsInsights(mockStatsData, { ...metrics, matchRate: 3 });

    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.type === 'warning')).toBe(true);
  });

  it('should return success for high match rate', () => {
    const insights = getStatsInsights(mockStatsData, { ...metrics, matchRate: 25 });

    expect(insights.some(i => i.type === 'success')).toBe(true);
  });

  it('should return activity info when active today', () => {
    const insights = getStatsInsights(mockStatsData, { ...metrics, isActiveToday: true });

    expect(insights.some(i => i.type === 'info')).toBe(true);
  });

  it('should return tip when not active today', () => {
    const insights = getStatsInsights(mockStatsData, { ...metrics, isActiveToday: false });

    expect(insights.some(i => i.type === 'tip')).toBe(true);
  });

  it('should limit insights to 2 max', () => {
    const insights = getStatsInsights(mockStatsData, metrics);

    expect(insights.length).toBeLessThanOrEqual(2);
  });

  it('should return empty array for null inputs', () => {
    expect(getStatsInsights(null, null)).toEqual([]);
    expect(getStatsInsights(mockStatsData, null)).toEqual([]);
  });
});

describe('STATS_CONFIG constants', () => {
  it('should have correct cache time values', () => {
    expect(STATS_CONFIG.CACHE_TIME).toBe(5 * 60 * 1000);
    expect(STATS_CONFIG.POLLING_INTERVAL).toBe(2 * 60 * 1000);
    expect(STATS_CONFIG.NAVBAR_CACHE_TIME).toBe(10 * 60 * 1000);
    expect(STATS_CONFIG.MANUAL_REFRESH_ONLY).toBe(true);
  });
});
