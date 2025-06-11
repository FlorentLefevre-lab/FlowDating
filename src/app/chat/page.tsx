// src/app/chat/page.tsx - Version optimisée avec hooks refactorisés
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chat,
  ChannelList,
  Channel,
  Window,
  MessageList,
  MessageInput,
  Thread,
  Avatar
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import AuthGuard from '../../components/auth/AuthGuard';
import { useStream } from '../../hooks/useStream';
import { useAuth } from '../../hooks/useAuth';
import { useApiWithCache } from '../../hooks/useApiWithCache';
import { clientCache } from '../../lib/cache';

// Custom styles optimisés
const customStyles = `
  .str-chat {
    height: 100vh;
    font-family: inherit;
  }
  
  .str-chat-channel-list {
    background: white;
    border-right: 1px solid #e5e7eb;
    width: 350px;
  }
  
  .str-chat-message-simple__content .str-chat-message-text {
    background: #f3f4f6;
    border-radius: 16px;
    padding: 8px 12px;
    margin: 4px 0;
  }
  
  .str-chat-message-simple__content--me .str-chat-message-text {
    background: #ec4899;
    color: white;
  }

  .str-chat-message-input {
    background: white;
    border-top: 1px solid #e5e7eb;
    padding: 1rem;
  }

  .str-chat-message-input__input {
    border-radius: 20px;
    border: 1px solid #d1d5db;
    padding: 8px 16px;
  }

  @media (max-width: 768px) {
    .str-chat-channel-list {
      width: 100%;
      position: absolute;
      z-index: 10;
      height: 100%;
    }
    
    .chat-mobile-hidden {
      display: none;
    }
  }
`;

// 🚀 Hook pour les conversations optimisé
function useConversations() {
  return useApiWithCache('/api/matches', {
    cacheKey: 'user-conversations',
    cacheTtl: 2 * 60 * 1000, // 2 minutes de cache
  });
}

// 🚀 Hook pour les statistiques de chat optimisé
function useChatStats() {
  return useApiWithCache('/api/chat/stats', {
    cacheKey: 'chat-stats',
    cacheTtl: 30 * 1000, // 30 secondes
  });
}

// Composant Preview personnalisé optimisé
const CustomChannelPreview = React.memo((props: any) => {
  const { channel, active, setActiveChannel, lastMessage, unread } = props;
  
  const channelData = useMemo(() => {
    if (channel.data?.name) return { name: channel.data.name, avatar: null };
    
    const members = Object.values(channel.state.members || {});
    const otherMember = members.find((member: any) => member.user_id !== channel._client.userID);
    
    return {
      name: otherMember?.user?.name || 'Conversation',
      avatar: otherMember?.user?.image || null
    };
  }, [channel]);

  const lastMessageTime = useMemo(() => {
    if (!lastMessage) return '';
    return new Date(lastMessage.created_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [lastMessage]);

  return (
    <div 
      className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        active ? 'bg-pink-50 border-l-4 border-l-pink-500' : ''
      }`}
      onClick={setActiveChannel}
    >
      <div className="flex items-center space-x-3">
        <Avatar 
          name={channelData.name}
          image={channelData.avatar}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 truncate">
              {channelData.name}
            </h3>
            {lastMessage && (
              <span className="text-xs text-gray-500">
                {lastMessageTime}
              </span>
            )}
          </div>
          {lastMessage && (
            <p className="text-sm text-gray-500 truncate">
              {lastMessage.text || '📎 Fichier partagé'}
            </p>
          )}
        </div>
        {unread && unread > 0 && (
          <div className="w-5 h-5 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </div>
    </div>
  );
});

CustomChannelPreview.displayName = 'CustomChannelPreview';

// En-tête de la liste des conversations optimisé
const ChannelListHeader = React.memo(() => {
  const { data: stats } = useChatStats();
  
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <div className="relative w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">💬</span>
          {stats?.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
              {stats.unreadCount > 9 ? '9+' : stats.unreadCount}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Messages</h2>
          <p className="text-sm text-gray-500">
            {stats?.totalConversations || 0} conversation(s)
          </p>
        </div>
      </div>
    </div>
  );
});

ChannelListHeader.displayName = 'ChannelListHeader';

// État vide optimisé
const EmptyStateComponent = React.memo(() => (
  <div className="flex-1 flex items-center justify-center bg-gray-50">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-pink-500 text-3xl">💬</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        Aucune conversation sélectionnée
      </h3>
      <p className="text-gray-500 mb-6">
        Choisissez une conversation dans la liste pour commencer à discuter
      </p>
      <div className="text-sm text-gray-400">
        💡 Astuce : Utilisez la page Découverte pour faire de nouveaux matchs !
      </div>
    </div>
  </div>
));

EmptyStateComponent.displayName = 'EmptyStateComponent';

// Composant de chargement optimisé
const LoadingComponent = React.memo(() => (
  <div className="h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="w-16 h-16 border-4 border-pink-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Connexion au chat...
      </h2>
      <p className="text-gray-600">Chargement de vos conversations</p>
    </div>
  </div>
));

LoadingComponent.displayName = 'LoadingComponent';

// Composant d'erreur optimisé
const ErrorComponent = React.memo(({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-red-500 text-2xl">⚠️</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Erreur de connexion
      </h2>
      <p className="text-gray-600 mb-6">{error}</p>
      <div className="space-y-3">
        <button
          onClick={onRetry}
          className="w-full bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors font-medium"
        >
          Réessayer la connexion
        </button>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          Recharger la page
        </button>
      </div>
    </div>
  </div>
));

ErrorComponent.displayName = 'ErrorComponent';

// Hook personnalisé pour gérer l'état mobile
function useMobileView() {
  const [isMobile, setIsMobile] = useState(false);
  const [showChannelList, setShowChannelList] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowChannelList(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return { isMobile, showChannelList, setShowChannelList };
}

// Composant principal de la page Chat
export default function ChatPage() {
  const { session, isLoading: authLoading, isAuthenticated } = useAuth();
  const { chatClient, loading, error } = useStream(
    session?.user ? {
      id: session.user.id!,
      name: session.user.name!,
      image: session.user.image
    } : null
  );
  
  const { isMobile, showChannelList, setShowChannelList } = useMobileView();
  const [selectedChannel, setSelectedChannel] = useState(null);

  // 🚀 Configuration optimisée des filtres avec mise en cache
  const channelConfig = useMemo(() => {
    if (!session?.user?.id) return null;

    return {
      filters: {
        type: 'messaging',
        members: { $in: [session.user.id] }
      },
      sort: { last_message_at: -1 },
      options: { 
        limit: 20, 
        presence: true, 
        state: true,
        watch: true
      }
    };
  }, [session?.user?.id]);

  // 🚀 Gérer les notifications en temps réel
  useEffect(() => {
    if (!chatClient) return;

    const handleNewMessage = (event: any) => {
      // Invalider le cache des stats pour mettre à jour les compteurs
      clientCache.invalidate('chat-stats');
      
      // Notification browser si l'onglet n'est pas visible
      if (document.hidden && event.message?.user?.id !== session?.user?.id) {
        const notification = new Notification('Nouveau message', {
          body: event.message?.text || 'Vous avez reçu un nouveau message',
          icon: '/default-avatar.png'
        });
        
        setTimeout(() => notification.close(), 5000);
      }
    };

    chatClient.on('message.new', handleNewMessage);
    
    return () => {
      chatClient.off('message.new', handleNewMessage);
    };
  }, [chatClient, session?.user?.id]);

  // 🚀 Demander permission pour les notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Gestion des états de chargement et d'erreur
  if (authLoading || loading) {
    return (
      <AuthGuard requireAuth={true}>
        <LoadingComponent />
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard requireAuth={true}>
        <ErrorComponent 
          error={error} 
          onRetry={() => window.location.reload()} 
        />
      </AuthGuard>
    );
  }

  if (!chatClient || !channelConfig) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Connexion requise
            </h2>
            <p className="text-gray-600">
              Veuillez vous connecter pour accéder au chat
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="h-screen bg-gray-50 overflow-hidden">
        <style jsx global>{customStyles}</style>
        
        <Chat client={chatClient} theme="str-chat__theme-light">
          <div className="flex h-full">
            
            {/* 📱 Liste des conversations avec gestion mobile optimisée */}
            <div className={`w-80 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ${
              isMobile 
                ? (showChannelList ? 'translate-x-0' : '-translate-x-full absolute z-20 w-full h-full') 
                : 'relative'
            }`}>
              <ChannelListHeader />
              
              <div className="flex-1 overflow-hidden">
                <ChannelList
                  filters={channelConfig.filters}
                  sort={channelConfig.sort}
                  options={channelConfig.options}
                  Preview={CustomChannelPreview}
                  EmptyStateIndicator={() => (
                    <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-gray-400 text-xl">💬</span>
                      </div>
                      <p className="text-gray-500 text-sm mb-2">
                        Aucune conversation pour le moment
                      </p>
                      <p className="text-gray-400 text-xs">
                        Commencez à discuter avec vos matchs !
                      </p>
                    </div>
                  )}
                  onSelect={(channel) => {
                    setSelectedChannel(channel);
                    if (isMobile) setShowChannelList(false);
                  }}
                />
              </div>
            </div>

            {/* 💬 Zone de conversation principale */}
            <div className="flex-1 flex flex-col bg-white">
              <Channel EmptyStateIndicator={EmptyStateComponent}>
                <Window>
                  {/* 📱 Header avec navigation mobile */}
                  <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      {isMobile && (
                        <button
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={() => setShowChannelList(true)}
                        >
                          <span className="text-lg">←</span>
                        </button>
                      )}
                      <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-xs">💬</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedChannel?.data?.name || 'Conversation'}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <p className="text-sm text-gray-500">En ligne</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 🔧 Actions de conversation */}
                    <div className="flex items-center space-x-2">
                      <button 
                        className="p-2 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                        title="Appel audio"
                      >
                        📞
                      </button>
                      <button 
                        className="p-2 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                        title="Appel vidéo"
                      >
                        📹
                      </button>
                      <button 
                        className="p-2 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                        title="Plus d'options"
                      >
                        ⋮
                      </button>
                    </div>
                  </div>
                  
                  {/* 📨 Liste des messages */}
                  <MessageList 
                    threadList={false}
                    disableDateSeparator={false}
                  />
                  
                  {/* ✍️ Zone de saisie optimisée */}
                  <MessageInput 
                    grow={true}
                    placeholder="Tapez votre message..."
                    mentionAllAppUsers={false}
                    focus={!isMobile} // Auto-focus seulement sur desktop
                    maxRows={4}
                  />
                </Window>
                
                {/* 🧵 Thread de discussion */}
                <Thread />
              </Channel>
            </div>
          </div>
        </Chat>
      </div>
    </AuthGuard>
  );
}