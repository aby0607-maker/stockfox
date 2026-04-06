/**
 * CMOTS Price Data — Historical OHLCV + Real-time Delayed Prices
 *
 * Two endpoints:
 *   /AdjustedPriceChart/{exchange}/{co_code}/{from}/{to} — historical OHLCV
 *   /BSEDelayedPriceFeed — bulk real-time/delayed prices for all BSE stocks
 */

import type { CMOTSOHLCVRecord, CMOTSDelayedPrice } from '@/types'
import { cmotsFetch } from './client'
import { getCoCode } from './companyMaster'

const CACHE_TTL = 60 * 60 * 1000          // 1 hour (historical)
const DELAYED_CACHE_TTL = 5 * 60 * 1000   // 5 minutes (real-time feed)

// ─── Delayed Price Feed (bulk, all BSE stocks) ───

let delayedPriceFeedPromise: Promise<Map<string, CMOTSDelayedPrice>> | null = null

/**
 * Fetch delayed/real-time prices for all BSE stocks (bulk endpoint).
 * Returns a Map keyed by String(co_code) for O(1) lookup.
 */
export async function getDelayedPriceFeed(): Promise<Map<string, CMOTSDelayedPrice>> {
  if (delayedPriceFeedPromise) return delayedPriceFeedPromise

  delayedPriceFeedPromise = (async () => {
    const data = await cmotsFetch<CMOTSDelayedPrice>({
      endpoint: '/BSEDelayedPriceFeed',
      cacheTTL: DELAYED_CACHE_TTL,
    })
    const map = new Map<string, CMOTSDelayedPrice>()
    for (const rec of data) {
      map.set(String(Math.round(rec.co_code)), rec)
    }
    delayedPriceFeedPromise = null
    console.log(`[PriceData] Delayed feed loaded: ${map.size} stocks`)
    return map
  })()

  return delayedPriceFeedPromise
}

/**
 * Get delayed price for a single stock by co_code (string).
 */
export async function getDelayedPrice(coCodeStr: string): Promise<CMOTSDelayedPrice | null> {
  const feed = await getDelayedPriceFeed()
  return feed.get(coCodeStr) ?? null
}

/**
 * Convert a CMOTSDelayedPrice into a CMOTSOHLCVRecord so it can be
 * appended to historical price arrays seamlessly.
 */
function delayedToOHLCV(dp: CMOTSDelayedPrice): CMOTSOHLCVRecord {
  return {
    CO_CODE: Math.round(dp.co_code),
    companyname: dp.lname || dp.CO_NAME,
    Tradedate: dp.Tr_Date,
    DayOpen: dp.Open,
    DayHigh: dp.High,
    Daylow: dp.Low,
    Dayclose: dp.price,
    TotalVolume: dp.Volume,
    TotalValue: dp.Value,
    DMCAP: 0,
  }
}

// ─── Historical Price Data ───

/** Get historical prices — tries CMOTS first, falls back to Yahoo Finance */
export async function getHistoricalPrices(
  symbol: string,
  from: string,
  to: string,
  exchange: 'bse' | 'nse' = 'bse',
  resolvedCoCode?: number,
): Promise<CMOTSOHLCVRecord[]> {
  // Try CMOTS first
  const coCode = resolvedCoCode ?? await getCoCode(symbol)
  if (coCode) {
    const records = await cmotsFetch<CMOTSOHLCVRecord>({
      endpoint: `/AdjustedPriceChart/${exchange}/${coCode}/${from}/${to}`,
      cacheTTL: CACHE_TTL,
    })
    if (records.length > 0) {
      records.sort((a, b) => a.Tradedate.localeCompare(b.Tradedate))
      return records
    }
  }

  // Fallback: Yahoo Finance (uses NSE symbol)
  try {
    const { getYahooHistoricalPrices } = await import('@/services/yahoo')
    const nseSymbol = symbol.toUpperCase()
    const yahooRecords = await getYahooHistoricalPrices(nseSymbol, from, to)
    if (yahooRecords.length > 0) {
      console.info(`[PriceData] Yahoo Finance fallback for ${symbol}: ${yahooRecords.length} records`)
      return yahooRecords
    }
  } catch (err) {
    console.warn(`[PriceData] Yahoo fallback failed for ${symbol}:`, err instanceof Error ? err.message : err)
  }

  console.warn(`[PriceData] No price history available for ${symbol} (CMOTS + Yahoo both failed)`)
  return []
}

/** Get latest price for a stock (fetches last 7 days, returns most recent) */
export async function getLatestPrice(symbol: string): Promise<CMOTSOHLCVRecord | null> {
  const delayed = await getDelayedPrice(symbol)
  if (delayed) return delayedToOHLCV(delayed)

  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const prices = await getHistoricalPrices(symbol, from, to)
  return prices.length > 0 ? prices[prices.length - 1] : null
}

/**
 * Get 52-week high/low for a stock from OHLCV history.
 * Tries CMOTS first, falls back to DhanHQ via ISIN bridge.
 */
export async function get52WeekRange(
  symbol: string,
  resolvedCoCode?: number,
  isin?: string,
): Promise<{ high: number; low: number } | null> {
  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Try CMOTS first
  const records = await getHistoricalPrices(symbol, from, to, 'bse', resolvedCoCode)
  if (records.length > 0) return compute52WFromRecords(records)

  // Fallback: DhanHQ via ISIN
  if (isin) {
    try {
      const { resolveToSecurity } = await import('@/services/dhan/instrumentMap')
      const { getDhanHistoricalPrices } = await import('@/services/dhan/priceData')
      const security = await resolveToSecurity(isin)
      if (security) {
        const dhanRecords = await getDhanHistoricalPrices(
          security.securityId, security.exchangeSegment, from, to,
        )
        if (dhanRecords.length > 0) return compute52WFromRecords(dhanRecords)
      }
    } catch (err) {
      console.warn(`[PriceData] DhanHQ 52W fallback failed for ${symbol}:`, err instanceof Error ? err.message : err)
    }
  }

  return null
}

function compute52WFromRecords(records: CMOTSOHLCVRecord[]): { high: number; low: number } {
  let high = -Infinity
  let low = Infinity
  for (const r of records) {
    if (r.DayHigh > high) high = r.DayHigh
    if (r.Daylow > 0 && r.Daylow < low) low = r.Daylow
  }
  return { high, low }
}

/** Get prices for multiple stocks in parallel */
export async function getBatchPrices(
  symbols: string[],
  from: string,
  to: string
): Promise<Record<string, CMOTSOHLCVRecord[]>> {
  const result: Record<string, CMOTSOHLCVRecord[]> = {}
  const today = new Date().toISOString().split('T')[0]

  const toDate = new Date(to)
  const diffDays = Math.floor((Date.now() - toDate.getTime()) / (24 * 60 * 60 * 1000))
  const needsRealtime = diffDays <= 2

  const [_, delayedFeed] = await Promise.all([
    Promise.all(symbols.map(async symbol => {
      const data = await getHistoricalPrices(symbol, from, to)
      result[symbol] = data
    })),
    needsRealtime ? getDelayedPriceFeed() : Promise.resolve(null),
  ])

  if (delayedFeed) {
    for (const symbol of symbols) {
      const dp = delayedFeed.get(symbol)
      if (!dp) continue

      const records = result[symbol] ?? []
      const dpDate = dp.Tr_Date.split('T')[0]

      if (dpDate < from || dpDate > (to >= today ? today : to)) continue

      const lastRecord = records.length > 0 ? records[records.length - 1] : null
      const lastDate = lastRecord?.Tradedate.split('T')[0]
      if (lastDate === dpDate) continue

      records.push(delayedToOHLCV(dp))
      records.sort((a, b) => a.Tradedate.localeCompare(b.Tradedate))
      result[symbol] = records
    }
  }

  return result
}
