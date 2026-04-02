/**
 * CMOTS API Client — HTTP layer with caching
 *
 * All CMOTS data access goes through this client.
 *
 * Real API: All responses are wrapped in { success, data: T[], message }.
 * This client unwraps automatically so callers get clean typed arrays.
 *
 * On error, returns empty arrays with console warnings explaining the reason.
 */

import { cache } from '@/services/cache'

const API_BASE = '/api/cmots'

interface CMOTSRequestOptions {
  /** Path segment after /api/cmots, e.g. '/TTMData/476/s' */
  endpoint: string
  /** Cache TTL in ms (default 1 hour) */
  cacheTTL?: number
  /** Persist to localStorage (survives page reload) */
  persist?: boolean
}

/**
 * Fetch an array of items from CMOTS API.
 * Unwraps the { success, data, message } envelope automatically.
 * Returns empty array on error (never throws) and logs the reason.
 */
export async function cmotsFetch<T>(options: CMOTSRequestOptions): Promise<T[]> {
  const { endpoint, cacheTTL = 60 * 60 * 1000, persist = false } = options

  const cacheKey = `cmots\0${endpoint}`
  const cached = cache.get<T[]>(cacheKey)
  if (cached !== undefined) return cached

  try {
    const url = `${API_BASE}${endpoint}`
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      console.warn(`[CMOTS] HTTP ${response.status} for ${endpoint} — data unavailable from API`)
      return []
    }

    const json = await response.json() as { success: boolean; data: T[]; message: string }

    if (!json.success || !Array.isArray(json.data)) {
      console.warn(`[CMOTS] Unsuccessful response for ${endpoint}: ${json.message}`)
      return []
    }

    cache.set(cacheKey, json.data, { ttl: cacheTTL, persist })
    return json.data
  } catch (error) {
    console.warn(`[CMOTS] Network error fetching ${endpoint}:`, error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * Convenience: fetch the first item from a CMOTS endpoint.
 * Returns null if no data.
 */
export async function cmotsFetchOne<T>(options: CMOTSRequestOptions): Promise<T | null> {
  const data = await cmotsFetch<T>(options)
  return data.length > 0 ? data[0] : null
}
