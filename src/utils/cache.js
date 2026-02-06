/**
 * Simple in-memory cache with TTL (Time To Live)
 * Provides efficient caching for frequently accessed data
 */
class SimpleCache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Cache instances with appropriate TTLs
export const agentsCache = new SimpleCache(60000); // 1 minute TTL
export const knowledgeCache = new SimpleCache(300000); // 5 minutes TTL
