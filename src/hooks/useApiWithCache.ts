// hooks/useApiWithCache.ts
import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { clientCache } from '@/lib/cache';

interface UseApiWithCacheOptions {
  cacheKey: string;
  cacheTtl?: number;
  enabled?: boolean;
  refetchOnMount?: boolean;
}

export function useApiWithCache<T>(
  endpoint: string, 
  { cacheKey, cacheTtl = 300000, enabled = true, refetchOnMount = false }: UseApiWithCacheOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { get } = useApi();

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      // Vérifier le cache d'abord
      const cached = clientCache.get(cacheKey);
      if (cached && !refetchOnMount) {
        console.log(`📦 Cache hit pour ${cacheKey}`);
        setData(cached);
        setIsLoading(false);
        return;
      }

      console.log(`🌐 Fetching ${endpoint}`);
      const result = await get(endpoint);
      
      // Mettre en cache
      clientCache.set(cacheKey, result, cacheTtl);
      setData(result);

    } catch (err) {
      console.error(`❌ Erreur ${endpoint}:`, err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, enabled, get, cacheKey, cacheTtl, refetchOnMount]);

  // Fetch initial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fonction de refresh
  const refresh = useCallback(() => {
    clientCache.invalidate(cacheKey);
    fetchData();
  }, [cacheKey, fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh,
    // Fonctions utilitaires
    refetch: fetchData,
    invalidateCache: () => clientCache.invalidate(cacheKey)
  };
}
