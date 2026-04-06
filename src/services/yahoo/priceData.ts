/**
 * Yahoo Finance Price Data — Free OHLCV history for Indian stocks
 *
 * Uses Yahoo Finance v8 chart API via proxy.
 * Provides daily OHLCV data for any NSE/BSE listed stock.
 * No API key required — completely free.
 *
 * Used as fallback when CMOTS AdjustedPriceChart returns 404.
 *
 * Symbol format: NSE symbol + ".NS" suffix (e.g., "RELIANCE.NS")
 * Special cases: Renamed stocks need mapping (ZOMATO → ETERNAL)
 */

import { cache } from '@/services/cache'
import type { CMOTSOHLCVRecord } from '@/types'

const CACHE_TTL = 60 * 60 * 1000  // 1 hour

// Stocks renamed on NSE — Yahoo uses the NEW name
const SYMBOL_RENAMES: Record<string, string> = {
  ZOMATO: 'ETERNAL',
}

/**
 * Convert NSE symbol to Yahoo Finance format.
 */
function toYahooSymbol(nseSymbol: string): string {
  const upper = nseSymbol.toUpperCase()
  const mapped = SYMBOL_RENAMES[upper] || upper
  return `${mapped}.NS`
}

/**
 * Fetch historical OHLCV from Yahoo Finance.
 * Returns data in CMOTSOHLCVRecord format for seamless integration.
 */
export async function getYahooHistoricalPrices(
  nseSymbol: string,
  from: string,  // YYYY-MM-DD
  to: string,    // YYYY-MM-DD
): Promise<CMOTSOHLCVRecord[]> {
  const yahooSymbol = toYahooSymbol(nseSymbol)
  const cacheKey = `yahoo\0${yahooSymbol}\0${from}\0${to}`
  const cached = cache.get<CMOTSOHLCVRecord[]>(cacheKey)
  if (cached !== undefined) return cached

  try {
    // Convert dates to Unix timestamps
    const fromTs = Math.floor(new Date(from).getTime() / 1000)
    const toTs = Math.floor(new Date(to).getTime() / 1000)

    const url = `/api/yahoo/v8/finance/chart/${yahooSymbol}?period1=${fromTs}&period2=${toTs}&interval=1d&includePrePost=false`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[Yahoo] HTTP ${response.status} for ${yahooSymbol}`)
      return []
    }

    const json = await response.json()
    const result = json?.chart?.result?.[0]
    if (!result) {
      console.warn(`[Yahoo] No chart data for ${yahooSymbol}`)
      return []
    }

    const timestamps: number[] = result.timestamp || []
    const quotes = result.indicators?.quote?.[0]
    if (!quotes || timestamps.length === 0) {
      console.warn(`[Yahoo] Empty quotes for ${yahooSymbol}`)
      return []
    }

    const records: CMOTSOHLCVRecord[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const close = quotes.close?.[i]
      if (close == null) continue  // Skip days with no data (holidays)

      const date = new Date(timestamps[i] * 1000)
      const dateStr = date.toISOString().split('T')[0] + 'T00:00:00'

      records.push({
        CO_CODE: 0,  // Yahoo doesn't use CMOTS co_code
        companyname: nseSymbol,
        Tradedate: dateStr,
        DayOpen: quotes.open?.[i] ?? close,
        DayHigh: quotes.high?.[i] ?? close,
        Daylow: quotes.low?.[i] ?? close,
        Dayclose: close,
        TotalVolume: quotes.volume?.[i] ?? 0,
        TotalValue: 0,  // Yahoo doesn't provide traded value
        DMCAP: 0,
      })
    }

    records.sort((a, b) => a.Tradedate.localeCompare(b.Tradedate))
    console.log(`[Yahoo] Loaded ${records.length} daily prices for ${yahooSymbol} (${from} → ${to})`)

    cache.set(cacheKey, records, { ttl: CACHE_TTL })
    return records
  } catch (error) {
    console.warn(`[Yahoo] Failed to fetch ${yahooSymbol}:`, error instanceof Error ? error.message : error)
    return []
  }
}
