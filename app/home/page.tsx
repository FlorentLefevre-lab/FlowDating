// app/page.tsx - Version corrigée pour le chargement des données

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { RecentActivity } from '@/components/profile/RecentActivity'
import { useStats } from '@/hooks/useStats'
import { useQuery } from '@/hooks/useQuery'
import { Button, Card, Badge, SimpleLoading } from '@/components/ui'

// ================================
// 🔥 TYPES POUR L'API DISCOVER
// ================================

interface DiscoverUser {
  id: string
  name: string
  age: number
  bio: string
  location: string
  profession: string
  interests: string[]
  role?: 'USER' | 'MODERATOR' | 'ADMIN'
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

interface AccountStatus {
  accountStatus: string
  suspendedAt?: string
  suspensionReason?: string
  suspendedUntil?: string
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // 🔥 CORRECTION: États pour forcer le re-render
  const [mounted, setMounted] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // 🔥 CORRECTION: Hooks avec options fixes
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats
  } = useStats(false) // Pas de polling automatique pour éviter les conflits

  const { 
    data: rawAccountStatus, 
    isLoading: statusLoading, 
    error: statusError,
    refetch: refetchStatus
  } = useQuery<any>('/api/profile', {
    cache: true,
    cacheTtl: 2 * 60 * 1000,
    enabled: status === 'authenticated' && mounted // 🔥 Condition précise
  })

  const { 
    data: discoveryData, 
    isLoading: discoverLoading, 
    error: discoverError,
    refetch: refetchProfiles 
  } = useQuery<DiscoverApiResponse>('/api/discover?limit=10', {
    cache: true,
    cacheTtl: 30 * 1000,
    enabled: status === 'authenticated' && mounted // 🔥 Condition précise
  })

  // 🔥 CORRECTION: Gestion du mounting et chargement forcé
  useEffect(() => {
    setMounted(true)
  }, [])

  // 🔥 CORRECTION: Chargement forcé des données quand tout est prêt
  useEffect(() => {
    if (status === 'authenticated' && mounted && !dataLoaded) {
      console.log('🔄 [HOME] Chargement forcé des données...')
      
      // Forcer le chargement de toutes les données
      const loadAllData = async () => {
        try {
          await Promise.all([
            refetchStats(),
            refetchStatus(),
            refetchProfiles()
          ])
          setDataLoaded(true)
          console.log('✅ [HOME] Toutes les données chargées')
        } catch (error) {
          console.error('❌ [HOME] Erreur chargement:', error)
        }
      }
      
      loadAllData()
    }
  }, [status, mounted, dataLoaded, refetchStats, refetchStatus, refetchProfiles])

  // 🔥 CORRECTION: Debugging amélioré
  useEffect(() => {
    console.log('🐛 [HOME] État complet:', {
      status,
      mounted,
      dataLoaded,
      statsLoading,
      stats: stats ? 'Données présentes' : 'Aucune donnée',
      statusLoading,
      discoverLoading
    })
  }, [status, mounted, dataLoaded, statsLoading, stats, statusLoading, discoverLoading])

  // États UI
  const [currentUserIndex, setCurrentUserIndex] = useState(0)
  const [isMatch, setIsMatch] = useState(false)
  const [matchUser, setMatchUser] = useState<{ id: string; name: string } | null>(null)

  // Données dérivées
  const accountStatus: AccountStatus | null = rawAccountStatus ? {
    accountStatus: rawAccountStatus.accountStatus || 'ACTIVE',
    suspendedAt: rawAccountStatus.suspendedAt,
    suspensionReason: rawAccountStatus.suspensionReason,
    suspendedUntil: rawAccountStatus.suspendedUntil
  } : null

  const discoveryUsers = discoveryData?.users || []
  const currentUser = discoveryUsers[currentUserIndex]

  // 🔥 CORRECTION: Fonction de rafraîchissement améliorée
  const handleRefresh = async () => {
    console.log('🔄 [HOME] Rafraîchissement manuel...')
    setDataLoaded(false)
    
    try {
      await Promise.all([
        refetchStats(),
        refetchStatus(),
        refetchProfiles()
      ])
      setDataLoaded(true)
      console.log('✅ [HOME] Rafraîchissement terminé')
    } catch (error) {
      console.error('❌ [HOME] Erreur rafraîchissement:', error)
    }
  }

  // Actions discover (code inchangé mais amélioré)
  const handleLike = async (userId: string) => {
    try {
      console.log('💖 Like user:', userId)

      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          action: 'like'
        })
      })

      const result = await response.json()
      console.log('📡 Like result:', result)

      if (result.success) {
        if (result.isMatch) {
          console.log('🎉 MATCH détecté !')
          setMatchUser({ id: userId, name: currentUser.name })
          setIsMatch(true)
          refetchStats() // Mettre à jour les stats
          // Notifier la Navbar pour mettre à jour le compteur
          window.dispatchEvent(new Event('match-updated'))
        }
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
      console.log('👎 Pass user:', userId)

      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          action: 'dislike'
        })
      })

      const result = await response.json()
      console.log('📡 Pass result:', result)

      nextUser() // Continuer même en cas d'erreur
    } catch (error) {
      console.error('❌ Erreur réseau pass:', error)
      nextUser() // Continuer même en cas d'erreur réseau
    }
  }

  const handleSuperLike = async (userId: string) => {
    try {
      console.log('⭐ Super Like user:', userId)

      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          action: 'super_like'
        })
      })

      const result = await response.json()
      console.log('📡 Super Like result:', result)

      if (result.success && result.isMatch) {
        console.log('🎉 SUPER MATCH détecté !')
        setMatchUser({ id: userId, name: currentUser.name })
        setIsMatch(true)
        refetchStats()
        // Notifier la Navbar pour mettre à jour le compteur
        window.dispatchEvent(new Event('match-updated'))
      }
      nextUser()
    } catch (error) {
      console.error('❌ Erreur réseau super like:', error)
      alert('Erreur de connexion lors du super like')
    }
  }

  const nextUser = () => {
    if (currentUserIndex < discoveryUsers.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1)
    } else {
      console.log('🔄 Fin des profils, rechargement...')
      refetchProfiles()
      setCurrentUserIndex(0)
    }
  }

  // Utilitaires (code inchangé)
  const getUserAvatar = (user: DiscoverUser) => {
    const primaryPhoto = user.photos?.find(photo => photo.isPrimary)
    const firstPhoto = user.photos?.[0]
    
    if (primaryPhoto?.url) {
      return primaryPhoto.url
    } else if (firstPhoto?.url) {
      return firstPhoto.url
    } else {
      const avatars = ['👩‍🦰', '👱‍♀️', '👩‍🦱', '👩', '🧑‍🦰', '👨‍🦱', '👨', '🧑']
      const index = user.name.length % avatars.length
      return avatars[index]
    }
  }

  const getDistance = (compatibility: number) => {
    return Math.round((100 - compatibility) / 10 + 0.5)
  }

  // Redirection si non authentifié
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // 🔥 Composant de statut de compte avec chargement amélioré
  const AccountStatusBanner = () => {
    if (statusLoading || !mounted) {
      return (
        <Card className="bg-blue-50 border-blue-200 p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="spinner-sm border-blue-500"></div>
            <span className="text-sm text-blue-700">Vérification du statut du compte...</span>
          </div>
        </Card>
      )
    }

    if (statusError) {
      return (
        <Card className="bg-yellow-50 border-yellow-200 p-3 mb-4">
          <div className="flex-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-sm text-yellow-700">Impossible de vérifier le statut du compte</span>
            </div>
            <Button onClick={handleRefresh} size="sm" className="bg-yellow-500 hover:bg-yellow-600">
              Réessayer
            </Button>
          </div>
        </Card>
      )
    }

    if (!accountStatus) return null

    // Affichage selon le statut
    switch (accountStatus.accountStatus) {
      case 'ACTIVE':
        return (
          <Card className="bg-green-50 border-green-200 p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span className="text-sm text-green-700 font-medium">Compte actif</span>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">En ligne</span>
              </div>
            </div>
          </Card>
        )

      case 'SUSPENDED':
        return (
          <Card className="bg-orange-50 border-l-4 border-orange-500 rounded-r-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-orange-500 text-xl">⏸️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-orange-800">Compte suspendu</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Votre compte est actuellement suspendu.
                </p>
                <div className="mt-3">
                  <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600">
                    <Link href="/profile?tab=settings">
                      ⚙️ Gérer mon compte
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )

      default:
        return (
          <Card className="bg-gray-50 border-gray-200 p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">❓</span>
              <span className="text-sm text-gray-700">
                Statut: {accountStatus.accountStatus || 'Inconnu'}
              </span>
            </div>
          </Card>
        )
    }
  }

  // 🔥 Actions rapides avec données réelles
  const quickActions = [
    {
      icon: '🔥',
      label: 'Découverte',
      href: '/discover',
      color: 'from-orange-500 to-red-500',
      description: 'Explorer les profils'
    },
    {
      icon: '💖',
      label: 'Matchs',
      href: '/matches',
      count: stats?.matchStats?.totalMatches || stats?.matchesCount || 0,
      color: 'from-pink-500 to-pink-600',
      description: `${stats?.matchStats?.newMatches || 0} nouveau(x)`
    },
    {
      icon: '💬',
      label: 'Messages',
      href: '/chat',
      count: stats?.matchStats?.activeConversations || 0,
      color: 'from-blue-500 to-blue-600',
      description: 'Conversations actives'
    },
    {
      icon: '🐛',
      label: 'Support',
      href: '/help',
      color: 'from-red-500 to-orange-500',
      description: 'Aide & signaler un bug'
    },
    {
      icon: '👑',
      label: 'Premium',
      href: '/premium',
      color: 'from-amber-500 to-yellow-500',
      description: 'Fonctionnalités exclusives'
    },
    {
      icon: '🪙',
      label: 'Don',
      href: '/donate',
      color: 'from-yellow-500 to-amber-500',
      description: 'Soutenir Flow Dating'
    }
  ]

  // Loading state global
  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center">
        <SimpleLoading message="Préparation de votre tableau de bord..." size="lg" />
      </div>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Bannière de statut du compte */}
          <AccountStatusBanner />
          
          {/* En-tête de bienvenue */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Salut {session?.user?.name?.split(' ')[0] || 'toi'} ! 👋
                </h1>
                <div className="text-gray-600 flex items-center gap-3">
                  <span>Voici votre activité et les dernières notifications</span>
                  
                  {/* Indicateur de statut dans l'en-tête */}
                  {!statusLoading && accountStatus && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400">•</div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${
                          accountStatus.accountStatus === 'ACTIVE' ? 'bg-green-500' :
                          accountStatus.accountStatus === 'SUSPENDED' ? 'bg-orange-500' :
                          'bg-gray-400'
                        }`}></div>
                        <span className={`text-xs font-medium ${
                          accountStatus.accountStatus === 'ACTIVE' ? 'text-green-600' :
                          accountStatus.accountStatus === 'SUSPENDED' ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          {accountStatus.accountStatus === 'ACTIVE' ? 'Actif' :
                           accountStatus.accountStatus === 'SUSPENDED' ? 'Suspendu' :
                           accountStatus.accountStatus}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Bouton de rafraîchissement avec indicateur */}
              <div className="text-right">
                <Button
                  onClick={handleRefresh}
                  disabled={!dataLoaded}
                  variant="default"
                >
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    statsLoading ? 'bg-yellow-200 animate-pulse' :
                    statsError ? 'bg-red-200' : 'bg-green-200'
                  }`}></div>
                  Actualiser
                </Button>
                {statsError && (
                  <div className="text-xs text-red-500 mt-1">
                    Erreur de connexion
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section principale en 3 colonnes */}
          <div className="flex flex-col xl:flex-row gap-6 mb-8">

            {/* Colonne 1: Stats rapides */}
            <Card className="xl:w-1/3 p-6">
              <h3 className="text-subheading mb-4 flex items-center gap-2">
                ⚡ En un coup d&apos;œil
                {statsLoading && (
                  <div className="spinner-sm"></div>
                )}
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {statsLoading ? (
                      <div className="animate-pulse">...</div>
                    ) : (
                      stats?.dailyStats?.profileViews || stats?.profileViews || 0
                    )}
                  </div>
                  <div className="text-xs text-blue-700">Vues aujourd&apos;hui</div>
                </div>

                <div className="text-center p-3 bg-pink-50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600">
                    {statsLoading ? (
                      <div className="animate-pulse">...</div>
                    ) : (
                      stats?.dailyStats?.likesReceived || stats?.likesReceived || 0
                    )}
                  </div>
                  <div className="text-xs text-pink-700">Likes reçus</div>
                </div>

                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {statsLoading ? (
                      <div className="animate-pulse">...</div>
                    ) : (
                      stats?.matchStats?.activeConversations || 0
                    )}
                  </div>
                  <div className="text-xs text-green-700">Conversations actives</div>
                </div>

                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {statsLoading ? (
                      <div className="animate-pulse">...</div>
                    ) : (
                      stats?.matchStats?.totalMatches || stats?.matchesCount || 0
                    )}
                  </div>
                  <div className="text-xs text-orange-700">Matches total</div>
                </div>
              </div>

              {/* Stats de matches détaillées */}
              <div className="mb-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">📊 Activité des matches</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Nouveaux aujourd&apos;hui
                    </span>
                    <span className="font-semibold text-green-600">
                      {statsLoading ? '...' : (stats?.matchStats?.newMatches || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Cette semaine
                    </span>
                    <span className="font-semibold text-blue-600">
                      {statsLoading ? '...' : (stats?.matchStats?.thisWeekMatches || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      En attente
                    </span>
                    <span className="font-semibold text-yellow-600">
                      {statsLoading ? '...' : (stats?.matchStats?.dormantMatches || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      ⏱️ Temps de réponse moy.
                    </span>
                    <span className="font-semibold text-purple-600">
                      {statsLoading ? '...' : (stats?.matchStats?.averageResponseTime || '0h')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance du jour */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Performance du jour</span>
                  <span className={`font-medium ${
                    ((stats?.dailyStats?.profileViews || 0) + (stats?.dailyStats?.likesReceived || 0)) > 5
                      ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {((stats?.dailyStats?.profileViews || 0) + (stats?.dailyStats?.likesReceived || 0)) > 5
                      ? '🔥 Excellente' : '📈 Moyenne'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Colonne 2: Découverte */}
            <Card className="xl:w-1/3 p-4 flex flex-col min-h-[500px]">
              <div className="flex-between mb-4">
                <h2 className="text-subheading flex items-center gap-2">
                  🔥 Découverte
                  {discoverLoading && (
                    <div className="spinner-sm"></div>
                  )}
                </h2>
                <Button asChild variant="link" className="text-primary-600">
                  <Link href="/discover">
                    Voir plus →
                  </Link>
                </Button>
              </div>

              {/* Contenu découverte */}
              {discoverLoading || !dataLoaded ? (
                <div className="flex-1 flex-center">
                  <SimpleLoading message="Recherche de profils..." size="sm" />
                </div>
              ) : discoverError ? (
                <div className="flex-1 flex-center">
                  <div className="text-center">
                    <div className="text-2xl mb-2">😞</div>
                    <p className="text-sm text-red-600 mb-2">Erreur de chargement</p>
                    <Button onClick={handleRefresh} size="sm" variant="default">
                      Réessayer
                    </Button>
                  </div>
                </div>
              ) : currentUser ? (
                <div className="flex-1 min-h-0">
                  {/* Carte de profil discover (code inchangé mais avec currentUser) */}
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
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40"></div>
                    
                    {/* Badges en haut */}
                    <div className="relative z-10 p-4 flex-between items-start">
                      <div className="flex items-center gap-2">
                        {currentUser.isOnline && (
                          <Badge className="badge-online">
                            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                            En ligne
                          </Badge>
                        )}
                        {/* Badge Admin/Moderator */}
                        {(currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') && (
                          <Badge className={`${
                            currentUser.role === 'ADMIN'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          } text-white border-0`}>
                            {currentUser.role === 'ADMIN' ? '👑 Admin' : '🛡️ Mod'}
                          </Badge>
                        )}
                      </div>
                      <Badge className="badge-primary glass">
                        ✨ {currentUser.compatibility}% compatible
                      </Badge>
                    </div>

                    {/* Contenu principal */}
                    <div className="relative z-10 mt-auto p-4 text-white">
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

                      {/* Bio */}
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

                      {/* Actions de swipe */}
                      <div className="flex-center gap-4 mb-3">
                        <Button
                          onClick={() => handlePass(currentUser.id)}
                          variant="ghost"
                          size="icon"
                          className="w-14 h-14 rounded-full glass border border-white/20 hover:scale-110"
                          title="Passer"
                        >
                          <span className="text-xl">👎</span>
                        </Button>

                        <Button
                          onClick={() => handleSuperLike(currentUser.id)}
                          variant="ghost"
                          size="icon"
                          className="w-14 h-14 rounded-full bg-blue-500/90 hover:bg-blue-600 text-white hover:scale-110 shadow-lg border border-white/30"
                          title="Super Like"
                        >
                          <span className="text-xl">⭐</span>
                        </Button>

                        <Button
                          onClick={() => handleLike(currentUser.id)}
                          variant="ghost"
                          size="icon"
                          className="w-16 h-16 rounded-full bg-primary-500 hover:bg-primary-600 text-white hover:scale-110 shadow-xl border-2 border-white/40"
                          title="Liker"
                        >
                          <span className="text-2xl">💖</span>
                        </Button>
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
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 flex-1 flex flex-col justify-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">
                    Plus de profils !
                  </h3>
                  <p className="text-caption mb-3">
                    Aucun nouveau profil disponible
                  </p>
                  <Button asChild size="sm" variant="default">
                    <Link href="/discover">
                      Explorer plus
                    </Link>
                  </Button>
                </div>
              )}
            </Card>

            {/* Colonne 3: Actions rapides */}
            <Card className="xl:w-1/3 p-6">
              <h3 className="text-subheading mb-4 flex items-center gap-2">
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

              {/* Conseil du jour */}
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl p-4 text-white">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    💡 Conseil du jour
                  </h3>
                  <div className="text-orange-100 text-xs leading-relaxed mb-3">
                    {!dataLoaded ? 
                      'Chargement de conseils personnalisés...' :
                      (stats?.dailyStats?.profileViews || 0) === 0 ? 
                      'Votre profil n\'a pas encore été vu aujourd\'hui. Pensez à vous connecter plus souvent !' :
                      (stats?.dailyStats?.profileViews || 0) > 20 ?
                      'Excellent ! Votre profil attire beaucoup d\'attention.' :
                      'Ajoutez plus de photos à votre profil pour augmenter vos chances de match !'
                    }
                  </div>
                  <Button asChild size="sm" className="bg-white text-orange-600 hover:bg-orange-50">
                    <Link href="/profile">
                      📷 Améliorer mon profil
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Modal de Match */}
      {isMatch && matchUser && (
        <div className="modal-overlay flex-center">
          <Card className="p-8 mx-4 text-center max-w-md">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-heading mb-2">C'est un Match !</h2>
            <p className="text-body mb-6">
              Vous et <span className="font-semibold text-primary-600">{matchUser.name}</span> vous plaisez mutuellement !
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setIsMatch(false)
                  setMatchUser(null)
                }}
                variant="gradient"
                size="lg"
                className="w-full rounded-full"
              >
                Continuer à découvrir
              </Button>
              <Button
                onClick={() => {
                  router.push('/messages')
                  setIsMatch(false)
                  setMatchUser(null)
                }}
                variant="outline"
                size="lg"
                className="w-full rounded-full"
              >
                Envoyer un message
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AuthGuard>
  )
}