import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'

export async function GET() {
  const instanceInfo = {
    id: process.env.INSTANCE_ID || 'Unknown',
    color: process.env.INSTANCE_COLOR || '#333',
    pid: process.pid,
    port: process.env.PORT || 3000,
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    redis_connected: await testRedisConnection(),
  }

  // Log dans le cache pour debug
  await cache.set(`instance:${instanceInfo.id}:ping`, instanceInfo, {
    prefix: 'debug:',
    ttl: 60
  })

  return NextResponse.json(instanceInfo)
}

async function testRedisConnection(): Promise<boolean> {
  try {
    await cache.set('test', 'test', { ttl: 1 })
    const result = await cache.get('test')
    return result === 'test'
  } catch {
    return false
  }
}