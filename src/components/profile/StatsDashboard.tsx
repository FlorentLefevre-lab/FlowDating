// src/components/profile/StatsDashboard.tsx
'use client'

import { useState } from 'react'
import { useRealTimeStats, useActivityNotifications } from './../../hooks/useRealTimeStats'

interface StatsDashboardProps {
  className?: string
  showDetailedStats?: boolean
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  className = '',
  showDetailedStats = false
}) => {
  const { 
    stats, 
    isLoading, 
    error, 
    refreshStats, 
    lastUpdated 
  } = useRealTimeStats(30000)
  
  const { newActivities, hasNewActivity } = useActivityNotifications()
  const [expanded, setExpanded] = useState(showDetailedStats)

  const getDetailedStats = () => [
    { 
      label: 'Profil vu cette semaine', 
      value: stats.profileViews.toString(), 
      icon: '👀', 
      color: 'text-blue-600',
      change: '+12%',
      trend: 'up'
    },
    { 
      label: 'Likes reçus ce mois', 
      value: stats.likesReceived.toString(), 
      icon: '💗', 
      color: 'text-pink-600',
      change: '+23%',
      trend: 'up'
    },
    { 
      label: 'Messages reçus', 
      value: stats.messagesReceived.toString(), 
      icon: '💬', 
      color: 'text-green-600',
      change: '+8%',
      trend: 'up'
    },
    { 
      label: 'Matches actifs', 
      value: stats.matchesCount.toString(), 
      icon: '🔥', 
      color: 'text-orange-600',
      change: '+2',
      trend: 'up'
    }
  ]

  const formatLastUpdate = () => {
    if (!lastUpdated) return 'Jamais'
    return lastUpdated.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm ${className}`}>
      {/* En-tête avec indicateurs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            📊 Tableau de bord
          </h3>
          
          {/* Indicateur de nouvelles activités */}
          {hasNewActivity && (
            <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {newActivities.length} nouveau{newActivities.length > 1 ? 'x' : ''}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Statut de connexion */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              isLoading ? 'bg-yellow-400 animate-pulse' : 
              error ? 'bg-red-400' : 'bg-green-400'
            }`}></div>
            <span className="text-gray-500">
              {error ? 'Erreur' : `${formatLastUpdate()}`}
            </span>
          </div>

          {/* Bouton refresh */}
          <button
            onClick={refreshStats}
            disabled={isLoading}
            className="text-sm text-pink-600 hover:text-pink-700 transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
          </button>

          {/* Bouton détails */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
          >
            {expanded ? 'Masquer' : 'Détails'} →
          </button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="space-y-4">
        {[
          { 
            label: 'Profil vu aujourd\'hui', 
            value: stats.dailyStats.profileViews.toString(), 
            icon: '👀', 
            color: 'text-blue-600' 
          },
          { 
            label: 'Likes reçus', 
            value: stats.dailyStats.likesReceived.toString(), 
            icon: '💗', 
            color: 'text-pink-600' 
          },
          { 
            label: 'Messages reçus', 
            value: stats.dailyStats.messagesReceived.toString(), 
            icon: '💬', 
            color: 'text-green-600' 
          }
        ].map((stat, index) => (
          <div key={index} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg group-hover:scale-110 transition-transform">{stat.icon}</span>
              <span className="text-sm text-gray-600">{stat.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${stat.color} ${isLoading ? 'animate-pulse' : ''}`}>
                {isLoading ? '...' : stat.value}
              </span>
              {!isLoading && stat.value !== '0' && (
                <span className="text-xs text-green-600">✨</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Stats détaillées */}
      {expanded && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            📈 Statistiques complètes
            {isLoading && <span className="text-xs text-gray-500">(mise à jour...)</span>}
          </h4>
          
          <div className="grid grid-cols-1 gap-3">
            {getDetailedStats().map((stat, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-sm">{stat.icon}</span>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">{stat.label}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${stat.color} text-lg`}>
                    {isLoading ? '...' : stat.value}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-xs">
                      {stat.trend === 'up' ? '📈' : stat.trend === 'down' ? '📉' : '➖'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Performance insights */}
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h5 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
              💡 Analyse de performance
            </h5>
            <div className="space-y-1 text-xs text-blue-700">
              {stats.dailyStats.profileViews > 20 && (
                <p>🔥 Votre profil attire beaucoup d'attention aujourd'hui !</p>
              )}
              {stats.dailyStats.likesReceived > 5 && (
                <p>💖 Excellent taux de likes aujourd'hui</p>
              )}
              {stats.matchesCount > 10 && (
                <p>⭐ Vous avez un bon nombre de matches actifs</p>
              )}
              {stats.dailyStats.messagesReceived === 0 && (
                <p>💬 Pensez à engager la conversation avec vos matches</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Erreur d'affichage */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-center gap-2">
            ⚠️ {error}
            <button 
              onClick={refreshStats}
              className="text-red-600 hover:text-red-800 font-medium underline"
            >
              Réessayer
            </button>
          </p>
        </div>
      )}
    </div>
  )
}