/**
 * Finnhub Client — Analyst consensus data for ExQ signals
 *
 * Free tier: 60 requests/minute, JSON responses.
 * Indian stocks use BSE suffix (e.g., RELIANCE.BSE).
 * Coverage is partial — gracefully returns null when unavailable.
 *
 * Retry policy: up to 2 retries with exponential backoff on 429/5xx.
 */

import { cache } from '@/services/cache'

const API_BASE = '/api/finnhub'
const DEFAULT_MAX_RETRIES = 2
const PER_REQUEST_TIMEOUT_MS = 10_000

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getBackoffDelay(attempt: number): number {
  const base = 1000 * Math.pow(2, attempt)
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return Math.round(base + jitter)
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
      if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
        const delay = getBackoffDelay(attempt)
        console.warn(`[Finnhub] HTTP ${response.status} for ${label} — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
        await sleep(delay)
        continue
      }
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error
      if (attempt < maxRetries) {
        const delay = getBackoffDelay(attempt)
        console.warn(`[Finnhub] ${error instanceof DOMException ? 'Timeout' : 'Network error'} for ${label} — retry ${attempt + 1}/${maxRetries} in ${delay}ms`)
        await sleep(delay)
        continue
      }
    }
  }
  throw lastError
}

// ── Types ──

export interface FinnhubRecommendation {
  buy: number
  hold: number
  sell: number
  strongBuy: number
  strongSell: number
  period: string  // e.g. "2025-04-01"
  symbol: string
}

export interface FinnhubConsensus {
  recommendations: FinnhubRecommendation[]
  latestConsensus: 'strongBuy' | 'buy' | 'hold' | 'sell' | 'strongSell' | null
  totalAnalysts: number
  buyPct: number  // 0-100
}

// ── API Functions ──

/**
 * Convert Indian stock symbol to Finnhub format.
 * Finnhub uses BSE suffix for Indian stocks.
 */
function toFinnhubSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().replace(/\s+/g, '')
  // Already has exchange suffix
  if (clean.includes('.')) return clean
  return `${clean}.BSE`
}

/**
 * Fetch analyst recommendation trends from Finnhub.
 * Returns null if stock not covered (never throws).
 */
export async function getAnalystConsensus(symbol: string): Promise<FinnhubConsensus | null> {
  const finnhubSymbol = toFinnhubSymbol(symbol)
  const cacheKey = `finnhub\0rec\0${finnhubSymbol}`
  const cached = cache.get<FinnhubConsensus>(cacheKey)
  if (cached !== undefined) return cached

  try {
    const url = `${API_BASE}/stock/recommendation?symbol=${encodeURIComponent(finnhubSymbol)}`
    const response = await fetchWithRetry(url, DEFAULT_MAX_RETRIES, finnhubSymbol)

    if (!response.ok) {
      console.warn(`[Finnhub] HTTP ${response.status} for ${finnhubSymbol}`)
      cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 }) // Cache miss for 6h
      return null
    }

    const data: FinnhubRecommendation[] = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      console.info(`[Finnhub] No analyst coverage for ${finnhubSymbol}`)
      cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
      return null
    }

    // Latest recommendation (first in array, sorted by period desc)
    const latest = data[0]
    const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell
    if (total === 0) {
      cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
      return null
    }

    const buyTotal = latest.strongBuy + latest.buy
    const sellTotal = latest.sell + latest.strongSell

    let latestConsensus: FinnhubConsensus['latestConsensus'] = null
    if (latest.strongBuy > latest.buy && latest.strongBuy > latest.hold) latestConsensus = 'strongBuy'
    else if (buyTotal > latest.hold + sellTotal) latestConsensus = 'buy'
    else if (sellTotal > buyTotal) latestConsensus = 'sell'
    else latestConsensus = 'hold'

    const result: FinnhubConsensus = {
      recommendations: data.slice(0, 4), // Last 4 quarters
      latestConsensus,
      totalAnalysts: total,
      buyPct: (buyTotal / total) * 100,
    }

    cache.set(cacheKey, result, { ttl: 24 * 60 * 60 * 1000 }) // 24h cache
    return result
  } catch (error) {
    console.warn(`[Finnhub] Error fetching ${finnhubSymbol}:`, error instanceof Error ? error.message : error)
    return null
  }
}
