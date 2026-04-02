/**
 * Verdict Service — V2 async verdict assembly
 *
 * buildVerdictForStock() assembles StockVerdictV2 from live CMOTS data:
 *   - Quant pillar: live data via quantScoringService
 *   - Qual pillar: live data via qualScoringService
 *   - Risk pillar: computed from red flags
 */

import type { Stock, StockVerdictV2, PillarVerdict, SegmentVerdictV2, SignalGroup, QualSignal, RedFlagV2 } from '@/types'
import { getScoreBandEnum, getOverallVerdict } from '@/lib/scoring'
import { getProfileWeightsV2 } from '@/data/profiles'
import { computeQuantSegments } from './quantScoringService'
import { computeQualFactors } from './qualScoringService'

// ============================================================
// RISK SIGNAL GENERATION — Cross-pillar risk assessment
// ============================================================

function generateRiskSignals(
  quantSegments: SegmentVerdictV2[],
  qualFactors: SegmentVerdictV2[],
): { flags: RedFlagV2[]; categories: number; segments: SegmentVerdictV2[] } {
  const flags: RedFlagV2[] = []
  const riskSignals: QualSignal[] = []

  // Helper to create risk signal
  const rsig = (id: string, name: string, severity: 'hard' | 'soft', triggered: boolean, text: string): QualSignal => ({
    id, name, group: 'risk', escalationTier: severity === 'hard' ? 'hard' : 'soft',
    score: triggered ? 20 : 80, state: triggered ? 'flag' : 'strong',
    userText: text, isTriggered: triggered, version: 'v1',
  })

  // ── Scan Quant segments for risk signals ──
  const fh = quantSegments.find(s => s.id === 'financial_health')
  const val = quantSegments.find(s => s.id === 'valuation')
  const tech = quantSegments.find(s => s.id === 'technical')
  const perf = quantSegments.find(s => s.id === 'performance')
  const inst = quantSegments.find(s => s.id === 'institutional')

  // Financial Health risk
  if (fh && fh.score != null && fh.score < 40) {
    flags.push({ signalId: 'RISK_FH', severity: 'soft', title: 'Weak Financial Health', description: `Financial health score is ${fh.score}/100`, source: 'Risk-FH' })
    riskSignals.push(rsig('R_FH', 'Financial Health Risk', 'soft', true, `Financial health is weak at ${fh.score}/100 — potential solvency or cash flow concerns.`))
  } else {
    riskSignals.push(rsig('R_FH', 'Financial Health Risk', 'soft', false, 'Financial health is within acceptable range.'))
  }

  // Valuation risk (overvaluation)
  if (val && val.score != null && val.score < 35) {
    flags.push({ signalId: 'RISK_VAL', severity: 'soft', title: 'Stretched Valuation', description: `Valuation score is ${val.score}/100 — trading at premium to history`, source: 'Risk-VAL' })
    riskSignals.push(rsig('R_VAL', 'Valuation Risk', 'soft', true, `Stock appears overvalued (${val.score}/100) relative to its own history and benchmarks.`))
  } else {
    riskSignals.push(rsig('R_VAL', 'Valuation Risk', 'soft', false, 'Valuation is not at extreme levels.'))
  }

  // Technical risk (bearish trend)
  if (tech && tech.score != null && tech.score < 35) {
    flags.push({ signalId: 'RISK_TECH', severity: 'soft', title: 'Bearish Technical Trend', description: `Technical score is ${tech.score}/100 — price below key EMAs`, source: 'Risk-TECH' })
    riskSignals.push(rsig('R_TECH', 'Technical Momentum Risk', 'soft', true, `Price momentum is bearish (${tech.score}/100) — trading below key moving averages.`))
  } else {
    riskSignals.push(rsig('R_TECH', 'Technical Momentum Risk', 'soft', false, 'Price momentum is not flagging risk.'))
  }

  // Promoter conviction risk
  if (inst) {
    const promGroup = inst.signalGroups?.find(g => g.id === 'promoter')
    const promChange = promGroup?.signals?.find(s => s.id === 'P3') // 1Y change
    if (promChange && promChange.state === 'flag') {
      flags.push({ signalId: 'RISK_PROM', severity: 'soft', title: 'Declining Promoter Stake', description: promChange.userText, source: 'Risk-PROM' })
      riskSignals.push(rsig('R_PROM', 'Promoter Conviction Risk', 'soft', true, promChange.userText))
    } else {
      riskSignals.push(rsig('R_PROM', 'Promoter Conviction Risk', 'soft', false, 'Promoter holding is stable or increasing.'))
    }
  }

  // Drawdown risk
  if (perf) {
    const riskGroup = perf.signalGroups?.find(g => g.id === 'risk')
    const ddSignal = riskGroup?.signals?.find(s => s.id === 'K1')
    if (ddSignal && ddSignal.state === 'flag') {
      flags.push({ signalId: 'RISK_DD', severity: 'soft', title: 'Significant Drawdown', description: ddSignal.userText, source: 'Risk-DD' })
      riskSignals.push(rsig('R_DD', 'Drawdown Risk', 'soft', true, ddSignal.userText))
    } else {
      riskSignals.push(rsig('R_DD', 'Drawdown Risk', 'soft', false, 'No significant drawdown in recent period.'))
    }
  }

  // ── Scan Qual factors for risk signals ──
  const mg = qualFactors.find(s => s.id === 'management_governance')
  const eq = qualFactors.find(s => s.id === 'earnings_quality')
  const bq = qualFactors.find(s => s.id === 'business_quality')

  // Governance risk
  if (mg && mg.score != null && mg.score < 45) {
    flags.push({ signalId: 'RISK_MG', severity: 'soft', title: 'Governance Concerns', description: `Management & Governance score is ${mg.score}/100`, source: 'Risk-MG' })
    riskSignals.push(rsig('R_MG', 'Governance Risk', 'soft', true, `Management & governance score of ${mg.score}/100 suggests areas of concern.`))
  } else {
    riskSignals.push(rsig('R_MG', 'Governance Risk', 'soft', false, 'No significant governance concerns detected.'))
  }

  // Earnings quality risk
  if (eq && eq.score != null && eq.score < 45) {
    flags.push({ signalId: 'RISK_EQ', severity: 'soft', title: 'Earnings Quality Concerns', description: `Earnings quality score is ${eq.score}/100`, source: 'Risk-EQ' })
    riskSignals.push(rsig('R_EQ', 'Earnings Quality Risk', 'soft', true, `Earnings quality score of ${eq.score}/100 — possible accounting or cash conversion issues.`))
  } else {
    riskSignals.push(rsig('R_EQ', 'Earnings Quality Risk', 'soft', false, 'Earnings quality is within acceptable range.'))
  }

  // Business quality risk
  if (bq && bq.score != null && bq.score < 45) {
    flags.push({ signalId: 'RISK_BQ', severity: 'soft', title: 'Business Quality Concerns', description: `Business quality score is ${bq.score}/100`, source: 'Risk-BQ' })
    riskSignals.push(rsig('R_BQ', 'Business Quality Risk', 'soft', true, `Business quality score of ${bq.score}/100 — margin durability or cash backing concerns.`))
  } else {
    riskSignals.push(rsig('R_BQ', 'Business Quality Risk', 'soft', false, 'Business quality metrics are within acceptable range.'))
  }

  // Count distinct categories with active flags
  const categories = new Set(flags.map(f => f.source.split('-')[1])).size

  // Build risk segment for display
  const triggeredSignals = riskSignals.filter(s => s.isTriggered)
  const clearSignals = riskSignals.filter(s => !s.isTriggered)

  const riskGroups: SignalGroup[] = []
  if (triggeredSignals.length > 0) {
    riskGroups.push({
      id: 'active_risks', name: 'Active Risk Flags', role: 'scored', signals: triggeredSignals,
    })
  }
  if (clearSignals.length > 0) {
    riskGroups.push({
      id: 'clear', name: 'Risk Checks Passed', role: 'context', signals: clearSignals,
    })
  }

  const riskSegment: SegmentVerdictV2 = {
    id: 'risk_assessment', name: 'Cross-Pillar Risk Assessment', pillar: 'risk',
    scoringType: 'scored',
    score: flags.length === 0 ? 80 : Math.max(15, 80 - flags.length * 10),
    scoreBand: getScoreBandEnum(flags.length === 0 ? 80 : Math.max(15, 80 - flags.length * 10)),
    label: flags.length === 0 ? 'LOW RISK' : flags.length <= 2 ? 'MODERATE' : 'ELEVATED',
    status: flags.length === 0 ? 'positive' : flags.length <= 2 ? 'neutral' : 'negative',
    interpretation: flags.length === 0
      ? 'No significant risk factors detected across quant and qual analysis.'
      : `${flags.length} risk factor(s) across ${categories} categories — review flagged items.`,
    confidenceIndicator: {
      signalsComputed: riskSignals.length,
      signalsTotal: riskSignals.length,
      dataRange: 'Cross-pillar',
      state: 'full',
      tooltip: `${triggeredSignals.length} of ${riskSignals.length} risk checks triggered`,
    },
    signalGroups: riskGroups,
    redFlags: flags,
  }

  return { flags, categories, segments: [riskSegment] }
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

  // ── Risk Pillar: comprehensive risk assessment ──
  const allRedFlags = [...quantSegments, ...qualFactors]
    .flatMap(s => s.redFlags || [])

  // Generate additional risk flags from scored data
  const riskSignals = generateRiskSignals(quantSegments, qualFactors)
  const totalRiskFlags = allRedFlags.length + riskSignals.flags.length

  const riskScore = totalRiskFlags === 0 ? 80 : Math.max(15, 80 - totalRiskFlags * 10)
  const riskPillar: PillarVerdict = {
    pillar: 'risk',
    name: 'Risk Score',
    score: riskScore,
    scoreBand: getScoreBandEnum(riskScore),
    label: riskScore >= 75 ? 'LOW RISK' : riskScore >= 55 ? 'MODERATE' : riskScore >= 35 ? 'ELEVATED' : 'HIGH RISK',
    summary: totalRiskFlags === 0
      ? 'No red flags detected across analysis'
      : `${totalRiskFlags} risk factor(s) identified across ${riskSignals.categories} categories`,
    segments: riskSignals.segments,
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
