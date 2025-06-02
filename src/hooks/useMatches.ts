// ===========================================
// ÉTAPE 4: Hook useMatches
// FICHIER: src/hooks/useMatches.ts
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface MatchWithMessages {
  id: string;
  users: Array<{
    id: string;
    name: string;
    image?: string;
    age?: number;
    location?: string;
  }>;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    readAt?: string;
  };
  unreadCount: number;
  createdAt: string;
}

export const useMatches = () => {
  const [matches, setMatches] = useState<MatchWithMessages[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { data: session } = useSession();

  const loadMatches = useCallback(async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/matches');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des matches');
      }
      
      const data = await response.json();
      setMatches(data.matches || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  const getMatchById = useCallback((matchId: string) => {
    return matches.find(match => match.id === matchId);
  }, [matches]);

  const updateMatchLastMessage = useCallback((matchId: string, message: any) => {
    setMatches(prev => prev.map(match => 
      match.id === matchId 
        ? { ...match, lastMessage: message }
        : match
    ));
  }, []);

  const incrementUnreadCount = useCallback((matchId: string) => {
    setMatches(prev => prev.map(match => 
      match.id === matchId 
        ? { ...match, unreadCount: match.unreadCount + 1 }
        : match
    ));
  }, []);

  const resetUnreadCount = useCallback((matchId: string) => {
    setMatches(prev => prev.map(match => 
      match.id === matchId 
        ? { ...match, unreadCount: 0 }
        : match
    ));
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return {
    matches,
    loading,
    error,
    loadMatches,
    getMatchById,
    updateMatchLastMessage,
    incrementUnreadCount,
    resetUnreadCount
  };
};