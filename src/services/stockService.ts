/**
 * Stock Service - Handles stock data retrieval
 *
 * Supports both sync (mock data) and async (CMOTS API) access patterns.
 * Sync methods use hardcoded demo stocks for fallback.
 * Async methods query the CMOTS company master for any BSE stock.
 */

import { cache } from './cache'
import { stocks, getStockBySymbol as _getStockBySymbol, getStockById as _getStockById } from '@/data/stocks'
import { getCompanyBySymbol, getCompanyMaster, getDelayedPriceFeed, get52WeekRange } from './cmots'
import type { Stock, CMOTSCompany, CMOTSDelayedPrice } from '@/types'

const CACHE_PREFIX = 'stock:'
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

/** Demo stock IDs for fallback */
export const DEMO_STOCK_IDS = ['zomato', 'axisbank', 'tcs'] as const

/**
 * Convert a CMOTSCompany to the Stock interface used by UI components
 */
export function cmotCompanyToStock(
  company: CMOTSCompany,
  delayedPrice?: CMOTSDelayedPrice | null,
  range52w?: { high: number; low: number } | null,
): Stock {
  const price = delayedPrice?.price || 0
  const prevClose = delayedPrice ? price - delayedPrice.Price_diff : 0
  return {
    id: (company.nsesymbol || company.bsecode || String(company.co_code)).toLowerCase(),
    symbol: company.nsesymbol || company.bsecode,
    name: company.companyname,
    sector: company.sectorname || company.categoryname || 'Unknown',
    subSector: company.industryname || '',
    currentPrice: price,
    previousClose: prevClose > 0 ? prevClose : 0,
    change: delayedPrice?.Price_diff || 0,
    changePercent: delayedPrice?.change || 0,
    marketCap: 0,
    high52w: range52w?.high || 0,
    low52w: range52w?.low || 0,
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

// ─── Peer Group Generation ───

/**
 * Generate a peer group for any stock by querying the in-memory company master.
 * Matches by industry first (specific), broadens to sector if too few peers.
 */
async function generatePeerGroup(company: CMOTSCompany): Promise<string[]> {
  try {
    const allCompanies = await getCompanyMaster()
    if (allCompanies.length === 0) return []

    // Filter by same industry (more specific)
    let peers = allCompanies.filter(c =>
      c.industryname === company.industryname &&
      c.co_code !== company.co_code
    )

    // Broaden to sector if fewer than 3 industry peers
    if (peers.length < 3 && company.sectorname) {
      peers = allCompanies.filter(c =>
        c.sectorname === company.sectorname &&
        c.co_code !== company.co_code
      )
    }

    // Prefer same market cap tier, then take top 6 by name
    const sameTier = peers.filter(c => c.mcaptype === company.mcaptype)
    const pool = sameTier.length >= 3 ? sameTier : peers
    return pool.slice(0, 6).map(c => c.companyshortname || c.companyname)
  } catch {
    return []
  }
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

  // Fetch delayed price + 52W range in parallel
  let delayedPrice: CMOTSDelayedPrice | null = null
  let range52w: { high: number; low: number } | null = null
  try {
    const [feed, range] = await Promise.all([
      getDelayedPriceFeed(),
      get52WeekRange(String(company.co_code), company.co_code, company.isin),
    ])
    delayedPrice = feed.get(String(company.co_code)) ?? null
    range52w = range
  } catch {
    // Price data unavailable — proceed without
  }

  const stock = cmotCompanyToStock(company, delayedPrice, range52w)
  stock.peerGroup = await generatePeerGroup(company)
  return stock
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
