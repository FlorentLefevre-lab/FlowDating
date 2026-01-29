'use client';

import { usePresence } from '@/hooks/usePresence';
import { ReactNode } from 'react';

interface PresenceProviderProps {
  children: ReactNode;
  enabled?: boolean;
  heartbeatInterval?: number;
}

/**
 * Provider qui gère automatiquement la présence utilisateur
 * Met à jour isOnline et lastSeen dans la base de données
 */
export function PresenceProvider({
  children,
  enabled = true,
  heartbeatInterval = 30000 // 30 secondes par défaut
}: PresenceProviderProps) {
  // Le hook gère tout automatiquement
  usePresence({
    enabled,
    heartbeatInterval,
    offlineTimeout: 60000 // 1 minute avant d'être marqué offline
  });

  return <>{children}</>;
}
