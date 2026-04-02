/**
 * Screener.in Client — Fetches company page HTML via proxy
 *
 * Screener.in serves financial data as server-rendered HTML tables.
 * This client fetches the HTML and returns it as a string for parsing
 * by companyData.ts.
 *
 * Retry policy: up to 3 retries with exponential backoff (1s → 2s → 4s)
 * on network errors, HTTP 429, and HTTP 5xx.
 */

import { cache } from '@/services/cache'

const API_BASE = '/api/screener'
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
  maxRetries: number,
  label: string,
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PER_REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (isRetryableStatus(response.status) && attempt < maxRetries) {
        const delay = getBackoffDelay(attempt)
        console.warn(`[Screener] HTTP ${response.status} for ${label} — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
        await sleep(delay)
        continue
      }
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error
      if (attempt < maxRetries) {
        const delay = getBackoffDelay(attempt)
        console.warn(`[Screener] ${error instanceof DOMException ? 'Timeout' : 'Network error'} for ${label} — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
        await sleep(delay)
        continue
      }
    }
  }
  throw lastError
}

/**
 * Fetch a Screener.in company page as HTML string.
 * Returns null on error (never throws). Uses 24h cache.
 */
export async function screenerFetchHtml(symbol: string): Promise<string | null> {
  const cleanSymbol = symbol.toUpperCase().replace(/\s+/g, '')
  const cacheKey = `screener\0html\0${cleanSymbol}`
  const cached = cache.get<string>(cacheKey)
  if (cached !== undefined) return cached

  try {
    const url = `${API_BASE}/company/${cleanSymbol}/`
    const response = await fetchWithRetry(url, DEFAULT_MAX_RETRIES, cleanSymbol)

    if (!response.ok) {
      console.warn(`[Screener] HTTP ${response.status} for ${cleanSymbol}`)
      return null
    }

    const html = await response.text()

    // Verify it's a valid company page (has financial tables)
    if (!html.includes('id="balance-sheet"') && !html.includes('id="profit-loss"')) {
      console.warn(`[Screener] Page for ${cleanSymbol} doesn't contain financial data`)
      return null
    }

    cache.set(cacheKey, html, { ttl: 24 * 60 * 60 * 1000 }) // 24h
    return html
  } catch (error) {
    console.warn(`[Screener] Network error fetching ${cleanSymbol}:`, error instanceof Error ? error.message : error)
    return null
  }
}
