/**
 * ESG Score — Environmental, Social, Governance ratings from Yahoo Finance
 *
 * Uses Yahoo Finance v10 quoteSummary API with esgScores module.
 * Coverage is decent for large-cap Indian stocks (Nifty 100+).
 * Falls back gracefully for mid/small caps without ESG data.
 *
 * Data source: Sustainalytics (via Yahoo Finance)
 */

import { cache } from '@/services/cache'

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Stocks renamed on NSE — Yahoo uses the NEW name
const SYMBOL_RENAMES: Record<string, string> = {
  ZOMATO: 'ETERNAL',
}

export interface ESGScoreData {
  totalEsg: number | null          // Overall ESG risk score (lower = better, Sustainalytics scale)
  environmentScore: number | null  // Environmental risk
  socialScore: number | null       // Social risk
  governanceScore: number | null   // Governance risk
  esgPerformance: string | null    // "LAG_PERF", "AVG_PERF", "LEAD_PERF", "OUT_PERF"
  percentile: number | null        // Percentile within peers
  riskCategory: 'negligible' | 'low' | 'medium' | 'high' | 'severe' | null
  peerGroup: string | null         // Sustainalytics peer group name
  lastUpdated: string | null
}

function classifyRisk(score: number): ESGScoreData['riskCategory'] {
  if (score < 10) return 'negligible'
  if (score < 20) return 'low'
  if (score < 30) return 'medium'
  if (score < 40) return 'high'
  return 'severe'
}

/**
 * Fetch ESG scores for an Indian stock from Yahoo Finance.
 * Returns null if the stock doesn't have ESG data (common for small caps).
 */
export async function getESGScore(nseSymbol: string): Promise<ESGScoreData | null> {
  const cacheKey = `esg\0${nseSymbol}`
  const cached = cache.get<ESGScoreData | null>(cacheKey)
  if (cached !== undefined) return cached

  const upper = nseSymbol.toUpperCase()
  const yahooSymbol = `${SYMBOL_RENAMES[upper] || upper}.NS`

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const base = isLocal ? 'http://localhost:5173' : ''
  const url = `${base}/api/yahoo/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=esgScores`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      cache.set(cacheKey, null, { ttl: CACHE_TTL })
      return null
    }

    const json = await response.json()
    const esg = json?.quoteSummary?.result?.[0]?.esgScores

    if (!esg || esg.totalEsg?.raw == null) {
      cache.set(cacheKey, null, { ttl: CACHE_TTL })
      return null
    }

    const result: ESGScoreData = {
      totalEsg: esg.totalEsg?.raw ?? null,
      environmentScore: esg.environmentScore?.raw ?? null,
      socialScore: esg.socialScore?.raw ?? null,
      governanceScore: esg.governanceScore?.raw ?? null,
      esgPerformance: esg.esgPerformance ?? null,
      percentile: esg.percentile?.raw ?? null,
      riskCategory: esg.totalEsg?.raw != null ? classifyRisk(esg.totalEsg.raw) : null,
      peerGroup: esg.peerGroup ?? null,
      lastUpdated: esg.ratingDate ?? null,
    }

    cache.set(cacheKey, result, { ttl: CACHE_TTL })
    return result
  } catch (err) {
    console.warn(`[ESG] Failed to fetch ESG for ${nseSymbol}:`, err)
    cache.set(cacheKey, null, { ttl: CACHE_TTL })
    return null
  }
}
