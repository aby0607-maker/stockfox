/**
 * Simple in-memory cache with TTL support
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
}

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 500 // Maximum entries before eviction
const CLEANUP_INTERVAL = 60 * 1000 // Run cleanup every 60 seconds

class Cache {
  private store = new Map<string, CacheEntry<unknown>>()
  private pendingFactories = new Map<string, Promise<unknown>>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Periodic cleanup of expired entries to prevent unbounded growth
    this.cleanupTimer = setInterval(() => this.evictExpired(), CLEANUP_INTERVAL)
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }

    return entry.value as T
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    // Evict oldest entries if over max size
    if (this.store.size >= MAX_CACHE_SIZE) {
      this.evictOldest(Math.floor(MAX_CACHE_SIZE * 0.2))
    }

    const ttl = options.ttl ?? DEFAULT_TTL
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    })
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): void {
    this.store.delete(key)
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.store.clear()
    this.pendingFactories.clear()
  }

  /**
   * Get or set a value using an async factory function.
   * Deduplicates concurrent calls for the same key — only one factory runs.
   */
  async getOrFetch<T>(key: string, factory: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    // Deduplicate concurrent factory calls for the same key
    const pending = this.pendingFactories.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    const promise = factory().then(value => {
      this.set(key, value, options)
      this.pendingFactories.delete(key)
      return value
    }).catch(err => {
      this.pendingFactories.delete(key)
      throw err
    })

    this.pendingFactories.set(key, promise)
    return promise
  }

  /**
   * Get or set a value using a synchronous factory function
   */
  getOrSet<T>(key: string, factory: () => T, options: CacheOptions = {}): T {
    const cached = this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    const value = factory()
    this.set(key, value, options)
    return value
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    this.evictExpired()

    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    }
  }

  /** Remove all expired entries */
  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }

  /** Remove the N oldest entries by expiration time */
  private evictOldest(count: number): void {
    const entries = [...this.store.entries()]
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt)

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.store.delete(entries[i][0])
    }
  }

  /** Cleanup timer (for tests or shutdown) */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

// Singleton cache instance
export const cache = new Cache()

// Export for creating multiple cache instances if needed
export { Cache }
