// src/hooks/useChat.ts - Hook corrigé pour les sessions multiples
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

// Types mis à jour
interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  online?: boolean;
  sessions?: number;
  connectedAt?: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  conversationId: string;
  type?: string;
  sender?: User;
}

interface Conversation {
  id: string;
  with: User;
  lastMessage?: Message;
  lastActivity: string;
  messageCount: number;
  unreadCount: number;
}

// États de connexion plus précis avec sessions multiples
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error' | 'multiple_sessions';
type AuthenticationStatus = 'idle' | 'authenticating' | 'authenticated' | 'failed';

interface ChatStats {
  onlineUsersCount: number;
  conversationsCount: number;
  totalMessages: number;
  connectionDuration?: number;
  sessionId?: string;
  multipleSessionsDetected?: boolean;
}

interface ChatError {
  type: 'connection' | 'authentication' | 'message' | 'general' | 'session';
  message: string;
  details?: any;
  timestamp: Date;
  isRecoverable?: boolean;
}

export const useChat = () => {
  const { data: session, status } = useSession();
  
  // États de connexion détaillés
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>('idle');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastError, setLastError] = useState<ChatError | null>(null);
  
  // États de session multiples
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [multipleSessionsDetected, setMultipleSessionsDetected] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);
  
  // Données du chat
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<ChatStats>({
    onlineUsersCount: 0,
    conversationsCount: 0,
    totalMessages: 0
  });
  
  // Refs pour la gestion de la connexion
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttempts = useRef(0);
  const maxReconnectAttempts = 3; // Réduit pour éviter les boucles
  const isManualDisconnect = useRef(false);
  const lastConnectionAttempt = useRef(0);
  const connectionCooldown = 5000; // 5 secondes entre les tentatives

  // Configuration
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  // 🔧 GESTION D'ERREUR INTELLIGENTE
  const handleError = useCallback((type: ChatError['type'], message: string, details?: any, isRecoverable = true) => {
    const error: ChatError = {
      type,
      message,
      details,
      timestamp: new Date(),
      isRecoverable
    };
    
    setLastError(error);
    console.error(`❌ Erreur Chat [${type}]:`, message, details);
    
    // Auto-clear des erreurs récupérables
    if (isRecoverable) {
      setTimeout(() => {
        setLastError(prev => prev?.timestamp === error.timestamp ? null : prev);
      }, 8000);
    }
  }, []);

  // 🔧 RÉCUPÉRATION UTILISATEUR ACTUEL SÉCURISÉE
  const getCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      if (!session?.user?.email) {
        throw new Error('Session invalide ou manquante');
      }

      console.log('🔍 Récupération utilisateur actuel...');
      
      const response = await fetch('/api/user/current');
      if (!response.ok) {
        throw new Error(`Erreur API ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue de l\'API utilisateur');
      }

      const user: User = {
        id: data.user.id,
        name: data.user.name || session.user.name,
        email: data.user.email,
        image: data.user.image || session.user.image
      };

      console.log('✅ Utilisateur récupéré:', {
        id: user.id,
        email: user.email,
        name: user.name
      });

      setCurrentUser(user);
      return user;

    } catch (error: any) {
      handleError('authentication', `Erreur récupération utilisateur: ${error.message}`, error, false);
      return null;
    }
  }, [session, handleError]);

  // 🔧 CONNEXION SOCKET ROBUSTE AVEC RETRY ET GESTION SESSIONS MULTIPLES
  const connectSocket = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.email) {
      console.log('⏳ Attente authentification session...');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('✅ Socket déjà connecté');
      return;
    }

    // Vérifier le cooldown
    const now = Date.now();
    if (now - lastConnectionAttempt.current < connectionCooldown) {
      console.log('⏳ Cooldown actif, attente...');
      return;
    }

    if (connectionAttempts.current >= maxReconnectAttempts) {
      handleError('connection', 'Nombre maximum de tentatives de reconnexion atteint', null, false);
      return;
    }

    try {
      setConnectionStatus('connecting');
      setAuthStatus('idle');
      connectionAttempts.current++;
      lastConnectionAttempt.current = now;

      console.log(`🔌 Tentative de connexion ${connectionAttempts.current}/${maxReconnectAttempts}...`);

      // 1. Récupérer l'utilisateur en premier
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Impossible de récupérer les données utilisateur');
      }

      // 2. Créer la connexion socket
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 15000,
        forceNew: true,
        autoConnect: true,
        reconnection: false // On gère nous-mêmes la reconnexion
      });

      // 🔧 ÉVÉNEMENTS DE CONNEXION
      socket.on('connect', () => {
        console.log('✅ Socket connecté:', socket.id);
        setConnectionStatus('connected');
        setLastError(null);
        connectionAttempts.current = 0; // Reset counter sur succès
        
        // Authentifier immédiatement
        setAuthStatus('authenticating');
        const authData = {
          userId: user.id,
          userName: user.name || user.email?.split('@')[0],
          avatar: user.image || null
        };
        
        console.log('🔐 Envoi authentification...', { userId: authData.userId });
        socket.emit('authenticate', authData);
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket déconnecté:', reason);
        setConnectionStatus('disconnected');
        setAuthStatus('idle');
        setSessionId(null);
        
        // Reconnexion automatique si pas manuel
        if (!isManualDisconnect.current && 
            reason !== 'io client disconnect' && 
            connectionAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Erreur connexion Socket:', error);
        setConnectionStatus('error');
        handleError('connection', `Erreur connexion: ${error.message}`, error);
        scheduleReconnect();
      });

      // 🔧 ÉVÉNEMENTS D'AUTHENTIFICATION
      socket.on('authenticated', (data) => {
        console.log('✅ Authentification réussie:', data);
        setAuthStatus('authenticated');
        setConnectionStatus('authenticated');
        setSessionId(data.sessionId);
        setCurrentUser(prev => ({ ...prev, ...data }));
        
        // Récupérer les données initiales
        socket.emit('get_conversations');
        socket.emit('get_online_users');
        
        // Démarrer le heartbeat
        startHeartbeat(socket);
        
        // Mettre à jour les stats
        setStats(prev => ({
          ...prev,
          sessionId: data.sessionId,
          multipleSessionsDetected: false
        }));
      });

      socket.on('auth_error', (error) => {
        console.error('❌ Erreur authentification:', error);
        setAuthStatus('failed');
        setConnectionStatus('error');
        handleError('authentication', error.message, error, false);
      });

      // 🔧 GESTION INTELLIGENTE DES SESSIONS MULTIPLES
      socket.on('new_session_detected', (data) => {
        console.log('🔔 Nouvelle session détectée:', data);
        setMultipleSessionsDetected(true);
        setSessionCount(data.sessionCount || 1);
        setConnectionStatus('multiple_sessions');
        
        handleError('session', 
          `Nouvelle session détectée (${data.sessionCount} sessions actives)`, 
          data, 
          true
        );
        
        setStats(prev => ({
          ...prev,
          multipleSessionsDetected: true
        }));
      });

      socket.on('session_expired', (data) => {
        console.log('⏰ Session expirée:', data.message);
        handleError('session', 'Session expirée due à l\'inactivité', data, true);
        
        // Cette session a été fermée, ne pas se reconnecter automatiquement
        isManualDisconnect.current = true;
        setConnectionStatus('disconnected');
      });

      // Compatibilité avec l'ancien format (à supprimer après migration)
      socket.on('session_replaced', (data) => {
        console.log('⚠️ Session remplacée (ancien format):', data.message);
        handleError('session', 'Nouvelle connexion détectée ailleurs', data, true);
        
        // Ne plus forcer la déconnexion, juste notifier
        setMultipleSessionsDetected(true);
        setConnectionStatus('multiple_sessions');
      });

      // 🔧 ÉVÉNEMENTS DE CONVERSATION
      socket.on('conversation_started', (data) => {
        console.log('✅ Conversation démarrée:', data.conversationId);
        setActiveConversation(data.conversationId);
        
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            const newMessages = new Map(prev);
            newMessages.set(data.conversationId, data.messages);
            return newMessages;
          });
        }
      });

      socket.on('conversation_ready', (data) => {
        console.log('✅ Conversation prête:', data.conversationId);
        setActiveConversation(data.conversationId);
        
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            const newMessages = new Map(prev);
            newMessages.set(data.conversationId, data.messages);
            return newMessages;
          });
        }
      });

      // 🔧 ÉVÉNEMENTS DE MESSAGES AVEC DÉDUPLICATION
      socket.on('new_message', (data) => {
        console.log('📨 Nouveau message reçu:', data.message?.id);
        
        const { message, conversationId } = data;
        
        setMessages(prev => {
          const newMessages = new Map(prev);
          const existing = newMessages.get(conversationId) || [];
          
          // Vérifier si le message n'existe pas déjà (éviter les doublons)
          if (!existing.some(m => m.id === message.id)) {
            newMessages.set(conversationId, [...existing, message]);
            
            // Mettre à jour les stats seulement pour les nouveaux messages
            setStats(prevStats => ({
              ...prevStats,
              totalMessages: prevStats.totalMessages + 1
            }));
          }
          
          return newMessages;
        });
      });

      socket.on('message_sent', (data) => {
        console.log('✅ Message envoyé confirmé:', data.message?.id);
        
        const { message, conversationId } = data;
        
        setMessages(prev => {
          const newMessages = new Map(prev);
          const existing = newMessages.get(conversationId) || [];
          
          // Vérifier si le message n'existe pas déjà
          if (!existing.some(m => m.id === message.id)) {
            newMessages.set(conversationId, [...existing, message]);
          }
          
          return newMessages;
        });
      });

      // 🔧 ÉVÉNEMENTS D'UTILISATEURS AVEC INFO SESSIONS
      socket.on('online_users', (users) => {
        console.log('👥 Utilisateurs en ligne mis à jour:', users.length);
        setOnlineUsers(users);
        setStats(prev => ({ ...prev, onlineUsersCount: users.length }));
      });

      socket.on('user_online', (user) => {
        console.log('✅ Utilisateur connecté:', user.id);
        setOnlineUsers(prev => {
          const filtered = prev.filter(u => u.id !== user.id);
          return [...filtered, { ...user, online: true }];
        });
      });

      socket.on('user_offline', (data) => {
        console.log('❌ Utilisateur déconnecté:', data.userId);
        setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
      });

      // 🔧 ÉVÉNEMENTS DE CONVERSATIONS
      socket.on('conversations_list', (data) => {
        console.log('📋 Liste conversations reçue:', data.count || data.conversations?.length);
        if (data.conversations) {
          setConversations(data.conversations);
          setStats(prev => ({ 
            ...prev, 
            conversationsCount: data.conversations.length 
          }));
        }
      });

      // 🔧 GESTION DU HEARTBEAT
      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('server_ping', () => {
        socket.emit('server_pong');
      });

      // 🔧 ÉVÉNEMENTS D'ERREUR
      socket.on('error', (error) => {
        console.error('❌ Erreur serveur:', error);
        handleError('general', error.message || 'Erreur inconnue du serveur', error);
      });

      socket.on('server_shutdown', (data) => {
        console.log('🛑 Arrêt serveur:', data.message);
        handleError('connection', 'Serveur en cours d\'arrêt', data, false);
        setConnectionStatus('disconnected');
        isManualDisconnect.current = true; // Empêcher la reconnexion
      });

      socketRef.current = socket;

    } catch (error: any) {
      console.error('❌ Erreur lors de la connexion:', error);
      setConnectionStatus('error');
      handleError('connection', `Erreur création socket: ${error.message}`, error);
      scheduleReconnect();
    }
  }, [session, status, SOCKET_URL, getCurrentUser, handleError]);

  // 🔧 HEARTBEAT POUR MAINTENIR LA CONNEXION
  const startHeartbeat = useCallback((socket: Socket) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      } else {
        console.log('💔 Heartbeat: socket déconnecté');
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      }
    }, 30000); // Ping toutes les 30 secondes
  }, []);

  // 🔧 RECONNEXION AVEC BACKOFF EXPONENTIEL
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current || 
        isManualDisconnect.current || 
        connectionAttempts.current >= maxReconnectAttempts) {
      return;
    }
    
    const delay = Math.min(2000 * Math.pow(1.5, connectionAttempts.current), 15000);
    console.log(`🔄 Reconnexion programmée dans ${delay}ms... (tentative ${connectionAttempts.current + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectSocket();
    }, delay);
  }, [connectSocket]);

  // 🔧 DÉCONNEXION PROPRE
  const disconnect = useCallback(() => {
    console.log('🔌 Déconnexion manuelle...');
    isManualDisconnect.current = true;
    setMultipleSessionsDetected(false);
    setSessionCount(1);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setAuthStatus('idle');
    setCurrentUser(null);
    setSessionId(null);
    connectionAttempts.current = 0;
  }, []);

  // 🔧 CONNEXION AUTOMATIQUE AU MONTAGE AVEC DÉLAI
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      isManualDisconnect.current = false;
      
      // Petit délai pour éviter les connexions rapides multiples
      const timer = setTimeout(() => {
        connectSocket();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    return () => {
      isManualDisconnect.current = true;
      disconnect();
    };
  }, [session, status, connectSocket, disconnect]);

  // 🔧 ACTIONS DU CHAT
  const startConversation = useCallback((targetUserId: string) => {
    if (connectionStatus !== 'authenticated' && connectionStatus !== 'multiple_sessions') {
      handleError('message', 'Socket non connecté - impossible de démarrer la conversation');
      return;
    }

    if (!socketRef.current) {
      handleError('message', 'Socket non disponible');
      return;
    }

    console.log('💬 Démarrage conversation avec:', targetUserId);
    socketRef.current.emit('start_conversation', { targetUserId });
  }, [connectionStatus, handleError]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (connectionStatus !== 'authenticated' && connectionStatus !== 'multiple_sessions') {
      handleError('message', 'Socket non connecté - impossible d\'envoyer le message');
      return;
    }

    if (!socketRef.current) {
      handleError('message', 'Socket non disponible');
      return;
    }

    if (!content.trim()) {
      handleError('message', 'Message vide');
      return;
    }

    console.log('📤 Envoi message:', { conversationId, content: content.substring(0, 50) + '...' });
    socketRef.current.emit('send_message', {
      conversationId,
      content: content.trim(),
      type: 'text'
    });
  }, [connectionStatus, handleError]);

  const openConversation = useCallback((conversationId: string) => {
    console.log('📂 Ouverture conversation:', conversationId);
    setActiveConversation(conversationId);
  }, []);

  const closeConversation = useCallback(() => {
    console.log('📚 Fermeture conversation');
    setActiveConversation(null);
  }, []);

  const getActiveMessages = useCallback(() => {
    if (!activeConversation) return [];
    return messages.get(activeConversation) || [];
  }, [activeConversation, messages]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some(user => user.id === userId && user.online !== false);
  }, [onlineUsers]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const refreshData = useCallback(() => {
    if ((connectionStatus === 'authenticated' || connectionStatus === 'multiple_sessions') && socketRef.current) {
      console.log('🔄 Actualisation des données...');
      socketRef.current.emit('get_conversations');
      socketRef.current.emit('get_online_users');
    }
  }, [connectionStatus]);

  // 🔧 NOUVELLES FONCTIONS POUR GESTION DES SESSIONS MULTIPLES
  const acceptMultipleSessions = useCallback(() => {
    console.log('✅ Sessions multiples acceptées par l\'utilisateur');
    setMultipleSessionsDetected(false);
    if (connectionStatus === 'multiple_sessions') {
      setConnectionStatus('authenticated');
    }
    setLastError(null);
  }, [connectionStatus]);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Reconnexion forcée...');
    disconnect();
    connectionAttempts.current = 0;
    setTimeout(() => {
      isManualDisconnect.current = false;
      connectSocket();
    }, 1000);
  }, [disconnect, connectSocket]);

  // Calculer la durée de connexion
  useEffect(() => {
    if (connectionStatus === 'authenticated' || connectionStatus === 'multiple_sessions') {
      const startTime = Date.now();
      const interval = setInterval(() => {
        setStats(prev => ({
          ...prev,
          connectionDuration: Date.now() - startTime
        }));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [connectionStatus]);

  // Dérivés pour compatibilité
  const connected = connectionStatus === 'connected' || 
                   connectionStatus === 'authenticated' || 
                   connectionStatus === 'multiple_sessions';
  const authenticated = authStatus === 'authenticated';

  return {
    // États de connexion détaillés
    connectionStatus,
    authStatus,
    connected,
    authenticated,
    error: lastError,
    
    // États de session multiples
    sessionId,
    multipleSessionsDetected,
    sessionCount,
    
    // Utilisateur actuel
    currentUser,
    
    // Données du chat
    conversations,
    activeConversation,
    onlineUsers,
    stats,
    
    // Actions principales
    connectSocket,
    disconnect,
    forceReconnect,
    startConversation,
    sendMessage,
    openConversation,
    closeConversation,
    refreshData,
    
    // Gestion des sessions multiples
    acceptMultipleSessions,
    
    // Utilitaires
    getActiveMessages,
    isUserOnline,
    clearError,
    
    // Debug/monitoring
    socket: socketRef.current,
    connectionAttempts: connectionAttempts.current
  };
};