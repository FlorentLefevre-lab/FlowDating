// src/hooks/useChat.ts - VERSION CORRIGÉE
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/providers/SocketProvider';

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  status?: 'pending' | 'sent' | 'delivered' | 'queued' | 'failed';
}

interface UseChatProps {
  conversationId: string;
  currentUserId: string;
  targetUserId: string;
}

export function useChat({ conversationId, currentUserId, targetUserId }: UseChatProps) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger l'historique
  const loadHistory = useCallback(() => {
    if (!socket || !isConnected) return;

    console.log('📚 Chargement historique conversation:', conversationId);
    
    socket.emit('conversation:history', {
      conversationId,
      targetUserId, // ✅ IMPORTANT : Ajouter targetUserId
      limit: 50
    });
  }, [socket, isConnected, conversationId, targetUserId]);

  // Envoyer un message
  const sendMessage = useCallback(async (content: string) => {
    if (!socket || !isConnected || !content.trim()) {
      throw new Error('Socket non connecté ou message vide');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tempMessage: Message = {
      id: messageId,
      content: content.trim(),
      senderId: currentUserId,
      timestamp: new Date(),
      status: 'pending'
    };

    // Ajouter immédiatement le message à l'interface
    setMessages(prev => [...prev, tempMessage]);

    // Envoyer via Socket.IO
    socket.emit('message:send', {
      id: messageId,
      conversationId,
      content: content.trim(),
      to: targetUserId,
      from: currentUserId,
      timestamp: new Date().toISOString()
    });

    return messageId;
  }, [socket, isConnected, conversationId, currentUserId, targetUserId]);

  // Gérer les événements Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleConversationHistory = (data: any) => {
      console.log('📚 Historique reçu:', data);
      setLoading(false);
      setError(null);
      
      if (data.messages) {
        const historyMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.from,
          timestamp: new Date(msg.timestamp),
          status: 'delivered'
        }));
        setMessages(historyMessages);
      }
    };

    const handleMessageReceived = (data: any) => {
      console.log('📥 Message reçu:', data);
      
      if (data.conversationId === conversationId) {
        const newMessage: Message = {
          id: data.id,
          content: data.content,
          senderId: data.from,
          timestamp: new Date(data.timestamp),
          status: 'delivered'
        };
        setMessages(prev => [...prev, newMessage]);
      }
    };

    const handleMessageSent = (data: any) => {
      console.log('✅ Message envoyé:', data);
      
      // Mettre à jour le statut du message
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: data.status }
          : msg
      ));
    };

    const handleConversationError = (data: any) => {
      console.error('❌ Erreur conversation:', data);
      setError(data.error);
      setLoading(false);
    };

    // Écouter les événements
    socket.on('conversation:history', handleConversationHistory);
    socket.on('message:received', handleMessageReceived);
    socket.on('message:sent', handleMessageSent);
    socket.on('conversation:error', handleConversationError);

    // Charger l'historique
    loadHistory();

    // Cleanup
    return () => {
      socket.off('conversation:history', handleConversationHistory);
      socket.off('message:received', handleMessageReceived);
      socket.off('message:sent', handleMessageSent);
      socket.off('conversation:error', handleConversationError);
    };
  }, [socket, conversationId, loadHistory]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    isConnected
  };
}