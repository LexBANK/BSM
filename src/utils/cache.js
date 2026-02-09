/**
 * Simple in-memory cache with TTL support
 */
class SimpleCache {
  constructor(ttlMs = 60000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Optional TTL override in milliseconds
   */
  set(key, value, ttlMs = this.ttl) {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Clear a specific key or entire cache
   * @param {string} key - Optional key to clear
   */
  clear(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache size
   * @returns {number} Number of items in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Create a shared cache instance with 5 minute TTL
export const cache = new SimpleCache(5 * 60 * 1000);

// Periodic cleanup every minute
const cleanupInterval = setInterval(() => cache.cleanup(), 60000);

// Clean up on shutdown
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
  cache.clear();
});

process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
  cache.clear();
});

export default cache;
