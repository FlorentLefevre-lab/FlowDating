// src/hooks/useDatingChat.ts
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { StreamChat, Channel } from 'stream-chat';

interface Match {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  matchedAt: Date;
  channelId?: string;
}

interface UseDatingChatReturn {
  // État
  isConnected: boolean;
  matches: Match[];
  activeChannels: Channel[];
  unreadCount: number;
  
  // Actions
  createConversationWithMatch: (matchId: string) => Promise<Channel | null>;
  getOrCreateChannel: (otherUserId: string) => Promise<Channel | null>;
  markChannelAsRead: (channelId: string) => Promise<void>;
  getUnreadMessagesCount: () => number;
  
  // État de chargement
  loading: boolean;
  error: string | null;
}

export function useDatingChat(client: StreamChat | null): UseDatingChatReturn {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeChannels, setActiveChannels] = useState<Channel[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surveiller l'état de connexion
  useEffect(() => {
    if (!client) {
      setIsConnected(false);
      return;
    }

    const handleConnection = () => setIsConnected(true);
    const handleDisconnection = () => setIsConnected(false);

    client.on('connection.changed', (event) => {
      setIsConnected(event.online);
    });

    // Vérifier l'état initial
    setIsConnected(client.wsConnection?.isConnecting === false);

    return () => {
      client.off('connection.changed', handleConnection);
      client.off('connection.changed', handleDisconnection);
    };
  }, [client]);

  // Charger les matches depuis votre API
  const loadMatches = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const response = await fetch('/api/matches', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const matchesData = await response.json();
        setMatches(matchesData);
      }
    } catch (err) {
      console.error('Erreur chargement matches:', err);
      setError('Impossible de charger les matches');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Charger les channels actifs
  const loadActiveChannels = useCallback(async () => {
    if (!client || !session?.user?.id) return;

    try {
      const channels = await client.queryChannels(
        {
          type: 'messaging',
          members: { $in: [session.user.id] }
        },
        { last_message_at: -1 },
        { state: true, presence: true, limit: 20 }
      );

      setActiveChannels(channels);
      
      // Calculer le nombre de messages non lus
      const totalUnread = channels.reduce((total, channel) => {
        return total + (channel.countUnread() || 0);
      }, 0);
      
      setUnreadCount(totalUnread);

    } catch (err) {
      console.error('Erreur chargement channels:', err);
      setError('Impossible de charger les conversations');
    }
  }, [client, session?.user?.id]);

  // Créer une conversation avec un match
  const createConversationWithMatch = useCallback(async (matchId: string): Promise<Channel | null> => {
    if (!client || !session?.user?.id) return null;

    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) throw new Error('Match introuvable');

      const channelId = `match-${session.user.id}-${match.userId}`;
      
      const channel = client.channel('messaging', channelId, {
        members: [session.user.id, match.userId],
        name: `${session.user.name} & ${match.userName}`,
        match_id: matchId,
        created_by_match: true
      });

      await channel.create();
      
      // Mettre à jour le match avec l'ID du channel
      setMatches(prev => prev.map(m => 
        m.id === matchId ? { ...m, channelId: channel.id } : m
      ));

      return channel;
      
    } catch (err) {
      console.error('Erreur création conversation:', err);
      setError('Impossible de créer la conversation');
      return null;
    }
  }, [client, session?.user?.id, matches]);

  // Obtenir ou créer un channel avec un utilisateur
  const getOrCreateChannel = useCallback(async (otherUserId: string): Promise<Channel | null> => {
    if (!client || !session?.user?.id) return null;

    try {
      // Vérifier si un channel existe déjà
      const existingChannels = await client.queryChannels(
        {
          type: 'messaging',
          members: { $eq: [session.user.id, otherUserId] }
        }
      );

      if (existingChannels.length > 0) {
        return existingChannels[0];
      }

      // Créer un nouveau channel
      const channelId = `private-${[session.user.id, otherUserId].sort().join('-')}`;
      
      const channel = client.channel('messaging', channelId, {
        members: [session.user.id, otherUserId]
      });

      await channel.create();
      return channel;

    } catch (err) {
      console.error('Erreur get/create channel:', err);
      setError('Impossible d\'accéder à la conversation');
      return null;
    }
  }, [client, session?.user?.id]);

  // Marquer un channel comme lu
  const markChannelAsRead = useCallback(async (channelId: string) => {
    if (!client) return;

    try {
      const channel = client.channel('messaging', channelId);
      await channel.markRead();
      
      // Recalculer le nombre non lu
      loadActiveChannels();
      
    } catch (err) {
      console.error('Erreur mark as read:', err);
    }
  }, [client, loadActiveChannels]);

  // Obtenir le nombre total de messages non lus
  const getUnreadMessagesCount = useCallback(() => {
    return activeChannels.reduce((total, channel) => {
      return total + (channel.countUnread() || 0);
    }, 0);
  }, [activeChannels]);

  // Charger les données au montage
  useEffect(() => {
    if (isConnected && session?.user?.id) {
      loadMatches();
      loadActiveChannels();
    }
  }, [isConnected, session?.user?.id, loadMatches, loadActiveChannels]);

  // Écouter les nouveaux messages pour mettre à jour le compteur
  useEffect(() => {
    if (!client) return;

    const handleNewMessage = () => {
      loadActiveChannels();
    };

    client.on('message.new', handleNewMessage);
    client.on('message.read', handleNewMessage);

    return () => {
      client.off('message.new', handleNewMessage);
      client.off('message.read', handleNewMessage);
    };
  }, [client, loadActiveChannels]);

  return {
    isConnected,
    matches,
    activeChannels,
    unreadCount,
    createConversationWithMatch,
    getOrCreateChannel,
    markChannelAsRead,
    getUnreadMessagesCount,
    loading,
    error
  };
}