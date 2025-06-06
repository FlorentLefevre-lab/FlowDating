// src/hooks/useRealTimeStats.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

export interface UserStats {
  messagesReceived: number
  matchesCount: number
  profileViews: number
  likesReceived: number
  dailyStats: {
    messagesReceived: number
    profileViews: number
    likesReceived: number
  }
}

export interface RecentActivity {
  id: string
  type: 'match' | 'like' | 'message' | 'visit'
  userId: string
  userName: string
  userAvatar: string
  timestamp: Date
  content?: string
  isRead?: boolean
}

interface UseRealTimeStatsReturn {
  stats: UserStats
  recentActivity: RecentActivity[]
  isLoading: boolean
  error: string | null
  refreshStats: () => Promise<void>
  lastUpdated: Date | null
}

// 💾 CACHE SIMPLE POUR ÉVITER LES REQUÊTES RÉPÉTÉES
const statsCache = new Map<string, { data: UserStats; timestamp: number }>()
const activityCache = new Map<string, { data: RecentActivity[]; timestamp: number }>()
const CACHE_DURATION = 15000 // 15 secondes

// 🎭 DONNÉES MOCKÉES - Pour fallback ou développement
const generateMockStats = (userId: string): UserStats => {
  const baseStats = {
    messagesReceived: Math.floor(Math.random() * 50) + 10,
    matchesCount: Math.floor(Math.random() * 25) + 5,
    profileViews: Math.floor(Math.random() * 200) + 50,
    likesReceived: Math.floor(Math.random() * 80) + 20,
    dailyStats: {
      messagesReceived: Math.floor(Math.random() * 8) + 1,
      profileViews: Math.floor(Math.random() * 30) + 5,
      likesReceived: Math.floor(Math.random() * 15) + 2,
    }
  }
  
  // Simulation d'évolution en temps réel
  const now = Date.now()
  const variation = Math.sin(now / 10000) * 2
  
  return {
    ...baseStats,
    dailyStats: {
      ...baseStats.dailyStats,
      messagesReceived: Math.max(0, baseStats.dailyStats.messagesReceived + Math.floor(variation)),
      profileViews: Math.max(0, baseStats.dailyStats.profileViews + Math.floor(variation * 2)),
      likesReceived: Math.max(0, baseStats.dailyStats.likesReceived + Math.floor(variation)),
    }
  }
}

const generateMockActivity = (userId: string): RecentActivity[] => {
  const mockUsers = [
    { id: '1', name: 'Sophie', avatar: '👩‍🦰' },
    { id: '2', name: 'Emma', avatar: '👱‍♀️' },
    { id: '3', name: 'Léa', avatar: '👩‍🦱' },
    { id: '4', name: 'Chloé', avatar: '👩' },
    { id: '5', name: 'Marie', avatar: '👩‍💼' },
    { id: '6', name: 'Alice', avatar: '🧑‍🎨' },
  ]
  
  const activities: RecentActivity[] = []
  const now = new Date()
  
  for (let i = 0; i < 8; i++) {
    const user = mockUsers[Math.floor(Math.random() * mockUsers.length)]
    const types: RecentActivity['type'][] = ['match', 'like', 'message', 'visit']
    const type = types[Math.floor(Math.random() * types.length)]
    
    const hoursAgo = Math.floor(Math.random() * 24) + (i * 0.5)
    const timestamp = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000))
    
    const messages = [
      'Salut ! Comment ça va ?',
      'J\'ai vu qu\'on avait des centres d\'intérêt en commun 😊',
      'Tu fais quoi ce weekend ?',
      'Merci pour le like ! 💕',
      'J\'adore tes photos de voyage !',
    ]
    
    activities.push({
      id: `${user.id}-${i}-${type}`,
      type,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      timestamp,
      content: type === 'message' ? messages[Math.floor(Math.random() * messages.length)] : undefined,
      isRead: Math.random() > 0.3
    })
  }
  
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

// 🔄 API CALLS - Basculer entre Mock et Production
const USE_MOCK_DATA = false // Changez à true pour utiliser les données mockées

const fetchUserStats = async (userId: string): Promise<UserStats> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200))
    return generateMockStats(userId)
  }

  // 🚀 Vérification du cache
  const cached = statsCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  const response = await fetch(`/api/users/${userId}/stats`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  })
  
  if (!response.ok) {
    throw new Error(`Erreur API stats: ${response.status}`)
  }
  
  const data = await response.json()
  
  // 💾 Mise en cache
  statsCache.set(userId, { data, timestamp: Date.now() })
  
  return data
}

const fetchRecentActivity = async (userId: string): Promise<RecentActivity[]> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100))
    return generateMockActivity(userId)
  }

  // 🚀 Vérification du cache
  const cached = activityCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  const response = await fetch(`/api/users/${userId}/activity?limit=10`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  })
  
  if (!response.ok) {
    throw new Error(`Erreur API activity: ${response.status}`)
  }
  
  const data = await response.json()
  
  // 📅 Conversion des timestamps en objets Date
  const formattedData = data.map((activity: any) => ({
    ...activity,
    timestamp: new Date(activity.timestamp)
  }))
  
  // 💾 Mise en cache
  activityCache.set(userId, { data: formattedData, timestamp: Date.now() })
  
  return formattedData
}

export const useRealTimeStats = (
  refreshInterval: number = 30000,
  enableAutoRefresh: boolean = true
): UseRealTimeStatsReturn => {
  const { data: session } = useSession()
  const [stats, setStats] = useState<UserStats>({
    messagesReceived: 0,
    matchesCount: 0,
    profileViews: 0,
    likesReceived: 0,
    dailyStats: {
      messagesReceived: 0,
      profileViews: 0,
      likesReceived: 0,
    }
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isComponentMounted = useRef(true)

  const refreshStats = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setError(null)
      
      // 🚀 Chargement en parallèle avec gestion d'erreur individuelle
      const [statsResult, activityResult] = await Promise.allSettled([
        fetchUserStats(session.user.id),
        fetchRecentActivity(session.user.id)
      ])
      
      // 📊 Traitement des stats
      if (statsResult.status === 'fulfilled') {
        if (isComponentMounted.current) {
          setStats(statsResult.value)
        }
      } else {
        console.error('Erreur stats:', statsResult.reason)
      }
      
      // 📋 Traitement de l'activité
      if (activityResult.status === 'fulfilled') {
        if (isComponentMounted.current) {
          setRecentActivity(activityResult.value)
        }
      } else {
        console.error('Erreur activité:', activityResult.reason)
      }
      
      // ⚠️ Gestion d'erreur globale seulement si les deux échouent
      if (statsResult.status === 'rejected' && activityResult.status === 'rejected') {
        setError('Impossible de charger les données')
      }
      
      if (isComponentMounted.current) {
        setLastUpdated(new Date())
      }
      
    } catch (err) {
      console.error('Erreur lors du chargement des stats:', err)
      if (isComponentMounted.current) {
        setError('Erreur de connexion')
      }
    } finally {
      if (isComponentMounted.current) {
        setIsLoading(false)
      }
    }
  }, [session?.user?.id])

  // 🔄 Chargement initial
  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  // ⏰ Rafraîchissement automatique
  useEffect(() => {
    if (!session?.user?.id || !enableAutoRefresh) return

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      if (isComponentMounted.current) {
        refreshStats()
      }
    }, refreshInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [session?.user?.id, refreshInterval, enableAutoRefresh, refreshStats])

  // 🧹 Nettoyage au démontage
  useEffect(() => {
    return () => {
      isComponentMounted.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    stats,
    recentActivity,
    isLoading,
    error,
    refreshStats,
    lastUpdated
  }
}

// 🎯 HOOK SPÉCIALISÉ POUR LES NOTIFICATIONS
export const useActivityNotifications = () => {
  const { recentActivity } = useRealTimeStats(15000)
  const [previousActivityCount, setPreviousActivityCount] = useState(0)
  const [newActivities, setNewActivities] = useState<RecentActivity[]>([])

  useEffect(() => {
    if (recentActivity.length > previousActivityCount && previousActivityCount > 0) {
      const newItems = recentActivity.slice(0, recentActivity.length - previousActivityCount)
      setNewActivities(newItems)
      
      setTimeout(() => setNewActivities([]), 5000)
    }
    setPreviousActivityCount(recentActivity.length)
  }, [recentActivity, previousActivityCount])

  return {
    newActivities,
    hasNewActivity: newActivities.length > 0,
    clearNotifications: () => setNewActivities([])
  }
}