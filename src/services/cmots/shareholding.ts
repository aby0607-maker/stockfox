/**
 * CMOTS Shareholding — Promoter, FII, DII holding patterns
 *
 * Endpoint: /Aggregate-Share-Holding/{co_code}
 */

import type { CMOTSShareholding } from '@/types'
import { cmotsFetch } from './client'
import { getCoCode } from './companyMaster'

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000  // 7 days (quarterly data, persist for demo)

/** Get shareholding pattern for a stock (latest quarter) */
export async function getShareholdingPattern(symbol: string, resolvedCoCode?: number): Promise<CMOTSShareholding | null> {
  const coCode = resolvedCoCode ?? await getCoCode(symbol)
  if (!coCode) {
    console.warn(`[Shareholding] Shareholding data unavailable for ${symbol}: could not resolve co_code`)
    return null
  }

  const data = await cmotsFetch<CMOTSShareholding>({
    endpoint: `/Aggregate-Share-Holding/${coCode}`,
    cacheTTL: CACHE_TTL,
    persist: true,
  })

  if (data.length === 0) return null

  // Sort by YRC descending to get latest quarter
  data.sort((a, b) => b.YRC - a.YRC)
  return data[0]
}

/** Get shareholding history (multiple quarters, sorted YRC descending) for trend calculation */
export async function getShareholdingHistory(symbol: string, resolvedCoCode?: number): Promise<CMOTSShareholding[]> {
  const coCode = resolvedCoCode ?? await getCoCode(symbol)
  if (!coCode) {
    console.warn(`[Shareholding] Shareholding history unavailable for ${symbol}: could not resolve co_code`)
    return []
  }

  const data = await cmotsFetch<CMOTSShareholding>({
    endpoint: `/Aggregate-Share-Holding/${coCode}`,
    cacheTTL: CACHE_TTL,
    persist: true,
  })

  data.sort((a, b) => b.YRC - a.YRC)
  return data
}
