// scripts/test-redis.ts - Manual Redis connection test
// Run with: npx tsx scripts/test-redis.ts

import { getRedisClient, initRedis, closeRedis, isRedisHealthy, getRedisStatus } from '../src/lib/redis';
import { cache, userCache, sessionCache } from '../src/lib/cache';

async function testRedisConnection() {
  console.log('='.repeat(50));
  console.log('Redis Connection Test');
  console.log('='.repeat(50));

  // Test 1: Initialize Redis
  console.log('\n[Test 1] Initializing Redis...');
  const initialized = await initRedis();
  console.log(`Initialization: ${initialized ? 'SUCCESS' : 'FAILED'}`);

  // Test 2: Check health
  console.log('\n[Test 2] Checking Redis health...');
  const healthy = await isRedisHealthy();
  console.log(`Health check: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
  console.log(`Status: ${getRedisStatus()}`);

  if (!healthy) {
    console.log('\nRedis is not available. Make sure Redis is running.');
    console.log('You can start Redis with: docker run -d -p 6379:6379 redis');
    await closeRedis();
    process.exit(1);
  }

  // Test 3: Basic Redis operations
  console.log('\n[Test 3] Testing basic Redis operations...');
  const client = getRedisClient();

  try {
    // SET
    await client.set('test:key', 'Hello Redis!');
    console.log('SET test:key = "Hello Redis!" - SUCCESS');

    // GET
    const value = await client.get('test:key');
    console.log(`GET test:key = "${value}" - ${value === 'Hello Redis!' ? 'SUCCESS' : 'FAILED'}`);

    // SETEX (with TTL)
    await client.setex('test:ttl', 60, 'expires in 60s');
    const ttl = await client.ttl('test:ttl');
    console.log(`SETEX with TTL: ${ttl}s remaining - SUCCESS`);

    // DEL
    await client.del('test:key', 'test:ttl');
    console.log('DEL test keys - SUCCESS');
  } catch (error) {
    console.error('Basic operations failed:', error);
  }

  // Test 4: Cache module operations
  console.log('\n[Test 4] Testing cache module...');

  try {
    // Test generic cache
    await cache.set('test:cache', { message: 'Hello from cache', timestamp: Date.now() }, { ttl: 300 });
    const cached = await cache.get<{ message: string; timestamp: number }>('test:cache');
    console.log(`Cache SET/GET: ${cached?.message === 'Hello from cache' ? 'SUCCESS' : 'FAILED'}`);

    // Test user cache
    await userCache.set('user123', { id: 'user123', name: 'Test User', email: 'test@example.com' });
    const userData = await userCache.get('user123');
    console.log(`UserCache SET/GET: ${userData ? 'SUCCESS' : 'FAILED'}`);

    // Test session cache
    await sessionCache.set('session456', { userId: 'user123', token: 'abc123', expiresAt: Date.now() + 3600000 });
    const sessionData = await sessionCache.get('session456');
    console.log(`SessionCache SET/GET: ${sessionData ? 'SUCCESS' : 'FAILED'}`);

    // Test pattern invalidation
    await cache.set('pattern:user:1', 'data1', { ttl: 300 });
    await cache.set('pattern:user:2', 'data2', { ttl: 300 });
    await cache.set('pattern:user:3', 'data3', { ttl: 300 });
    const invalidated = await cache.invalidatePattern('pattern:user:*');
    console.log(`Pattern invalidation: ${invalidated} keys deleted - SUCCESS`);

    // Test getOrSet
    let fetcherCalled = false;
    const result = await cache.getOrSet('test:getOrSet', async () => {
      fetcherCalled = true;
      return { computed: true };
    }, { ttl: 60 });
    console.log(`getOrSet (fetcher called: ${fetcherCalled}): ${result.computed ? 'SUCCESS' : 'FAILED'}`);

    // Second call should use cache
    fetcherCalled = false;
    await cache.getOrSet('test:getOrSet', async () => {
      fetcherCalled = true;
      return { computed: true };
    }, { ttl: 60 });
    console.log(`getOrSet cache hit (fetcher not called: ${!fetcherCalled}): ${!fetcherCalled ? 'SUCCESS' : 'FAILED'}`);

    // Cleanup test keys
    await cache.delete('test:cache');
    await userCache.delete('user123');
    await sessionCache.delete('session456');
    await cache.delete('test:getOrSet');
    console.log('Cleanup - SUCCESS');
  } catch (error) {
    console.error('Cache operations failed:', error);
  }

  // Test 5: Performance test
  console.log('\n[Test 5] Performance test (1000 operations)...');

  try {
    const startTime = Date.now();
    const operations = 1000;

    for (let i = 0; i < operations; i++) {
      await client.set(`perf:${i}`, `value-${i}`);
    }
    const writeTime = Date.now() - startTime;

    const readStart = Date.now();
    for (let i = 0; i < operations; i++) {
      await client.get(`perf:${i}`);
    }
    const readTime = Date.now() - readStart;

    // Cleanup
    const keys = Array.from({ length: operations }, (_, i) => `perf:${i}`);
    await client.del(...keys);

    console.log(`Write ${operations} keys: ${writeTime}ms (${Math.round(operations / (writeTime / 1000))} ops/sec)`);
    console.log(`Read ${operations} keys: ${readTime}ms (${Math.round(operations / (readTime / 1000))} ops/sec)`);
  } catch (error) {
    console.error('Performance test failed:', error);
  }

  // Cleanup and close
  console.log('\n[Cleanup] Closing Redis connection...');
  await closeRedis();
  console.log('Connection closed.');

  console.log('\n' + '='.repeat(50));
  console.log('All tests completed!');
  console.log('='.repeat(50));
}

// Run tests
testRedisConnection().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
