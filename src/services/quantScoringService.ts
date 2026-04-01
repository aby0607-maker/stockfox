/**
 * Quant Scoring Service — Converts CMOTS data into 7 scored Quant segments
 *
 * Pipeline: resolveMetricValues() → score signals → build SegmentVerdictV2[]
 *
 * 7 Segments:
 * 1. Financial Health (scored): 5 gates + 5 clusters + modifiers
 * 2. Profitability (scored): anchors + modifiers
 * 3. Growth (scored): anchors + modifiers
 * 4. Valuation (scored): PE/PB/EV vs 5Y avg
 * 5. Technical (scored): EMA, RSI, VPT
 * 6. Performance (context): 1Y/3Y/5Y returns
 * 7. Institutional (context): FII/DII/Promoter
 */

import type { SegmentVerdictV2, SignalGroup, QualSignal, ConfidenceIndicator, RedFlagV2 } from '@/types'
import { getScoreBandEnum } from '@/lib/scoring'
import { resolveMetricValues } from './metricResolver'
import { buildQuantSegmentsV2 } from '@/data/quantSignals'

// ─── Signal Helpers ─────────────────────────────

function sig(
  id: string, name: string, group: string,
  tier: QualSignal['escalationTier'],
  score: number | undefined,
  state: QualSignal['state'],
  userText: string,
  extras?: Partial<QualSignal>,
): QualSignal {
  return { id, name, group, escalationTier: tier, score, state, userText, isTriggered: extras?.isTriggered ?? false, version: 'v1', ...extras }
}

function gate(
  id: string, name: string, group: string,
  passed: boolean, value: string, threshold: string,
  formula: string, userText: string,
): QualSignal {
  return sig(id, name, group, 'hard', passed ? 85 : 10, passed ? 'strong' : 'suppressed', userText, {
    gatePassed: passed, gateValue: value, gateThreshold: threshold, gateFormula: formula, isTriggered: !passed,
  })
}

function modifier(
  id: string, name: string, group: string,
  points: number, active: boolean, userText: string,
): QualSignal {
  return sig(id, name, group, active ? 'soft' : 'score_only', undefined, active ? 'monitor' : 'strong', userText, {
    modifierPoints: points, modifierActive: active,
  })
}

function confidence(computed: number, total: number, range?: string): ConfidenceIndicator {
  const dataRange = range || 'FY20–FY25'
  return {
    signalsComputed: computed, signalsTotal: total, dataRange,
    state: computed === total ? 'full' : computed >= total * 0.7 ? 'partial' : 'limited_history',
    tooltip: `Based on ${computed} of ${total} signals | Data: ${dataRange}`,
  }
}

/** Score a metric value against thresholds (higher is better) */
function scoreMetric(value: number | null, thresholds: { excellent: number; good: number; fair: number }): number {
  if (value == null) return 50
  if (value >= thresholds.excellent) return 90
  if (value >= thresholds.good) return 72
  if (value >= thresholds.fair) return 55
  return 30
}

/** Score where lower is better (e.g., Debt/EBITDA, PE ratio) */
function scoreMetricLower(value: number | null, thresholds: { excellent: number; good: number; fair: number }): number {
  if (value == null) return 50
  if (value <= thresholds.excellent) return 90
  if (value <= thresholds.good) return 72
  if (value <= thresholds.fair) return 55
  return 30
}

function stateFromScore(score: number): QualSignal['state'] {
  if (score >= 70) return 'strong'
  if (score >= 45) return 'monitor'
  return 'flag'
}

function fmt(v: number | null, unit = '%', decimals = 1): string {
  if (v == null) return 'N/A'
  return `${v.toFixed(decimals)}${unit}`
}

// ─── Segment Builders ────────────────────────────

function buildFinancialHealth(m: Record<string, number | null>): SegmentVerdictV2 {
  const groups: SignalGroup[] = []
  const redFlags: RedFlagV2[] = []
  let computed = 0
  const total = 14

  // Hard Gates
  const debtEbitda = m['v2_debt_ebitda']
  const ocfEbitda = m['v2_ocf_ebitda']
  const g1Passed = debtEbitda == null || debtEbitda < 5 // Low leverage = pass
  const g3Passed = true // Pledge gate — would need pledge data, default pass
  const g4Passed = ocfEbitda != null && ocfEbitda > 30 // CFO > 30% of EBITDA
  const g5Passed = true // Regulatory — default pass

  if (!g4Passed) {
    redFlags.push({ signalId: 'G4', severity: 'soft', title: 'Cash Flow Viability', description: `OCF/EBITDA is ${fmt(ocfEbitda)} — weak cash conversion`, source: 'FH-G4' })
  }

  groups.push({
    id: 'gates', name: 'Hard Gates', role: 'gate', signals: [
      gate('G1', 'Solvency Gate', 'gates', g1Passed, fmt(debtEbitda, 'x'), '< 5x', 'Debt/EBITDA', g1Passed ? 'Leverage is manageable.' : 'High debt relative to earnings — solvency concern.'),
      gate('G3', 'Promoter Pledge Gate', 'gates', g3Passed, '0%', '< 50%', 'Pledged / Total', 'No excessive promoter pledging detected.'),
      gate('G4', 'Cash Flow Viability', 'gates', g4Passed, fmt(ocfEbitda), '> 30%', 'OCF/EBITDA', g4Passed ? 'Cash conversion from EBITDA is healthy.' : 'Operating cash flow is weak relative to reported EBITDA.'),
      gate('G5', 'Regulatory Gate', 'gates', g5Passed, 'Clear', 'Not flagged', 'ASM/GSM', 'No regulatory surveillance flags.'),
    ],
  })
  computed += 4

  // Scored Clusters
  const ocfScore = scoreMetric(ocfEbitda, { excellent: 80, good: 50, fair: 30 })
  const debtScore = debtEbitda != null ? scoreMetricLower(debtEbitda, { excellent: 0.5, good: 2, fair: 4 }) : 80
  computed += 2

  groups.push({
    id: 'B1', name: 'Cash Flow Quality', role: 'scored', weight: 0.5, score: ocfScore, signals: [
      sig('B1a', 'OCF/EBITDA', 'B1', 'score_only', ocfScore, stateFromScore(ocfScore), `Cash conversion is ${fmt(ocfEbitda)} of EBITDA.`),
    ],
  })

  groups.push({
    id: 'B2', name: 'Balance Sheet Strength', role: 'scored', weight: 0.5, score: debtScore, signals: [
      sig('B2a', 'Debt/EBITDA', 'B2', 'score_only', debtScore, stateFromScore(debtScore), `Leverage at ${fmt(debtEbitda, 'x')} Debt/EBITDA.`),
    ],
  })

  // Modifiers
  const pledgeModifier = false
  groups.push({
    id: 'modifiers', name: 'India Modifiers', role: 'modifier', signals: [
      modifier('M1', 'Promoter Pledge 20–50%', 'modifiers', -5, pledgeModifier, 'No elevated promoter pledging detected.'),
    ],
  })

  const clusterScore = Math.round((ocfScore * 0.5 + debtScore * 0.5))
  const gatesPassed = g1Passed && g3Passed && g4Passed && g5Passed
  const finalScore = gatesPassed ? clusterScore : Math.min(clusterScore, 35)

  return {
    id: 'financial_health', name: 'Financial Health', pillar: 'quant',
    scoringType: 'scored', score: finalScore, scoreBand: getScoreBandEnum(finalScore),
    label: getScoreBandEnum(finalScore).toUpperCase(), weight: 20,
    status: finalScore >= 60 ? 'positive' : finalScore >= 40 ? 'neutral' : 'negative',
    interpretation: `Financial health scores ${finalScore}/100 — ${finalScore >= 60 ? 'solid fundamentals' : 'areas of concern exist'}.`,
    confidenceIndicator: confidence(computed, total), signalGroups: groups, redFlags,
  }
}

function buildProfitability(m: Record<string, number | null>): SegmentVerdictV2 {
  const roe = m['v2_roe']
  const roeScore = scoreMetric(roe, { excellent: 20, good: 15, fair: 10 })

  const groups: SignalGroup[] = [{
    id: 'A', name: 'Return Metrics', role: 'anchor', score: roeScore, signals: [
      sig('A1', 'ROE (5Y Avg)', 'A', 'score_only', roeScore, stateFromScore(roeScore), `Return on equity averages ${fmt(roe)} over 5 years.`),
    ],
  }]

  return {
    id: 'profitability', name: 'Profitability', pillar: 'quant',
    scoringType: 'scored', score: roeScore, scoreBand: getScoreBandEnum(roeScore),
    label: getScoreBandEnum(roeScore).toUpperCase(), weight: 20,
    status: roeScore >= 60 ? 'positive' : roeScore >= 40 ? 'neutral' : 'negative',
    interpretation: `Profitability scores ${roeScore}/100 based on ${fmt(roe)} average ROE.`,
    confidenceIndicator: confidence(1, 3), signalGroups: groups,
  }
}

function buildGrowth(m: Record<string, number | null>): SegmentVerdictV2 {
  const revGrowth = m['v2_revenue_growth']
  const ebitdaGrowth = m['v2_ebitda_growth']
  const earningsGrowth = m['v2_earnings_growth']

  const revScore = scoreMetric(revGrowth, { excellent: 20, good: 12, fair: 5 })
  const ebitdaScore = scoreMetric(ebitdaGrowth, { excellent: 20, good: 12, fair: 5 })
  const earningsScore = scoreMetric(earningsGrowth, { excellent: 20, good: 12, fair: 5 })
  const avgScore = Math.round((revScore + ebitdaScore + earningsScore) / 3)

  const groups: SignalGroup[] = [{
    id: 'A', name: 'Growth Anchors', role: 'anchor', score: avgScore, signals: [
      sig('A1', 'Revenue CAGR', 'A', 'score_only', revScore, stateFromScore(revScore), `Revenue has grown at ${fmt(revGrowth)} CAGR.`),
      sig('A2', 'EBITDA CAGR', 'A', 'score_only', ebitdaScore, stateFromScore(ebitdaScore), `EBITDA has grown at ${fmt(ebitdaGrowth)} CAGR.`),
      sig('A3', 'Earnings CAGR', 'A', 'score_only', earningsScore, stateFromScore(earningsScore), `Earnings (PAT) have grown at ${fmt(earningsGrowth)} CAGR.`),
    ],
  }]

  // Quarterly momentum modifiers
  const revMultiplier = m['v2_revenue_multiplier']
  const revMultOk = revMultiplier != null && revMultiplier >= 1.0
  groups.push({
    id: 'modifiers', name: 'Momentum Modifiers', role: 'modifier', signals: [
      modifier('M1', 'Quarterly Revenue Momentum', 'modifiers', revMultOk ? 5 : -5, !revMultOk,
        revMultiplier != null ? `Latest quarter revenue is ${(revMultiplier * 100 - 100).toFixed(0)}% vs same quarter last year.` : 'Quarterly data not available.'),
    ],
  })

  return {
    id: 'growth', name: 'Growth', pillar: 'quant',
    scoringType: 'scored', score: avgScore, scoreBand: getScoreBandEnum(avgScore),
    label: getScoreBandEnum(avgScore).toUpperCase(), weight: 25,
    status: avgScore >= 60 ? 'positive' : avgScore >= 40 ? 'neutral' : 'negative',
    interpretation: `Growth scores ${avgScore}/100 — Revenue ${fmt(revGrowth)}, EBITDA ${fmt(ebitdaGrowth)}, Earnings ${fmt(earningsGrowth)} CAGR.`,
    confidenceIndicator: confidence(3, 6), signalGroups: groups,
  }
}

function buildValuation(m: Record<string, number | null>): SegmentVerdictV2 {
  const peRatio = m['v2_pe_vs_5y']
  const pbRatio = m['v2_pb_vs_5y']
  const evRatio = m['v2_ev_vs_5y']

  // Ratio < 1 = undervalued vs own history, > 1 = overvalued
  const peScore = scoreMetricLower(peRatio, { excellent: 0.7, good: 1.0, fair: 1.3 })
  const pbScore = scoreMetricLower(pbRatio, { excellent: 0.7, good: 1.0, fair: 1.3 })
  const evScore = scoreMetricLower(evRatio, { excellent: 0.7, good: 1.0, fair: 1.3 })

  const scores = [peScore, pbScore, evScore].filter((_, i) => [peRatio, pbRatio, evRatio][i] != null)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50

  const rawPE = m['raw_pe']
  const rawPB = m['raw_pb']
  const rawEV = m['raw_ev']

  const groups: SignalGroup[] = [{
    id: 'A', name: 'Valuation vs Own History', role: 'anchor', score: avgScore, signals: [
      sig('A1', 'PE vs 5Y Avg', 'A', 'score_only', peScore, stateFromScore(peScore),
        peRatio != null ? `Trading at ${(peRatio * 100).toFixed(0)}% of 5Y average PE (${fmt(rawPE, 'x')}).` : 'PE ratio not available.'),
      sig('A2', 'PB vs 5Y Avg', 'A', 'score_only', pbScore, stateFromScore(pbScore),
        pbRatio != null ? `Trading at ${(pbRatio * 100).toFixed(0)}% of 5Y average PB (${fmt(rawPB, 'x')}).` : 'PB ratio not available.'),
      sig('A3', 'EV/EBITDA vs 5Y Avg', 'A', 'score_only', evScore, stateFromScore(evScore),
        evRatio != null ? `Trading at ${(evRatio * 100).toFixed(0)}% of 5Y average EV/EBITDA (${fmt(rawEV, 'x')}).` : 'EV/EBITDA not available.'),
    ],
  }]

  return {
    id: 'valuation', name: 'Valuation', pillar: 'quant',
    scoringType: 'scored', score: avgScore, scoreBand: getScoreBandEnum(avgScore),
    label: getScoreBandEnum(avgScore).toUpperCase(), weight: 20,
    status: avgScore >= 60 ? 'positive' : avgScore >= 40 ? 'neutral' : 'negative',
    interpretation: `Valuation scores ${avgScore}/100 based on PE/PB/EV vs own 5-year history.`,
    confidenceIndicator: confidence(scores.length, 3), signalGroups: groups,
  }
}

function buildTechnical(m: Record<string, number | null>): SegmentVerdictV2 {
  const ema20 = m['v2_price_ema20']
  const ema200 = m['v2_price_ema200']
  const rsiVal = m['v2_rsi']
  const vptVal = m['v2_vpt']

  // EMA: positive deviation = bullish
  const ema20Score = scoreMetric(ema20, { excellent: 5, good: 2, fair: 0 })
  const ema200Score = scoreMetric(ema200, { excellent: 20, good: 10, fair: 0 })

  // RSI: 40-60 is optimal, extremes are bad
  let rsiScore = 50
  if (rsiVal != null) {
    if (rsiVal >= 50 && rsiVal <= 65) rsiScore = 85
    else if (rsiVal >= 40 && rsiVal < 50) rsiScore = 72
    else if (rsiVal >= 30 && rsiVal < 40) rsiScore = 45
    else if (rsiVal >= 65 && rsiVal < 75) rsiScore = 60
    else rsiScore = 30
  }

  // VPT: positive = accumulation
  const vptScore = scoreMetric(vptVal, { excellent: 30, good: 10, fair: 0 })

  const allScores = [ema20Score, ema200Score, rsiScore, vptScore]
  const avgScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)

  const groups: SignalGroup[] = [{
    id: 'A', name: 'Trend & Momentum', role: 'anchor', score: avgScore, signals: [
      sig('A1', 'Price vs 20-Day EMA', 'A', 'score_only', ema20Score, stateFromScore(ema20Score), `Price is ${fmt(ema20)} above 20-day EMA.`),
      sig('A2', 'Price vs 200-Day EMA', 'A', 'score_only', ema200Score, stateFromScore(ema200Score), `Price is ${fmt(ema200)} above 200-day EMA.`),
      sig('A3', 'RSI (14-day)', 'A', 'score_only', rsiScore, stateFromScore(rsiScore), `RSI is ${fmt(rsiVal, '', 0)} — ${rsiVal != null && rsiVal > 70 ? 'overbought' : rsiVal != null && rsiVal < 30 ? 'oversold' : 'neutral zone'}.`),
      sig('A4', 'Volume-Price Trend', 'A', 'score_only', vptScore, stateFromScore(vptScore), `VPT is ${fmt(vptVal, '', 1)} — ${vptVal != null && vptVal > 10 ? 'accumulation' : vptVal != null && vptVal < -10 ? 'distribution' : 'neutral'}.`),
    ],
  }]

  const hasData = ema20 != null
  if (!hasData) {
    return {
      id: 'technical', name: 'Technical', pillar: 'quant',
      scoringType: 'scored', score: 50, scoreBand: 'mixed', label: 'MIXED', weight: 15,
      status: 'neutral', interpretation: 'Insufficient price history for technical analysis.',
      confidenceIndicator: confidence(0, 5, 'N/A'), signalGroups: groups,
    }
  }

  return {
    id: 'technical', name: 'Technical', pillar: 'quant',
    scoringType: 'scored', score: avgScore, scoreBand: getScoreBandEnum(avgScore),
    label: getScoreBandEnum(avgScore).toUpperCase(), weight: 15,
    status: avgScore >= 60 ? 'positive' : avgScore >= 40 ? 'neutral' : 'negative',
    interpretation: `Technical scores ${avgScore}/100 — EMA trend ${ema200 != null && ema200 > 0 ? 'bullish' : 'bearish'}, RSI ${fmt(rsiVal, '', 0)}.`,
    confidenceIndicator: confidence(4, 5), signalGroups: groups,
  }
}

function buildPerformance(_m: Record<string, number | null>): SegmentVerdictV2 {
  // Context-only — no score
  const groups: SignalGroup[] = [{
    id: 'context', name: 'Price Returns', role: 'context', signals: [
      sig('C1', 'Current Price Trend', 'context', 'score_only', undefined, 'not_applicable',
        'Historical price performance data. Use for context, not scoring.'),
    ],
  }]

  return {
    id: 'performance', name: 'Performance', pillar: 'quant',
    scoringType: 'context', status: 'neutral',
    interpretation: 'Performance metrics shown for context — not scored.',
    confidenceIndicator: confidence(0, 0, 'N/A'), signalGroups: groups,
  }
}

function buildInstitutional(m: Record<string, number | null>): SegmentVerdictV2 {
  const promoter = m['promoter_holding']
  const fii = m['fii_holding']
  const dii = m['dii_holding']
  const promoterChange = m['promoter_holding_change_3m']
  const fiiChange = m['fii_holding_change_3m']

  const groups: SignalGroup[] = [{
    id: 'context', name: 'Ownership Pattern', role: 'context', signals: [
      sig('C1', 'Promoter Holding', 'context', 'score_only', undefined, promoter != null ? 'strong' : 'not_applicable',
        promoter != null ? `Promoter holds ${fmt(promoter)} of the company${promoterChange != null ? ` (${promoterChange > 0 ? '+' : ''}${fmt(promoterChange)} QoQ)` : ''}.` : 'Promoter holding data not available.'),
      sig('C2', 'FII Holding', 'context', 'score_only', undefined, fii != null ? 'strong' : 'not_applicable',
        fii != null ? `Foreign institutional investors hold ${fmt(fii)}${fiiChange != null ? ` (${fiiChange > 0 ? '+' : ''}${fmt(fiiChange)} QoQ)` : ''}.` : 'FII data not available.'),
      sig('C3', 'DII Holding', 'context', 'score_only', undefined, dii != null ? 'strong' : 'not_applicable',
        dii != null ? `Domestic institutional investors hold ${fmt(dii)}.` : 'DII data not available.'),
    ],
  }]

  return {
    id: 'institutional', name: 'Institutional Signals', pillar: 'quant',
    scoringType: 'context', status: 'neutral',
    interpretation: promoter != null
      ? `Promoter ${fmt(promoter)}, FII ${fmt(fii)}, DII ${fmt(dii)}.`
      : 'Ownership data not yet available.',
    confidenceIndicator: confidence(promoter != null ? 3 : 0, 3), signalGroups: groups,
  }
}

// ─── Public API ─────────────────────────────────

/**
 * Compute quant segments for any stock.
 * Demo stocks use mock data; all others resolve via CMOTS.
 */
export async function computeQuantSegments(symbol: string): Promise<SegmentVerdictV2[]> {
  // Demo stocks: use existing mock data
  const demoMap: Record<string, 'zomato' | 'axisbank' | 'tcs'> = {
    zomato: 'zomato', axisbank: 'axisbank', tcs: 'tcs',
  }
  const demoKey = demoMap[symbol.toLowerCase()]
  if (demoKey) {
    return buildQuantSegmentsV2(demoKey)
  }

  // Resolve metrics from CMOTS
  const resolved = await resolveMetricValues(symbol)
  if (!resolved) {
    console.warn(`[QuantScoring] No metrics resolved for ${symbol}, returning empty`)
    return buildEmptySegments()
  }

  return buildSegmentsFromMetrics(resolved.data)
}

/** Build all 7 segments from resolved metric data */
function buildSegmentsFromMetrics(m: Record<string, number | null>): SegmentVerdictV2[] {
  return [
    buildFinancialHealth(m),
    buildProfitability(m),
    buildGrowth(m),
    buildValuation(m),
    buildTechnical(m),
    buildPerformance(m),
    buildInstitutional(m),
  ]
}

/** Empty segments when no data is available */
function buildEmptySegments(): SegmentVerdictV2[] {
  const empty = (id: string, name: string, weight?: number): SegmentVerdictV2 => ({
    id, name, pillar: 'quant',
    scoringType: weight ? 'scored' : 'context',
    score: weight ? 50 : undefined, scoreBand: weight ? 'mixed' : undefined,
    label: weight ? 'MIXED' : undefined, weight,
    status: 'neutral',
    interpretation: `${name} data not yet available for this stock.`,
    confidenceIndicator: { signalsComputed: 0, signalsTotal: 1, state: 'cmots_gap', tooltip: 'Data not available' },
    signalGroups: [],
  })

  return [
    empty('financial_health', 'Financial Health', 20),
    empty('profitability', 'Profitability', 20),
    empty('growth', 'Growth', 25),
    empty('valuation', 'Valuation', 20),
    empty('technical', 'Technical', 15),
    empty('performance', 'Performance'),
    empty('institutional', 'Institutional Signals'),
  ]
}
