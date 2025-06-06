// src/components/profile/RecentActivity.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RecentActivity as ActivityType } from '@/hooks/useRealTimeStats'

interface RecentActivityProps {
  activities: ActivityType[]
  isLoading?: boolean
  onRefresh?: () => void
  maxItems?: number
  showRefreshButton?: boolean
  className?: string
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  isLoading = false,
  onRefresh,
  maxItems = 5,
  showRefreshButton = true,
  className = ''
}) => {
  const [visibleActivities, setVisibleActivities] = useState<ActivityType[]>([])

  useEffect(() => {
    // Animation d'entrée échelonnée des activités
    if (activities.length > 0) {
      setVisibleActivities([])
      activities.slice(0, maxItems).forEach((activity, index) => {
        setTimeout(() => {
          setVisibleActivities(prev => [...prev, activity])
        }, index * 100)
      })
    }
  }, [activities, maxItems])

  const getActivityIcon = (type: ActivityType['type']): string => {
    const icons = {
      match: '💖',
      like: '👍',
      message: '💬',
      visit: '👀'
    }
    return icons[type] || '✨'
  }

  const getActivityText = (activity: ActivityType): string => {
    const texts = {
      match: `Vous avez matché avec ${activity.userName} !`,
      like: `${activity.userName} vous a liké`,
      message: `${activity.userName} vous a écrit`,
      visit: `${activity.userName} a visité votre profil`
    }
    return texts[activity.type] || 'Nouvelle activité'
  }

  const getActivityColor = (type: ActivityType['type']): string => {
    const colors = {
      match: 'from-pink-400 to-red-400',
      like: 'from-purple-400 to-pink-400',
      message: 'from-blue-400 to-indigo-400',
      visit: 'from-green-400 to-emerald-400'
    }
    return colors[type] || 'from-gray-400 to-gray-500'
  }

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date()
    const diff = now.getTime() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `il y a ${minutes}min`
    if (hours < 24) return `il y a ${hours}h`
    if (days < 7) return `il y a ${days}j`
    return new Date(timestamp).toLocaleDateString('fr-FR')
  }

  const getActionLink = (activity: ActivityType): string => {
    switch (activity.type) {
      case 'match':
      case 'message':
        return `/messages/${activity.userId}`
      case 'like':
        return `/matches`
      case 'visit':
        return `/profile/visits`
      default:
        return '#'
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            ⚡ Activité récente
          </h3>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          ⚡ Activité récente
          {activities.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {activities.length > 9 ? '9+' : activities.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {showRefreshButton && onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-pink-600 hover:text-pink-700 transition-colors"
              title="Actualiser"
            >
              🔄
            </button>
          )}
          <Link 
            href="/activity" 
            className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
          >
            Voir tout →
          </Link>
        </div>
      </div>

      {visibleActivities.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">😴</div>
          <p className="text-gray-500 text-sm">Aucune activité récente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleActivities.map((activity, index) => {
            const isNewActivity = new Date().getTime() - new Date(activity.timestamp).getTime() < 300000 // 5 minutes

            return (
              <div
                key={activity.id}
                onClick={() => window.location.href = getActionLink(activity)}
                className="cursor-pointer group"
              >
                <div 
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                    hover:bg-gray-50 hover:scale-[1.02] hover:shadow-sm
                    ${isNewActivity ? 'bg-blue-50 border border-blue-200' : ''}
                    animate-slideInFromRight
                  `}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Avatar avec gradient */}
                  <div className={`
                    relative w-12 h-12 bg-gradient-to-br ${getActivityColor(activity.type)} 
                    rounded-full flex items-center justify-center text-white font-semibold
                    group-hover:scale-110 transition-transform duration-200
                  `}>
                    {activity.userAvatar && activity.userAvatar.length === 1 ? 
                      <span className="text-xl">{activity.userAvatar}</span> :
                      <span className="text-sm">{activity.userName.charAt(0).toUpperCase()}</span>
                    }
                    
                    {/* Badge d'activité */}
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-xs">{getActivityIcon(activity.type)}</span>
                    </div>
                    
                    {/* Indicateur "nouveau" */}
                    {isNewActivity && (
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900 leading-tight">
                          {getActivityText(activity)}
                        </p>
                        
                        {/* Contenu du message si présent */}
                        {activity.content && (
                          <p className="text-xs text-gray-600 mt-1 italic">
                            "{activity.content}"
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(activity.timestamp)}
                          </span>
                          
                          {/* Badge non lu */}
                          {!activity.isRead && activity.type === 'message' && (
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                      
                      {/* Flèche d'action */}
                      <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          
          {/* Bouton "Voir plus" si il y a plus d'activités */}
          {activities.length > maxItems && (
            <div 
              onClick={() => window.location.href = '/activity'}
              className="block text-center text-sm text-pink-600 hover:text-pink-700 font-medium py-2 hover:bg-pink-50 rounded-lg transition-colors cursor-pointer"
            >
              Voir {activities.length - maxItems} activité{activities.length - maxItems > 1 ? 's' : ''} de plus
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Styles CSS personnalisés à ajouter dans votre globals.css
/* 
@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slideInFromRight {
  animation: slideInFromRight 0.3s ease-out forwards;
  opacity: 0;
}
*/