// hooks/useStats.ts - Version polling intelligent
import { useState, useEffect } from 'react';
import { useApiWithCache } from './useApiWithCache';

export function useStats(pollingInterval = 30000) {
  const [isPolling, setIsPolling] = useState(true);
  
  const { data, isLoading, error, refresh } = useApiWithCache('/api/user/stats', {
    cacheKey: 'user-stats',
    cacheTtl: 30 * 1000, // 30 secondes
  });

  // Polling intelligent
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      console.log('🔄 Polling stats...');
      refresh();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [isPolling, pollingInterval, refresh]);

  // Arrêter le polling quand l'onglet n'est pas visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPolling(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    stats: data,
    isLoading,
    error,
    refresh,
    isPolling,
    setPolling: setIsPolling
  };
}