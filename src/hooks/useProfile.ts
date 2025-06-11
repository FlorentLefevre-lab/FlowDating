// hooks/useProfile.ts - Version finale simplifiéee

export function useProfile() {
  return useApiWithCache('/api/profile', {
    cacheKey: 'user-profile',
    cacheTtl: 5 * 60 * 1000, // 5 minutes
  });
}