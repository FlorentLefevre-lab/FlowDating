// ===========================================
// ÉTAPE 11: Hook useChat
// FICHIER: src/hooks/useChat.ts
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import io, { Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  matchId: string;
  createdAt: string;
  readAt?: string;
  sender: {
    id: string;
    name: string;
    image?: string;
  };
}

interface MatchConversation {
  id: string;
  users: Array<{
    id: string;
    name: string;
    image?: string;
  }>;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
}

export const useChat = () => {
  const [matches, setMatches] = useState<MatchConversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const { data: session } = useSession();

  // Initialiser Socket.io
  useEffect(() => {
    if (!session?.user?.id) return;

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        userId: session.user.id,
        token: session.accessToken
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [session]);

  // Charger les matches
  const loadMatches = useCallback(async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/matches');
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches);
      } else {
        setError('Erreur lors du chargement des matches');
      }
    } catch (error) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Charger les messages d'un match
  const loadMessages = useCallback(async (matchId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/messages?matchId=${matchId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      } else {
        setError('Erreur lors du chargement des messages');
      }
    } catch (error) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  // Envoyer un message
  const sendMessage = useCallback(async (content: string, matchId: string, receiverId: string) => {
    if (!socket || !session?.user?.id) return;

    const messageData = {
      content,
      matchId,
      receiverId,
      senderId: session.user.id
    };

    try {
      // Envoyer via Socket.io
      socket.emit('message:send', messageData);

      // Aussi via API
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

    } catch (error) {
      setError('Erreur lors de l\'envoi du message');
    }
  }, [socket, session?.user?.id]);

  // Marquer un message comme lu
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH'
      });

      socket?.emit('message:read', messageId);
    } catch (error) {
      setError('Erreur lors du marquage comme lu');
    }
  }, [socket]);

  // Charger les matches au montage
  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return {
    matches,
    messages,
    loading,
    error,
    socket,
    loadMatches,
    loadMessages,
    sendMessage,
    markAsRead
  };
};