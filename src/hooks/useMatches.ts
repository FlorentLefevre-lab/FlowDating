// hooks/useMatches.ts -

export function useMatches() {
  return useApiWithCache('/api/matches', {
    cacheKey: 'user-matches',
    cacheTtl: 2 * 60 * 1000, // 2 minutes
  });
}