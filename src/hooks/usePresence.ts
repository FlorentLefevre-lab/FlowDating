// =====================================================
// src/hooks/usePresence.ts - Gestion du statut en ligne
// =====================================================
import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UsePresenceOptions {
  heartbeatInterval?: number; // Intervalle en ms (défaut: 30s)
  offlineTimeout?: number;    // Délai avant marquage offline en ms (défaut: 60s)
  enabled?: boolean;          // Activer/désactiver (défaut: true)
}

/**
 * Hook pour gérer la présence utilisateur (online/offline)
 * - Envoie des heartbeats périodiques pour maintenir le statut "en ligne"
 * - Marque l'utilisateur comme "hors ligne" quand il quitte la page
 * - Met à jour lastSeen régulièrement
 */
export function usePresence(options: UsePresenceOptions = {}) {
  const {
    heartbeatInterval = 30000, // 30 secondes
    offlineTimeout = 60000,    // 1 minute
    enabled = true
  } = options;

  const { data: session, status } = useSession();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isOnlineRef = useRef<boolean>(false);

  // Envoyer un heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    try {
      const response = await fetch('/api/user/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // keepalive permet d'envoyer la requête même si la page se ferme
        keepalive: true
      });

      if (response.ok) {
        isOnlineRef.current = true;
        console.log('💚 [Presence] Heartbeat envoyé');
      }
    } catch (error) {
      console.warn('⚠️ [Presence] Erreur heartbeat:', error);
    }
  }, [session?.user?.id, status]);

  // Marquer comme hors ligne
  const markOffline = useCallback(async () => {
    if (!isOnlineRef.current) return;

    try {
      await fetch('/api/user/status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true
      });
      isOnlineRef.current = false;
      console.log('🔴 [Presence] Marqué hors ligne');
    } catch (error) {
      console.warn('⚠️ [Presence] Erreur marquage offline:', error);
    }
  }, []);

  // Marquer comme en ligne
  const markOnline = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) return;

    try {
      await fetch('/api/user/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: true, status: 'online' })
      });
      isOnlineRef.current = true;
      console.log('🟢 [Presence] Marqué en ligne');
    } catch (error) {
      console.warn('⚠️ [Presence] Erreur marquage online:', error);
    }
  }, [session?.user?.id, status]);

  // Démarrer les heartbeats
  useEffect(() => {
    if (!enabled || status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    // Marquer en ligne immédiatement
    markOnline();

    // Démarrer les heartbeats périodiques
    heartbeatRef.current = setInterval(sendHeartbeat, heartbeatInterval);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [enabled, status, session?.user?.id, heartbeatInterval, markOnline, sendHeartbeat]);

  // Gérer la visibilité de la page
  useEffect(() => {
    if (!enabled || status !== 'authenticated') return;

    let hiddenTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page cachée - démarrer un timer pour marquer offline après un délai
        hiddenTimeout = setTimeout(() => {
          markOffline();
        }, offlineTimeout);
      } else {
        // Page visible - annuler le timer et marquer en ligne
        if (hiddenTimeout) {
          clearTimeout(hiddenTimeout);
          hiddenTimeout = null;
        }
        markOnline();
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hiddenTimeout) {
        clearTimeout(hiddenTimeout);
      }
    };
  }, [enabled, status, offlineTimeout, markOffline, markOnline, sendHeartbeat]);

  // Gérer la fermeture de la page
  useEffect(() => {
    if (!enabled || status !== 'authenticated') return;

    const handleBeforeUnload = () => {
      // Utiliser sendBeacon pour envoyer la requête même si la page se ferme
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/user/status/offline', JSON.stringify({ offline: true }));
      } else {
        // Fallback avec fetch keepalive
        markOffline();
      }
    };

    const handlePageHide = () => {
      // Pour les appareils mobiles qui utilisent pagehide au lieu de beforeunload
      handleBeforeUnload();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, status, markOffline]);

  // Détecter l'activité utilisateur
  useEffect(() => {
    if (!enabled || status !== 'authenticated') return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Écouter les événements d'activité
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [enabled, status]);

  return {
    isOnline: isOnlineRef.current,
    markOnline,
    markOffline,
    sendHeartbeat
  };
}
