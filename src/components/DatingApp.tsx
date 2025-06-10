// src/components/DatingApp.tsx - Adapté à votre structure

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useStream } from '@/hooks/useStream';
import ChatComponent from './ChatComponent';
import VideoCallComponent from './VideoCallComponent';
import { Heart, MessageCircle, User, Video, Phone, ArrowLeft } from 'lucide-react';
import type { 
  User as StreamUser, 
  HeaderProps, 
  SidebarProps, 
  ProfileTabProps,
  TabType,
  prismaUserToStreamUser 
} from '@/types/stream';

const DatingApp: React.FC = () => {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [matchedUser, setMatchedUser] = useState<StreamUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les paramètres de l'URL
  const userId = searchParams.get('userId');
  const matchId = searchParams.get('matchId');

  useEffect(() => {
    const loadMatchedUser = async () => {
      try {
        if (!currentUser || !userId) {
          setLoading(false);
          return;
        }

        console.log('🔍 Chargement utilisateur:', userId);

        // Récupérer les infos de l'autre utilisateur via votre API
        const response = await fetch(`/api/users/${userId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors du chargement de l\'utilisateur');
        }

        const { user: userData } = await response.json();
        
        // Convertir les données Prisma en format Stream
        const streamUser: StreamUser = {
          id: userData.id,
          name: userData.name || 'Utilisateur',
          email: userData.email,
          image: userData.image || '/default-avatar.png',
          age: userData.age,
          bio: userData.bio,
          location: userData.location,
          profession: userData.profession,
          gender: userData.gender,
          isOnline: userData.isOnline || false,
          lastSeen: userData.lastSeen ? new Date(userData.lastSeen) : null
        };

        setMatchedUser(streamUser);
        console.log('✅ Utilisateur chargé:', streamUser.name);

      } catch (err) {
        console.error('❌ Erreur chargement utilisateur:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadMatchedUser();
    }
  }, [currentUser, userId, matchId, authLoading]);

  // Convertir currentUser en format Stream
  const streamCurrentUser: StreamUser | null = currentUser ? {
    id: currentUser.id,
    name: currentUser.name || 'Moi',
    email: currentUser.email,
    image: currentUser.image || '/default-avatar.png',
    age: currentUser.age,
    bio: currentUser.bio,
    location: currentUser.location,
    profession: currentUser.profession,
    gender: currentUser.gender,
    isOnline: true // L'utilisateur connecté est forcément en ligne
  } : null;

  // Initialiser Stream avec les vrais utilisateurs
  const { chatClient, videoClient, channel, loading: streamLoading, error: streamError } = useStream(
    streamCurrentUser!, 
    matchedUser!
  );

  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [call, setCall] = useState<any>(null);

  const startAudioCall = async (): Promise<void> => {
    if (!videoClient) return;
    
    try {
      const callId = `audio-${Date.now()}`;
      const newCall = videoClient.call('default', callId);
      
      await newCall.camera.disable();
      await newCall.join({ create: true });
      
      setCall(newCall);
      setIsInCall(true);
      setActiveTab('video');
    } catch (error) {
      console.error('Erreur démarrage appel audio:', error);
      alert('Impossible de démarrer l\'appel audio');
    }
  };

  const startVideoCall = async (): Promise<void> => {
    if (!videoClient) return;
    
    try {
      const callId = `video-${Date.now()}`;
      const newCall = videoClient.call('default', callId);
      
      await newCall.join({ create: true });
      setCall(newCall);
      setIsInCall(true);
      setActiveTab('video');
    } catch (error) {
      console.error('Erreur démarrage appel vidéo:', error);
      alert('Impossible de démarrer l\'appel vidéo');
    }
  };

  const endCall = async (): Promise<void> => {
    if (call) {
      try {
        await call.leave();
        setCall(null);
        setIsInCall(false);
        setActiveTab('chat');
      } catch (error) {
        console.error('Erreur fin d\'appel:', error);
      }
    }
  };

  const goBackToMatches = () => {
    window.location.href = '/matches';
  };

  // États de chargement
  if (authLoading || loading || streamLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading && 'Vérification de l\'authentification...'}
            {loading && 'Chargement de l\'utilisateur...'}
            {streamLoading && 'Connexion au chat...'}
          </p>
        </div>
      </div>
    );
  }

  // Gestion des erreurs
  if (error || streamError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-100 to-pink-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 mb-4">
            <Heart className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error || streamError}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
              type="button"
            >
              Réessayer
            </button>
            <button 
              onClick={goBackToMatches}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              type="button"
            >
              Retour aux matchs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vérifications de sécurité
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Heart className="h-12 w-12 text-pink-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Veuillez vous connecter pour accéder au chat</p>
          <button 
            onClick={() => window.location.href = '/auth/login'}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
            type="button"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  if (!matchedUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Utilisateur non trouvé</h2>
          <p className="text-gray-600 mb-4">
            {userId ? 'Cet utilisateur n\'existe pas ou n\'est plus disponible.' : 'Aucun utilisateur sélectionné.'}
          </p>
          <button 
            onClick={goBackToMatches}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
            type="button"
          >
            Retour aux matchs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isInCall={isInCall}
        onStartVideoCall={startVideoCall}
        onEndCall={endCall}
        onGoBack={goBackToMatches}
        matchedUser={matchedUser}
      />

      <div className="flex h-[calc(100vh-80px)]">
        <Sidebar matchedUser={matchedUser} />

        <div className="flex-1">
          {activeTab === 'chat' && (
            <ChatComponent
              chatClient={chatClient}
              channel={channel}
              otherUser={matchedUser}
              onStartCall={startAudioCall}
              onStartVideoCall={startVideoCall}
            />
          )}

          {activeTab === 'video' && isInCall && call && (
            <VideoCallComponent
              videoClient={videoClient}
              call={call}
              onEndCall={endCall}
              otherUser={matchedUser}
            />
          )}

          {activeTab === 'profile' && streamCurrentUser && (
            <ProfileTab currentUser={streamCurrentUser} />
          )}

          {activeTab !== 'video' && activeTab !== 'chat' && activeTab !== 'profile' && (
            <WelcomeScreen matchedUser={matchedUser} />
          )}
        </div>
      </div>
    </div>
  );
};

// Header adapté avec bouton retour
interface HeaderPropsExtended extends HeaderProps {
  onGoBack: () => void;
  matchedUser: StreamUser;
}

const Header: React.FC<HeaderPropsExtended> = ({ 
  activeTab, 
  setActiveTab, 
  isInCall, 
  onStartVideoCall, 
  onEndCall,
  onGoBack,
  matchedUser 
}) => {
  return (
    <div className="bg-white shadow-sm border-b border-pink-100 p-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          <button
            onClick={onGoBack}
            className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
            title="Retour"
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <Heart className="h-8 w-8 text-pink-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Chat avec {matchedUser.name}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'profile' ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Mon profil"
            type="button"
          >
            <User className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'chat' ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Chat"
            type="button"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          
          {!isInCall ? (
            <button
              onClick={onStartVideoCall}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-2 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
              title="Démarrer appel vidéo"
              type="button"
            >
              <Video className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={onEndCall}
              className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
              title="Raccrocher"
              type="button"
            >
              <Phone className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Sidebar adaptée avec vraies données
const Sidebar: React.FC<SidebarProps> = ({ matchedUser }) => {
  const getStatusText = () => {
    if (matchedUser.isOnline) return 'En ligne';
    if (matchedUser.lastSeen) {
      const lastSeen = new Date(matchedUser.lastSeen);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
      
      if (diffMinutes < 60) return `Vu il y a ${diffMinutes}min`;
      if (diffMinutes < 1440) return `Vu il y a ${Math.floor(diffMinutes / 60)}h`;
      return `Vu il y a ${Math.floor(diffMinutes / 1440)}j`;
    }
    return 'Hors ligne';
  };

  return (
    <div className="w-80 bg-white shadow-sm border-r border-pink-100 p-6">
      <div className="text-center">
        <div className="relative inline-block">
          <img
            src={matchedUser.image || '/default-avatar.png'}
            alt={matchedUser.name || 'Utilisateur'}
            className="w-24 h-24 rounded-full border-4 border-pink-200 object-cover"
          />
          {matchedUser.isOnline && (
            <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        
        <h2 className="text-xl font-semibold text-gray-800 mt-3">
          {matchedUser.name || 'Utilisateur'}
        </h2>
        <p className="text-gray-600">
          {matchedUser.age && `${matchedUser.age} ans`}
          {matchedUser.age && matchedUser.location && ' • '}
          {matchedUser.location}
        </p>
        
        <div className="mt-4">
          <p className="text-sm text-gray-500">{getStatusText()}</p>
        </div>
        
        <div className="mt-6 space-y-3">
          {matchedUser.profession && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">{matchedUser.profession}</p>
            </div>
          )}
          
          {matchedUser.bio && (
            <div className="bg-pink-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700">{matchedUser.bio}</p>
            </div>
          )}
          
          {matchedUser.gender && (
            <div className="text-center">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                {matchedUser.gender}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ProfileTab et WelcomeScreen restent similaires...
const ProfileTab: React.FC<ProfileTabProps> = ({ currentUser }) => {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Mon Profil</h2>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center space-x-4 mb-6">
            <img
              src={currentUser.image || '/default-avatar.png'}
              alt={currentUser.name || 'Moi'}
              className="w-20 h-20 rounded-full border-4 border-pink-200 object-cover"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{currentUser.name}</h3>
              <p className="text-gray-600">
                {currentUser.age && `${currentUser.age} ans`}
                {currentUser.age && currentUser.location && ' • '}
                {currentUser.location}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                À propos de moi
              </label>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                {currentUser.bio || 'Aucune description disponible'}
              </p>
            </div>
            
            <button 
              onClick={() => window.location.href = '/profile'}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
              type="button"
            >
              Modifier mon profil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const WelcomeScreen: React.FC<{ matchedUser: StreamUser }> = ({ matchedUser }) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Heart className="h-16 w-16 text-pink-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          Chat avec {matchedUser.name}
        </h3>
        <p className="text-gray-500">Sélectionnez une option pour commencer à discuter</p>
      </div>
    </div>
  );
};

export default DatingApp;