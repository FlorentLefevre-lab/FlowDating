// src/app/page.tsx - Version intégrée avec l'API Discover
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from './../../components/auth/AuthGuard'
import { RecentActivity } from './../../components/profile/RecentActivity'
import { StatsDashboard } from './../../components/profile/StatsDashboard'
import { useRealTimeStats } from './../../hooks/useRealTimeStats'

// ================================
// TYPES POUR L'API DISCOVER
// ================================

interface DiscoverUser {
  id: string
  name: string
  age: number
  bio: string
  location: string
  profession: string
  interests: string[]
  photos: Array<{
    id: string
    url: string
    isPrimary: boolean
  }>
  compatibility: number
  isOnline: boolean
  memberSince: string
}

interface DiscoverApiResponse {
  success: boolean
  users: DiscoverUser[]
  stats: {
    totalUsers: number
    excludedCount: number
    discoverableCount: number
    avgCompatibility: number
  }
  currentUser: {
    id: string
    interests: string[]
    age: number | null
    location: string | null
  }
  meta: {
    timestamp: string
    algorithm: string
    responseTime?: number
    cacheHit?: boolean
  }
  error?: string
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

  // ================================
  // ÉTATS POUR LA DÉCOUVERTE (API)
  // ================================
  
  const [discoveryUsers, setDiscoveryUsers] = useState<DiscoverUser[]>([])
  const [currentUserIndex, setCurrentUserIndex] = useState(0)
  const [discoverLoading, setDiscoverLoading] = useState(true)
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const [isMatch, setIsMatch] = useState(false)
  const [matchUser, setMatchUser] = useState<{ id: string; name: string } | null>(null)

  const currentUser = discoveryUsers[currentUserIndex]

  // ================================
  // CHARGEMENT DES PROFILS DISCOVER
  // ================================

  const loadDiscoverProfiles = async () => {
    try {
      setDiscoverLoading(true)
      setDiscoverError(null)

      console.log('🔍 Chargement des profils discover pour la home...')

      const response = await fetch('/api/discover?limit=10', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data: DiscoverApiResponse = await response.json()

      console.log('📊 API Discover response:', data)

      if (!data.success) {
        throw new Error(data.error || 'API returned success: false')
      }

      if (!data.users || !Array.isArray(data.users)) {
        throw new Error('Invalid users data from API')
      }

      // Transformation pour compatibilité avec l'UI existante
      const transformedUsers: DiscoverUser[] = data.users.map(user => ({
        id: user.id,
        name: user.name,
        age: user.age,
        bio: user.bio,
        location: user.location,
        profession: user.profession,
        interests: user.interests || [],
        photos: user.photos || [],
        compatibility: user.compatibility,
        isOnline: user.isOnline || false,
        memberSince: user.memberSince
      }))

      setDiscoveryUsers(transformedUsers)
      setCurrentUserIndex(0)

      console.log('✅ Profils discover chargés:', transformedUsers.length)

    } catch (err: any) {
      console.error('❌ Erreur chargement discover:', err)
      setDiscoverError(err.message)
      
      // Fallback vers profils vides en cas d'erreur
      setDiscoveryUsers([])
    } finally {
      setDiscoverLoading(false)
    }
  }

  // Chargement initial des profils
  useEffect(() => {
    if (session?.user) {
      loadDiscoverProfiles()
    }
  }, [session])

  // ================================
  // ACTIONS DISCOVER (API)
  // ================================

  const handleLike = async (userId: string) => {
    try {
      console.log('💖 Like user via API:', userId)

      // Appel API pour le like
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId: userId,
          action: 'like'
        })
      })

      const result = await response.json()
      console.log('📡 Like result:', result)

      if (result.success) {
        // Vérifier s'il y a un match
        if (result.isMatch) {
          console.log('🎉 MATCH détecté !')
          setMatchUser({ id: userId, name: currentUser.name })
          setIsMatch(true)
          
          // Refresh des stats après un match
          refreshStats()
        }

        // Passer au profil suivant
        nextUser()

      } else {
        console.error('❌ Erreur API like:', result.error)
        alert('Erreur lors du like: ' + result.error)
      }

    } catch (error) {
      console.error('❌ Erreur réseau like:', error)
      alert('Erreur de connexion lors du like')
    }
  }

  const handlePass = async (userId: string) => {
    try {
      console.log('👎 Pass user via API:', userId)

      // Appel API pour le dislike
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId: userId,
          action: 'dislike'
        })
      })

      const result = await response.json()
      console.log('📡 Pass result:', result)

      if (result.success) {
        // Passer au profil suivant
        nextUser()
      } else {
        console.error('❌ Erreur API pass:', result.error)
        // Continuer même en cas d'erreur côté serveur
        nextUser()
      }

    } catch (error) {
      console.error('❌ Erreur réseau pass:', error)
      // Continuer même en cas d'erreur réseau
      nextUser()
    }
  }

  const handleSuperLike = async (userId: string) => {
    try {
      console.log('⭐ Super Like user via API:', userId)

      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId: userId,
          action: 'super_like'
        })
      })

      const result = await response.json()
      console.log('📡 Super Like result:', result)

      if (result.success) {
        if (result.isMatch) {
          console.log('🎉 SUPER MATCH détecté !')
          setMatchUser({ id: userId, name: currentUser.name })
          setIsMatch(true)
          refreshStats()
        }
        nextUser()
      } else {
        console.error('❌ Erreur API super like:', result.error)
        alert('Erreur lors du super like: ' + result.error)
      }

    } catch (error) {
      console.error('❌ Erreur réseau super like:', error)
      alert('Erreur de connexion lors du super like')
    }
  }

  const nextUser = () => {
    if (currentUserIndex < discoveryUsers.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1)
    } else {
      // Recharger de nouveaux profils quand on arrive à la fin
      console.log('🔄 Fin des profils, rechargement...')
      loadDiscoverProfiles()
    }
  }

  // ================================
  // GESTION DE L'AVATAR/PHOTO
  // ================================

  const getUserAvatar = (user: DiscoverUser) => {
    // Priorité : photo principale > première photo > placeholder
    const primaryPhoto = user.photos?.find(photo => photo.isPrimary)
    const firstPhoto = user.photos?.[0]
    
    if (primaryPhoto?.url) {
      return primaryPhoto.url
    } else if (firstPhoto?.url) {
      return firstPhoto.url
    } else {
      // Fallback vers un emoji basé sur le genre ou aléatoire
      const avatars = ['👩‍🦰', '👱‍♀️', '👩‍🦱', '👩', '🧑‍🦰', '👨‍🦱', '👨', '🧑']
      const index = user.name.length % avatars.length
      return avatars[index]
    }
  }

  // Calculer la "distance" basée sur la compatibilité (simulation)
  const getDistance = (compatibility: number) => {
    // Plus la compatibilité est haute, plus la "distance" est courte
    return Math.round((100 - compatibility) / 10 + 0.5)
  }

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
                <div className="text-gray-600">
                  Voici votre activité et les dernières notifications
                </div>
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
                  <div className="text-xs text-red-500 mt-1">
                    Erreur de connexion
                  </div>
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
                ⚡ En un coup d&apos;œil
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {statsLoading ? '...' : stats.dailyStats.profileViews}
                  </div>
                  <div className="text-xs text-blue-700">Vues aujourd&apos;hui</div>
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
                  activities={recentActivity || []}
                  isLoading={statsLoading}
                  onRefresh={refreshStats}
                  maxItems={4}
                  showRefreshButton={true}
                  className="h-full"
                />
              </div>
            </div>

            {/* Colonne 2: Découverte API (au centre) - VERSION AGRANDIE */}
            <div className="xl:w-1/3 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  🔥 Découverte
                  {discoverLoading && (
                    <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </h2>
                <Link 
                  href="/discover" 
                  className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
                >
                  Voir plus →
                </Link>
              </div>

              {/* État de chargement */}
              {discoverLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Recherche de profils...</p>
                  </div>
                </div>
              ) : discoverError ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-2">😞</div>
                    <p className="text-sm text-red-600 mb-2">Erreur de chargement</p>
                    <button 
                      onClick={loadDiscoverProfiles}
                      className="text-xs bg-pink-500 text-white px-2 py-1 rounded hover:bg-pink-600"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              ) : currentUser ? (
                <div className="flex-1 min-h-0">
                  {/* CARTE PROFIL AGRANDIE AVEC PHOTO DE FOND */}
                  <div 
                    className="rounded-xl relative overflow-hidden h-full flex flex-col shadow-xl"
                    style={{
                      backgroundImage: currentUser.photos?.length > 0 
                        ? `url(${getUserAvatar(currentUser)})` 
                        : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      minHeight: '400px'
                    }}
                  >
                    {/* Overlay gradient pour lisibilité */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40"></div>
                    
                    {/* Badges en haut */}
                    <div className="relative z-10 p-4 flex justify-between items-start">
                      {currentUser.isOnline && (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                          En ligne
                        </div>
                      )}
                      <div className="bg-pink-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold">
                        ✨ {currentUser.compatibility}% compatible
                      </div>
                    </div>

                    {/* Contenu principal en bas */}
                    <div className="relative z-10 mt-auto p-4 text-white">
                      {/* Nom et âge */}
                      <div className="mb-3">
                        <h3 className="text-2xl font-bold mb-1">
                          {currentUser.name}, {currentUser.age}
                        </h3>
                        <div className="flex items-center gap-4 text-white/90 text-sm">
                          <span className="flex items-center gap-1">
                            📍 {currentUser.location}
                          </span>
                          <span className="flex items-center gap-1">
                            📏 {getDistance(currentUser.compatibility)} km
                          </span>
                        </div>
                        {currentUser.profession && (
                          <div className="text-white/80 text-sm mt-1">
                            💼 {currentUser.profession}
                          </div>
                        )}
                      </div>

                      {/* Bio si disponible */}
                      {currentUser.bio && (
                        <div className="mb-3">
                          <p className="text-white/90 text-sm line-clamp-2">
                            {currentUser.bio}
                          </p>
                        </div>
                      )}

                      {/* Centres d'intérêt */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2 text-white/95">Centres d&apos;intérêt</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentUser.interests.slice(0, 4).map((interest, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium"
                            >
                              {interest}
                            </span>
                          ))}
                          {currentUser.interests.length > 4 && (
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium">
                              +{currentUser.interests.length - 4}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions de swipe AGRANDIES */}
                      <div className="flex justify-center gap-4 mb-3">
                        <button 
                          onClick={() => handlePass(currentUser.id)}
                          className="w-14 h-14 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-110 border border-white/20"
                          title="Passer"
                          type="button"
                        >
                          <span className="text-xl">👎</span>
                        </button>
                        
                        <button 
                          onClick={() => handleSuperLike(currentUser.id)}
                          className="w-14 h-14 bg-blue-500/90 hover:bg-blue-600 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-110 shadow-lg border border-white/30"
                          title="Super Like"
                          type="button"
                        >
                          <span className="text-xl">⭐</span>
                        </button>
                        
                        <button 
                          onClick={() => handleLike(currentUser.id)}
                          className="w-16 h-16 bg-pink-500 hover:bg-pink-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-xl border-2 border-white/40"
                          title="Liker"
                          type="button"
                        >
                          <span className="text-2xl">💖</span>
                        </button>
                      </div>

                      {/* Indicateur de progression */}
                      <div className="flex justify-center">
                        <div className="flex gap-1.5">
                          {discoveryUsers.slice(0, 8).map((_, index) => (
                            <div 
                              key={index}
                              className={`w-2 h-2 rounded-full transition-all ${
                                index === currentUserIndex ? 'bg-white scale-110' : 'bg-white/40'
                              }`}
                            />
                          ))}
                          {discoveryUsers.length > 8 && (
                            <span className="text-xs text-white/70 ml-2 self-center">
                              +{discoveryUsers.length - 8}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Indicateur de multiple photos */}
                    {currentUser.photos && currentUser.photos.length > 1 && (
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <div className="flex gap-1">
                          {currentUser.photos.slice(0, 5).map((_, index) => (
                            <div key={index} className="w-8 h-1 bg-white/40 rounded-full"></div>
                          ))}
                          {currentUser.photos.length > 5 && (
                            <div className="w-8 h-1 bg-white/20 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 flex-1 flex flex-col justify-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">
                    Plus de profils !
                  </h3>
                  <div className="text-gray-600 text-xs mb-3">
                    Aucun nouveau profil disponible pour le moment
                  </div>
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
                  <div className="text-orange-100 text-xs leading-relaxed mb-3">
                    {stats.dailyStats.profileViews === 0 ? 
                      'Votre profil n\'a pas encore été vu aujourd\'hui. Pensez à vous connecter plus souvent et à optimiser vos photos !' :
                      stats.dailyStats.profileViews > 20 ?
                      'Excellent ! Votre profil attire beaucoup d\'attention. Continuez sur cette lancée !' :
                      'Ajoutez plus de photos à votre profil pour augmenter vos chances de match de 40% !'
                    }
                  </div>
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

      {/* Modal de Match */}
      {isMatch && matchUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white rounded-2xl p-8 mx-4 text-center max-w-md">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">C'est un Match !</h2>
            <p className="text-gray-600 mb-6">
              Vous et <span className="font-semibold text-pink-600">{matchUser.name}</span> vous plaisez mutuellement !
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsMatch(false)
                  setMatchUser(null)
                }}
                className="w-full bg-pink-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-pink-600 transition-all"
              >
                Continuer à découvrir
              </button>
              <button
                onClick={() => {
                  router.push('/messages')
                  setIsMatch(false)
                  setMatchUser(null)
                }}
                className="w-full bg-white border-2 border-gray-200 text-gray-700 px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-all"
              >
                Envoyer un message
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  )
}