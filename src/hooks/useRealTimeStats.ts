// hooks/useRealTimeStats.ts - Version corrigée avec gestion des activités sécurisée

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface StatsData {
  profileViews: number;
  likesReceived: number;
  matchesCount: number;
  messagesReceived: number;
  dailyStats: {
    profileViews: number;
    likesReceived: number;
    matchesCount: number;
    messagesReceived: number;
  };
  totalStats?: {
    profileViews: number;
    likesReceived: number;
    matchesCount: number;
    messagesReceived: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'match' | 'like' | 'message' | 'visit';
  userId: string;
  userName: string;
  userAvatar?: string;
  content?: string;
  timestamp: Date;
  isRead?: boolean;
}

export const useRealTimeStats = (refreshInterval: number = 30000) => {
  // 🔐 Session avec status pour détecter l'état de chargement
  const { data: session, status } = useSession();
  
  // 📊 États des statistiques
  const [stats, setStats] = useState<StatsData>({
    profileViews: 0,
    likesReceived: 0,
    matchesCount: 0,
    messagesReceived: 0,
    dailyStats: {
      profileViews: 0,
      likesReceived: 0,
      matchesCount: 0,
      messagesReceived: 0
    }
  });
  
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // 🔄 Ref pour éviter les appels multiples
  const isFirstLoadRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 🎭 Fonction pour générer des activités factices sécurisées
  const generateSafeActivities = useCallback((data: any): ActivityItem[] => {
    const activities: ActivityItem[] = [];
    const now = new Date();
    
    // Noms d'exemple pour les activités factices
    const exampleNames = [
      'Sophie', 'Emma', 'Léa', 'Chloé', 'Marie', 'Julie', 'Sarah', 'Lisa'
    ];
    
    const getRandomName = () => exampleNames[Math.floor(Math.random() * exampleNames.length)];
    const getRandomTime = (hoursAgo: number) => new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
    
    try {
      // Activités basées sur les stats du jour
      if (data.dailyStats?.profileViews > 0) {
        activities.push({
          id: `view-${Date.now()}-1`,
          type: 'visit',
          userId: 'example-user-1',
          userName: getRandomName(),
          userAvatar: '👩',
          timestamp: getRandomTime(2),
          isRead: true
        });
      }
      
      if (data.dailyStats?.likesReceived > 0) {
        activities.push({
          id: `like-${Date.now()}-2`,
          type: 'like',
          userId: 'example-user-2',
          userName: getRandomName(),
          userAvatar: '👱‍♀️',
          timestamp: getRandomTime(4),
          isRead: false
        });
      }
      
      if (data.dailyStats?.messagesReceived > 0) {
        activities.push({
          id: `message-${Date.now()}-3`,
          type: 'message',
          userId: 'example-user-3',
          userName: getRandomName(),
          userAvatar: '👩‍🦱',
          content: 'Salut ! Comment ça va ?',
          timestamp: getRandomTime(1),
          isRead: false
        });
      }
      
      if (data.dailyStats?.matchesCount > 0) {
        activities.push({
          id: `match-${Date.now()}-4`,
          type: 'match',
          userId: 'example-user-4',
          userName: getRandomName(),
          userAvatar: '👩‍🦰',
          timestamp: getRandomTime(6),
          isRead: true
        });
      }
      
      // Activité par défaut si aucune autre
      if (activities.length === 0) {
        activities.push({
          id: `default-${Date.now()}`,
          type: 'visit',
          userId: 'default-user',
          userName: 'Visiteur anonyme',
          userAvatar: '👤',
          timestamp: getRandomTime(12),
          isRead: true
        });
      }
      
    } catch (err) {
      console.error('❌ Erreur lors de la génération des activités:', err);
      // Activité de fallback en cas d'erreur
      activities.push({
        id: `fallback-${Date.now()}`,
        type: 'visit',
        userId: 'fallback-user',
        userName: 'Utilisateur',
        userAvatar: '👤',
        timestamp: now,
        isRead: true
      });
    }
    
    // Trier par timestamp décroissant (plus récent en premier)
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, []);

  // ✅ Fonction de fetch avec gestion complète des erreurs
  const fetchStats = useCallback(async (isRetry = false) => {
    // 🚨 VÉRIFICATIONS CRITIQUES AVANT TOUT APPEL
    console.log('🔍 Vérification conditions pour fetch stats:', {
      sessionStatus: status,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      isRetry
    });

    // Condition 1: Session pas encore chargée
    if (status === 'loading') {
      console.log('⏳ Session en cours de chargement, attente...');
      return;
    }
    
    // Condition 2: Utilisateur non authentifié
    if (status === 'unauthenticated') {
      console.log('🚫 Utilisateur non authentifié');
      setError('Non authentifié');
      setIsLoading(false);
      return;
    }
    
    // Condition 3: Session authentifiée mais pas d'userId
    if (status === 'authenticated' && !session?.user?.id) {
      console.log('⚠️ Session authentifiée mais userId manquant');
      setError('ID utilisateur manquant');
      setIsLoading(false);
      return;
    }
    
    // Condition 4: Tout est OK, on peut faire l'appel
    if (status !== 'authenticated' || !session?.user?.id) {
      console.log('⏸️ Conditions non remplies pour l\'appel API');
      return;
    }

    try {
      console.log('🚀 Lancement appel API stats pour:', session.user.id);
      
      // Annuler l'appel précédent s'il existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Nouveau contrôleur d'annulation
      abortControllerRef.current = new AbortController();
      
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${session.user.id}/stats`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Stats reçues avec succès:', data);
      
      // 📊 Mise à jour des stats avec structure flexible
      setStats({
        // Structure rétro-compatible (racine = stats du jour)
        profileViews: data.profileViews || 0,
        likesReceived: data.likesReceived || 0,
        matchesCount: data.matchesCount || 0,
        messagesReceived: data.messagesReceived || 0,
        
        // Stats du jour (explicites)
        dailyStats: data.dailyStats || {
          profileViews: data.profileViews || 0,
          likesReceived: data.likesReceived || 0,
          matchesCount: data.matchesCount || 0,
          messagesReceived: data.messagesReceived || 0
        },
        
        // Stats totales (nouvelles)
        ...(data.totalStats && { totalStats: data.totalStats })
      });
      
      // 📈 Génération de l'activité récente sécurisée
      const safeActivities = generateSafeActivities(data);
      console.log('📋 Activités générées:', safeActivities);
      
      setRecentActivity(safeActivities);
      setLastUpdated(new Date());
      
      // Marquer le premier chargement comme terminé
      if (isFirstLoadRef.current) {
        console.log('✅ Premier chargement des stats terminé avec succès');
        isFirstLoadRef.current = false;
      }
      
    } catch (err: any) {
      // Ignorer les erreurs d'annulation
      if (err.name === 'AbortError') {
        console.log('🛑 Appel API annulé');
        return;
      }
      
      console.error('❌ Erreur lors du chargement des stats:', err);
      setError(err.message || 'Erreur de chargement');
      
      // Retry automatique pour la première tentative
      if (isFirstLoadRef.current && !isRetry) {
        console.log('🔄 Tentative de retry automatique...');
        setTimeout(() => fetchStats(true), 2000);
      }
      
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, status, generateSafeActivities]);

  // 🚀 Effect principal : Déclenchement initial
  useEffect(() => {
    console.log('🔄 Effect principal - Vérification conditions:', {
      sessionStatus: status,
      hasUserId: !!session?.user?.id,
      isFirstLoad: isFirstLoadRef.current
    });

    // ✅ Conditions parfaites pour lancer l'appel
    if (status === 'authenticated' && session?.user?.id) {
      console.log('✅ Toutes les conditions remplies, lancement des stats');
      fetchStats();
    } else {
      console.log('⏳ Conditions pas encore remplies, attente...');
    }
  }, [fetchStats, status, session?.user?.id]);

  // ⏰ Effect pour l'intervalle de refresh
  useEffect(() => {
    // Ne démarrer l'intervalle que si tout est prêt et premier chargement fait
    if (status !== 'authenticated' || !session?.user?.id || isFirstLoadRef.current) {
      return;
    }

    console.log(`⏰ Démarrage intervalle refresh (${refreshInterval}ms)`);
    
    const interval = setInterval(() => {
      console.log('🔄 Refresh automatique des stats');
      fetchStats();
    }, refreshInterval);

    return () => {
      console.log('🛑 Nettoyage intervalle refresh');
      clearInterval(interval);
    };
  }, [fetchStats, refreshInterval, status, session?.user?.id]);

  // 🧹 Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 🔄 Fonction de refresh manuel
  const refreshStats = useCallback(() => {
    console.log('🔄 Refresh manuel des stats déclenché');
    fetchStats();
  }, [fetchStats]);

  // 📊 Log de debug pour le développement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 État actuel useRealTimeStats:', {
        sessionStatus: status,
        userId: session?.user?.id,
        isLoading,
        error,
        hasStats: !!stats.profileViews || !!stats.likesReceived,
        lastUpdated: lastUpdated?.toLocaleTimeString(),
        isFirstLoad: isFirstLoadRef.current,
        activitiesCount: recentActivity.length
      });
    }
  }, [status, session?.user?.id, isLoading, error, stats, lastUpdated, recentActivity.length]);

  return {
    stats,
    recentActivity,
    isLoading,
    error,
    refreshStats,
    lastUpdated,
    // 🆕 Informations de debug utiles
    sessionStatus: status,
    isSessionReady: status === 'authenticated' && !!session?.user?.id
  };
};