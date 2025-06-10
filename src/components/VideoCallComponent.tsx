// ÉTAPE 9 - Créer le fichier components/VideoCallComponent.tsx

import React, { useState, useEffect } from 'react';
import { 
  StreamVideo, 
  StreamCall, 
  useCall, 
  useCallStateHooks,
  SpeakerLayout
} from '@stream-io/video-react-sdk';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor } from 'lucide-react';
import type { VideoCallComponentProps, User } from '@/types/stream';

const VideoCallComponent: React.FC<VideoCallComponentProps> = ({ 
  videoClient, 
  call, 
  onEndCall,
  otherUser 
}) => {
  if (!videoClient || !call) {
    return <VideoCallSkeleton />;
  }

  return (
    <StreamVideo client={videoClient}>
      <StreamCall call={call}>
        <VideoCallInterface 
          onEndCall={onEndCall}
          otherUser={otherUser}
        />
      </StreamCall>
    </StreamVideo>
  );
};

interface VideoCallInterfaceProps {
  onEndCall: () => void;
  otherUser: User;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({ onEndCall, otherUser }) => {
  const call = useCall();
  const { useParticipants, useCallCallingState } = useCallStateHooks();
  
  const participants = useParticipants();
  const callingState = useCallCallingState();

  const getCallStatus = (): string => {
    switch (callingState) {
      case 'joined':
        return 'En appel';
      case 'connecting':
        return 'Connexion...';
      case 'reconnecting':
        return 'Reconnexion...';
      case 'offline':
        return 'Hors ligne';
      default:
        return 'Connexion...';
    }
  };

  return (
    <div className="h-full bg-black relative">
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              callingState === 'joined' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm font-medium">{getCallStatus()}</span>
          </div>
          {otherUser && (
            <p className="text-xs text-gray-300 mt-1">
              Avec {otherUser.name}
            </p>
          )}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <div className="bg-black bg-opacity-60 text-white px-3 py-1 rounded-lg text-sm">
          {participants.length} participant{participants.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="h-full relative">
        {participants.length > 0 ? (
          <SpeakerLayout />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-semibold mb-2">En attente...</h3>
              <p className="text-gray-300">
                {otherUser ? `${otherUser.name} va bientôt vous rejoindre` : 'En attente d\'un autre participant'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <CustomCallControls onEndCall={onEndCall} />
      </div>

      <CallTimer />
    </div>
  );
};

interface CustomCallControlsProps {
  onEndCall: () => void;
}

const CustomCallControls: React.FC<CustomCallControlsProps> = ({ onEndCall }) => {
  const call = useCall();
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);

  const toggleAudio = async (): Promise<void> => {
    try {
      if (isAudioOn) {
        await call?.microphone.disable();
      } else {
        await call?.microphone.enable();
      }
      setIsAudioOn(!isAudioOn);
    } catch (error) {
      console.error('Erreur toggle audio:', error);
    }
  };

  const toggleVideo = async (): Promise<void> => {
    try {
      if (isVideoOn) {
        await call?.camera.disable();
      } else {
        await call?.camera.enable();
      }
      setIsVideoOn(!isVideoOn);
    } catch (error) {
      console.error('Erreur toggle video:', error);
    }
  };

  const toggleScreenShare = async (): Promise<void> => {
    try {
      await call?.screenShare.toggle();
    } catch (error) {
      console.error('Erreur partage d\'écran:', error);
    }
  };

  return (
    <div className="flex items-center space-x-4 bg-black bg-opacity-80 rounded-2xl px-6 py-3">
      <button
        onClick={toggleAudio}
        className={`p-3 rounded-full transition-all ${
          isAudioOn 
            ? 'bg-gray-600 hover:bg-gray-500 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
        title={isAudioOn ? 'Couper le micro' : 'Activer le micro'}
        type="button"
      >
        {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
      </button>

      <button
        onClick={toggleVideo}
        className={`p-3 rounded-full transition-all ${
          isVideoOn 
            ? 'bg-gray-600 hover:bg-gray-500 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
        title={isVideoOn ? 'Couper la caméra' : 'Activer la caméra'}
        type="button"
      >
        {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
      </button>

      <button
        className="p-3 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-all"
        title="Partager l'écran"
        onClick={toggleScreenShare}
        type="button"
      >
        <Monitor className="h-6 w-6" />
      </button>

      <button
        onClick={onEndCall}
        className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
        title="Raccrocher"
        type="button"
      >
        <PhoneOff className="h-6 w-6" />
      </button>
    </div>
  );
};

const CallTimer: React.FC = () => {
  const [callDuration, setCallDuration] = useState<number>(0);
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (callingState === 'joined') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callingState]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callingState !== 'joined' || callDuration === 0) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
      <div className="bg-black bg-opacity-60 text-white px-3 py-1 rounded-lg text-sm font-mono">
        {formatDuration(callDuration)}
      </div>
    </div>
  );
};

const VideoCallSkeleton: React.FC = () => {
  return (
    <div className="h-full bg-black flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-300">Préparation de l'appel...</p>
      </div>
    </div>
  );
};

export default VideoCallComponent;