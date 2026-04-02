/**
 * IndianAPI.in Client — HTTP layer with caching + retry
 *
 * IndianAPI uses GET requests with query parameters and authenticates
 * via an `X-Api-Key` header.
 *
 * Retry policy: up to 3 retries with exponential backoff (1s → 2s → 4s)
 * on network errors, HTTP 429, and HTTP 5xx.
 */

import { cache } from '@/services/cache'

const API_BASE = '/api/indianapi'
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
        console.warn(`[IndianAPI] HTTP ${response.status} for ${endpoint} — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
        await sleep(delay)
        continue
      }
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error
      if (attempt < maxRetries) {
        const delay = getBackoffDelay(attempt)
        console.warn(`[IndianAPI] ${error instanceof DOMException ? 'Timeout' : 'Network error'} for ${endpoint} — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
        await sleep(delay)
        continue
      }
    }
  }
  throw lastError
}

interface IndianAPIRequestOptions {
  endpoint: string
  params: Record<string, string>
  cacheTTL?: number
  retries?: number
}

/**
 * GET from an IndianAPI.in endpoint.
 * Returns the parsed JSON response or null on error (never throws).
 */
export async function indianApiFetch<T>(options: IndianAPIRequestOptions): Promise<T | null> {
  const { endpoint, params, cacheTTL = 24 * 60 * 60 * 1000, retries = DEFAULT_MAX_RETRIES } = options

  const paramsKey = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')
  const cacheKey = `indianapi\0${endpoint}\0${paramsKey}`
  const cached = cache.get<T>(cacheKey)
  if (cached !== undefined) return cached

  try {
    const qs = new URLSearchParams(params).toString()
    const url = `${API_BASE}/${endpoint}?${qs}`
    const response = await fetchWithRetry(url, { method: 'GET' }, retries, endpoint)

    if (!response.ok) {
      const text = await response.text().catch(() => '(unreadable)')
      console.error(`[IndianAPI] HTTP ${response.status} for ${endpoint}`, text.slice(0, 200))
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      console.error(`[IndianAPI] API returned HTML for ${endpoint} — serverless function may not be deployed`)
      return null
    }

    const json = await response.json() as T
    cache.set(cacheKey, json, { ttl: cacheTTL })
    return json
  } catch (error) {
    console.error(`[IndianAPI] Network error fetching ${endpoint}:`, error instanceof Error ? error.message : error)
    return null
  }
}
