import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import redis, { isRedisHealthy } from '@/lib/redis'

interface HealthCheck {
  status: 'ok' | 'error'
  responseTime?: number
  error?: string
  mode?: string
}

export async function GET() {
  const health = {
    status: 'ok' as 'ok' | 'degraded' | 'error',
    instance: process.env.INSTANCE_ID || 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      redis: { status: 'ok' } as HealthCheck,
      database: { status: 'ok' } as HealthCheck
    }
  }

  // Check Redis
  try {
    const start = Date.now()
    if (isRedisHealthy()) {
      await redis.ping()
      health.checks.redis = {
        status: 'ok',
        responseTime: Date.now() - start,
        mode: 'redis'
      }
    } else {
      health.checks.redis = {
        status: 'ok',
        mode: 'memory-fallback'
      }
    }
  } catch (error) {
    health.checks.redis = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      mode: 'memory-fallback'
    }
    health.status = 'degraded'
  }

  // Check Database
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = {
      status: 'ok',
      responseTime: Date.now() - start
    }
  } catch (error) {
    health.checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    health.status = 'error'
  }

  return NextResponse.json(health, {
    status: health.status === 'ok' ? 200 : 503
  })
}