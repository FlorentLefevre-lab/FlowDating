// src/components/chat/ChatSystem.tsx - Version CORRIGÉE pour Next.js
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneCall,
  PhoneIncoming,
  X,
  Maximize2,
  Minimize2,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Shield,
  Wifi,
  WifiOff
} from 'lucide-react';

interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
}

interface ChatSystemProps {
  currentUser: User;
  remoteUser: User;
  onClose?: () => void;
  socket?: any;
}

interface DebugLog {
  timestamp: Date;
  type: 'sent' | 'received' | 'auth' | 'error' | 'system' | 'conversation' | 'call' | 'warning' | 'success';
  message: string;
  data?: any;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  status?: 'pending' | 'sent' | 'delivered' | 'queued' | 'failed';
  isOfflineMessage?: boolean;
  conversationId?: string;
}

interface CallState {
  isActive: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  isVideoCall: boolean;
  callId: string | null;
  remoteUserName: string | null;
  remoteUserId: string | null; // ✅ Corrigé : pas optionnel
}

interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  isVideoCall: boolean;
  offer: RTCSessionDescriptionInit;
}

interface UserStatus {
  isOnline: boolean;
  lastSeen: Date | null;
  isConnecting: boolean;
}

export const ChatSystem: React.FC<ChatSystemProps> = ({
  currentUser,
  remoteUser,
  onClose,
  socket
}) => {
  // États du chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [conversationId, setConversationId] = useState<string>('');
  
  // États de connexion et statut
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userStatus, setUserStatus] = useState<UserStatus>({
    isOnline: false,
    lastSeen: null,
    isConnecting: false
  });
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [serverStats, setServerStats] = useState<any>(null);
  const [conversationEnsured, setConversationEnsured] = useState<boolean>(false);
  
  // États des appels vidéo
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    isIncoming: false,
    isOutgoing: false,
    isVideoCall: false,
    callId: null,
    remoteUserName: null,
    remoteUserId: null // ✅ Ajouté
  });
  
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  
  // Debug
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebug, setShowDebug] = useState<boolean>(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<number | null>(null);
  const cleanupRef = useRef<boolean>(false);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const isUnmountedRef = useRef<boolean>(false);

  // Configuration ICE servers
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Vérification des paramètres
  const hasRequiredParams = Boolean(currentUser?.id && remoteUser?.id);

  // Fonction de debug améliorée
  const addDebugLog = useCallback((type: DebugLog['type'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date(),
      type,
      message,
      data
    };
    
    const emoji = {
      sent: '📤',
      received: '📥',
      auth: '🔐',
      error: '❌',
      system: '⚙️',
      conversation: '💬',
      call: '📞',
      warning: '⚠️',
      success: '✅'
    };
    
    console.log(`${emoji[type]} [${type.toUpperCase()}] ${message}`, data || '');
    
    setDebugLogs(prev => [...prev.slice(-100), log]);
  }, []);

  // Fonction de vérification du statut utilisateur
  const checkUserStatus = useCallback(() => {
    if (socket?.connected) {
      addDebugLog('system', 'Vérification statut utilisateur distant');
      socket.emit('user:check', { targetUserId: remoteUser.id });
    }
  }, [socket, remoteUser.id, addDebugLog]);

  // Fonction pour s'assurer que la conversation existe
  const ensureConversation = useCallback(async () => {
    if (!socket?.connected || !conversationId || conversationEnsured) {
      return;
    }

    addDebugLog('conversation', 'S\'assurer que la conversation existe');
    
    try {
      socket.emit('conversation:ensure', {
        conversationId,
        targetUserId: remoteUser.id
      });
    } catch (error) {
      addDebugLog('error', 'Erreur lors de la vérification de conversation', error);
    }
  }, [socket, conversationId, remoteUser.id, conversationEnsured, addDebugLog]);

  // Fonction de reconnexion stabilisée
  const attemptReconnection = useCallback(() => {
    if (!socket || socket.connected || reconnectAttempts >= 5 || isUnmountedRef.current) {
      return;
    }

    addDebugLog('system', `Tentative de reconnexion ${reconnectAttempts + 1}/5`);
    setReconnectAttempts(prev => prev + 1);
    
    if (socket.connect) {
      socket.connect();
    }
    
    retryTimeoutRef.current = window.setTimeout(() => {
      if (!socket?.connected && !isUnmountedRef.current) {
        attemptReconnection();
      }
    }, Math.pow(2, reconnectAttempts) * 1000);
  }, [socket, reconnectAttempts, addDebugLog]);

  // Fonction heartbeat pour maintenir la connexion
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current || !socket?.connected) {
      return;
    }
    
    addDebugLog('system', 'Démarrage heartbeat');
    heartbeatIntervalRef.current = window.setInterval(() => {
      if (socket?.connected && !isUnmountedRef.current) {
        socket.emit('heartbeat');
      }
    }, 30000);
  }, [socket, addDebugLog]);

  // Arrêter le heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      addDebugLog('system', 'Heartbeat arrêté');
    }
  }, [addDebugLog]);

  // Fonction d'authentification
  const authenticate = useCallback(() => {
    if (!socket?.connected || isAuthenticated || isUnmountedRef.current) {
      return;
    }

    addDebugLog('auth', '📤 Envoi authentification au serveur', {
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.name || currentUser.email
    });
    
    socket.emit('user:authenticate', {
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.name || currentUser.email || 'Utilisateur'
    });
  }, [socket, isAuthenticated, currentUser, addDebugLog]);

  // Demander l'historique de la conversation
  const loadConversationHistory = useCallback(() => {
    if (socket?.connected && conversationId && isAuthenticated) {
      addDebugLog('conversation', 'Demande historique conversation');
      
      socket.emit('conversation:history', {
        conversationId,
        targetUserId: remoteUser.id,
        limit: 50
      });
    }
  }, [socket, conversationId, remoteUser.id, isAuthenticated, addDebugLog]);

  // Fonction de récupération d'erreur de conversation
  const handleConversationError = useCallback(async () => {
    addDebugLog('warning', '🔄 Tentative de récupération de conversation');
    
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'emergency-create',
          conversationId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        addDebugLog('success', '✅ Conversation créée en urgence');
        setConversationEnsured(true);
        
        setTimeout(() => {
          loadConversationHistory();
        }, 500);
      } else {
        addDebugLog('error', '❌ Échec création urgence', result);
      }
    } catch (error) {
      addDebugLog('error', '❌ Erreur API urgence', error);
    }
  }, [conversationId, loadConversationHistory, addDebugLog]);

  // Initialisation
  useEffect(() => {
    if (hasRequiredParams) {
      const convId = `chat_${[currentUser.id, remoteUser.id].sort().join('_')}`;
      setConversationId(convId);
      
      addDebugLog('system', 'Chat système Next.js initialisé', {
        conversationId: convId,
        currentUser: currentUser.id,
        currentUserName: currentUser.name || currentUser.email,
        remoteUser: remoteUser.id,
        remoteUserName: remoteUser.name || remoteUser.email,
        socketConnected: socket?.connected || false,
        version: 'v3.0 - Next.js Optimisé'
      });

      if (socket?.connected) {
        const welcomeMessage: Message = {
          id: `msg_welcome_${Date.now()}`,
          content: `💬 Chat Next.js avec ${remoteUser.name || remoteUser.email} • Socket connecté`,
          senderId: 'system',
          timestamp: new Date(),
          conversationId: convId
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [currentUser.id, remoteUser.id, hasRequiredParams, socket?.connected, addDebugLog]);

  // Gestion de la connexion socket
  useEffect(() => {
    if (socket?.connected && !isAuthenticated) {
      authenticate();
      startHeartbeat();
      checkUserStatus();
    }
  }, [socket?.connected, isAuthenticated, authenticate, startHeartbeat, checkUserStatus]);

  // S'assurer que la conversation existe après authentification
  useEffect(() => {
    if (isAuthenticated && conversationId && !conversationEnsured) {
      setTimeout(() => {
        ensureConversation();
      }, 1000);
    }
  }, [isAuthenticated, conversationId, conversationEnsured, ensureConversation]);

  // ✅ Nettoyage appel - VERSION CORRIGÉE
  const cleanupCall = useCallback((): void => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;

    addDebugLog('call', '🧹 Nettoyage appel');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (callTimerRef.current !== null) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    setCallDuration(0);
    setIncomingCallData(null);
    setIsConnecting(false);
    setCallState({
      isActive: false,
      isIncoming: false,
      isOutgoing: false,
      isVideoCall: false,
      callId: null,
      remoteUserName: null,
      remoteUserId: null
    });

    cleanupRef.current = false;
  }, [addDebugLog]);

  // Terminer appel
  const endCall = useCallback((): void => {
    addDebugLog('call', '🔚 Fin de l\'appel');
    
    if (callState.callId && socket) {
      const targetUserId = callState.remoteUserId || remoteUser.id;
      socket.emit('call:end', { 
        callId: callState.callId,
        targetUserId: targetUserId,
        to: targetUserId
      });
    }
    
    cleanupCall();
  }, [callState.callId, callState.remoteUserId, remoteUser.id, socket, cleanupCall, addDebugLog]);

  // Obtenir flux local
  const getLocalStream = useCallback(async (video: boolean = true): Promise<MediaStream> => {
    try {
      addDebugLog('call', `📹 Demande accès ${video ? 'vidéo + audio' : 'audio'}`);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      addDebugLog('error', 'Erreur accès média', error);
      throw new Error('Impossible d\'accéder à votre caméra/microphone');
    }
  }, [addDebugLog]);

  // Initialiser WebRTC
  const initializePeerConnection = useCallback((callId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection(iceServers);

    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
      if (event.candidate && socket && !cleanupRef.current) {
        addDebugLog('call', '🧊 Envoi ICE candidate');
        socket.emit('call:ice-candidate', {
          callId,
          candidate: event.candidate,
          targetUserId: remoteUser.id,
          to: remoteUser.id,
          conversationId
        });
      }
    };

    peerConnection.ontrack = (event: RTCTrackEvent): void => {
      addDebugLog('call', '📺 Flux distant reçu');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.onconnectionstatechange = (): void => {
      addDebugLog('call', `🔗 État WebRTC: ${peerConnection.connectionState}`);
      
      if (peerConnection.connectionState === 'connected') {
        setIsConnecting(false);
      } else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
        cleanupCall();
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [socket, remoteUser.id, conversationId, cleanupCall, addDebugLog]);

  // Démarrer appel
  const startCall = useCallback(async (isVideo: boolean = false): Promise<void> => {
    if (!socket?.connected) {
      alert('Socket non connecté. Vérifiez votre connexion.');
      return;
    }

    if (isConnecting || callState.isActive || callState.isOutgoing) {
      addDebugLog('error', 'Appel déjà en cours');
      return;
    }

    try {
      addDebugLog('call', `🚀 Démarrage appel ${isVideo ? 'vidéo' : 'audio'}`);
      setIsConnecting(true);
      
      const stream = await getLocalStream(isVideo);
      const tempCallId = `call_${Date.now()}_${currentUser.id}`;
      const peerConnection = initializePeerConnection(tempCallId);

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });
      
      await peerConnection.setLocalDescription(offer);

      setCallState({
        isActive: false,
        isIncoming: false,
        isOutgoing: true,
        isVideoCall: isVideo,
        callId: tempCallId,
        remoteUserName: remoteUser.name || remoteUser.email || 'Utilisateur',
        remoteUserId: remoteUser.id
      });

      setIsVideoEnabled(isVideo);

      socket.emit('call:offer', {
        offer,
        targetUserId: remoteUser.id,
        callerId: currentUser.id,
        callerName: currentUser.name || currentUser.email || 'Utilisateur',
        isVideoCall: isVideo,
        callId: tempCallId
      });

      addDebugLog('call', '📤 Offre envoyée via socket');

    } catch (error: unknown) {
      addDebugLog('error', 'Erreur démarrage appel', error);
      setIsConnecting(false);
      cleanupCall();
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'appel');
    }
  }, [socket, remoteUser, currentUser, isConnecting, callState, getLocalStream, initializePeerConnection, addDebugLog, cleanupCall]);

  // Accepter appel
  const acceptCall = useCallback(async (): Promise<void> => {
    if (!incomingCallData || !socket || isConnecting) return;

    try {
      addDebugLog('call', '✅ Acceptation appel');
      setIsConnecting(true);
      
      const stream = await getLocalStream(incomingCallData.isVideoCall);
      const peerConnection = initializePeerConnection(incomingCallData.callId);

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      await peerConnection.setRemoteDescription(incomingCallData.offer);
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      setCallState(prev => ({
        ...prev,
        isActive: true,
        isIncoming: false,
        isOutgoing: false,
        callId: incomingCallData.callId,
        remoteUserId: incomingCallData.callerId
      }));

      setIsVideoEnabled(incomingCallData.isVideoCall);

      socket.emit('call:answer', {
        callId: incomingCallData.callId,
        targetUserId: incomingCallData.callerId,
        to: incomingCallData.callerId,
        answer
      });

      setIncomingCallData(null);
      
      callTimerRef.current = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      addDebugLog('call', '📤 Réponse envoyée');

    } catch (error: unknown) {
      addDebugLog('error', 'Erreur acceptation', error);
      setIsConnecting(false);
      cleanupCall();
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'acceptation');
    }
  }, [incomingCallData, socket, isConnecting, getLocalStream, initializePeerConnection, addDebugLog, cleanupCall]);

  // Refuser appel
  const rejectCall = useCallback((): void => {
    if (!incomingCallData || !socket) return;

    addDebugLog('call', '❌ Refus appel');
    socket.emit('call:reject', { 
      callId: incomingCallData.callId,
      targetUserId: incomingCallData.callerId,
      to: incomingCallData.callerId
    });
    setIncomingCallData(null);
    cleanupCall();
  }, [incomingCallData, socket, cleanupCall, addDebugLog]);

  // Toggle vidéo
  const toggleVideo = useCallback((): void => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        addDebugLog('call', `📹 Vidéo: ${videoTrack.enabled ? 'ON' : 'OFF'}`);
      }
    }
  }, [addDebugLog]);

  // Toggle audio
  const toggleAudio = useCallback((): void => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        addDebugLog('call', `🎤 Audio: ${audioTrack.enabled ? 'ON' : 'OFF'}`);
      }
    }
  }, [addDebugLog]);

  // Formater durée
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Scroll messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Envoi message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    if (!socket?.connected) {
      addDebugLog('error', '❌ Impossible d\'envoyer - socket déconnecté');
      alert('Connexion perdue. Reconnexion en cours...');
      attemptReconnection();
      return;
    }

    if (!isAuthenticated) {
      addDebugLog('error', '❌ Impossible d\'envoyer - non authentifié');
      authenticate();
      return;
    }

    if (!conversationEnsured) {
      addDebugLog('warning', '⚠️ Conversation non assurée, tentative d\'envoi quand même');
      ensureConversation();
    }

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: newMessage.trim(),
      senderId: currentUser.id,
      timestamp: new Date(),
      status: 'pending',
      conversationId
    };

    setMessages(prev => [...prev, message]);
    addDebugLog('sent', `📤 Envoi: "${message.content}"`);

    const messageData = {
      id: message.id,
      conversationId,
      content: message.content,
      to: remoteUser.id,
      from: currentUser.id,
      timestamp: message.timestamp.toISOString()
    };
    
    addDebugLog('system', `📡 Envoi via socket: message:send`, messageData);
    socket.emit('message:send', messageData);

    setNewMessage('');
  }, [newMessage, currentUser.id, conversationId, remoteUser.id, socket, isAuthenticated, conversationEnsured, authenticate, attemptReconnection, ensureConversation, addDebugLog]);

  // Gestion clavier
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Mettre à jour le statut d'un message
  const updateMessageStatus = useCallback((messageId: string, status: Message['status']) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    ));
  }, []);

  // Fonction pour tester la connexion
  const testConnection = useCallback(() => {
    if (socket?.connected) {
      addDebugLog('system', '🧪 Test de connexion');
      socket.emit('test:connection', {
        timestamp: new Date().toISOString(),
        message: 'Test depuis ChatSystem Next.js'
      });
    }
  }, [socket, addDebugLog]);

  // Handlers Socket.IO améliorés
  useEffect((): (() => void) => {
    if (!socket) return () => {};

    // Authentification
    const handleUserAuthenticated = (data: any): void => {
      addDebugLog('auth', '✅ Authentification confirmée', data);
      setIsAuthenticated(true);
      setReconnectAttempts(0);
      checkUserStatus();
      
      setTimeout(() => {
        loadConversationHistory();
      }, 500);
    };

    const handleAuthError = (data: any): void => {
      addDebugLog('error', '❌ Erreur authentification', data);
      setIsAuthenticated(false);
    };

    // Conversation assurée
    const handleConversationEnsured = (data: any): void => {
      addDebugLog('success', '✅ Conversation assurée', data);
      setConversationEnsured(true);
      
      if (data.created) {
        addDebugLog('conversation', '📝 Nouvelle conversation créée');
      }
    };

    // Statut utilisateur
    const handleUserStatus = (data: any): void => {
      addDebugLog('system', '👤 Statut utilisateur reçu', data);
      setUserStatus({
        isOnline: data.isOnline,
        lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
        isConnecting: false
      });
    };

    const handleUserOnline = (data: any): void => {
      if (data.userId === remoteUser.id) {
        addDebugLog('system', '🟢 Utilisateur distant en ligne', data);
        setUserStatus(prev => ({ ...prev, isOnline: true }));
      }
    };

    const handleUserOffline = (data: any): void => {
      if (data.userId === remoteUser.id) {
        addDebugLog('system', '🔴 Utilisateur distant hors ligne', data);
        setUserStatus(prev => ({ 
          ...prev, 
          isOnline: false, 
          lastSeen: new Date(data.timestamp) 
        }));
      }
    };

    // Gestion de la connexion/déconnexion
    const handleConnect = (): void => {
      addDebugLog('system', '🟢 Socket reconnecté');
      setReconnectAttempts(0);
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      authenticate();
      startHeartbeat();
    };

    const handleDisconnect = (reason: string): void => {
      addDebugLog('error', '🔴 Socket déconnecté', { reason });
      setIsAuthenticated(false);
      setConversationEnsured(false);
      setUserStatus(prev => ({ ...prev, isOnline: false }));
      stopHeartbeat();
      
      if (reason !== 'io client disconnect') {
        attemptReconnection();
      }
    };

    // Messages
    const handleMessageReceived = (data: any): void => {
      addDebugLog('received', `📥 Message reçu`, data);
      
      if ((data.conversationId === conversationId || !data.conversationId) && data.from === remoteUser.id) {
        const message: Message = {
          id: data.id || `msg_${Date.now()}`,
          content: data.content,
          senderId: data.from,
          timestamp: new Date(data.timestamp || Date.now()),
          status: 'delivered',
          conversationId: data.conversationId || conversationId
        };

        setMessages(prev => [...prev, message]);
        addDebugLog('received', `✅ Message ajouté: "${message.content}"`);
      }
    };

    const handleMessageSent = (data: any): void => {
      addDebugLog('system', `✅ Confirmation envoi`, data);
      updateMessageStatus(data.messageId, data.status);
      
      if (data.status === 'queued') {
        addDebugLog('warning', '⏳ Message mis en file d\'attente - utilisateur hors ligne');
      }
    };

    const handleMessageError = (data: any): void => {
      addDebugLog('error', `❌ Erreur message`, data);
      if (data.messageId) {
        updateMessageStatus(data.messageId, 'failed');
      }
    };

    // Historique
    const handleConversationHistory = (data: any): void => {
      addDebugLog('conversation', `📚 Historique reçu: ${data.messages?.length || 0} messages`);
      
      if (data.messages && data.messages.length > 0) {
        const historyMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.from,
          timestamp: new Date(msg.timestamp),
          status: 'delivered',
          isOfflineMessage: true,
          conversationId: data.conversationId
        }));
        
        setMessages(prev => [...historyMessages, ...prev.filter(m => m.senderId === 'system')]);
        setConversationEnsured(true);
      } else {
        addDebugLog('conversation', '📝 Aucun historique - nouvelle conversation');
        setConversationEnsured(true);
      }
    };

    // ✅ Handler d'appel entrant avec debug amélioré
    const handleIncomingCall = (data: any): void => {
      addDebugLog('call', '📞 [DEBUG] Appel entrant reçu', data);
      
      if (callState.isActive || callState.isOutgoing || callState.isIncoming) {
        addDebugLog('call', '⚠️ [DEBUG] Appel ignoré - déjà en communication');
        socket.emit('call:reject', { callId: data.callId });
        return;
      }
    
      if (!data.callerId || !data.callerName || !data.offer) {
        addDebugLog('error', '❌ [DEBUG] Données d\'appel entrant incomplètes', data);
        return;
      }
      
      addDebugLog('call', '✅ [DEBUG] Création incomingCallData');
      
      const incomingData: IncomingCallData = {
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        isVideoCall: data.isVideoCall || false,
        offer: data.offer
      };
      
      setIncomingCallData(incomingData);
      setCallState({
        isActive: false,
        isIncoming: true,
        isOutgoing: false,
        isVideoCall: data.isVideoCall || false,
        callId: data.callId,
        remoteUserId: data.callerId,
        remoteUserName: data.callerName
      });
      
      addDebugLog('call', '📞 [DEBUG] CallState mis à jour pour isIncoming=true');
    };

    const handleCallAnswered = async (data: any): Promise<void> => {
      addDebugLog('call', '📞 Appel accepté', data);
      
      if (peerConnectionRef.current && data.callId === callState.callId && data.answer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(data.answer);
          setCallState(prev => ({ 
            ...prev, 
            isActive: true, 
            isOutgoing: false 
          }));
          
          callTimerRef.current = window.setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
          
          setIsConnecting(false);
        } catch (error) {
          addDebugLog('error', 'Erreur setRemoteDescription', error);
          cleanupCall();
        }
      }
    };

    const handleIceCandidate = async (data: any): Promise<void> => {
      if (peerConnectionRef.current && data.callId === callState.callId && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(data.candidate);
          addDebugLog('call', '🧊 ICE candidate ajouté');
        } catch (error) {
          addDebugLog('error', 'Erreur ICE candidate', error);
        }
      }
    };

    const handleCallRejected = (): void => {
      addDebugLog('call', '❌ Appel refusé');
      cleanupCall();
    };

    const handleCallEnded = (): void => {
      addDebugLog('call', '🔚 Appel terminé à distance');
      cleanupCall();
    };

    // Heartbeat
    const handleHeartbeatResponse = (data: any): void => {
      if (data?.userId) {
        addDebugLog('system', '💓 Heartbeat OK');
      }
    };

    // Stats serveur
    const handleServerStats = (data: any): void => {
      setServerStats(data);
    };

    // Test
    const handleTestResponse = (data: any): void => {
      addDebugLog('system', '🧪 Réponse test serveur', data);
    };

    // Événements serveur
    const handleServerError = (data: any): void => {
      addDebugLog('error', '💥 Erreur serveur', data);
      if (data.recovered) {
        addDebugLog('system', '🔄 Erreur récupérée automatiquement');
      }
    };

    const handleAuthRequired = (data: any): void => {
      addDebugLog('warning', '🔐 Authentification requise', data);
      setIsAuthenticated(false);
      authenticate();
    };

    // Enregistrer tous les handlers
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('user:authenticated', handleUserAuthenticated);
    socket.on('auth:error', handleAuthError);
    socket.on('auth:required', handleAuthRequired);
    socket.on('conversation:ensured', handleConversationEnsured);
    socket.on('user:status', handleUserStatus);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    socket.on('message:received', handleMessageReceived);
    socket.on('message:sent', handleMessageSent);
    socket.on('message:error', handleMessageError);
    socket.on('conversation:history', handleConversationHistory);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:answered', handleCallAnswered);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('heartbeat:response', handleHeartbeatResponse);
    socket.on('server:stats', handleServerStats);
    socket.on('server:error', handleServerError);
    socket.on('test:response', handleTestResponse);

    return (): void => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('user:authenticated', handleUserAuthenticated);
      socket.off('auth:error', handleAuthError);
      socket.off('auth:required', handleAuthRequired);
      socket.off('conversation:ensured', handleConversationEnsured);
      socket.off('user:status', handleUserStatus);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('message:received', handleMessageReceived);
      socket.off('message:sent', handleMessageSent);
      socket.off('message:error', handleMessageError);
      socket.off('conversation:history', handleConversationHistory);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:answered', handleCallAnswered);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('heartbeat:response', handleHeartbeatResponse);
      socket.off('server:stats', handleServerStats);
      socket.off('server:error', handleServerError);
      socket.off('test:response', handleTestResponse);
    };
  }, [socket, conversationId, remoteUser.id, currentUser.id, callState.callId, callState.isActive, callState.isOutgoing, callState.isIncoming, checkUserStatus, loadConversationHistory, updateMessageStatus, cleanupCall, authenticate, startHeartbeat, stopHeartbeat, attemptReconnection, addDebugLog]);

  // Nettoyage au démontage
  useEffect((): (() => void) => {
    return (): void => {
      isUnmountedRef.current = true;
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      stopHeartbeat();
      cleanupCall();
      
      addDebugLog('system', '🧹 Composant ChatSystem Next.js démonté');
    };
  }, [cleanupCall, stopHeartbeat, addDebugLog]);

  if (!hasRequiredParams) {
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 rounded-lg">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <div className="text-yellow-600 text-lg font-semibold mb-2">Configuration incomplète</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Current User: {currentUser?.id || '❌'}</div>
            <div>Remote User: {remoteUser?.id || '❌'}</div>
          </div>
        </div>
      </div>
    );
  }

  // Icône de statut connexion
  const getConnectionIcon = () => {
    if (!socket?.connected) return <WifiOff className="w-4 h-4 text-red-500" />;
    if (!isAuthenticated) return <Clock className="w-4 h-4 text-yellow-500" />;
    if (!conversationEnsured) return <Shield className="w-4 h-4 text-orange-500" />;
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  // Statut utilisateur distant
  const getRemoteUserStatus = () => {
    if (userStatus.isOnline) return "🟢 En ligne";
    if (userStatus.lastSeen) {
      const diff = Date.now() - userStatus.lastSeen.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "🟡 Vu à l'instant";
      if (minutes < 60) return `🟡 Vu il y a ${minutes}min`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `🔴 Vu il y a ${hours}h`;
      return "🔴 Hors ligne";
    }
    return "🔴 Hors ligne";
  };

  // Boutons d'appel
  const renderCallButtons = (): React.ReactElement => (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => startCall(false)}
        className="p-2 hover:bg-white/20 rounded-full transition-colors"
        title="Appel audio"
        disabled={!socket?.connected || callState.isActive || callState.isOutgoing || callState.isIncoming}
      >
        <Phone className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={() => startCall(true)}
        className="p-2 hover:bg-white/20 rounded-full transition-colors"
        title="Appel vidéo"
        disabled={!socket?.connected || callState.isActive || callState.isOutgoing || callState.isIncoming}
      >
        <Video className="w-5 h-5 text-white" />
      </button>
    </div>
  );

  // Interface d'appel sortant minimaliste
  const renderOutgoingCall = (): React.ReactElement | null => {
    if (!callState.isOutgoing) return null;

    return (
      <div className="fixed top-4 right-4 z-40 bg-blue-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-center space-x-3">
          <PhoneCall size={24} className="animate-pulse" />
          <div className="flex-1">
            <div className="font-semibold">Appel en cours...</div>
            <div className="text-sm opacity-90">vers {callState.remoteUserName}</div>
            <div className="text-xs opacity-75">
              {callState.isVideoCall ? 'Appel vidéo' : 'Appel audio'}
            </div>
          </div>
          <button
            onClick={endCall}
            className="p-1 hover:bg-blue-600 rounded"
            title="Annuler"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </div>
    );
  };

  // ✅ Interface d'appel complète avec debug amélioré
  const renderCallInterface = (): React.ReactElement | null => {
    console.log('🔍 [DEBUG] renderCallInterface appelé:', {
      isIncoming: callState.isIncoming,
      isActive: callState.isActive,
      incomingCallData: !!incomingCallData,
      callId: callState.callId
    });
    
    if (!callState.isIncoming && !callState.isActive) {
      console.log('❌ [DEBUG] Interface cachée - conditions non remplies');
      return null;
    }

    console.log('✅ [DEBUG] Interface d\'appel affichée !');

    return (
      <div className={`fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center ${
        isFullscreen ? 'p-0' : 'p-4'
      }`}>
        <div className={`bg-white rounded-lg overflow-hidden ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl h-3/4'
        }`}>
          {/* En-tête appel */}
          <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">
                {callState.isIncoming && 'Appel entrant de '}
                {callState.isActive && 'En communication avec '}
                {callState.remoteUserName}
              </h3>
              {callState.isActive && (
                <p className="text-sm text-gray-300">{formatDuration(callDuration)}</p>
              )}
              {isConnecting && (
                <p className="text-sm text-gray-300">Connexion...</p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button onClick={endCall} className="p-1 hover:bg-gray-700 rounded">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Zone vidéo */}
          <div className="relative flex-1 bg-gray-900" style={{ height: 'calc(100% - 140px)' }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {callState.isVideoCall && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg border-2 border-white object-cover"
              />
            )}

            {isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center text-white">
                  <PhoneCall size={48} className="mx-auto mb-4 animate-pulse" />
                  <p className="text-lg">Connexion en cours...</p>
                </div>
              </div>
            )}
          </div>

          {/* Contrôles */}
          <div className="bg-gray-800 p-4">
            {callState.isIncoming ? (
              <div className="flex justify-center space-x-4">
                <button
                  onClick={rejectCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  disabled={isConnecting}
                >
                  <PhoneOff size={20} />
                  <span>Refuser</span>
                </button>
                <button
                  onClick={acceptCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  disabled={isConnecting}
                >
                  <PhoneIncoming size={20} />
                  <span>{isConnecting ? 'Connexion...' : 'Accepter'}</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center space-x-4">
                {callState.isVideoCall && (
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full ${
                      isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                    disabled={isConnecting}
                  >
                    {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                  </button>
                )}
                
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full ${
                    isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                  } text-white`}
                  disabled={isConnecting}
                >
                  {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                
                <button
                  onClick={endCall}
                  className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <PhoneOff size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-white relative">
      {/* Appel sortant */}
      {renderOutgoingCall()}
      
      {/* Interface d'appel complète */}
      {renderCallInterface()}

      {/* Chat principal */}
      <div className="flex-1 flex flex-col">
        {/* En-tête amélioré */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold">
                {(remoteUser?.name || remoteUser?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold">
                  {remoteUser?.name || remoteUser?.email?.split('@')[0] || 'Utilisateur'}
                </h3>
                <div className="flex items-center space-x-2 text-sm opacity-90">
                  {getConnectionIcon()}
                  <span>{getRemoteUserStatus()}</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    v3.1 - Corrigé
                  </span>
                  {callState.isActive && (
                    <span className="text-xs bg-red-500 px-2 py-1 rounded animate-pulse">
                      🔴 En appel
                    </span>
                  )}
                  {callState.isOutgoing && (
                    <span className="text-xs bg-blue-500 px-2 py-1 rounded animate-pulse">
                      📞 Appel...
                    </span>
                  )}
                  {callState.isIncoming && (
                    <span className="text-xs bg-orange-500 px-2 py-1 rounded animate-pulse">
                      📱 Entrant
                    </span>
                  )}
                  {reconnectAttempts > 0 && (
                    <span className="text-xs bg-orange-500 px-2 py-1 rounded animate-pulse">
                      🔄 Reconnexion {reconnectAttempts}/5
                    </span>
                  )}
                  {!conversationEnsured && isAuthenticated && (
                    <span className="text-xs bg-yellow-500 px-2 py-1 rounded">
                      ⏳ Setup...
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {renderCallButtons()}
              <button
                onClick={checkUserStatus}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Actualiser statut"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={testConnection}
                className="px-3 py-1 text-xs bg-white/20 rounded hover:bg-white/30"
                title="Tester connexion"
              >
                Test
              </button>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-3 py-1 text-xs bg-white/20 rounded hover:bg-white/30"
              >
                Debug {debugLogs.length}
              </button>
              {onClose && (
                <button onClick={onClose} className="px-3 py-1 text-xs bg-white/20 rounded hover:bg-white/30">
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-lg mb-2">💬</div>
              <div className="font-medium">Chat système Next.js optimisé prêt !</div>
              <div className="text-sm mt-2 space-y-1">
                <div>Socket: {socket?.connected ? '🟢 Connecté' : '🔴 Déconnecté'}</div>
                <div>Auth: {isAuthenticated ? '🟢 OK' : '🔴 Pending'}</div>
                <div>Conversation: {conversationEnsured ? '🟢 Assurée' : '🔴 En cours...'}</div>
                <div>Remote: {getRemoteUserStatus()}</div>
              </div>
              <div className="text-xs mt-4 space-y-1 text-gray-400">
                <div>Conversation: {conversationId}</div>
                <div>✅ Interface d'appel corrigée</div>
                <div>✅ Debug logs améliorés</div>
                <div>✅ Types TypeScript corrigés</div>
                <div>✅ WebRTC fonctionnel</div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.senderId === currentUser?.id;
              const isSystem = message.senderId === 'system';
              
              const getMessageStatusIcon = () => {
                if (isOwn && !isSystem) {
                  switch (message.status) {
                    case 'pending': return <Clock className="w-3 h-3 text-gray-400" />;
                    case 'sent': return <CheckCircle className="w-3 h-3 text-blue-400" />;
                    case 'delivered': return <CheckCircle className="w-3 h-3 text-green-400" />;
                    case 'queued': return <Clock className="w-3 h-3 text-yellow-400" />;
                    case 'failed': return <AlertCircle className="w-3 h-3 text-red-400" />;
                    default: return null;
                  }
                }
                return null;
              };
              
              return (
                <div
                  key={message.id || index}
                  className={`flex ${isSystem ? 'justify-center' : isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isSystem
                        ? 'bg-gray-200 text-gray-600 text-sm'
                        : isOwn
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                        : 'bg-white text-gray-900 shadow-sm border'
                    } ${message.isOfflineMessage ? 'opacity-75' : ''}`}
                  >
                    <div className="break-words">{message.content}</div>
                    {!isSystem && (
                      <div className={`flex items-center justify-between mt-1 ${
                        isOwn ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        <div className="text-xs">
                          {new Date(message.timestamp).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {message.isOfflineMessage && (
                            <span className="ml-1 opacity-60">(historique)</span>
                          )}
                        </div>
                        {getMessageStatusIcon()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Saisie */}
        <div className="bg-white border-t p-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message à ${remoteUser.name || remoteUser.email}...`}
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-green-500"
              disabled={!socket?.connected || !isAuthenticated}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !socket?.connected || !isAuthenticated}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full hover:from-green-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
            >
              ✈️
            </button>
          </div>
          
          <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
            <div>
              Socket: {socket?.connected ? '🟢' : '🔴'} | 
              Auth: {isAuthenticated ? '🟢' : '🔴'} | 
              Conv: {conversationEnsured ? '🟢' : '🔴'} |
              Messages: {messages.length} |
              Remote: {userStatus.isOnline ? '🟢' : '🔴'} | 
              Appel: {
                callState.isActive ? '🔴 Actif' : 
                callState.isIncoming ? '🟠 Entrant' : 
                callState.isOutgoing ? '🔵 Sortant' : '🟢'
              }
            </div>
            {reconnectAttempts > 0 && (
              <div className="text-orange-500">
                Reconnexion en cours... ({reconnectAttempts}/5)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debug amélioré */}
      {showDebug && (
        <div className="w-80 bg-gray-50 border-l flex flex-col">
          <div className="bg-gray-200 px-3 py-2 border-b">
            <h3 className="font-semibold text-sm">Debug v3.1 CORRIGÉ - {debugLogs.length}</h3>
          </div>
          
          <div className="bg-blue-50 p-2 border-b text-xs space-y-1">
            <div><strong>Socket:</strong> {socket?.connected ? '✅ Connecté' : '❌ Déconnecté'}</div>
            <div><strong>Auth:</strong> {isAuthenticated ? '✅ OK' : '❌ Pending'}</div>
            <div><strong>Conv Assured:</strong> {conversationEnsured ? '✅ Oui' : '❌ Non'}</div>
            <div><strong>Conv ID:</strong> {conversationId}</div>
            <div><strong>Messages:</strong> {messages.length}</div>
            <div><strong>Remote:</strong> {userStatus.isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}</div>
            <div><strong>Call State:</strong> {
              callState.isActive ? '🔴 Actif' : 
              callState.isIncoming ? '🟠 Entrant' : 
              callState.isOutgoing ? '🔵 Sortant' : '🟢 Libre'
            }</div>
            <div><strong>WebRTC:</strong> {peerConnectionRef.current?.connectionState || 'None'}</div>
            <div><strong>Stream:</strong> {localStreamRef.current ? '✅' : '❌'}</div>
            <div><strong>Incoming Data:</strong> {incomingCallData ? '✅' : '❌'}</div>
            <div><strong>Reconnect:</strong> {reconnectAttempts}/5</div>
            {serverStats && (
              <div><strong>Serveur:</strong> {serverStats.connectedUsers} users</div>
            )}
            <div className="text-green-600 font-bold">✅ VERSION CORRIGÉE v3.1</div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {debugLogs.slice(-30).map((log, index) => (
              <div
                key={`${log.timestamp.getTime()}-${index}`}
                className={`text-xs p-2 rounded border-l-2 ${
                  log.type === 'error' ? 'bg-red-50 text-red-800 border-red-500' :
                  log.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-yellow-500' :
                  log.type === 'success' ? 'bg-green-50 text-green-800 border-green-500' :
                  log.type === 'sent' ? 'bg-blue-50 text-blue-800 border-blue-500' :
                  log.type === 'received' ? 'bg-green-50 text-green-800 border-green-500' :
                  log.type === 'call' ? 'bg-orange-50 text-orange-800 border-orange-500' :
                  log.type === 'auth' ? 'bg-purple-50 text-purple-800 border-purple-500' :
                  'bg-gray-50 text-gray-700 border-gray-300'
                }`}
              >
                <div className="font-semibold">
                  [{log.type.toUpperCase()}] {log.timestamp.toLocaleTimeString()}
                </div>
                <div>{log.message}</div>
                {log.data && (
                  <details className="mt-1">
                    <summary className="cursor-pointer opacity-70">Data</summary>
                    <pre className="text-xs bg-white/50 p-1 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSystem;