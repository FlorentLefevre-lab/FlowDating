// ===============================
// 📁 hooks/useStats.ts - Version optimisée pour éviter les appels répétés
// ===============================

import { useQuery, type QueryReturn } from '@/hooks/useQuery';

// Types pour vos stats (SANS messages)
interface StatsData {
  profileViews: number;
  likesReceived: number;
  matchesCount: number;
  
  dailyStats?: {
    profileViews: number;
    likesReceived: number;
    matchesCount: number;
  };
  
  totalStats?: {
    profileViews: number;
    likesReceived: number;
    matchesCount: number;
  };
  
  meta?: {
    timestamp: string;
    userId: string;
    memberSince: string;
    lastSeen?: string;
    isOnline?: boolean;
    dataSource: string;
    cacheHit?: boolean;
  };
}

// 🔥 Hook principal ULTRA-OPTIMISÉ pour éviter les appels répétés
export function useStats(realTime = false): QueryReturn<StatsData> {
  return useQuery<StatsData>('/api/user/stats', {
    cache: true,
    cacheTtl: 5 * 60 * 1000, // 🔥 5 MINUTES côté client (plus long)
    polling: realTime ? 2 * 60 * 1000 : 0, // 🔥 2 minutes de polling (très peu fréquent)
    retryOnError: false, // 🔥 PAS de retry automatique
    requireAuth: true,
    enabled: true
  });
}

// Hook avec options avancées
export function useStatsWithOptions(options: {
  realTime?: boolean;
  cacheTime?: number;
  pollingInterval?: number;
  enabled?: boolean;
  requireAuth?: boolean;
} = {}) {
  const {
    realTime = false,
    cacheTime = 5 * 60 * 1000, // 5 minutes par défaut
    pollingInterval = 2 * 60 * 1000, // 2 minutes par défaut
    enabled = true,
    requireAuth = true
  } = options;

  return useQuery<StatsData>('/api/user/stats', {
    cache: true,
    cacheTtl: cacheTime,
    polling: realTime ? pollingInterval : 0,
    retryOnError: false, // 🔥 PAS de retry
    requireAuth,
    enabled
  });
}

// Hook pour les stats quotidiennes seulement
export function useDailyStats(): Omit<QueryReturn<StatsData>, 'data'> & { data: StatsData['dailyStats'] | null } {
  const { data, ...rest } = useStats();
  
  return {
    ...rest,
    data: data?.dailyStats || null
  };
}

// Hook pour les stats totales seulement
export function useTotalStats(): Omit<QueryReturn<StatsData>, 'data'> & { data: StatsData['totalStats'] | null } {
  const { data, ...rest } = useStats();
  
  return {
    ...rest,
    data: data?.totalStats || null
  };
}

// Hook avec calculs dérivés
export function useStatsWithMetrics() {
  const { data, ...rest } = useStats();
  
  const metrics = data ? {
    // Taux de conversion likes → matches
    matchRate: data.likesReceived > 0 
      ? Math.round((data.matchesCount / data.likesReceived) * 100) 
      : 0,
    
    // Ratio vues/likes (popularité)
    popularityScore: data.profileViews > 0 
      ? Math.round((data.likesReceived / data.profileViews) * 100) 
      : 0,
    
    // Score d'engagement quotidien
    dailyEngagement: data.dailyStats 
      ? data.dailyStats.likesReceived + (data.dailyStats.matchesCount * 2)
      : 0,
    
    // Activité aujourd'hui
    isActiveToday: data.dailyStats 
      ? (data.dailyStats.likesReceived > 0 || data.dailyStats.matchesCount > 0)
      : false,
    
    // Croissance par rapport à la moyenne
    growthRate: data.dailyStats && data.totalStats
      ? {
          likes: data.totalStats.likesReceived > 0 
            ? Math.round((data.dailyStats.likesReceived / (data.totalStats.likesReceived / 30)) * 100)
            : 0,
          matches: data.totalStats.matchesCount > 0
            ? Math.round((data.dailyStats.matchesCount / (data.totalStats.matchesCount / 30)) * 100)
            : 0
        }
      : null
  } : null;

  return {
    ...rest,
    data,
    metrics
  };
}

// 🔥 Hook ultra-léger pour navbar (cache très long)
export function useStatsForNavbar() {
  return useQuery<Pick<StatsData, 'likesReceived' | 'matchesCount'>>('/api/user/stats', {
    cache: true,
    cacheTtl: 10 * 60 * 1000, // 🔥 10 MINUTES pour navbar
    polling: 0, // JAMAIS de polling automatique
    retryOnError: false,
    requireAuth: true,
    enabled: true
  });
}

// 🔥 Hook pour refresh manuel uniquement
export function useStatsManual() {
  return useQuery<StatsData>('/api/user/stats', {
    cache: false, // Pas de cache, données fraîches
    cacheTtl: 0,
    polling: 0, // Pas de polling
    retryOnError: false,
    requireAuth: true,
    enabled: false // 🔥 Désactivé par défaut, appel manuel seulement
  });
}

// Fonctions utilitaires
export function formatStats(stats: StatsData | null) {
  if (!stats) return null;
  
  return {
    formatted: {
      profileViews: stats.profileViews.toLocaleString('fr-FR'),
      likesReceived: stats.likesReceived.toLocaleString('fr-FR'),
      matchesCount: stats.matchesCount.toLocaleString('fr-FR')
    },
    raw: stats
  };
}

export function areStatsRecent(stats: StatsData | null, maxAgeMs = 60000): boolean {
  if (!stats?.meta?.timestamp) return false;
  
  const statsTime = new Date(stats.meta.timestamp).getTime();
  const now = Date.now();
  
  return (now - statsTime) < maxAgeMs;
}

// Fonction pour vérifier si les stats viennent du cache
export function isStatsCached(stats: StatsData | null): boolean {
  return stats?.meta?.cacheHit === true || stats?.meta?.dataSource?.includes('cache') || false;
}

// Fonction pour obtenir des conseils basés sur les stats
export function getStatsInsights(stats: StatsData | null, metrics: any) {
  if (!stats || !metrics) return [];

  const insights = [];

  // Analyse du taux de match
  if (metrics.matchRate < 5) {
    insights.push({
      type: 'warning',
      message: 'Votre taux de match est faible. Essayez d\'améliorer vos photos de profil.',
      action: 'Modifier le profil'
    });
  } else if (metrics.matchRate > 20) {
    insights.push({
      type: 'success',
      message: 'Excellent taux de match ! Vous êtes très populaire.',
      action: null
    });
  }

  // Analyse de l'activité quotidienne
  if (metrics.isActiveToday) {
    insights.push({
      type: 'info',
      message: `Vous avez été actif aujourd'hui avec ${stats.dailyStats?.likesReceived || 0} likes reçus.`,
      action: null
    });
  } else {
    insights.push({
      type: 'tip',
      message: 'Aucune activité aujourd\'hui. Connectez-vous plus souvent pour plus de visibilité.',
      action: 'Découvrir des profils'
    });
  }

  return insights.slice(0, 2); // Limiter à 2 insights max
}

// Types pour les composants
export type StatsHookReturn = ReturnType<typeof useStats>;
export type StatsWithMetricsReturn = ReturnType<typeof useStatsWithMetrics>;

// 🔥 Constantes mises à jour pour éviter les appels répétés
export const STATS_CONFIG = {
  CACHE_TIME: 5 * 60 * 1000,        // 5 minutes côté client
  POLLING_INTERVAL: 2 * 60 * 1000,   // 2 minutes polling  
  NAVBAR_CACHE_TIME: 10 * 60 * 1000, // 10 minutes navbar
  MANUAL_REFRESH_ONLY: true,         // Privilégier refresh manuel
  REDIS_TTL: 30 * 1000,             // 30s côté serveur Redis
} as const;