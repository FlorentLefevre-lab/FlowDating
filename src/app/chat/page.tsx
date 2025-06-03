// src/app/chat/page.tsx - UX améliorée pour une vraie app de dating
'use client';

import React, { useState, useEffect } from 'react';
import { ChatSystem } from '@/components/chat/ChatSystem';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  MessageCircle, 
  Users, 
  ArrowLeft, 
  Search, 
  Heart,
  Sparkles,
  Clock,
  Send,
  UserPlus,
  Star
} from 'lucide-react';

// Types
interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  age?: number;
  bio?: string;
  location?: string;
  profession?: string;
  interests?: string[];
}

interface Match {
  id: string;
  user: User;
  matchedAt: string;
  compatibility?: number;
}

interface Conversation {
  id: string;
  user: User;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  messageCount: number;
  unreadCount: number;
  lastActivity: string;
}

interface ChatState {
  mode: 'dashboard' | 'chat';
  selectedUser: User | null;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // États
  const [chatState, setChatState] = useState<ChatState>({
    mode: 'dashboard',
    selectedUser: null
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conversations' | 'matches'>('conversations');

  // Charger l'utilisateur actuel
  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/current');
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur actuel:', error);
    }
  };

  // Charger les conversations avec messages
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversations(data.conversations || []);
        }
      }
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    }
  };

  // Charger les matchs sans conversation encore
  const loadMatches = async () => {
    try {
      const response = await fetch('/api/matches');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filtrer les matchs qui n'ont pas encore de conversation
          const matchesWithoutConvo = data.matches.filter((match: Match) => 
            !conversations.some(conv => conv.user.id === match.user.id)
          );
          setMatches(matchesWithoutConvo);
        }
      }
    } catch (error) {
      console.error('Erreur chargement matchs:', error);
    }
  };

  // Chargement initial
  useEffect(() => {
    const initializePage = async () => {
      if (status === 'loading') return;
      
      if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Charger en parallèle
        await Promise.all([
          loadCurrentUser(),
          loadConversations(),
          loadMatches()
        ]);

        // Vérifier si on a un chat direct via URL
        const userIdParam = searchParams.get('userId');
        if (userIdParam) {
          // Trouver l'utilisateur dans les conversations ou matchs
          let targetUser = conversations.find(conv => conv.user.id === userIdParam)?.user;
          if (!targetUser) {
            targetUser = matches.find(match => match.user.id === userIdParam)?.user;
          }

          if (targetUser) {
            setChatState({
              mode: 'chat',
              selectedUser: targetUser
            });
          } else {
            setError(`Conversation introuvable avec ${userIdParam}`);
          }
        }

      } catch (error: any) {
        console.error('Erreur initialisation chat:', error);
        setError(`Erreur d'initialisation: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, [status, router, searchParams]);

  // Recharger les matchs après le chargement des conversations
  useEffect(() => {
    if (conversations.length > 0) {
      loadMatches();
    }
  }, [conversations]);

  // Démarrer une conversation
  const startConversation = (user: User) => {
    console.log('💬 Démarrage conversation avec:', user.name, user.id);
    setChatState({
      mode: 'chat',
      selectedUser: user
    });
  };

  // Retour au dashboard
  const backToDashboard = () => {
    setChatState({
      mode: 'dashboard',
      selectedUser: null
    });
    // Recharger les données au retour
    loadConversations();
    loadMatches();
  };

  // Calculer le temps depuis la dernière activité
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString();
  };

  // Interface de chargement
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos conversations...</p>
        </div>
      </div>
    );
  }

  // Interface d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-red-600 text-center mb-4">
            <MessageCircle size={48} className="mx-auto mb-2" />
            <h2 className="text-lg font-semibold">Erreur de Chat</h2>
          </div>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  // Mode Chat - Affichage du ChatSystem
  if (chatState.mode === 'chat' && chatState.selectedUser && currentUser) {
    return (
      <div className="h-screen bg-gray-50">
        <div className="container mx-auto h-full max-w-4xl">
          {/* Header avec bouton retour */}
          <div className="bg-white border-b px-4 py-3 flex items-center">
            <button
              onClick={backToDashboard}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mr-4"
            >
              <ArrowLeft size={20} />
              <span>Retour</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {chatState.selectedUser.name?.charAt(0) || '?'}
              </div>
              <div>
                <h3 className="font-semibold">{chatState.selectedUser.name}</h3>
                <p className="text-sm text-gray-500">
                  {chatState.selectedUser.age && `${chatState.selectedUser.age} ans`}
                  {chatState.selectedUser.location && ` • ${chatState.selectedUser.location}`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white h-full shadow-lg">
            <ChatSystem
              currentUser={currentUser}
              remoteUser={chatState.selectedUser}
              onClose={backToDashboard}
            />
          </div>
        </div>
      </div>
    );
  }

  // Mode Dashboard - Vue d'ensemble des conversations et matchs
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl p-4">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <MessageCircle className="text-pink-600" />
                <span>Messages</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Vos conversations et nouveaux matchs
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-pink-600">
                {conversations.length + matches.length}
              </div>
              <div className="text-sm text-gray-500">
                {conversations.length} conversation{conversations.length > 1 ? 's' : ''} • 
                {matches.length} nouveau{matches.length > 1 ? 'x' : ''} match{matches.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 px-6 py-4 font-medium text-center transition-colors ${
                activeTab === 'conversations'
                  ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <MessageCircle size={18} />
                <span>Conversations ({conversations.length})</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 px-6 py-4 font-medium text-center transition-colors ${
                activeTab === 'matches'
                  ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Heart size={18} />
                <span>Nouveaux matchs ({matches.length})</span>
              </div>
            </button>
          </div>
        </div>

        {/* Contenu des tabs */}
        {activeTab === 'conversations' && (
          <div className="space-y-4">
            {conversations.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucune conversation en cours
                </h3>
                <p className="text-gray-500 mb-4">
                  Commencez à chatter avec vos matchs !
                </p>
                <button
                  onClick={() => setActiveTab('matches')}
                  className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  Voir vos matchs
                </button>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => startConversation(conversation.user)}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="relative">
                      {conversation.user.image ? (
                        <img
                          src={conversation.user.image}
                          alt={conversation.user.name}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {conversation.user.name?.charAt(0) || '?'}
                        </div>
                      )}
                      
                      {conversation.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.user.name || conversation.user.email?.split('@')[0]}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(conversation.lastActivity)}
                        </span>
                      </div>
                      
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage.senderId === currentUser?.id ? 'Vous: ' : ''}
                          {conversation.lastMessage.content}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {conversation.messageCount} message{conversation.messageCount > 1 ? 's' : ''}
                        </span>
                        <Send size={14} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun nouveau match
                </h3>
                <p className="text-gray-500 mb-4">
                  Continuez à swiper pour trouver de nouveaux matchs !
                </p>
                <button
                  onClick={() => router.push('/discover')}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
                >
                  Découvrir des profils
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-200"
                  >
                    {/* Photo */}
                    <div className="relative h-32">
                      {match.user.image ? (
                        <img
                          src={match.user.image}
                          alt={match.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-3xl font-bold">
                            {match.user.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      
                      {/* Badge nouveau match */}
                      <div className="absolute top-2 left-2">
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          Nouveau match
                        </span>
                      </div>
                      
                      {/* Score de compatibilité */}
                      {match.compatibility && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-white bg-opacity-90 text-pink-600 text-xs font-bold px-2 py-1 rounded-full">
                            {match.compatibility}% ♥
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Infos */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {match.user.name || match.user.email?.split('@')[0]}
                      </h3>
                      
                      <p className="text-sm text-gray-500 mb-3">
                        Matchés {getTimeAgo(match.matchedAt)}
                        {match.user.age && ` • ${match.user.age} ans`}
                      </p>
                      
                      <button
                        onClick={() => startConversation(match.user)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
                      >
                        <Send size={16} />
                        <span>Envoyer un message</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action flottante */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => router.push('/discover')}
            className="w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center group"
            title="Découvrir de nouveaux profils"
          >
            <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}