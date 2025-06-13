// ===============================
// 📁 hooks/useMatches.ts - Hook spécialisé pour les matches (sans messages)
// ===============================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Match, MatchStats, MatchFilters, MatchesResponse } from '@/types/matches';

interface UseMatchesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
}

interface UseMatchesReturn {
  matches: Match[];
  stats: MatchStats;
  filteredMatches: Match[];
  filters: MatchFilters;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Actions
  loadMatches: () => Promise<void>;
  refreshMatches: () => Promise<void>;
  updateFilters: (newFilters: Partial<MatchFilters>) => void;
  clearFilters: () => void;
  
  // Utilities
  getMatchById: (id: string) => Match | undefined;
  getMatchByUserId: (userId: string) => Match | undefined;
  
  // Stats
  getFilteredStats: () => MatchStats;
}

const defaultFilters: MatchFilters = {
  status: 'all',
  timeframe: 'all',
  sortBy: 'recent',
  sortOrder: 'desc',
  searchQuery: ''
};

const defaultStats: MatchStats = {
  totalMatches: 0,
  newMatches: 0,
  activeConversations: 0,
  dormantMatches: 0,
  averageResponseTime: '0h',
  thisWeekMatches: 0
};

export function useMatches(options: UseMatchesOptions = {}): UseMatchesReturn {
  const { 
    autoRefresh = false, 
    refreshInterval = 30000,
    enableRealtime = false 
  } = options;
  
  const { data: session, status } = useSession();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<MatchStats>(defaultStats);
  const [filters, setFilters] = useState<MatchFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonctions utilitaires (définies avant les useCallback)
  const isNewMatch = useCallback((createdAt: string): boolean => {
    return new Date(createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  }, []);

  const getMatchStatus = useCallback((match: Match): 'active' | 'dormant' | 'archived' => {
    // Basé sur l'activité de l'utilisateur plutôt que sur les messages
    if (match.user.isOnline) return 'active';
    
    if (match.user.lastSeen) {
      const lastSeenTime = new Date(match.user.lastSeen).getTime();
      const daysSinceLastSeen = (Date.now() - lastSeenTime) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastSeen > 30) return 'archived';
      if (daysSinceLastSeen > 7) return 'dormant';
      return 'active';
    }
    
    // Si pas de lastSeen, regarder la date du match
    const matchTime = new Date(match.createdAt).getTime();
    const daysSinceMatch = (Date.now() - matchTime) / (1000 * 60 * 60 * 24);
    
    if (daysSinceMatch > 30) return 'archived';
    if (daysSinceMatch > 7) return 'dormant';
    return 'active';
  }, []);

  // Fonction pour charger les matchs
  const loadMatches = useCallback(async (): Promise<void> => {
    if (status !== 'authenticated') return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/matches', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data: MatchesResponse = await response.json();
      
      const enrichedMatches = data.matches.map(match => ({
        ...match,
        isNew: isNewMatch(match.createdAt),
        status: getMatchStatus(match)
      }));
      
      setMatches(enrichedMatches);
      setStats(data.stats);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('❌ [useMatches] Erreur lors du chargement:', err);
    } finally {
      setIsLoading(false);
    }
  }, [status, isNewMatch, getMatchStatus]);

  // Fonction pour rafraîchir les matchs
  const refreshMatches = useCallback(async (): Promise<void> => {
    if (status !== 'authenticated' || isLoading) return;
    
    try {
      setIsRefreshing(true);
      setError(null);
      
      const response = await fetch('/api/matches');
      if (!response.ok) throw new Error(`Erreur ${response.status}`);
      
      const data: MatchesResponse = await response.json();
      
      const enrichedMatches = data.matches.map(match => ({
        ...match,
        isNew: isNewMatch(match.createdAt),
        status: getMatchStatus(match)
      }));
      
      setMatches(enrichedMatches);
      setStats(data.stats);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de rafraîchissement';
      setError(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  }, [status, isLoading, isNewMatch, getMatchStatus]);

  // Fonction pour mettre à jour les filtres
  const updateFilters = useCallback((newFilters: Partial<MatchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Fonction pour réinitialiser les filtres
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Filtrage et tri des matchs (memoized)
  const filteredMatches = useMemo(() => {
    let filtered = matches.filter(match => {
      // Filtre par statut
      switch (filters.status) {
        case 'active':
          return match.status === 'active';
        case 'dormant':
          return match.status === 'dormant';
        case 'new':
          return match.isNew;
        default:
          return true;
      }
    }).filter(match => {
      // Filtre par période
      const matchDate = new Date(match.createdAt);
      const now = new Date();
      
      switch (filters.timeframe) {
        case 'today':
          return matchDate.toDateString() === now.toDateString();
        case 'week':
          return matchDate.getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000;
        case 'month':
          return matchDate.getTime() > now.getTime() - 30 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    }).filter(match => {
      // Filtre par recherche
      if (!filters.searchQuery) return true;
      
      const query = filters.searchQuery.toLowerCase();
      return (
        match.user.name.toLowerCase().includes(query) ||
        match.user.profession?.toLowerCase().includes(query) ||
        match.user.location?.toLowerCase().includes(query) ||
        match.user.interests?.some(interest => 
          interest.toLowerCase().includes(query)
        )
      );
    });

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'recent':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'activity':
          // Basé sur lastSeen au lieu de lastMessage
          const aLastActivity = a.user.lastSeen || a.createdAt;
          const bLastActivity = b.user.lastSeen || b.createdAt;
          comparison = new Date(bLastActivity).getTime() - new Date(aLastActivity).getTime();
          break;
        case 'compatibility':
          comparison = (b.compatibility || 0) - (a.compatibility || 0);
          break;
        case 'name':
          comparison = a.user.name.localeCompare(b.user.name);
          break;
        case 'age':
          comparison = (a.user.age || 0) - (b.user.age || 0);
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [matches, filters]);

  // Fonction pour récupérer un match par ID
  const getMatchById = useCallback((id: string): Match | undefined => {
    return matches.find(match => match.id === id);
  }, [matches]);

  // Fonction pour récupérer un match par ID utilisateur
  const getMatchByUserId = useCallback((userId: string): Match | undefined => {
    return matches.find(match => match.user.id === userId);
  }, [matches]);

  // Fonction pour calculer les stats filtrées
  const getFilteredStats = useCallback((): MatchStats => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      totalMatches: filteredMatches.length,
      newMatches: filteredMatches.filter(match => 
        new Date(match.createdAt) > oneDayAgo
      ).length,
      activeConversations: filteredMatches.filter(match => 
        match.user.isOnline || 
        (match.user.lastSeen && new Date(match.user.lastSeen) > oneWeekAgo)
      ).length,
      dormantMatches: filteredMatches.filter(match => 
        !match.user.isOnline && 
        (!match.user.lastSeen || new Date(match.user.lastSeen) < oneWeekAgo)
      ).length,
      averageResponseTime: stats.averageResponseTime, // Utiliser la valeur de l'API
      thisWeekMatches: filteredMatches.filter(match => 
        new Date(match.createdAt) > oneWeekAgo
      ).length
    };
  }, [filteredMatches, stats.averageResponseTime]);

  // Chargement initial
  useEffect(() => {
    if (status === 'authenticated') {
      loadMatches();
    }
  }, [status, loadMatches]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || status !== 'authenticated') return;

    const interval = setInterval(() => {
      refreshMatches();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, status, refreshMatches]);

  return {
    matches,
    stats,
    filteredMatches,
    filters,
    isLoading,
    isRefreshing,
    error,
    
    loadMatches,
    refreshMatches,
    updateFilters,
    clearFilters,
    
    getMatchById,
    getMatchByUserId,
    getFilteredStats
  };
}
