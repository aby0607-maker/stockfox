/**
 * Sector Rotation — Tracks relative strength of NSE sector indices
 *
 * Uses Yahoo Finance v8 chart API to get returns for Nifty sector indices.
 * Computes 1M, 3M, 6M returns to identify sector momentum.
 *
 * Sector indices on Yahoo Finance use ^CNX prefix for most:
 *   ^NSEI = Nifty 50, ^NSEBANK = Nifty Bank, ^CNXIT = Nifty IT, etc.
 */

import { cache } from '@/services/cache'

const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

// NSE sector indices available on Yahoo Finance
const SECTOR_INDICES: { symbol: string; name: string; sector: string }[] = [
  { symbol: '^NSEI',        name: 'Nifty 50',         sector: 'Market' },
  { symbol: '^NSEBANK',     name: 'Nifty Bank',       sector: 'Banking' },
  { symbol: '^CNXIT',       name: 'Nifty IT',         sector: 'IT' },
  { symbol: '^CNXPHARMA',   name: 'Nifty Pharma',     sector: 'Pharma' },
  { symbol: '^CNXAUTO',     name: 'Nifty Auto',       sector: 'Auto' },
  { symbol: '^CNXFMCG',     name: 'Nifty FMCG',      sector: 'FMCG' },
  { symbol: '^CNXMETAL',    name: 'Nifty Metal',      sector: 'Metals' },
  { symbol: '^CNXREALTY',   name: 'Nifty Realty',     sector: 'Realty' },
  { symbol: '^CNXENERGY',   name: 'Nifty Energy',     sector: 'Energy' },
  { symbol: '^CNXINFRA',    name: 'Nifty Infra',      sector: 'Infra' },
  { symbol: '^CNXPSUBANK',  name: 'Nifty PSU Bank',   sector: 'PSU Banking' },
  { symbol: '^CNXMEDIA',    name: 'Nifty Media',      sector: 'Media' },
  { symbol: '^CNXFINANCE',  name: 'Nifty Financial',  sector: 'Financial Services' },
]

export interface SectorMomentum {
  symbol: string
  name: string
  sector: string
  return1M: number | null  // % return over 1 month
  return3M: number | null  // % return over 3 months
  return6M: number | null  // % return over 6 months
  momentum: 'strong' | 'positive' | 'neutral' | 'weak'  // Derived
}

export interface SectorRotationData {
  sectors: SectorMomentum[]
  nifty50Return3M: number | null
  lastUpdated: string
}

/**
 * Fetch closing prices for a Yahoo symbol over a date range.
 */
async function fetchYahooClose(yahooSymbol: string, periodMonths: number): Promise<{ start: number; end: number } | null> {
  const now = Math.floor(Date.now() / 1000)
  const from = now - periodMonths * 30 * 24 * 60 * 60

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const base = isLocal ? 'http://localhost:5173' : ''
  const url = `${base}/api/yahoo/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${from}&period2=${now}&interval=1d`

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const json = await response.json()

    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close as number[] | undefined
    if (!closes || closes.length < 2) return null

    // First valid close and last valid close
    const validCloses = closes.filter((c: number | null) => c != null && c > 0) as number[]
    if (validCloses.length < 2) return null

    return { start: validCloses[0], end: validCloses[validCloses.length - 1] }
  } catch {
    return null
  }
}

/**
 * Get sector rotation data — relative momentum for all NSE sector indices.
 */
export async function getSectorRotation(): Promise<SectorRotationData> {
  const cacheKey = 'sector-rotation'
  const cached = cache.get<SectorRotationData>(cacheKey)
  if (cached) return cached

  const results: SectorMomentum[] = []

  // Fetch 6M data for each index (contains 1M, 3M, 6M in one call)
  const promises = SECTOR_INDICES.map(async (idx) => {
    const data6M = await fetchYahooClose(idx.symbol, 6)
    const data3M = await fetchYahooClose(idx.symbol, 3)
    const data1M = await fetchYahooClose(idx.symbol, 1)

    const r1M = data1M ? ((data1M.end - data1M.start) / data1M.start) * 100 : null
    const r3M = data3M ? ((data3M.end - data3M.start) / data3M.start) * 100 : null
    const r6M = data6M ? ((data6M.end - data6M.start) / data6M.start) * 100 : null

    // Derive momentum
    let momentum: SectorMomentum['momentum'] = 'neutral'
    if (r3M != null) {
      if (r3M > 10) momentum = 'strong'
      else if (r3M > 3) momentum = 'positive'
      else if (r3M < -5) momentum = 'weak'
    }

    return { ...idx, return1M: r1M, return3M: r3M, return6M: r6M, momentum }
  })

  const settled = await Promise.allSettled(promises)
  for (const result of settled) {
    if (result.status === 'fulfilled') results.push(result.value)
  }

  // Sort by 3M return descending
  results.sort((a, b) => (b.return3M ?? -999) - (a.return3M ?? -999))

  const nifty = results.find(r => r.symbol === '^NSEI')

  const data: SectorRotationData = {
    sectors: results,
    nifty50Return3M: nifty?.return3M ?? null,
    lastUpdated: new Date().toISOString().split('T')[0],
  }

  cache.set(cacheKey, data, { ttl: CACHE_TTL })
  return data
}

/**
 * Map a stock's sector to the nearest Nifty sector index.
 */
export function mapSectorToIndex(stockSector: string): string | null {
  const lower = stockSector.toLowerCase()
  if (lower.includes('bank') || lower.includes('finance') || lower.includes('nbfc')) return 'Banking'
  if (lower.includes('it') || lower.includes('software') || lower.includes('tech')) return 'IT'
  if (lower.includes('pharma') || lower.includes('health')) return 'Pharma'
  if (lower.includes('auto') || lower.includes('vehicle')) return 'Auto'
  if (lower.includes('fmcg') || lower.includes('consumer')) return 'FMCG'
  if (lower.includes('metal') || lower.includes('mining') || lower.includes('steel')) return 'Metals'
  if (lower.includes('real') || lower.includes('construction')) return 'Realty'
  if (lower.includes('energy') || lower.includes('oil') || lower.includes('gas') || lower.includes('refin')) return 'Energy'
  if (lower.includes('infra') || lower.includes('cement') || lower.includes('power')) return 'Infra'
  if (lower.includes('media') || lower.includes('entertain')) return 'Media'
  return null
}
