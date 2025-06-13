// ===============================
// 📁 app/matches/page.tsx - Page interface matches CORRIGÉE
// ===============================

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
  Star,
  Search,
  Filter,
  ArrowUpDown,
  Activity,
  UserCheck,
  Zap,
  Archive,
  SortAsc,
  SortDesc,
  RefreshCw,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { useMatches } from '@/hooks/useMatches';
import { Match } from '@/types/matches';

// ===============================
// STYLES CSS INTÉGRÉS
// ===============================
const styles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
      transform: translateY(0);
    }
    40%, 43% {
      transform: translateY(-10px);
    }
    70% {
      transform: translateY(-5px);
    }
    90% {
      transform: translateY(-2px);
    }
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }

  .animate-fadeInUp {
    animation: fadeInUp 0.6s ease-out;
  }

  .animate-slideInRight {
    animation: slideInRight 0.4s ease-out;
  }

  .animate-bounce-gentle {
    animation: bounce 2s infinite;
  }

  .animate-pulse-gentle {
    animation: pulse 2s infinite;
  }

  .match-card {
    transition: all 0.3s ease;
    transform: translateY(0);
  }

  .match-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .glass-badge {
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .gradient-stats-pink {
    background: linear-gradient(135deg, #f472b6 0%, #be185d 100%);
  }

  .gradient-stats-green {
    background: linear-gradient(135deg, #34d399 0%, #059669 100%);
  }

  .gradient-stats-yellow {
    background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
  }

  .gradient-stats-blue {
    background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  }

  .gradient-stats-purple {
    background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
  }

  .gradient-stats-gray {
    background: linear-gradient(135deg, #9ca3af 0%, #4b5563 100%);
  }

  .btn-match {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .btn-match::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .btn-match:hover::before {
    left: 100%;
  }

  .btn-match:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-match:disabled::before {
    display: none;
  }

  .status-badge {
    position: relative;
    overflow: hidden;
  }

  .status-badge::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: inherit;
    border-radius: inherit;
    opacity: 0.1;
    animation: pulse 2s infinite;
  }

  .parallax-img {
    transition: transform 0.3s ease;
  }

  .parallax-img:hover {
    transform: scale(1.05);
  }

  .filter-button {
    position: relative;
    transition: all 0.3s ease;
  }

  .filter-button.active {
    transform: scale(1.05);
  }

  .filter-button.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 2px;
    background: currentColor;
    border-radius: 1px;
  }

  .line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .line-clamp-3 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .status-online {
    position: relative;
  }

  .status-online::after {
    content: '';
    position: absolute;
    top: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    background: #10b981;
    border: 2px solid white;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .search-input:focus {
    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
    border-color: #ec4899;
  }

  .stats-card {
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .stats-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .stats-card:hover::before {
    transform: translateX(0);
  }

  .stats-card:hover {
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    .match-card:hover {
      transform: none;
    }
    
    .parallax-img:hover {
      transform: none;
    }
  }
`;

// ===============================
// COMPOSANTS
// ===============================

// Composant pour les statistiques
const StatsCard = ({ title, value, icon: Icon, gradient, subtitle }: {
  title: string;
  value: number | string;
  icon: any;
  gradient: string;
  subtitle?: string;
}) => (
  <div className={`${gradient} text-white rounded-lg p-4 stats-card`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white text-opacity-80 text-sm">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-white text-opacity-70 text-xs mt-1">{subtitle}</p>}
      </div>
      <Icon className="w-6 h-6 text-white text-opacity-80" />
    </div>
  </div>
);

// Composant pour une carte de match avec état de chargement
const MatchCard = ({ match, onOpenChat, isOpeningChat }: { 
  match: Match; 
  onOpenChat: (match: Match) => Promise<void>;
  isOpeningChat: boolean;
}) => {
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

  const getStatusBadge = (match: Match) => {
    switch (match.status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Activity className="w-3 h-3 mr-1" />
            Actif
          </span>
        );
      case 'dormant':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Endormi
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Archive className="w-3 h-3 mr-1" />
            Archivé
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 match-card animate-fadeInUp">
      <div className="relative">
        {match.user.photo?.url ? (
          <img
            src={match.user.photo.url}
            alt={match.user.name}
            className="w-full h-48 object-cover parallax-img"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">
              {match.user.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex flex-col space-y-2">
          {match.isNew && (
            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium animate-bounce-gentle">
              Nouveau
            </span>
          )}
          {match.user.isOnline && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium status-online">
              En ligne
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3">
          {getStatusBadge(match)}
        </div>

        {match.compatibility && (
          <div className="absolute bottom-3 right-3">
            <div className="glass-badge text-pink-600 text-xs font-bold px-2 py-1 rounded-full">
              {match.compatibility}% ♥
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {match.user.name}
            </h3>
            <p className="text-gray-600">{match.user.age} ans</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Match</div>
            <div className="text-pink-600 font-medium">
              {getTimeAgo(match.createdAt)}
            </div>
          </div>
        </div>
        
        <div className="space-y-1 mb-3">
          {match.user.profession && (
            <div className="flex items-center text-sm text-gray-600">
              <Briefcase size={14} className="mr-2 flex-shrink-0" />
              <span className="truncate">{match.user.profession}</span>
            </div>
          )}
          
          {match.user.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2 flex-shrink-0" />
              <span className="truncate">{match.user.location}</span>
            </div>
          )}

          {match.user.lastSeen && !match.user.isOnline && (
            <div className="flex items-center text-sm text-gray-500">
              <Clock size={14} className="mr-2 flex-shrink-0" />
              <span className="truncate">Vu {getTimeAgo(match.user.lastSeen)}</span>
            </div>
          )}
        </div>

        {match.user.bio && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {match.user.bio}
          </p>
        )}

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

        <div className="flex space-x-2">
          <button
            onClick={() => onOpenChat(match)}
            disabled={isOpeningChat}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all btn-match disabled:opacity-50"
          >
            {isOpeningChat ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Ouverture...</span>
              </>
            ) : (
              <>
                <MessageCircle size={16} />
                <span>Démarrer une conversation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===============================
// COMPOSANT PRINCIPAL
// ===============================
export default function MatchesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const {
    matches,
    stats,
    filteredMatches,
    filters,
    isLoading,
    isRefreshing,
    error,
    loadMatches,
    refreshMatches,
    updateFilters,
    clearFilters,
    getFilteredStats
  } = useMatches({ 
    autoRefresh: true, 
    refreshInterval: 60000 // 1 minute
  });

  const [showFilters, setShowFilters] = useState(false);
  const [openingChatMatchId, setOpeningChatMatchId] = useState<string | null>(null);

  // Fonction optimisée pour ouvrir le chat
  const openChat = async (match: Match) => {
    try {
      setOpeningChatMatchId(match.id);
      console.log('🔄 [MATCHES] Ouverture chat pour match:', {
        matchId: match.id,
        userId: match.user.id,
        userName: match.user.name
      });

      // Optionnel: Pré-créer le channel côté serveur (améliore la vitesse)
      try {
        console.log('🔄 [MATCHES] Tentative de pré-création du channel...');
        const preCreateResponse = await fetch('/api/chat/create-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ userId: match.user.id, matchId: match.id })
        });

        if (preCreateResponse.ok) {
          const preCreateData = await preCreateResponse.json();
          console.log('✅ [MATCHES] Channel pré-créé:', preCreateData.channelId);
        } else {
          console.warn('⚠️ [MATCHES] Pré-création échouée, la page chat tentera de créer le channel');
        }
      } catch (preCreateError) {
        console.warn('⚠️ [MATCHES] Erreur pré-création (non bloquant):', preCreateError);
        // Cette erreur n'est pas bloquante
      }

      // Construire l'URL avec tous les paramètres nécessaires
      const chatUrl = `/chat?userId=${encodeURIComponent(match.user.id)}&matchId=${encodeURIComponent(match.id)}&userName=${encodeURIComponent(match.user.name || 'Utilisateur')}`;
      
      console.log('🎯 [MATCHES] Redirection vers:', chatUrl);
      
      // Redirection vers la page chat
      router.push(chatUrl);
      
    } catch (error) {
      console.error('❌ [MATCHES] Erreur ouverture chat:', error);
      
      // En cas d'erreur, redirection simple sans pré-création
      const fallbackUrl = `/chat?userId=${encodeURIComponent(match.user.id)}&matchId=${encodeURIComponent(match.id)}`;
      console.log('🔄 [MATCHES] Redirection fallback vers:', fallbackUrl);
      router.push(fallbackUrl);
      
    } finally {
      // Délai pour éviter que le loading disparaisse trop vite
      setTimeout(() => {
        setOpeningChatMatchId(null);
      }, 1000);
    }
  };

  // Redirection si non authentifié
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">
            Chargement des matchs...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => loadMatches()}
            className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors font-medium"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="container mx-auto max-w-7xl p-4">
          {/* En-tête avec statistiques */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 animate-slideInRight">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                  <Heart className="text-pink-600 animate-pulse-gentle" />
                  <span>Mes Matchs</span>
                  <Sparkles className="text-yellow-500" size={24} />
                </h1>
                <p className="text-gray-600 mt-1">
                  Découvrez vos connexions et entamez des conversations
                </p>
              </div>
              <button
                onClick={() => refreshMatches()}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>

            {/* Statistiques détaillées */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <StatsCard 
                title="Total" 
                value={stats.totalMatches} 
                icon={Heart} 
                gradient="gradient-stats-pink"
              />
              <StatsCard 
                title="Actifs" 
                value={stats.activeConversations} 
                icon={Activity} 
                gradient="gradient-stats-green"
              />
              <StatsCard 
                title="Endormis" 
                value={stats.dormantMatches} 
                icon={Clock} 
                gradient="gradient-stats-yellow"
              />
              <StatsCard 
                title="Nouveaux" 
                value={stats.newMatches} 
                icon={Star} 
                gradient="gradient-stats-blue"
              />
              <StatsCard 
                title="Cette semaine" 
                value={stats.thisWeekMatches} 
                icon={Zap} 
                gradient="gradient-stats-purple"
              />
              <StatsCard 
                title="Temps réponse" 
                value={stats.averageResponseTime} 
                icon={TrendingUp} 
                gradient="gradient-stats-gray"
              />
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            {/* Recherche */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, profession, ville..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent search-input"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors filter-button"
              >
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
                {showFilters ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Filtres détaillés */}
            {showFilters && (
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Filtre par statut */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <select
                      value={filters.status}
                      onChange={(e) => updateFilters({ status: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="all">Tous</option>
                      <option value="active">Actifs</option>
                      <option value="dormant">Endormis</option>
                      <option value="new">Nouveaux</option>
                    </select>
                  </div>

                  {/* Filtre par période */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                    <select
                      value={filters.timeframe}
                      onChange={(e) => updateFilters({ timeframe: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="all">Toutes</option>
                      <option value="today">Aujourd'hui</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois</option>
                    </select>
                  </div>

                  {/* Tri */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trier par</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="recent">Plus récents</option>
                      <option value="activity">Activité</option>
                      <option value="compatibility">Compatibilité</option>
                      <option value="name">Nom</option>
                      <option value="age">Âge</option>
                    </select>
                  </div>

                  {/* Ordre de tri */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ordre</label>
                    <button
                      onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                      className="w-full flex items-center justify-center space-x-2 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      {filters.sortOrder === 'asc' ? (
                        <SortAsc className="w-4 h-4" />
                      ) : (
                        <SortDesc className="w-4 h-4" />
                      )}
                      <span>{filters.sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Résultats du filtrage */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                {filteredMatches.length} match{filteredMatches.length > 1 ? 's' : ''} 
                {filters.searchQuery && ` pour "${filters.searchQuery}"`}
              </p>
              
              {(filters.status !== 'all' || filters.timeframe !== 'all' || filters.searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>

          {/* Liste des matchs */}
          {filteredMatches.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Heart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun match trouvé
              </h3>
              <p className="text-gray-500 mb-4">
                {filters.status !== 'all' || filters.searchQuery
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : 'Continuez à swiper pour trouver vos âmes sœurs !'
                }
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/discover')}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all font-medium"
                >
                  Découvrir des profils
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onOpenChat={openChat}
                  isOpeningChat={openingChatMatchId === match.id}
                />
              ))}
            </div>
          )}

          {/* Bouton flottant */}
          <div className="fixed bottom-6 right-6">
            <button
              onClick={() => router.push('/discover')}
              className="w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center group"
              title="Découvrir de nouveaux profils"
            >
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}