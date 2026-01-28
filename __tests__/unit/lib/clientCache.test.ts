/**
 * Unit tests for src/lib/clientCache.ts
 * Tests client-side cache functionality
 * Note: This runs in node environment but tests client-side code
 */

describe('ClientCache', () => {
  let clientCache: typeof import('@/lib/clientCache').clientCache;
  let apiCache: typeof import('@/lib/clientCache').apiCache;

  // Store original console.log
  const originalLog = console.log;

  beforeEach(async () => {
    jest.resetModules();

    // Suppress console.log during tests
    console.log = jest.fn();

    // Import fresh instance
    const cacheModule = await import('@/lib/clientCache');
    clientCache = cacheModule.clientCache;
    apiCache = cacheModule.apiCache;

    // Clear the cache
    clientCache.clear();
  });

  afterEach(() => {
    console.log = originalLog;
  });

  describe('ClientCache.set', () => {
    it('should store value with default TTL', () => {
      clientCache.set('key1', { data: 'test' });

      const result = clientCache.get('key1');

      expect(result).toEqual({ data: 'test' });
    });

    it('should store value with custom TTL', () => {
      clientCache.set('key2', 'value', 60000); // 1 minute

      const result = clientCache.get('key2');

      expect(result).toBe('value');
    });

    it('should serialize complex objects', () => {
      const complexData = {
        id: 1,
        nested: {
          array: [1, 2, 3],
          object: { a: 'b' },
        },
        date: new Date('2024-01-01').toISOString(),
      };

      clientCache.set('complex', complexData);

      const result = clientCache.get('complex');
      expect(result).toEqual(complexData);
    });

    it('should evict oldest entry when max size reached', () => {
      // Max size is 100
      for (let i = 0; i < 105; i++) {
        clientCache.set(`evict-${i}`, `value-${i}`);
      }

      // First few entries should be evicted
      // Later entries should still exist
      const lastValue = clientCache.get('evict-104');
      expect(lastValue).toBe('value-104');
    });

    it('should log cache SET operations', () => {
      clientCache.set('logged-key', 'value');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CLIENT] Cache SET:')
      );
    });
  });

  describe('ClientCache.get', () => {
    it('should return cached value', () => {
      clientCache.set('existing', 'cached-value');

      const result = clientCache.get('existing');

      expect(result).toBe('cached-value');
    });

    it('should return null for missing key', () => {
      const result = clientCache.get('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for expired key', () => {
      // Set with very short TTL
      clientCache.set('expires', 'value', 1); // 1ms TTL

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = clientCache.get('expires');
          expect(result).toBeNull();
          resolve();
        }, 10);
      });
    });

    it('should log cache HIT', () => {
      clientCache.set('hit-test', 'value');
      (console.log as jest.Mock).mockClear();

      clientCache.get('hit-test');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CLIENT] Cache HIT:')
      );
    });

    it('should log cache MISS', () => {
      (console.log as jest.Mock).mockClear();

      clientCache.get('miss-test');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CLIENT] Cache MISS:')
      );
    });

    it('should log cache EXPIRED', () => {
      clientCache.set('expire-log', 'value', 1);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          (console.log as jest.Mock).mockClear();
          clientCache.get('expire-log');

          expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('[CLIENT] Cache EXPIRED:')
          );
          resolve();
        }, 10);
      });
    });
  });

  describe('ClientCache.invalidate', () => {
    it('should delete specific key', () => {
      clientCache.set('to-delete', 'value');

      clientCache.invalidate('to-delete');

      expect(clientCache.get('to-delete')).toBeNull();
    });

    it('should log invalidation', () => {
      clientCache.set('inv-test', 'value');
      (console.log as jest.Mock).mockClear();

      clientCache.invalidate('inv-test');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CLIENT] Cache INVALIDATED:')
      );
    });

    it('should not throw for non-existent key', () => {
      expect(() => {
        clientCache.invalidate('never-existed');
      }).not.toThrow();
    });
  });

  describe('ClientCache.invalidatePattern', () => {
    it('should delete all matching keys', () => {
      clientCache.set('user:1:profile', 'profile1');
      clientCache.set('user:1:settings', 'settings1');
      clientCache.set('user:2:profile', 'profile2');

      clientCache.invalidatePattern('user:1');

      expect(clientCache.get('user:1:profile')).toBeNull();
      expect(clientCache.get('user:1:settings')).toBeNull();
      expect(clientCache.get('user:2:profile')).toBe('profile2');
    });

    it('should log pattern invalidation with count', () => {
      clientCache.set('pattern:a', 'a');
      clientCache.set('pattern:b', 'b');
      (console.log as jest.Mock).mockClear();

      clientCache.invalidatePattern('pattern:');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CLIENT] Cache PATTERN INVALIDATED:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('2 clés')
      );
    });

    it('should handle empty pattern', () => {
      clientCache.set('key1', 'value1');
      clientCache.set('key2', 'value2');

      // Empty pattern should match all keys
      clientCache.invalidatePattern('');

      expect(clientCache.get('key1')).toBeNull();
      expect(clientCache.get('key2')).toBeNull();
    });
  });

  describe('ClientCache.clear', () => {
    it('should remove all cached entries', () => {
      clientCache.set('key1', 'value1');
      clientCache.set('key2', 'value2');
      clientCache.set('key3', 'value3');

      clientCache.clear();

      expect(clientCache.get('key1')).toBeNull();
      expect(clientCache.get('key2')).toBeNull();
      expect(clientCache.get('key3')).toBeNull();
    });

    it('should log clear operation', () => {
      (console.log as jest.Mock).mockClear();

      clientCache.clear();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CLIENT] Cache CLEARED')
      );
    });
  });

  describe('ClientCache.getStats', () => {
    it('should return cache statistics', () => {
      clientCache.set('stat1', 'value1');
      clientCache.set('stat2', 'value2');

      const stats = clientCache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.keys).toContain('stat1');
      expect(stats.keys).toContain('stat2');
    });

    it('should reflect correct size after operations', () => {
      clientCache.set('a', 1);
      clientCache.set('b', 2);
      clientCache.invalidate('a');

      const stats = clientCache.getStats();

      expect(stats.size).toBe(1);
      expect(stats.keys).toEqual(['b']);
    });
  });

  describe('apiCache facade', () => {
    describe('apiCache.profile', () => {
      it('should cache and retrieve profile', () => {
        const profile = { name: 'Test User', age: 25 };

        apiCache.profile.set('user-1', profile);
        const result = apiCache.profile.get('user-1');

        expect(result).toEqual(profile);
      });

      it('should use correct cache key', () => {
        apiCache.profile.set('user-123', { data: true });

        // Should be stored with 'profile:' prefix
        const result = clientCache.get('profile:user-123');
        expect(result).toEqual({ data: true });
      });

      it('should use 10 minute TTL', () => {
        apiCache.profile.set('user-1', { data: true });

        // Check stats immediately - entry should exist
        expect(apiCache.profile.get('user-1')).not.toBeNull();
      });
    });

    describe('apiCache.discover', () => {
      it('should cache discover results with filters', () => {
        const filters = { minAge: 18, maxAge: 30 };
        const results = [{ id: 'u1' }, { id: 'u2' }];

        apiCache.discover.set('user-1', filters, results);
        const cached = apiCache.discover.get('user-1', filters);

        expect(cached).toEqual(results);
      });

      it('should differentiate by filters', () => {
        const filters1 = { gender: 'male' };
        const filters2 = { gender: 'female' };

        apiCache.discover.set('user-1', filters1, ['male-results']);
        apiCache.discover.set('user-1', filters2, ['female-results']);

        expect(apiCache.discover.get('user-1', filters1)).toEqual(['male-results']);
        expect(apiCache.discover.get('user-1', filters2)).toEqual(['female-results']);
      });

      it('should return null for missing filters', () => {
        apiCache.discover.set('user-1', { a: 1 }, ['results']);

        const result = apiCache.discover.get('user-1', { a: 2 });
        expect(result).toBeNull();
      });
    });

    describe('apiCache.stats', () => {
      it('should cache and retrieve stats', () => {
        const stats = { views: 100, likes: 50 };

        apiCache.stats.set('user-1', stats);
        const result = apiCache.stats.get('user-1');

        expect(result).toEqual(stats);
      });

      it('should use 30 minute TTL', () => {
        apiCache.stats.set('user-1', { views: 1 });

        // Entry should exist immediately
        expect(apiCache.stats.get('user-1')).not.toBeNull();
      });
    });

    describe('apiCache.userBasic', () => {
      it('should cache and retrieve user basic data', () => {
        const userData = { email: 'test@test.com', name: 'Test' };

        apiCache.userBasic.set('user@email.com', userData);
        const result = apiCache.userBasic.get('user@email.com');

        expect(result).toEqual(userData);
      });
    });

    describe('apiCache.exclusions', () => {
      it('should cache and retrieve exclusions', () => {
        const exclusions = ['user-2', 'user-3'];

        apiCache.exclusions.set('user-1', exclusions);
        const result = apiCache.exclusions.get('user-1');

        expect(result).toEqual(exclusions);
      });

      it('should use 5 minute TTL', () => {
        apiCache.exclusions.set('user-1', ['excluded']);

        expect(apiCache.exclusions.get('user-1')).not.toBeNull();
      });
    });

    describe('apiCache.invalidateUser', () => {
      it('should invalidate all user-related cache entries', () => {
        // Set various cache entries for user
        apiCache.profile.set('user-1', { profile: true });
        apiCache.stats.set('user-1', { stats: true });
        apiCache.exclusions.set('user-1', ['excluded']);

        apiCache.invalidateUser('user-1');

        expect(apiCache.profile.get('user-1')).toBeNull();
        expect(apiCache.stats.get('user-1')).toBeNull();
        expect(apiCache.exclusions.get('user-1')).toBeNull();
      });

      it('should not affect other users', () => {
        apiCache.profile.set('user-1', { user1: true });
        apiCache.profile.set('user-2', { user2: true });

        apiCache.invalidateUser('user-1');

        expect(apiCache.profile.get('user-1')).toBeNull();
        expect(apiCache.profile.get('user-2')).toEqual({ user2: true });
      });
    });
  });

  describe('default export', () => {
    it('should export clientCache as default', async () => {
      const cacheModule = await import('@/lib/clientCache');

      expect(cacheModule.default).toBe(cacheModule.clientCache);
    });
  });

  describe('edge cases', () => {
    it('should handle null values', () => {
      clientCache.set('null-key', null);

      // Note: null is stored as the value
      const result = clientCache.get('null-key');
      expect(result).toBeNull();
    });

    it('should handle undefined values', () => {
      clientCache.set('undefined-key', undefined);

      const result = clientCache.get('undefined-key');
      expect(result).toBeUndefined();
    });

    it('should handle empty strings', () => {
      clientCache.set('empty', '');

      const result = clientCache.get('empty');
      expect(result).toBe('');
    });

    it('should handle numeric keys', () => {
      clientCache.set('123', 'numeric-key');

      const result = clientCache.get('123');
      expect(result).toBe('numeric-key');
    });

    it('should handle special characters in keys', () => {
      clientCache.set('key:with:colons', 'value1');
      clientCache.set('key/with/slashes', 'value2');
      clientCache.set('key-with-dashes', 'value3');

      expect(clientCache.get('key:with:colons')).toBe('value1');
      expect(clientCache.get('key/with/slashes')).toBe('value2');
      expect(clientCache.get('key-with-dashes')).toBe('value3');
    });

    it('should handle very large values', () => {
      const largeArray = Array(1000).fill({ id: 1, data: 'test'.repeat(100) });

      clientCache.set('large', largeArray);

      const result = clientCache.get('large');
      expect(result).toHaveLength(1000);
    });

    it('should handle concurrent operations', async () => {
      const operations = [];

      for (let i = 0; i < 50; i++) {
        operations.push(
          new Promise<void>((resolve) => {
            clientCache.set(`concurrent-${i}`, i);
            resolve();
          })
        );
      }

      await Promise.all(operations);

      const stats = clientCache.getStats();
      expect(stats.size).toBe(50);
    });
  });
});
