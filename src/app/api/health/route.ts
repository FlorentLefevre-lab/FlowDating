// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET() {
  const instanceId = process.env.INSTANCE_ID || 'UNKNOWN'
  const instanceColor = process.env.INSTANCE_COLOR || '#000000'
  
  try {
    // Vérifier la connexion à la base de données
    const dbCheck = await prisma.$queryRaw`SELECT 1`
    
    // Vérifier la connexion Redis
    await redis.ping()
    
    // Retourner le statut de santé
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      instance: {
        id: instanceId,
        color: instanceColor,
        hostname: process.env.HOSTNAME || 'unknown'
      },
      checks: {
        database: 'connected',
        redis: 'connected',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        },
        uptime: Math.round(process.uptime())
      }
    }, {
      headers: {
        'X-Instance-ID': instanceId,
        'X-Instance-Color': instanceColor
      }
    })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      instance: {
        id: instanceId,
        color: instanceColor
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 503,
      headers: {
        'X-Instance-ID': instanceId,
        'X-Instance-Color': instanceColor
      }
    })
  }
}