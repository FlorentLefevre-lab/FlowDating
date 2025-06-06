// src/app/page.tsx - Version réorganisée avec stats en haut
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from './../../components/auth/AuthGuard'
import { RecentActivity } from './../../components/profile/RecentActivity'
import { StatsDashboard } from './../../components/profile/StatsDashboard'
import { useRealTimeStats } from './../../hooks/useRealTimeStats'

// Types pour les données mockées (à conserver pour la découverte)
interface User {
  id: string
  name: string
  age: number
  avatar: string
  distance: number
  interests: string[]
  isOnline: boolean
}

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  // 🚀 HOOK TEMPS RÉEL pour les statistiques
  const { 
    stats, 
    recentActivity, 
    isLoading: statsLoading, 
    error: statsError,
    refreshStats,
    lastUpdated
  } = useRealTimeStats(30000) // Refresh toutes les 30 secondes

  // États locaux pour la section découverte (toujours mockée)
  const [discoveryUsers, setDiscoveryUsers] = useState<User[]>([])
  const [currentUserIndex, setCurrentUserIndex] = useState(0)

  // Données mockées pour la découverte (en attendant la vraie implémentation)
  const mockUsers: User[] = [
    {
      id: '1',
      name: 'Sophie',
      age: 26,
      avatar: '👩‍🦰',
      distance: 2.5,
      interests: ['Yoga', 'Photographie', 'Voyage'],
      isOnline: true
    },
    {
      id: '2',
      name: 'Emma',
      age: 24,
      avatar: '👱‍♀️',
      distance: 1.8,
      interests: ['Cuisine', 'Musique', 'Randonnée'],
      isOnline: false
    },
    {
      id: '3',
      name: 'Léa',
      age: 28,
      avatar: '👩‍🦱',
      distance: 3.2,
      interests: ['Art', 'Lecture', 'Cinéma'],
      isOnline: true
    },
    {
      id: '4',
      name: 'Chloé',
      age: 25,
      avatar: '👩',
      distance: 4.1,
      interests: ['Sport', 'Voyage', 'Danse'],
      isOnline: false
    }
  ]

  useEffect(() => {
    setDiscoveryUsers(mockUsers)
  }, [])

  const handleLike = (userId: string) => {
    console.log('Like user:', userId)
    // Simuler un match parfois
    if (Math.random() > 0.7) {
      setTimeout(() => {
        alert('🎉 C\'est un match ! Vous pouvez maintenant vous écrire.')
        // Refresh des stats après un match
        refreshStats()
      }, 500)
    }
    nextUser()
  }

  const handlePass = (userId: string) => {
    console.log('Pass user:', userId)
    nextUser()
  }

  const nextUser = () => {
    if (currentUserIndex < discoveryUsers.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1)
    } else {
      setCurrentUserIndex(0)
    }
  }

  const currentUser = discoveryUsers[currentUserIndex]

  // 🎯 Actions rapides avec badges de notification
  const quickActions = [
    { 
      icon: '💬', 
      label: 'Messages', 
      href: '/messages',
      count: stats.dailyStats.messagesReceived,
      color: 'from-blue-500 to-blue-600',
      description: 'Nouveaux messages'
    },
    { 
      icon: '💖', 
      label: 'Matchs', 
      href: '/matches',
      count: stats.matchesCount,
      color: 'from-pink-500 to-pink-600',
      description: 'Matches actifs'
    },
    { 
      icon: '👀', 
      label: 'Visites', 
      href: '/profile/visits',
      count: stats.dailyStats.profileViews,
      color: 'from-purple-500 to-purple-600',
      description: 'Vues aujourd\'hui'
    },
    { 
      icon: '⚙️', 
      label: 'Profil', 
      href: '/profile',
      color: 'from-gray-500 to-gray-600',
      description: 'Gérer mon profil'
    }
  ]

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* 🎯 EN-TÊTE DE BIENVENUE */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Salut {session?.user?.name?.split(' ')[0] || 'toi'} ! 👋
                </h1>
                <p className="text-gray-600">
                  Voici votre activité et les dernières notifications
                </p>
              </div>
              
              {/* Indicateur de statut temps réel */}
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${
                    statsLoading ? 'bg-yellow-400 animate-pulse' : 
                    statsError ? 'bg-red-400' : 'bg-green-400'
                  }`}></div>
                  <span>
                    {lastUpdated ? `Mis à jour ${lastUpdated.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}` : 'Chargement...'}
                  </span>
                </div>
                {statsError && (
                  <p className="text-xs text-red-500 mt-1">
                    Erreur de connexion
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 🔥 SECTION PRINCIPALE EN 3 COLONNES FLEX */}
          <div className="flex flex-col xl:flex-row gap-6 mb-8">
            
            {/* Colonne 1: Stats rapides + Performance + Activité récente */}
            <div className="xl:w-1/3 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              {/* Stats rapides en un coup d'œil */}
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                ⚡ En un coup d'œil
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {statsLoading ? '...' : stats.dailyStats.profileViews}
                  </div>
                  <div className="text-xs text-blue-700">Vues aujourd'hui</div>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600">
                    {statsLoading ? '...' : stats.dailyStats.likesReceived}
                  </div>
                  <div className="text-xs text-pink-700">Likes reçus</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {statsLoading ? '...' : stats.dailyStats.messagesReceived}
                  </div>
                  <div className="text-xs text-green-700">Messages reçus</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {statsLoading ? '...' : stats.matchesCount}
                  </div>
                  <div className="text-xs text-orange-700">Matches total</div>
                </div>
              </div>

              {/* Performance du jour */}
              <div className="mb-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Performance du jour</span>
                  <span className={`font-medium ${
                    (stats.dailyStats.profileViews + stats.dailyStats.likesReceived + stats.dailyStats.messagesReceived) > 5 
                      ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {(stats.dailyStats.profileViews + stats.dailyStats.likesReceived + stats.dailyStats.messagesReceived) > 5 
                      ? '🔥 Excellente' : '📈 Moyenne'}
                  </span>
                </div>
              </div>

              {/* Activité récente */}
              <div className="border-t border-gray-200 pt-6">
                <RecentActivity
                  activities={recentActivity}
                  isLoading={statsLoading}
                  onRefresh={refreshStats}
                  maxItems={4}
                  showRefreshButton={true}
                  className="h-full"
                />
              </div>
            </div>

            {/* Colonne 2: Découverte (au centre) */}
            <div className="xl:w-1/3 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  🔥 Découverte
                </h2>
                <Link 
                  href="/discover" 
                  className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
                >
                  Voir plus →
                </Link>
              </div>

              {currentUser ? (
                <div className="flex-1 min-h-0">
                  <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl p-4 text-white relative overflow-hidden h-full flex flex-col">
                    {/* Décorations */}
                    <div className="absolute top-2 right-2 text-lg opacity-20">✨</div>
                    <div className="absolute bottom-2 left-2 text-sm opacity-20">💫</div>
                    
                    <div className="relative z-10 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl backdrop-blur-sm">
                          {currentUser.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold mb-1 truncate">
                            {currentUser.name}, {currentUser.age}
                          </h3>
                          <p className="text-pink-100 flex items-center gap-1 text-xs">
                            📍 À {currentUser.distance} km
                            {currentUser.isOnline && (
                              <span className="ml-1 flex items-center gap-1 bg-green-500/30 px-1.5 py-0.5 rounded-full text-xs">
                                <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                                En ligne
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4 flex-1 min-h-0">
                        <h4 className="text-xs font-semibold mb-2">Centres d'intérêt</h4>
                        <div className="flex flex-wrap gap-1.5 overflow-hidden">
                          {currentUser.interests.slice(0, 4).map((interest, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-white/20 rounded-full text-xs backdrop-blur-sm font-medium"
                            >
                              {interest}
                            </span>
                          ))}
                          {currentUser.interests.length > 4 && (
                            <span className="px-2 py-1 bg-white/10 rounded-full text-xs backdrop-blur-sm font-medium">
                              +{currentUser.interests.length - 4}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions de swipe */}
                      <div className="flex justify-center gap-3 mb-2 mt-auto">
                        <button 
                          onClick={() => handlePass(currentUser.id)}
                          className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-110"
                          title="Passer"
                        >
                          <span className="text-sm">👎</span>
                        </button>
                        
                        <button 
                          onClick={() => handleLike(currentUser.id)}
                          className="w-12 h-12 bg-pink-500 hover:bg-pink-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg border border-white/30"
                          title="Liker"
                        >
                          <span className="text-lg">💖</span>
                        </button>
                        
                        <button 
                          className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-110"
                          title="Super Like"
                        >
                          <span className="text-sm">⭐</span>
                        </button>
                      </div>

                      {/* Indicateur de progression */}
                      <div className="flex justify-center">
                        <div className="flex gap-1">
                          {discoveryUsers.map((_, index) => (
                            <div 
                              key={index}
                              className={`w-1 h-1 rounded-full transition-all ${
                                index === currentUserIndex ? 'bg-white' : 'bg-white/30'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 flex-1 flex flex-col justify-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">
                    Plus de profils !
                  </h3>
                  <p className="text-gray-600 text-xs mb-3">
                    Revenez demain pour découvrir de nouveaux profils
                  </p>
                  <Link 
                    href="/discover" 
                    className="bg-pink-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-pink-600 transition-colors inline-block"
                  >
                    Explorer plus
                  </Link>
                </div>
              )}
            </div>

            {/* Colonne 3: Actions rapides + Objectifs + Conseil du jour */}
            <div className="xl:w-1/3 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              {/* Actions rapides */}
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🚀 Actions rapides
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {quickActions.map((action, index) => (
                  <Link 
                    key={index}
                    href={action.href}
                    className="block bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-all duration-200 hover:-translate-y-1 group border border-gray-100"
                  >
                    <div className={`w-8 h-8 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center mb-2 text-white text-sm group-hover:scale-110 transition-transform`}>
                      {action.icon}
                    </div>
                    <div className="text-sm font-medium text-gray-800">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {action.description}
                    </div>
                    {action.count !== undefined && action.count > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        <span className="text-xs font-medium text-red-600">
                          {action.count}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              {/* Objectifs de la semaine */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  🎯 Objectifs de la semaine
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Profils vus</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '60%'}}></div>
                      </div>
                      <span className="text-xs text-gray-500">12/20</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Messages envoyés</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{width: '80%'}}></div>
                      </div>
                      <span className="text-xs text-gray-500">8/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Nouveaux matchs</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-pink-500 h-1.5 rounded-full" style={{width: '40%'}}></div>
                      </div>
                      <span className="text-xs text-gray-500">2/5</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conseil du jour */}
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl p-4 text-white">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    💡 Conseil du jour
                  </h3>
                  <p className="text-orange-100 text-xs leading-relaxed mb-3">
                    {stats.dailyStats.profileViews === 0 ? 
                      'Votre profil n\'a pas encore été vu aujourd\'hui. Pensez à vous connecter plus souvent et à optimiser vos photos !' :
                      stats.dailyStats.profileViews > 20 ?
                      'Excellent ! Votre profil attire beaucoup d\'attention. Continuez sur cette lancée !' :
                      'Ajoutez plus de photos à votre profil pour augmenter vos chances de match de 40% !'
                    }
                  </p>
                  <Link 
                    href="/profile" 
                    className="inline-flex items-center gap-1 bg-white text-orange-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-50 transition-colors"
                  >
                    📷 Améliorer mon profil
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 📊 SECTION INFÉRIEURE - STATISTIQUES DÉTAILLÉES */}
          <div className="mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <StatsDashboard 
                showDetailedStats={true} 
                className="h-full" 
              />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}