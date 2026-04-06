/**
 * Stock Cache Service — reads pre-computed data from static JSON.
 *
 * The JSON file at /data/stock-cache.json is generated nightly by GitHub Actions
 * and served via CDN. This service provides instant access to scores, prices,
 * and metrics without any API calls.
 *
 * Two-layer strategy:
 * 1. CDN cache (stock-cache.json) — updated nightly by cron
 * 2. In-memory cache — populated on first load, refreshed when Scorecard fetches new data
 *
 * Write-through: when buildVerdictForStock fetches fresh data, it writes back
 * to the in-memory cache so subsequent Dashboard visits show fresh data.
 */

export interface CachedStock {
  symbol: string
  name: string
  sector: string
  industry?: string
  mcapType?: string
  coCode?: number

  // Pre-computed scores
  score: number
  verdict: string

  // Price
  price: number | null
  changePercent: number | null

  // Key metrics
  pe: number | null
  pb: number | null
  roe: number | null
  roce: number | null
  opm: number | null
  de: number | null
  eps: number | null
  mcap: number | null
  dy: number | null
  evEbitda: number | null

  // Ownership
  promoterHolding: number | null

  // Ranking
  peerRank?: number
  peerTotal?: number
  peerCategory?: string

  // Metadata
  lastUpdated: string
}

interface StockCacheData {
  version: string
  generatedAt: string
  stockCount: number
  stocks: CachedStock[]
}

// In-memory cache
let _cache: Map<string, CachedStock> | null = null
let _cacheLoadPromise: Promise<void> | null = null
let _lastCDNFetch = 0

const CDN_REFRESH_INTERVAL = 30 * 60 * 1000 // 30 min — re-fetch CDN version

/**
 * Load the stock cache from CDN (static JSON file).
 * Called lazily on first access.
 */
async function loadFromCDN(): Promise<void> {
  try {
    const response = await fetch('/data/stock-cache.json')
    if (!response.ok) {
      console.warn('[StockCache] CDN cache not found — will use live API')
      _cache = new Map()
      return
    }

    const data: StockCacheData = await response.json()
    _cache = new Map()
    for (const stock of data.stocks) {
      _cache.set(stock.symbol.toUpperCase(), stock)
    }
    _lastCDNFetch = Date.now()
    console.info(`[StockCache] Loaded ${data.stockCount} stocks from CDN (generated ${data.generatedAt})`)
  } catch (err) {
    console.warn('[StockCache] Failed to load CDN cache:', err)
    _cache = new Map()
  }
}

/**
 * Ensure the cache is loaded. Deduplicates concurrent calls.
 */
async function ensureCache(): Promise<Map<string, CachedStock>> {
  if (_cache && (Date.now() - _lastCDNFetch < CDN_REFRESH_INTERVAL)) {
    return _cache
  }

  if (!_cacheLoadPromise) {
    _cacheLoadPromise = loadFromCDN().finally(() => { _cacheLoadPromise = null })
  }
  await _cacheLoadPromise
  return _cache || new Map()
}

/**
 * Get a cached stock by symbol. Returns null if not in cache.
 */
export async function getCachedStock(symbol: string): Promise<CachedStock | null> {
  const cache = await ensureCache()
  return cache.get(symbol.toUpperCase()) ?? null
}

/**
 * Get all cached stocks (for Dashboard watchlist).
 */
export async function getCachedStocks(symbols: string[]): Promise<CachedStock[]> {
  const cache = await ensureCache()
  return symbols
    .map(s => cache.get(s.toUpperCase()))
    .filter((s): s is CachedStock => s !== null)
}

/**
 * Get all cached stocks sorted by score (for discovery).
 */
export async function getTopStocks(limit = 10): Promise<CachedStock[]> {
  const cache = await ensureCache()
  return [...cache.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Write-through: update a stock's cached data after fresh scoring.
 * Called by buildVerdictForStock when live data is fetched.
 */
export function updateCachedStock(symbol: string, update: Partial<CachedStock>): void {
  if (!_cache) return
  const key = symbol.toUpperCase()
  const existing = _cache.get(key)
  if (existing) {
    _cache.set(key, { ...existing, ...update, lastUpdated: new Date().toISOString() })
  } else {
    // New stock — add to cache if we have enough data
    if (update.name && update.score != null) {
      _cache.set(key, {
        symbol: key,
        name: update.name || key,
        sector: update.sector || '',
        score: update.score || 0,
        verdict: update.verdict || '—',
        price: update.price ?? null,
        changePercent: update.changePercent ?? null,
        pe: update.pe ?? null,
        pb: update.pb ?? null,
        roe: update.roe ?? null,
        roce: update.roce ?? null,
        opm: update.opm ?? null,
        de: update.de ?? null,
        eps: update.eps ?? null,
        mcap: update.mcap ?? null,
        dy: update.dy ?? null,
        evEbitda: update.evEbitda ?? null,
        promoterHolding: update.promoterHolding ?? null,
        peerRank: update.peerRank,
        peerTotal: update.peerTotal,
        peerCategory: update.peerCategory,
        lastUpdated: new Date().toISOString(),
      })
    }
  }
}

/**
 * Check if the cache has data for a given symbol.
 */
export async function isCached(symbol: string): Promise<boolean> {
  const cache = await ensureCache()
  return cache.has(symbol.toUpperCase())
}

/**
 * Get cache stats (for debugging/monitoring).
 */
export async function getCacheStats(): Promise<{ count: number; generatedAt: string; age: string }> {
  const cache = await ensureCache()
  const ageMs = Date.now() - _lastCDNFetch
  const ageMin = Math.round(ageMs / 60000)
  return {
    count: cache.size,
    generatedAt: _lastCDNFetch > 0 ? new Date(_lastCDNFetch).toISOString() : 'never',
    age: ageMin < 60 ? `${ageMin}m` : `${Math.round(ageMin / 60)}h`,
  }
}
