// hooks/useApi.ts - Version avec intégration middleware
import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  autoRetry?: boolean;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  const request = useCallback(async (
    endpoint: string,
    config: RequestInit = {}
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          // 🎯 Plus besoin d'ajouter l'auth - le middleware le fait
          ...config.headers,
        },
        ...config,
      });

      if (!response.ok) {
        // 🎯 Le middleware gère déjà les 401, mais on peut avoir des cas edge
        if (response.status === 401) {
          console.log('🔄 Session expirée détectée, rechargement...');
          window.location.reload(); // Force refresh pour re-trigger middleware
          throw new Error('Session expirée');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `Erreur ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      options.onSuccess?.(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      options.onError?.(errorMessage);
      
      // 🔄 Auto-retry pour les erreurs réseau
      if (options.autoRetry && errorMessage.includes('fetch')) {
        console.log('🔄 Tentative de retry automatique...');
        setTimeout(() => request(endpoint, config), 2000);
        return Promise.reject(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router, options]);

  return { 
    data, 
    loading, 
    error, 
    request,
    // 🎯 Helpers simplifiés
    get: useCallback((endpoint: string) => request(endpoint, { method: 'GET' }), [request]),
    post: useCallback((endpoint: string, body?: any) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }), [request]),
    put: useCallback((endpoint: string, body?: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }), [request]),
    delete: useCallback((endpoint: string) => request(endpoint, { method: 'DELETE' }), [request]),
  };
}