/**
 * Verdict Service — V1 verdict caching + V2 async verdict assembly
 *
 * V1: Cached access to mock StockVerdict data (demo stocks only)
 * V2: buildVerdictForStock() assembles StockVerdictV2 from live CMOTS data
 *     - Quant pillar: live data via quantScoringService
 *     - Qual pillar: placeholder (Phase 4D)
 *     - Risk pillar: computed from red flags
 */

import { cache } from './cache'
import {
  getVerdict as _getVerdict,
  getVerdictsByProfile as _getVerdictsByProfile,
  getVerdictsByStock as _getVerdictsByStock,
} from '@/data/verdicts'
import type { Stock, StockVerdict, StockVerdictV2, PillarVerdict, SegmentVerdictV2 } from '@/types'
import { getScoreBandEnum, getOverallVerdict } from '@/lib/scoring'
import { getProfileWeightsV2 } from '@/data/profiles'
import { computeQuantSegments } from './quantScoringService'
import { computeQualFactors } from './qualScoringService'

const CACHE_PREFIX = 'verdict:'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get a verdict for a specific stock and profile with caching
 */
export function getVerdict(stockId: string, profileId: string): StockVerdict | undefined {
  const cacheKey = `${CACHE_PREFIX}${stockId}:${profileId}`

  return cache.getOrSet(
    cacheKey,
    () => _getVerdict(stockId, profileId),
    { ttl: CACHE_TTL }
  )
}

/**
 * Get verdict for a stock symbol (convenience wrapper)
 */
export function getVerdictForStock(symbol: string, profileId: string): StockVerdict | undefined {
  const stockId = symbol.toLowerCase()
  return getVerdict(stockId, profileId)
}

/**
 * Get all verdicts for a profile with caching
 */
export function getVerdictsByProfile(profileId: string): StockVerdict[] {
  const cacheKey = `${CACHE_PREFIX}profile:${profileId}`

  return cache.getOrSet(
    cacheKey,
    () => _getVerdictsByProfile(profileId),
    { ttl: CACHE_TTL }
  )
}

/**
 * Get all verdicts for a stock across profiles with caching
 */
export function getVerdictsByStock(stockId: string): StockVerdict[] {
  const cacheKey = `${CACHE_PREFIX}stock:${stockId}`

  return cache.getOrSet(
    cacheKey,
    () => _getVerdictsByStock(stockId),
    { ttl: CACHE_TTL }
  )
}

/**
 * Get multiple verdicts at once (batch fetch with caching)
 */
export function getVerdictsBatch(
  requests: Array<{ stockId: string; profileId: string }>
): Map<string, StockVerdict | undefined> {
  const results = new Map<string, StockVerdict | undefined>()

  for (const { stockId, profileId } of requests) {
    const key = `${stockId}:${profileId}`
    results.set(key, getVerdict(stockId, profileId))
  }

  return results
}

/**
 * Invalidate verdict cache
 */
export function invalidateVerdictCache(stockId?: string, profileId?: string): void {
  if (stockId && profileId) {
    cache.delete(`${CACHE_PREFIX}${stockId}:${profileId}`)
  } else if (stockId) {
    cache.delete(`${CACHE_PREFIX}stock:${stockId}`)
    // Also clear individual stock:profile caches
    const stats = cache.getStats()
    stats.keys
      .filter(key => key.startsWith(`${CACHE_PREFIX}${stockId}:`))
      .forEach(key => cache.delete(key))
  } else if (profileId) {
    cache.delete(`${CACHE_PREFIX}profile:${profileId}`)
  } else {
    // Clear all verdict caches
    const stats = cache.getStats()
    stats.keys
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => cache.delete(key))
  }
}

// ============================================================
// V2 VERDICT ASSEMBLY — Live data for any stock
// ============================================================

function buildPillarVerdictV2(
  pillar: 'quant' | 'qual' | 'risk',
  name: string,
  segments: SegmentVerdictV2[],
): PillarVerdict {
  const scoredSegments = segments.filter(s => s.scoringType === 'scored' && s.score !== undefined)
  const totalWeight = scoredSegments.reduce((sum, s) => sum + (s.weight || 0), 0)
  const weightedScore = totalWeight > 0
    ? Math.round(scoredSegments.reduce((sum, s) => sum + (s.score! * (s.weight || 0)), 0) / totalWeight)
    : 0

  const scoreBand = getScoreBandEnum(weightedScore)
  const labels: Record<string, string> = {
    strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK', suppressed: 'RED FLAG',
  }

  return {
    pillar,
    name,
    score: weightedScore,
    scoreBand,
    label: labels[scoreBand],
    summary: `${name} analysis based on ${segments.length} ${pillar === 'qual' ? 'factors' : 'segments'}`,
    segments,
  }
}

/**
 * Build a full V2 verdict for any stock from live CMOTS data.
 * Quant pillar uses live scoring; Qual uses placeholders; Risk computed from red flags.
 */
export async function buildVerdictForStock(
  stock: Stock,
  profileId: string,
): Promise<StockVerdictV2> {
  // Fetch quant + qual in parallel (both hit CMOTS cache)
  const [quantSegments, qualFactors] = await Promise.all([
    computeQuantSegments(stock.symbol),
    computeQualFactors(stock.symbol),
  ])
  const quantPillar = buildPillarVerdictV2('quant', 'Quant Score', quantSegments)
  const qualPillar = buildPillarVerdictV2('qual', 'Qual Score', qualFactors)

  const allRedFlags = [...quantSegments, ...qualFactors]
    .flatMap(s => s.redFlags || [])
  const riskScore = allRedFlags.length === 0 ? 80 : Math.max(20, 80 - allRedFlags.length * 15)
  const riskPillar: PillarVerdict = {
    pillar: 'risk',
    name: 'Risk Score',
    score: riskScore,
    scoreBand: getScoreBandEnum(riskScore),
    label: riskScore >= 80 ? 'LOW RISK' : riskScore >= 60 ? 'MODERATE' : 'ELEVATED',
    summary: allRedFlags.length === 0
      ? 'No red flags detected across analysis'
      : `${allRedFlags.length} risk factor(s) identified`,
    segments: [],
  }

  const profileWeights = getProfileWeightsV2(profileId)
  const pw = profileWeights.pillarWeights
  const totalWeight = pw.quant + pw.qual + pw.risk
  const overallScore = Math.round(
    (quantPillar.score * pw.quant + qualPillar.score * pw.qual + riskPillar.score * pw.risk) / totalWeight
  )
  const overall = getOverallVerdict(overallScore)

  return {
    overallVerdict: overall.verdict,
    overallScore,
    overallLabel: overall.label,
    overallSummary: `${stock.name} scores ${overallScore}/100 — ${overall.label}`,
    pillars: [quantPillar, qualPillar, riskPillar],
    newsEvents: [],
    ticker: stock.symbol.toUpperCase(),
    stockName: stock.name,
    sector: stock.sector || '',
    lastUpdated: new Date().toISOString().split('T')[0],
    stockId: stock.id,
    profileId,
    topSignals: [],
    topConcerns: [],
    verdictRationale: `Based on Quant (${quantPillar.score}/100) + Qual (${qualPillar.score}/100, limited data) + Risk (${riskPillar.score}/100) analysis.`,
    positionSizing: 'See detailed analysis',
    entryGuidance: 'See detailed analysis',
  }
}
