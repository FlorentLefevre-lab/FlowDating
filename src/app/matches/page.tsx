// src/app/matches/page.tsx - Page des matchs corrigée et compatible
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Heart, 
  MessageCircle, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Sparkles,
  Users,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';

// Interfaces compatibles avec l'API corrigée
interface MatchUser {
  id: string;
  name: string;
  email: string;
  age: number | null;
  bio: string | null;
  location: string | null;
  profession: string | null;
  interests: string[];
  gender: string | null;
  photos: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
}

interface Match {
  id: string;
  user: MatchUser;
  matchedAt: string;
  lastMessageAt?: string;
  lastMessage?: {
    content: string;
    senderId: string;
  };
  messageCount: number;
  isOnline?: boolean;
  compatibility?: number;
}

interface MatchStats {
  totalMatches: number;
  newMatches: number;
  activeConversations: number;
  responseRate: number;
}

interface MatchesResponse {
  success: boolean;
  matches: Match[];
  stats: MatchStats;
  currentUser: {
    id: string;
    interests: string[];
  };
  meta: {
    timestamp: string;
    algorithm: string;
  };
  error?: string;
}

export default function MatchesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // États
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<MatchStats>({
    totalMatches: 0,
    newMatches: 0,
    activeConversations: 0,
    responseRate: 0
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'active' | 'unread'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'compatibility' | 'activity'>('recent');

  // Helper pour obtenir la photo principale
  const getPrimaryPhoto = (user: MatchUser): string => {
    const primaryPhoto = user.photos.find(photo => photo.isPrimary);
    return primaryPhoto?.url || user.photos[0]?.url || '';
  };

  // Charger les matchs
  const loadMatches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Chargement des matchs...');

      const response = await fetch('/api/matches');
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data: MatchesResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur API inconnue');
      }
      
      setMatches(data.matches || []);
      setStats(data.stats);
      setCurrentUser(data.currentUser);
      
      console.log(`✅ ${data.matches?.length || 0} matchs chargés`);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement matchs:', error);
      setError(`Impossible de charger les matchs: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    loadMatches();
  }, [status, router]);

  // Filtrer et trier les matchs
  const filteredMatches = matches
    .filter(match => {
      switch (filter) {
        case 'new':
          return new Date(match.matchedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
        case 'active':
          return match.messageCount > 0;
        case 'unread':
          return match.lastMessage && match.lastMessage.senderId !== currentUser?.id;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'compatibility':
          return (b.compatibility || 0) - (a.compatibility || 0);
        case 'activity':
          if (!a.lastMessageAt && !b.lastMessageAt) return 0;
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        case 'recent':
        default:
          return new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime();
      }
    });

  // Ouvrir le chat
  const openChat = (match: Match) => {
    router.push(`/chat?userId=${encodeURIComponent(match.user.id)}&matchId=${encodeURIComponent(match.id)}`);
  };

  // Calculer le temps depuis le match
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `il y a ${diffHours}h`;
    if (diffMinutes > 0) return `il y a ${diffMinutes}min`;
    return 'À l\'instant';
  };

  // Interface de chargement
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {status === 'loading' ? 'Chargement de la session...' : 'Chargement des matchs...'}
          </p>
        </div>
      </div>
    );
  }

  // Interface d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-red-600 text-center mb-4">
            <Heart size={48} className="mx-auto mb-2" />
            <h2 className="text-lg font-semibold">Erreur de chargement</h2>
          </div>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors"
            >
              Recharger
            </button>
            <button
              onClick={loadMatches}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="container mx-auto max-w-6xl p-4">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <Heart className="text-pink-600" />
                <span>Mes Matchs</span>
                <Sparkles className="text-yellow-500" size={24} />
              </h1>
              <p className="text-gray-600 mt-1">
                Vos likes réciproques - Les vraies connexions ! 
              </p>
              <p className="text-sm text-pink-600 font-medium">
                💕 {stats.totalMatches} match{stats.totalMatches > 1 ? 's' : ''} • 
                💬 {stats.activeConversations} conversation{stats.activeConversations > 1 ? 's' : ''} active{stats.activeConversations > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-pink-600">{filteredMatches.length}</div>
              <div className="text-sm text-gray-500">match{filteredMatches.length > 1 ? 's' : ''} affiché{filteredMatches.length > 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Matchs</p>
                <p className="text-2xl font-bold text-pink-600">{stats.totalMatches}</p>
              </div>
              <Heart className="text-pink-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nouveaux (24h)</p>
                <p className="text-2xl font-bold text-green-600">{stats.newMatches}</p>
              </div>
              <Star className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversations</p>
                <p className="text-2xl font-bold text-blue-600">{stats.activeConversations}</p>
              </div>
              <MessageCircle className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux de réponse</p>
                <p className="text-2xl font-bold text-purple-600">{stats.responseRate}%</p>
              </div>
              <TrendingUp className="text-purple-500" size={24} />
            </div>
          </div>
        </div>

        {/* Filtres et tri */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Filtrer:</span>
              {[
                { key: 'all', label: 'Tous', icon: Users },
                { key: 'new', label: 'Nouveaux', icon: Star },
                { key: 'active', label: 'Actifs', icon: MessageCircle },
                { key: 'unread', label: 'Non lus', icon: Clock }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
                    filter === key
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Trier par:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="recent">Plus récents</option>
                <option value="activity">Activité</option>
                <option value="compatibility">Compatibilité</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des matchs */}
        {filteredMatches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Heart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'Aucun match pour le moment' : `Aucun match ${filter}`}
            </h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all' 
                ? 'Continuez à swiper pour trouver vos âmes sœurs !' 
                : `Changez de filtre pour voir tous vos matchs.`
              }
            </p>
            <div className="space-y-3">
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors mr-3"
                >
                  Voir tous les matchs
                </button>
              )}
              <button
                onClick={() => router.push('/discover')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Découvrir des profils
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200"
              >
                {/* Photo de profil */}
                <div className="relative">
                  {getPrimaryPhoto(match.user) ? (
                    <img
                      src={getPrimaryPhoto(match.user)}
                      alt={match.user.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">
                        {match.user.name?.charAt(0) || match.user.email?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  
                  {/* Badge de statut */}
                  <div className="absolute top-3 left-3 flex space-x-2">
                    {match.isOnline && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        En ligne
                      </span>
                    )}
                    {new Date(match.matchedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                        Nouveau
                      </span>
                    )}
                  </div>

                  {/* Badge de compatibilité */}
                  {match.compatibility && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-white bg-opacity-90 text-pink-600 text-xs font-bold px-2 py-1 rounded-full">
                        {match.compatibility}% ♥
                      </div>
                    </div>
                  )}
                </div>

                {/* Infos utilisateur */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {match.user.name || match.user.email?.split('@')[0]}
                      </h3>
                      {match.user.age && (
                        <p className="text-gray-600">{match.user.age} ans</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Match</div>
                      <div className="text-xs text-pink-600 font-medium">
                        {getTimeAgo(match.matchedAt)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Infos supplémentaires */}
                  <div className="space-y-1 mb-3">
                    {match.user.profession && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Briefcase size={14} className="mr-1" />
                        <span className="truncate">{match.user.profession}</span>
                      </div>
                    )}
                    
                    {match.user.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin size={14} className="mr-1" />
                        <span className="truncate">{match.user.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  {match.user.bio && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {match.user.bio}
                    </p>
                  )}

                  {/* Centres d'intérêt */}
                  {match.user.interests && match.user.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {match.user.interests.slice(0, 3).map((interest, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-pink-100 text-pink-600 rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                      {match.user.interests.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{match.user.interests.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dernier message */}
                  {match.lastMessage && (
                    <div className="bg-gray-50 rounded-lg p-2 mb-3">
                      <div className="text-xs text-gray-500 mb-1">Dernier message:</div>
                      <div className="text-sm text-gray-700 truncate">
                        {match.lastMessage.senderId === currentUser?.id ? 'Vous: ' : ''}
                        {match.lastMessage.content}
                      </div>
                      {match.lastMessageAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {getTimeAgo(match.lastMessageAt)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openChat(match)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
                    >
                      <MessageCircle size={16} />
                      <span>{match.messageCount > 0 ? 'Continuer' : 'Commencer'}</span>
                    </button>
                    
                    {match.messageCount > 0 && (
                      <div className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                        {match.messageCount} msg{match.messageCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action flottante */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => router.push('/discover')}
            className="w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center group"
            title="Découvrir de nouveaux profils"
          >
            <Heart size={24} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}