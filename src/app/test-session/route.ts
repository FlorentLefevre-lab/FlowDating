import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cache, userCache, sessionCache } from '@/lib/cache'

export async function GET() {
  // Vérifier l'authentification
    const session = await auth(); 

  // Créer ou récupérer un compteur de visites
  const sessionId = session?.user?.id || 'anonymous'
  const visitKey = `visits:${sessionId}`
  
  // Incrémenter le compteur
  let visits = 1
  const currentVisits = await cache.get(visitKey, { prefix: 'test:' })
  if (currentVisits) {
    visits = parseInt(currentVisits) + 1
  }
  await cache.set(visitKey, visits, { prefix: 'test:', ttl: 3600 })

  // Tester le cache utilisateur
  let userFromCache = null
  if (session?.user?.id) {
    userFromCache = await userCache.get(session.user.id)
    if (!userFromCache) {
      // Simuler la récupération depuis DB
      userFromCache = { id: session.user.id, cached: true }
      await userCache.set(session.user.id, userFromCache)
    }
  }

  return NextResponse.json({
    instance: process.env.INSTANCE_ID,
    session: session ? 'authenticated' : 'anonymous',
    userId: session?.user?.id || null,
    visits,
    userFromCache: !!userFromCache,
    timestamp: new Date().toISOString(),
    redisHealthy: isRedisHealthy()
  })
}