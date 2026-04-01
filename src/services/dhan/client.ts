/**
 * DhanHQ API Client — HTTP layer with caching + retry
 *
 * DhanHQ uses POST for chart endpoints with JSON body, and
 * authenticates via a raw `access-token` header (not Bearer).
 *
 * Retry policy: up to 3 retries with exponential backoff (1s → 2s → 4s)
 * on network errors, HTTP 429, and HTTP 5xx.
 */

import { cache } from '@/services/cache'

const API_BASE = '/api/dhan'
const DEFAULT_MAX_RETRIES = 3
const PER_REQUEST_TIMEOUT_MS = 20_000  // 20s

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getBackoffDelay(attempt: number): number {
  const base = 1000 * Math.pow(2, attempt)
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return Math.round(base + jitter)
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries: number,
  endpoint: string,
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PER_REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timeoutId)
      if (isRetryableStatus(response.status) && attempt < maxRetries) {
        const delay = getBackoffDelay(attempt)
        console.warn(`[DhanHQ] HTTP ${response.status} for ${endpoint} — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
        await sleep(delay)
        continue
      }
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error
      if (attempt < maxRetries) {
        const delay = getBackoffDelay(attempt)
        console.warn(`[DhanHQ] ${error instanceof DOMException ? 'Timeout' : 'Network error'} for ${endpoint} — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
        await sleep(delay)
        continue
      }
    }
  }
  throw lastError
}

interface DhanRequestOptions {
  endpoint: string
  body: Record<string, unknown>
  cacheTTL?: number
  retries?: number
}

/**
 * POST to a DhanHQ API endpoint.
 * Returns the parsed JSON response or null on error (never throws).
 */
export async function dhanFetch<T>(options: DhanRequestOptions): Promise<T | null> {
  const { endpoint, body, cacheTTL = 60 * 60 * 1000, retries = DEFAULT_MAX_RETRIES } = options

  const bodyKey = JSON.stringify(body)
  const cacheKey = `dhan\0${endpoint}\0${bodyKey}`
  const cached = cache.get<T>(cacheKey)
  if (cached !== undefined) return cached

  try {
    const url = `${API_BASE}${endpoint}`
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      retries,
      endpoint,
    )

    if (!response.ok) {
      const text = await response.text().catch(() => '(unreadable)')
      console.error(`[DhanHQ] HTTP ${response.status} for ${endpoint}`, text.slice(0, 200))
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      console.error(`[DhanHQ] API returned HTML for ${endpoint} — serverless function may not be deployed`)
      return null
    }

    const json = await response.json() as T
    cache.set(cacheKey, json, { ttl: cacheTTL })
    return json
  } catch (error) {
    console.error(`[DhanHQ] Network error fetching ${endpoint}:`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Fetch a raw resource via GET (used for instrument CSV).
 */
export async function dhanFetchRaw(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) {
      console.error(`[DhanHQ] HTTP ${response.status} fetching ${url}`)
      return null
    }
    return await response.text()
  } catch (error) {
    console.error(`[DhanHQ] Failed to fetch ${url}:`, error instanceof Error ? error.message : error)
    return null
  }
}
