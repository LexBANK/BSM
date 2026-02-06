/**
 * Simple in-memory cache with TTL support
 * Optimizes performance by caching frequently accessed data
 */

class Cache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Set a cache entry with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time-to-live in milliseconds (default: 60000 = 60s)
   */
  set(key, value, ttlMs = 60000) {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Get a cache entry if it exists and hasn't expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Clear a specific key or all cache entries
   * @param {string} [key] - Specific key to clear, or clear all if omitted
   */
  clear(key) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Clean up expired entries (can be called periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance
const cache = new Cache();

// Periodic cleanup every 5 minutes (unref to allow process exit)
const cleanupInterval = setInterval(() => cache.cleanup(), 5 * 60 * 1000);
cleanupInterval.unref(); // Allow Node.js to exit even if interval is active

export default cache;
