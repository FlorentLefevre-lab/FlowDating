// hooks/useDiscover.ts - Version finale simplifiée
export function useDiscover() {
  return useApiWithCache('/api/discover', {
    cacheKey: 'discover-profiles',
    cacheTtl: 5 * 60 * 1000, // 5 minutes
  });
}