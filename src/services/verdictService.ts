/**
 * Verdict Service — V2 async verdict assembly
 *
 * buildVerdictForStock() assembles StockVerdictV2 from live CMOTS data:
 *   - Quant pillar: live data via quantScoringService
 *   - Qual pillar: live data via qualScoringService
 *   - Risk pillar: computed from red flags
 */

import type { Stock, StockVerdictV2, PillarVerdict, SegmentVerdictV2 } from '@/types'
import { getScoreBandEnum, getOverallVerdict } from '@/lib/scoring'
import { getProfileWeightsV2 } from '@/data/profiles'
import { computeQuantSegments } from './quantScoringService'
import { computeQualFactors } from './qualScoringService'

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
