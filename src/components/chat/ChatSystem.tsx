"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, Video, MoreVertical, ArrowLeft, Image, Paperclip, Smile, Heart, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMatches } from '@/hooks/useMatches';
import io, { Socket } from 'socket.io-client';

// Types adaptés à votre schéma Prisma existant
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
  id: string; // Match ID
  users: Array<{
    id: string;
    name: string;
    image?: string;
    isOnline?: boolean;
    lastSeen?: string;
  }>;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  messages?: Message[];
}

interface ChatSystemProps {
  initialMatches?: MatchConversation[];
  selectedMatchId?: string;
}

const ChatSystem: React.FC<ChatSystemProps> = ({ 
  initialMatches = [], 
  selectedMatchId 
}) => {
  // État principal
  const [matches, setMatches] = useState<MatchConversation[]>(initialMatches);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(selectedMatchId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hooks
  const { user } = useAuth();

  // Configuration Socket.io
  useEffect(() => {
    if (!user?.id) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        userId: user.id,
        token: user.token
      }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connecté au serveur de chat');
      socket.emit('user:online', user.id);
    });

    socket.on('message:new', handleNewMessage);
    socket.on('message:read', handleMessageRead);
    socket.on('user:typing', handleUserTyping);
    socket.on('user:stop-typing', handleUserStopTyping);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.emit('user:offline', user.id);
      socket.disconnect();
    };
  }, [user?.id]);

  // Charger les matches avec messages
  useEffect(() => {
    if (user?.id) {
      loadMatches();
    }
  }, [user?.id]);

  // Handlers Socket.io
  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    
    // Mettre à jour le match
    setMatches(prev => prev.map(match => {
      if (match.id === message.matchId) {
        return {
          ...match,
          lastMessage: message,
          unreadCount: message.senderId !== user?.id ? match.unreadCount + 1 : match.unreadCount
        };
      }
      return match;
    }));

    // Marquer comme lu si c'est notre conversation active
    if (selectedMatch === message.matchId && message.senderId !== user?.id) {
      markMessageAsRead(message.id);
    }
  }, [selectedMatch, user?.id]);

  const handleMessageRead = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, readAt: new Date().toISOString() } : msg
    ));
  }, []);

  const handleUserTyping = useCallback((userId: string) => {
    setTypingUsers(prev => [...prev.filter(id => id !== userId), userId]);
  }, []);

  const handleUserStopTyping = useCallback((userId: string) => {
    setTypingUsers(prev => prev.filter(id => id !== userId));
  }, []);

  const handleUserOnline = useCallback((userId: string) => {
    setOnlineUsers(prev => [...prev.filter(id => id !== userId), userId]);
  }, []);

  const handleUserOffline = useCallback((userId: string) => {
    setOnlineUsers(prev => prev.filter(id => id !== userId));
  }, []);

  // Charger les matches de l'utilisateur
  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/matches', {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des matches:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  // Chargement des messages d'un match
  const loadMatchMessages = useCallback(async (matchId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages?matchId=${matchId}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Marquer tous les messages non lus comme lus
        const unreadMessages = data.messages.filter((msg: Message) => 
          !msg.readAt && msg.senderId !== user?.id
        );
        
        unreadMessages.forEach((msg: Message) => {
          markMessageAsRead(msg.id);
        });
        
        // Rejoindre la room du match
        socketRef.current?.emit('match:join', matchId);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.token, user?.id]);

  // Sélection d'un match
  const selectMatch = useCallback((matchId: string) => {
    if (selectedMatch) {
      socketRef.current?.emit('match:leave', selectedMatch);
    }
    
    setSelectedMatch(matchId);
    loadMatchMessages(matchId);
    
    // Réinitialiser le compteur de messages non lus
    setMatches(prev => prev.map(match => 
      match.id === matchId ? { ...match, unreadCount: 0 } : match
    ));
  }, [selectedMatch, loadMatchMessages]);

  // Envoi d'un message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedMatch || !user?.id) return;

    const currentMatch = matches.find(m => m.id === selectedMatch);
    if (!currentMatch) return;

    const receiverId = currentMatch.users.find(u => u.id !== user.id)?.id;
    if (!receiverId) return;

    const messageData = {
      content: newMessage.trim(),
      matchId: selectedMatch,
      senderId: user.id,
      receiverId
    };

    try {
      // Envoyer via Socket.io pour la rapidité
      socketRef.current?.emit('message:send', messageData);
      
      // Aussi envoyer via API pour la persistance
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  }, [newMessage, selectedMatch, user, matches]);

  // Marquer un message comme lu
  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      
      socketRef.current?.emit('message:read', messageId);
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  }, [user?.token]);

  // Gestion de la frappe
  const handleTyping = useCallback(() => {
    if (!selectedMatch || !user?.id) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('typing:start', { matchId: selectedMatch, userId: user.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('typing:stop', { matchId: selectedMatch, userId: user.id });
    }, 1000);
  }, [selectedMatch, user?.id, isTyping]);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Composant de liste des matches
  const MatchesList = () => (
    <div className="w-full lg:w-1/3 bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Matches</h2>
        <p className="text-sm text-gray-500">{matches.length} conversation{matches.length > 1 ? 's' : ''}</p>
      </div>

      {/* Liste des matches */}
      <div className="overflow-y-auto h-full">
        {loading && matches.length === 0 ? (
          <div className="p-4 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucun match pour le moment</p>
            <p className="text-gray-400 text-sm">Continuez à swiper pour trouver des matchs !</p>
          </div>
        ) : (
          matches.map(match => {
            const otherUser = match.users.find(u => u.id !== user?.id);
            const isOnline = onlineUsers.includes(otherUser?.id || '');
            
            return (
              <div
                key={match.id}
                onClick={() => selectMatch(match.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedMatch === match.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar avec indicateur en ligne */}
                  <div className="relative">
                    <img
                      src={otherUser?.image || '/placeholder-avatar.jpg'}
                      alt={otherUser?.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {otherUser?.name || 'Utilisateur'}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {match.lastMessage && formatTime(match.lastMessage.createdAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">
                        {match.lastMessage?.content || 'Commencez la conversation...'}
                      </p>
                      {match.unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {match.unreadCount > 99 ? '99+' : match.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Composant de chat
  const ChatWindow = () => {
    if (!selectedMatch) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Sélectionnez un match</h3>
            <p className="text-gray-500">Choisissez un match pour commencer à chatter</p>
          </div>
        </div>
      );
    }

    const currentMatch = matches.find(m => m.id === selectedMatch);
    const otherUser = currentMatch?.users.find(u => u.id !== user?.id);
    const isOnline = onlineUsers.includes(otherUser?.id || '');

    return (
      <div className="flex-1 flex flex-col bg-white">
        {/* Header du chat */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setSelectedMatch(null)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="relative">
                <img
                  src={otherUser?.image || '/placeholder-avatar.jpg'}
                  alt={otherUser?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border border-white rounded-full" />
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">{otherUser?.name}</h3>
                <p className="text-sm text-gray-500">
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Phone className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Video className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-pink-300 mx-auto mb-4" />
              <p className="text-gray-500">C'est un nouveau match !</p>
              <p className="text-gray-400 text-sm">Envoyez le premier message pour briser la glace</p>
            </div>
          ) : (
            messages.map(message => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                isOwn={message.senderId === user?.id}
              />
            ))
          )}
          
          {/* Indicateur de frappe */}
          {typingUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="bg-gray-200 rounded-lg px-3 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Zone de saisie */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Image className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Tapez votre message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500"
                maxLength={1000}
              />
            </div>
            
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Smile className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Composant de bulle de message
  const MessageBubble: React.FC<{ message: Message; isOwn: boolean }> = ({ message, isOwn }) => (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwn 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 text-gray-900'
      }`}>
        <p className="text-sm">{message.content}</p>
        <div className={`flex items-center justify-end mt-1 space-x-1 ${
          isOwn ? 'text-blue-100' : 'text-gray-500'
        }`}>
          <span className="text-xs">{formatTime(message.createdAt)}</span>
          {isOwn && (
            <div className="flex">
              {message.readAt ? (
                <CheckCheck className="w-3 h-3 text-blue-300" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Fonction utilitaire pour formater l'heure
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Vue mobile : matches OU chat */}
      <div className="lg:hidden w-full">
        {selectedMatch ? <ChatWindow /> : <MatchesList />}
      </div>
      
      {/* Vue desktop : matches ET chat */}
      <div className="hidden lg:flex w-full">
        <MatchesList />
        <ChatWindow />
      </div>
    </div>
  );
};

export default ChatSystem;