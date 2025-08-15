// utils/cache.ts
import NodeCache from 'node-cache';

class CacheManager {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes default
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // Don't clone objects for better performance
    });
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl);
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  keys(): string[] {
    return this.cache.keys();
  }

  stats(): NodeCache.Stats {
    return this.cache.getStats();
  }

  // Helper method for cached async operations
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    let cached = this.get<T>(key);
    
    if (cached !== undefined) {
      return cached;
    }

    const fresh = await fetchFunction();
    this.set(key, fresh, ttl);
    return fresh;
  }
}

export const cache = new CacheManager();