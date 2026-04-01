/**
 * Stock Service - Handles stock data retrieval
 *
 * Supports both sync (mock data) and async (CMOTS API) access patterns.
 * Sync methods use hardcoded demo stocks for fallback.
 * Async methods query the CMOTS company master for any BSE stock.
 */

import { cache } from './cache'
import { stocks, getStockBySymbol as _getStockBySymbol, getStockById as _getStockById } from '@/data/stocks'
import { getCompanyBySymbol, getDelayedPriceFeed } from './cmots'
import type { Stock, CMOTSCompany } from '@/types'

const CACHE_PREFIX = 'stock:'
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

/** Demo stock IDs for fallback */
export const DEMO_STOCK_IDS = ['zomato', 'axisbank', 'tcs'] as const

/**
 * Convert a CMOTSCompany to the Stock interface used by UI components
 */
export function cmotCompanyToStock(company: CMOTSCompany, price?: number): Stock {
  return {
    id: (company.nsesymbol || company.bsecode || String(company.co_code)).toLowerCase(),
    symbol: company.nsesymbol || company.bsecode,
    name: company.companyname,
    sector: company.sectorname || company.categoryname || 'Unknown',
    subSector: company.industryname || '',
    currentPrice: price || 0,
    previousClose: 0,
    change: 0,
    changePercent: 0,
    marketCap: 0,
    high52w: 0,
    low52w: 0,
    beta: 0,
    peerGroup: [],
  }
}

// ─── Sync methods (demo stock fallback) ───

/**
 * Get a stock by its symbol (sync — demo stocks only)
 */
export function getStockBySymbol(symbol: string): Stock | undefined {
  const cacheKey = `${CACHE_PREFIX}symbol:${symbol.toUpperCase()}`
  return cache.getOrSet(cacheKey, () => _getStockBySymbol(symbol), { ttl: CACHE_TTL })
}

/**
 * Get a stock by its ID (sync — demo stocks only)
 */
export function getStockById(id: string): Stock | undefined {
  const cacheKey = `${CACHE_PREFIX}id:${id}`
  return cache.getOrSet(cacheKey, () => _getStockById(id), { ttl: CACHE_TTL })
}

/**
 * Get all demo stocks
 */
export function getAllStocks(): Stock[] {
  return stocks
}

/**
 * Search demo stocks by name or symbol (sync)
 */
export function searchStocks(query: string): Stock[] {
  const cacheKey = `${CACHE_PREFIX}search:${query.toLowerCase()}`
  return cache.getOrSet(
    cacheKey,
    () => {
      const q = query.toLowerCase()
      return stocks.filter(
        stock =>
          stock.symbol.toLowerCase().includes(q) ||
          stock.name.toLowerCase().includes(q) ||
          stock.sector.toLowerCase().includes(q)
      )
    },
    { ttl: CACHE_TTL }
  )
}

/**
 * Get stocks by sector (sync — demo stocks only)
 */
export function getStocksBySector(sector: string): Stock[] {
  const cacheKey = `${CACHE_PREFIX}sector:${sector.toLowerCase()}`
  return cache.getOrSet(
    cacheKey,
    () => stocks.filter(stock => stock.sector.toLowerCase() === sector.toLowerCase()),
    { ttl: CACHE_TTL }
  )
}

// ─── Async methods (CMOTS API) ───

/**
 * Resolve any stock symbol to a Stock object via CMOTS.
 * Falls back to demo stock data if CMOTS lookup fails.
 */
export async function resolveStock(symbolOrId: string): Promise<Stock | null> {
  // Try demo stocks first (instant, no API call)
  const demoStock = _getStockBySymbol(symbolOrId) || _getStockById(symbolOrId)
  if (demoStock) return demoStock

  // Try CMOTS company master
  const company = await getCompanyBySymbol(symbolOrId)
  if (!company) return null

  // Try to get a price from the delayed feed
  let price = 0
  try {
    const feed = await getDelayedPriceFeed()
    const dp = feed.get(String(company.co_code))
    if (dp) price = dp.price
  } catch {
    // Price feed unavailable — proceed without price
  }

  return cmotCompanyToStock(company, price)
}

/**
 * Check if a symbol is a demo stock
 */
export function isDemoStock(symbolOrId: string): boolean {
  return !!(_getStockBySymbol(symbolOrId) || _getStockById(symbolOrId))
}

/**
 * Invalidate stock cache
 */
export function invalidateStockCache(symbol?: string): void {
  if (symbol) {
    cache.delete(`${CACHE_PREFIX}symbol:${symbol.toUpperCase()}`)
    cache.delete(`${CACHE_PREFIX}id:${symbol.toLowerCase()}`)
  } else {
    const stats = cache.getStats()
    stats.keys
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => cache.delete(key))
  }
}
