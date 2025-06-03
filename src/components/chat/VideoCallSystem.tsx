// src/components/VideoCallSystem.tsx - Version CORRIGÉE avec types et gestion améliorée
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
  Activity
} from 'lucide-react';
import { Socket } from 'socket.io-client';

// Types corrigés et étendus
interface CallState {
  isActive: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  isVideoCall: boolean;
  callId: string | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
}

interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  isVideoCall: boolean;
  offer: RTCSessionDescriptionInit;
}

interface SocketCallData {
  callId: string;
  callerId?: string;
  callerName?: string;
  isVideoCall?: boolean;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
  targetUserId?: string;
  reason?: string;
}

interface VideoCallSystemProps {
  socket: Socket | null;
  currentUserId: string;
  remoteUserId: string;
  remoteUserName: string;
  matchId: string;
  onCallStateChange?: (hasActiveCall: boolean) => void;
  onError?: (error: string) => void;
  onLog?: (message: string, data?: any) => void;
}

interface CallMetrics {
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  connectionState: string;
  iceConnectionState: string;
  localStreamActive: boolean;
  remoteStreamActive: boolean;
}

export const VideoCallSystem: React.FC<VideoCallSystemProps> = ({
    socket,
    currentUserId,
    remoteUserId,
    remoteUserName,
    matchId,
    onCallStateChange,
    onError,
    onLog
  }) => {
    
    // États avec types corrects
    const [callState, setCallState] = useState<CallState>({
      isActive: false,
      isIncoming: false,
      isOutgoing: false,
      isVideoCall: false,
      callId: null,
      remoteUserId: null,
      remoteUserName: null
    });

  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  const [callMetrics, setCallMetrics] = useState<CallMetrics>({
    startTime: null,
    endTime: null,
    duration: 0,
    connectionState: 'new',
    iceConnectionState: 'new',
    localStreamActive: false,
    remoteStreamActive: false
  });

  // Refs avec types corrects
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<number | null>(null); // ✅ Corrigé : number au lieu de NodeJS.Timeout
  const cleanupRef = useRef<boolean>(false);
  const isUnmountedRef = useRef<boolean>(false);
  const metricsIntervalRef = useRef<number | null>(null);

  // Configuration ICE servers
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Fonction de log améliorée
  const log = useCallback((message: string, data?: any) => {
    console.log(`📞 [VideoCallSystem] ${message}`, data || '');
    if (onLog) {
      onLog(message, data);
    }
  }, [onLog]);

  // Fonction d'erreur améliorée
  const handleError = useCallback((error: string, details?: any) => {
    log(`❌ Erreur: ${error}`, details);
    if (onError) {
      onError(error);
    }
  }, [log, onError]);

  // Fonction de nettoyage avec type de retour explicite
  const cleanup = useCallback((): void => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;

    log('🧹 Nettoyage VideoCallSystem');

    // Nettoyer les flux
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        log('🛑 Track arrêté:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Fermer la connexion WebRTC
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Nettoyer les refs vidéo
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Arrêter le timer - ✅ Corrigé : clearInterval avec number
    if (callTimerRef.current !== null) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Arrêter le monitoring des métriques
    if (metricsIntervalRef.current !== null) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }

    // Réinitialiser les états
    setCallDuration(0);
    setIncomingCallData(null);
    setIsConnecting(false);
    setConnectionQuality('unknown');
    setCallState({
      isActive: false,
      isIncoming: false,
      isOutgoing: false,
      isVideoCall: false,
      callId: null,
      remoteUserId: null,
      remoteUserName: null
    });

    // Mettre à jour les métriques de fin
    setCallMetrics(prev => ({
      ...prev,
      endTime: new Date(),
      localStreamActive: false,
      remoteStreamActive: false
    }));

    if (onCallStateChange) {
      onCallStateChange(false);
    }

    cleanupRef.current = false;
  }, [onCallStateChange, log]);

  // Terminer un appel avec type de retour explicite
  const endCall = useCallback((): void => {
    log('🔚 Fin de l\'appel');

    if (callState.callId && socket) {
      socket.emit('call:end', {
        callId: callState.callId
      });
    }

    cleanup();
  }, [callState.callId, socket, cleanup, log]);

  // Obtenir le flux media local avec types corrects
  const getLocalStream = useCallback(async (video: boolean = true): Promise<MediaStream> => {
    try {
      log(`📹 Demande accès ${video ? 'vidéo + audio' : 'audio seulement'}`);
      
      const constraints: MediaStreamConstraints = {
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      log('✅ Flux local obtenu:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      localStreamRef.current = stream;
      
      // Mettre à jour les métriques
      setCallMetrics(prev => ({
        ...prev,
        localStreamActive: true
      }));

      return stream;
    } catch (error) {
      const errorMessage = 'Impossible d\'accéder à votre caméra/microphone. Vérifiez vos permissions.';
      handleError(errorMessage, error);
      throw new Error(errorMessage);
    }
  }, [log, handleError]);

  // Initialiser la connexion WebRTC avec type de retour correct
  const initializePeerConnection = useCallback((callId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection(iceServers);

    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
      if (event.candidate && socket && !cleanupRef.current) {
        log('🧊 Envoi ICE candidate');
        socket.emit('call:ice-candidate', {
          callId,
          candidate: event.candidate,
          targetUserId: remoteUserId
        });
      }
    };

    peerConnection.ontrack = (event: RTCTrackEvent): void => {
      log('📺 Flux distant reçu');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        
        // Mettre à jour les métriques
        setCallMetrics(prev => ({
          ...prev,
          remoteStreamActive: true
        }));
      }
    };

    peerConnection.onconnectionstatechange = (): void => {
      const state = peerConnection.connectionState;
      log('🔗 État connexion WebRTC:', state);
      
      setCallMetrics(prev => ({
        ...prev,
        connectionState: state
      }));
      
      if (state === 'connected') {
        setIsConnecting(false);
        setConnectionQuality('excellent');
      } else if (state === 'disconnected') {
        setConnectionQuality('poor');
      } else if (state === 'failed' || state === 'closed') {
        log('❌ Connexion WebRTC fermée');
        cleanup();
      }
    };

    peerConnection.oniceconnectionstatechange = (): void => {
      const iceState = peerConnection.iceConnectionState;
      log('🧊 État ICE:', iceState);
      
      setCallMetrics(prev => ({
        ...prev,
        iceConnectionState: iceState
      }));
      
      if (iceState === 'connected' || iceState === 'completed') {
        setIsConnecting(false);
        setConnectionQuality('good');
      } else if (iceState === 'disconnected') {
        setConnectionQuality('poor');
      } else if (iceState === 'failed') {
        handleError('Connexion ICE échouée');
        cleanup();
      }
    };

    // Monitoring des statistiques
    const startStatsMonitoring = () => {
      if (metricsIntervalRef.current) return;
      
      metricsIntervalRef.current = window.setInterval(async () => {
        if (peerConnection && peerConnection.connectionState === 'connected') {
          try {
            const stats = await peerConnection.getStats();
            // Analyser les stats pour déterminer la qualité
            // (implémentation simplifiée)
            stats.forEach((report) => {
              if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                const packetsLost = report.packetsLost || 0;
                const packetsReceived = report.packetsReceived || 0;
                const lossRate = packetsLost / (packetsLost + packetsReceived) * 100;
                
                if (lossRate < 1) {
                  setConnectionQuality('excellent');
                } else if (lossRate < 5) {
                  setConnectionQuality('good');
                } else {
                  setConnectionQuality('poor');
                }
              }
            });
          } catch (error) {
            log('⚠️ Erreur lors du monitoring des stats:', error);
          }
        }
      }, 5000); // Toutes les 5 secondes
    };

    startStatsMonitoring();
    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [socket, remoteUserId, cleanup, log, handleError]);

  // Démarrer un appel
  const startCall = useCallback(async (isVideo: boolean = false): Promise<void> => {
    if (!socket?.connected) {
      handleError('Socket non connecté. Vérifiez votre connexion.');
      return;
    }

    if (isConnecting || callState.isActive || callState.isOutgoing) {
      log('⚠️ Appel déjà en cours');
      return;
    }

    try {
      log(`🚀 Démarrage appel ${isVideo ? 'vidéo' : 'audio'} vers ${remoteUserName}`);
      setIsConnecting(true);
      
      const stream = await getLocalStream(isVideo);
      const tempCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const peerConnection = initializePeerConnection(tempCallId);

      stream.getTracks().forEach(track => {
        log('➕ Ajout track:', track.kind);
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
        remoteUserId: remoteUserId,
        remoteUserName: remoteUserName
      });

      setIsVideoEnabled(isVideo);
      
      // Initialiser les métriques
      setCallMetrics({
        startTime: new Date(),
        endTime: null,
        duration: 0,
        connectionState: 'new',
        iceConnectionState: 'new',
        localStreamActive: true,
        remoteStreamActive: false
      });
      
      if (onCallStateChange) {
        onCallStateChange(true);
      }

      socket.emit('call:offer', {
        offer,
        targetUserId: remoteUserId,
        callerId: currentUserId,
        callerName: 'Utilisateur', // À adapter selon vos données
        isVideoCall: isVideo,
        callId: tempCallId,
        matchId: matchId
      });

      log('📤 Offre d\'appel envoyée');

    } catch (error: unknown) {
      handleError('Erreur lors du démarrage de l\'appel', error);
      setIsConnecting(false);
      cleanup();
    }
  }, [socket, remoteUserName, remoteUserId, currentUserId, matchId, isConnecting, callState, getLocalStream, initializePeerConnection, cleanup, onCallStateChange, log, handleError]);

  // Accepter un appel avec types corrects
  const acceptCall = useCallback(async (): Promise<void> => {
    if (!incomingCallData || !socket || isConnecting) return;

    try {
      log('✅ Acceptation de l\'appel', incomingCallData.callId);
      setIsConnecting(true);
      
      const stream = await getLocalStream(incomingCallData.isVideoCall);
      const peerConnection = initializePeerConnection(incomingCallData.callId);

      stream.getTracks().forEach(track => {
        log('➕ Ajout track pour réponse:', track.kind);
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
        callId: incomingCallData.callId
      }));

      setIsVideoEnabled(incomingCallData.isVideoCall);

      socket.emit('call:answer', {
        callId: incomingCallData.callId,
        answer
      });

      setIncomingCallData(null);
      
      // Démarrer le timer de durée
      if (callTimerRef.current === null) {
        callTimerRef.current = window.setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
      
      // Initialiser les métriques
      setCallMetrics({
        startTime: new Date(),
        endTime: null,
        duration: 0,
        connectionState: 'connecting',
        iceConnectionState: 'new',
        localStreamActive: true,
        remoteStreamActive: false
      });
      
      log('📤 Réponse d\'appel envoyée');

    } catch (error: unknown) {
      handleError('Erreur lors de l\'acceptation de l\'appel', error);
      setIsConnecting(false);
      cleanup();
    }
  }, [incomingCallData, socket, isConnecting, getLocalStream, initializePeerConnection, cleanup, log, handleError]);

  // Refuser un appel avec types corrects
  const rejectCall = useCallback((): void => {
    if (!incomingCallData || !socket) return;

    log('❌ Refus de l\'appel', incomingCallData.callId);

    socket.emit('call:reject', {
      callId: incomingCallData.callId
    });

    setIncomingCallData(null);
    cleanup();
  }, [incomingCallData, socket, cleanup, log]);

  // Basculer vidéo avec types corrects
  const toggleVideo = useCallback((): void => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        log('📹 Vidéo:', videoTrack.enabled ? 'activée' : 'désactivée');
      }
    }
  }, [log]);

  // Basculer audio avec types corrects
  const toggleAudio = useCallback((): void => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        log('🎤 Audio:', audioTrack.enabled ? 'activé' : 'désactivé');
      }
    }
  }, [log]);

  // Formater la durée avec types corrects
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Obtenir l'icône de qualité de connexion
  const getQualityIcon = useCallback(() => {
    switch (connectionQuality) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'good': return <CheckCircle className="w-4 h-4 text-yellow-500" />;
      case 'poor': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  }, [connectionQuality]);

  // Handlers Socket.IO avec types corrects
  useEffect((): (() => void) => {
    if (!socket) return () => {};

    const handleIncomingCall = (data: SocketCallData): void => {
      log('📞 Appel entrant reçu:', data);
      
      if (callState.isActive || callState.isOutgoing || callState.isIncoming) {
        log('⚠️ Appel ignoré - déjà en communication');
        socket.emit('call:reject', { callId: data.callId });
        return;
      }

      // ✅ Validation des données requises
      if (!data.callerId || !data.callerName || !data.offer || data.isVideoCall === undefined) {
        log('❌ Données d\'appel entrant incomplètes');
        return;
      }
      
      const incomingData: IncomingCallData = {
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        isVideoCall: data.isVideoCall,
        offer: data.offer
      };
      
      setIncomingCallData(incomingData);
      setCallState({
        isActive: false,
        isIncoming: true,
        isOutgoing: false,
        isVideoCall: data.isVideoCall,
        callId: data.callId,
        remoteUserId: data.callerId,
        remoteUserName: data.callerName
      });
      
      if (onCallStateChange) {
        onCallStateChange(true);
      }
    };

    const handleCallAnswered = async (data: SocketCallData): Promise<void> => {
      log('📞 Appel accepté:', data);
      
      if (peerConnectionRef.current && data.callId === callState.callId && data.answer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(data.answer);
          setCallState(prev => ({ 
            ...prev, 
            isActive: true, 
            isOutgoing: false,
            callId: data.callId 
          }));
          
          if (callTimerRef.current === null) {
            callTimerRef.current = window.setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }
          
          setIsConnecting(false);
        } catch (error) {
          handleError('Erreur lors de la réponse', error);
          cleanup();
        }
      }
    };

    const handleIceCandidate = async (data: SocketCallData): Promise<void> => {
      if (peerConnectionRef.current && data.callId === callState.callId && data.candidate) {
        try {
          log('🧊 ICE candidate reçu');
          await peerConnectionRef.current.addIceCandidate(data.candidate);
        } catch (error) {
          log('❌ Erreur ICE candidate:', error);
        }
      }
    };

    const handleCallRejected = (): void => {
      log('❌ Appel refusé');
      cleanup();
    };

    const handleCallEnded = (): void => {
      log('🔚 Appel terminé par l\'autre utilisateur');
      cleanup();
    };

    const handleCallFailed = (data: SocketCallData): void => {
      log('❌ Échec de l\'appel:', data.reason);
      handleError(`Appel impossible: ${data.reason || 'Erreur inconnue'}`);
      cleanup();
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:answered', handleCallAnswered);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:failed', handleCallFailed);

    return (): void => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:answered', handleCallAnswered);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:failed', handleCallFailed);
    };
  }, [socket, callState.callId, callState.isActive, callState.isOutgoing, callState.isIncoming, onCallStateChange, cleanup, handleError, log]);

  // Nettoyage au démontage
  useEffect((): (() => void) => {
    return (): void => {
      isUnmountedRef.current = true;
      log('🧹 Démontage VideoCallSystem');
      cleanup();
    };
  }, [cleanup, log]);

  // Fonctions de rendu avec types de retour React
  const renderCallButtons = (): React.ReactElement | null => {
    if (callState.isIncoming || callState.isOutgoing || callState.isActive || isConnecting) return null;

    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => startCall(false)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Appel audio"
          disabled={!socket?.connected}
        >
          <Phone className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => startCall(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Appel vidéo"
          disabled={!socket?.connected}
        >
          <Video className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    );
  };

  // Interface d'appel avec types corrects
  const renderCallInterface = (): React.ReactElement | null => {
    const shouldShowCallInterface = callState.isIncoming || callState.isOutgoing || callState.isActive || incomingCallData;

    if (!shouldShowCallInterface) return null;

    return (
      <div className={`fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center ${
        isFullscreen ? 'p-0' : 'p-4'
      }`}>
        <div className={`bg-white rounded-lg overflow-hidden ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl h-3/4'
        }`}>
          <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold flex items-center space-x-2">
                <span>
                  {callState.isIncoming && 'Appel entrant de '}
                  {callState.isOutgoing && 'Appel en cours vers '}
                  {callState.isActive && 'En communication avec '}
                  {callState.remoteUserName || remoteUserName}
                </span>
                {callState.isActive && getQualityIcon()}
              </h3>
              {callState.isActive && (
                <div className="flex items-center space-x-4 text-sm text-gray-300">
                  <span>{formatDuration(callDuration)}</span>
                  <span className="capitalize">{connectionQuality}</span>
                  <span>{callMetrics.connectionState}</span>
                </div>
              )}
              {(callState.isOutgoing || isConnecting) && (
                <p className="text-sm text-gray-300">
                  {isConnecting ? 'Connexion...' : 'Appel en cours...'}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 hover:bg-gray-700 rounded"
                title={isFullscreen ? 'Mode fenêtré' : 'Plein écran'}
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button
                onClick={endCall}
                className="p-1 hover:bg-gray-700 rounded"
                title="Fermer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="relative flex-1 bg-gray-900" style={{ height: 'calc(100% - 140px)' }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {(callState.isVideoCall || incomingCallData?.isVideoCall) && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg border-2 border-white object-cover"
              />
            )}

            {(callState.isOutgoing || isConnecting) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center text-white">
                  <PhoneCall size={48} className="mx-auto mb-4 animate-pulse" />
                  <p className="text-lg">
                    {isConnecting ? 'Connexion en cours...' : 'Appel en cours...'}
                  </p>
                  <p className="text-sm text-gray-300">vers {remoteUserName}</p>
                </div>
              </div>
            )}

            {/* Métriques de debug en mode développement */}
            {process.env.NODE_ENV === 'development' && callState.isActive && (
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
                <div>WebRTC: {callMetrics.connectionState}</div>
                <div>ICE: {callMetrics.iceConnectionState}</div>
                <div>Local: {callMetrics.localStreamActive ? '✅' : '❌'}</div>
                <div>Remote: {callMetrics.remoteStreamActive ? '✅' : '❌'}</div>
                <div>Quality: {connectionQuality}</div>
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-4">
            {(callState.isIncoming || incomingCallData) ? (
              <div className="flex justify-center space-x-4">
                <button
                  onClick={rejectCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  disabled={isConnecting}
                >
                  <PhoneOff size={20} />
                  <span>Refuser</span>
                </button>
                <button
                  onClick={acceptCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  disabled={isConnecting}
                >
                  <PhoneIncoming size={20} />
                  <span>{isConnecting ? 'Connexion...' : 'Accepter'}</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center space-x-4">
                {(callState.isVideoCall || incomingCallData?.isVideoCall) && (
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-colors ${
                      isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                    disabled={callState.isOutgoing || isConnecting}
                    title={isVideoEnabled ? 'Désactiver la vidéo' : 'Activer la vidéo'}
                  >
                    {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                  </button>
                )}
                
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full transition-colors ${
                    isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                  } text-white`}
                  disabled={callState.isOutgoing || isConnecting}
                  title={isAudioEnabled ? 'Couper le micro' : 'Activer le micro'}
                >
                  {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                
                <button
                  onClick={endCall}
                  className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Raccrocher"
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
    <>
      {renderCallButtons()}
      {renderCallInterface()}
    </>
  );
};

export default VideoCallSystem;