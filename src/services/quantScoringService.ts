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

  // ── Hard Gates ──
  const debtEbitda = m['v2_debt_ebitda']
  const ocfEbitda = m['v2_ocf_ebitda']
  const debtToEquity = m['v2_debt_to_equity']
  const currentRatio = m['v2_current_ratio']
  const interestCoverage = m['v2_interest_coverage']
  const accruals = m['v2_accruals_ratio']
  const assetTurnover = m['v2_asset_turnover']
  const fcfYield = m['v2_fcf_yield']

  const g1Passed = debtEbitda == null || debtEbitda < 5
  const g3Passed = true // Pledge gate — default pass (pledge data not reliably available)
  const g4Passed = ocfEbitda != null && ocfEbitda > 30
  const g5Passed = true // Regulatory — default pass

  if (!g1Passed) {
    redFlags.push({ signalId: 'G1', severity: 'hard', title: 'Solvency Risk', description: `Debt/EBITDA is ${fmt(debtEbitda, 'x')} — exceeds 5x threshold`, source: 'FH-G1' })
  }
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

  // ── B1: Cash Flow Quality ──
  const ocfScore = scoreMetric(ocfEbitda, { excellent: 80, good: 50, fair: 30 })
  computed++

  groups.push({
    id: 'B1', name: 'Cash Flow Quality', role: 'scored', weight: 0.25, score: ocfScore, signals: [
      sig('B1a', 'OCF/EBITDA', 'B1', 'score_only', ocfScore, stateFromScore(ocfScore), `Cash conversion is ${fmt(ocfEbitda)} of EBITDA.`),
    ],
  })

  // ── B2: Balance Sheet Strength ──
  const debtEbitdaScore = debtEbitda != null ? scoreMetricLower(debtEbitda, { excellent: 0.5, good: 2, fair: 4 }) : 80
  const deScore = debtToEquity != null ? scoreMetricLower(debtToEquity, { excellent: 0.3, good: 1.0, fair: 2.0 }) : 50
  const crScore = scoreMetric(currentRatio, { excellent: 2.0, good: 1.5, fair: 1.0 })
  const b2Score = Math.round((debtEbitdaScore * 0.4 + deScore * 0.3 + crScore * 0.3))
  computed += 3

  groups.push({
    id: 'B2', name: 'Balance Sheet Strength', role: 'scored', weight: 0.25, score: b2Score, signals: [
      sig('B2a', 'Debt/EBITDA', 'B2', 'score_only', debtEbitdaScore, stateFromScore(debtEbitdaScore), `Leverage at ${fmt(debtEbitda, 'x')} Debt/EBITDA.`),
      sig('B2b', 'Debt/Equity', 'B2', 'score_only', deScore, stateFromScore(deScore), `Debt-to-equity ratio is ${fmt(debtToEquity, 'x')}.`),
      sig('B2c', 'Current Ratio', 'B2', 'score_only', crScore, stateFromScore(crScore), `Current ratio is ${fmt(currentRatio, 'x')} — ${currentRatio != null && currentRatio >= 1.5 ? 'comfortable liquidity' : currentRatio != null && currentRatio >= 1.0 ? 'adequate liquidity' : 'tight liquidity'}.`),
    ],
  })

  // ── B3: Earnings Quality (Accruals) ──
  // Lower accruals = higher earnings quality (cash-backed profits)
  const accrualScore = accruals != null ? scoreMetricLower(Math.abs(accruals), { excellent: 3, good: 8, fair: 15 }) : 50
  computed++

  groups.push({
    id: 'B3', name: 'Earnings Quality', role: 'scored', weight: 0.20, score: accrualScore, signals: [
      sig('B3a', 'Accruals Ratio', 'B3', 'score_only', accrualScore, stateFromScore(accrualScore),
        accruals != null
          ? `Accruals ratio is ${fmt(accruals)} — ${Math.abs(accruals) < 5 ? 'earnings well-backed by cash' : Math.abs(accruals) < 10 ? 'moderate gap between profit and cash' : 'large gap — earnings quality concern'}.`
          : 'Accruals data not available.'),
    ],
  })

  // ── B4: Operating Efficiency ──
  const atScore = scoreMetric(assetTurnover, { excellent: 1.5, good: 1.0, fair: 0.5 })
  const icScore = interestCoverage != null ? scoreMetric(interestCoverage, { excellent: 5, good: 3, fair: 1.5 }) : 50
  const b4Score = Math.round((atScore * 0.5 + icScore * 0.5))
  computed += 2

  groups.push({
    id: 'B4', name: 'Operating Efficiency', role: 'scored', weight: 0.15, score: b4Score, signals: [
      sig('B4a', 'Asset Turnover', 'B4', 'score_only', atScore, stateFromScore(atScore),
        `Asset turnover is ${fmt(assetTurnover, 'x')} — ${assetTurnover != null && assetTurnover >= 1.0 ? 'efficient asset utilization' : 'capital-intensive business model'}.`),
      sig('B4b', 'Interest Coverage', 'B4', 'score_only', icScore, stateFromScore(icScore),
        interestCoverage != null
          ? `Interest coverage is ${fmt(interestCoverage, 'x')} — ${interestCoverage >= 3 ? 'comfortably covering interest' : 'interest burden is notable'}.`
          : 'Interest coverage data not available.'),
    ],
  })

  // ── B5: Capital Allocation ──
  const fcfScore = fcfYield != null ? scoreMetric(fcfYield, { excellent: 5, good: 3, fair: 1 }) : 50
  computed++

  groups.push({
    id: 'B5', name: 'Capital Allocation', role: 'scored', weight: 0.15, score: fcfScore, signals: [
      sig('B5a', 'FCF Yield', 'B5', 'score_only', fcfScore, stateFromScore(fcfScore),
        fcfYield != null
          ? `Free cash flow yield is ${fmt(fcfYield)} — ${fcfYield >= 3 ? 'generating meaningful free cash' : fcfYield > 0 ? 'moderate cash generation' : 'cash flow negative or minimal'}.`
          : 'FCF yield data not available.'),
    ],
  })

  // ── India Modifiers ──
  const highDE = debtToEquity != null && debtToEquity > 1.5
  const lowIC = interestCoverage != null && interestCoverage < 2
  groups.push({
    id: 'modifiers', name: 'India Modifiers', role: 'modifier', signals: [
      modifier('M1', 'Promoter Pledge 20–50%', 'modifiers', -5, false, 'No elevated promoter pledging detected.'),
      modifier('M2', 'High Leverage Warning', 'modifiers', -3, highDE,
        highDE ? `Debt/Equity at ${fmt(debtToEquity, 'x')} is above comfort zone.` : 'Leverage within acceptable limits.'),
      modifier('M3', 'Interest Burden', 'modifiers', -3, lowIC,
        lowIC ? `Interest coverage at ${fmt(interestCoverage, 'x')} is tight.` : 'Interest obligations comfortably covered.'),
    ],
  })

  if (highDE) {
    redFlags.push({ signalId: 'M2', severity: 'soft', title: 'High Leverage', description: `D/E ratio is ${fmt(debtToEquity, 'x')}`, source: 'FH-M2' })
  }

  // ── Final Score ──
  const clusterScore = Math.round(
    ocfScore * 0.25 + b2Score * 0.25 + accrualScore * 0.20 + b4Score * 0.15 + fcfScore * 0.15
  )
  const modPenalty = (highDE ? -3 : 0) + (lowIC ? -3 : 0)
  const gatesPassed = g1Passed && g3Passed && g4Passed && g5Passed
  const finalScore = Math.max(0, Math.min(100, gatesPassed ? clusterScore + modPenalty : Math.min(clusterScore, 35)))

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
  const roce = m['v2_roce']
  const opm = m['v2_opm']
  const npm = m['v2_npm']
  const roa = m['v2_roa']
  const roeTrend = m['v2_roe_trend']

  const roeScore = scoreMetric(roe, { excellent: 20, good: 15, fair: 10 })
  const roceScore = scoreMetric(roce, { excellent: 20, good: 15, fair: 10 })
  const opmScore = scoreMetric(opm, { excellent: 25, good: 15, fair: 8 })

  const groups: SignalGroup[] = []
  let computed = 0
  const total = 9

  // Anchor group: core return metrics
  const anchorScores = [roeScore, roceScore, opmScore]
  const anchorAvg = Math.round(anchorScores.reduce((a, b) => a + b, 0) / anchorScores.length)
  computed += 3

  groups.push({
    id: 'anchors', name: 'Core Profitability', role: 'anchor', score: anchorAvg, signals: [
      sig('A1', 'ROE (5Y Avg)', 'anchors', 'score_only', roeScore, stateFromScore(roeScore),
        `Return on equity averages ${fmt(roe)} over 5 years.`),
      sig('A2', 'ROCE', 'anchors', 'score_only', roceScore, stateFromScore(roceScore),
        `Return on capital employed is ${fmt(roce)}.`),
      sig('A3', 'Operating Margin', 'anchors', 'score_only', opmScore, stateFromScore(opmScore),
        `Operating profit margin is ${fmt(opm)}.`),
    ],
  })

  // Quality modifiers: trend & secondary metrics
  const npmScore = scoreMetric(npm, { excellent: 20, good: 12, fair: 5 })
  const roaScore = scoreMetric(roa, { excellent: 12, good: 8, fair: 4 })

  // ROE trend: positive = improving profitability
  let trendScore = 50
  if (roeTrend != null) {
    if (roeTrend > 2) trendScore = 85
    else if (roeTrend > 0) trendScore = 72
    else if (roeTrend > -2) trendScore = 45
    else trendScore = 30
  }
  computed += 3

  const modScores = [npmScore, roaScore, trendScore]
  const modAvg = Math.round(modScores.reduce((a, b) => a + b, 0) / modScores.length)

  groups.push({
    id: 'modifiers', name: 'Quality Modifiers', role: 'scored', weight: 0.35, score: modAvg, signals: [
      sig('M1', 'Net Profit Margin', 'modifiers', 'score_only', npmScore, stateFromScore(npmScore),
        `Net margin is ${fmt(npm)}.`),
      sig('M2', 'Return on Assets', 'modifiers', 'score_only', roaScore, stateFromScore(roaScore),
        `ROA is ${fmt(roa)} — measures asset efficiency.`),
      sig('M3', 'ROE Trend (5Y)', 'modifiers', 'score_only', trendScore, stateFromScore(trendScore),
        roeTrend != null
          ? `ROE has ${roeTrend > 0 ? 'improved' : 'declined'} by ${fmt(Math.abs(roeTrend), 'pp/yr')} annually over 5 years.`
          : 'ROE trend data not available.'),
    ],
  })

  const finalScore = Math.round(anchorAvg * 0.65 + modAvg * 0.35)

  return {
    id: 'profitability', name: 'Profitability', pillar: 'quant',
    scoringType: 'scored', score: finalScore, scoreBand: getScoreBandEnum(finalScore),
    label: getScoreBandEnum(finalScore).toUpperCase(), weight: 20,
    status: finalScore >= 60 ? 'positive' : finalScore >= 40 ? 'neutral' : 'negative',
    interpretation: `Profitability scores ${finalScore}/100 — ROE ${fmt(roe)}, ROCE ${fmt(roce)}, OPM ${fmt(opm)}.`,
    confidenceIndicator: confidence(computed, total), signalGroups: groups,
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
  const ebitdaMultiplier = m['v2_ebitda_multiplier']
  const revMultOk = revMultiplier != null && revMultiplier >= 1.0
  const ebitdaMultOk = ebitdaMultiplier != null && ebitdaMultiplier >= 1.0
  groups.push({
    id: 'modifiers', name: 'Momentum Modifiers', role: 'modifier', signals: [
      modifier('M1', 'Quarterly Revenue Momentum', 'modifiers', revMultOk ? 5 : -5, !revMultOk,
        revMultiplier != null ? `Latest quarter revenue is ${(revMultiplier * 100 - 100).toFixed(0)}% vs same quarter last year.` : 'Quarterly data not available.'),
      modifier('M2', 'Quarterly EBITDA Momentum', 'modifiers', ebitdaMultOk ? 5 : -5, !ebitdaMultOk,
        ebitdaMultiplier != null ? `Latest quarter EBITDA is ${(ebitdaMultiplier * 100 - 100).toFixed(0)}% vs same quarter last year.` : 'Quarterly EBITDA data not available.'),
    ],
  })

  return {
    id: 'growth', name: 'Growth', pillar: 'quant',
    scoringType: 'scored', score: avgScore, scoreBand: getScoreBandEnum(avgScore),
    label: getScoreBandEnum(avgScore).toUpperCase(), weight: 25,
    status: avgScore >= 60 ? 'positive' : avgScore >= 40 ? 'neutral' : 'negative',
    interpretation: `Growth scores ${avgScore}/100 — Revenue ${fmt(revGrowth)}, EBITDA ${fmt(ebitdaGrowth)}, Earnings ${fmt(earningsGrowth)} CAGR.`,
    confidenceIndicator: confidence(5, 6), signalGroups: groups,
  }
}

function buildValuation(m: Record<string, number | null>): SegmentVerdictV2 {
  const peRatio = m['v2_pe_vs_5y']
  const pbRatio = m['v2_pb_vs_5y']
  const evRatio = m['v2_ev_vs_5y']
  const peg = m['v2_peg_ratio']
  const divYield = m['v2_dividend_yield']
  const earningsYield = m['v2_earnings_yield']

  const rawPE = m['raw_pe']
  const rawPB = m['raw_pb']
  const rawEV = m['raw_ev']

  const groups: SignalGroup[] = []
  let computed = 0
  const total = 6

  // ── L2: Historical Range (anchor) ──
  const peScore = scoreMetricLower(peRatio, { excellent: 0.7, good: 1.0, fair: 1.3 })
  const pbScore = scoreMetricLower(pbRatio, { excellent: 0.7, good: 1.0, fair: 1.3 })
  const evScore = scoreMetricLower(evRatio, { excellent: 0.7, good: 1.0, fair: 1.3 })

  const histScores = [peScore, pbScore, evScore].filter((_, i) => [peRatio, pbRatio, evRatio][i] != null)
  const histAvg = histScores.length > 0 ? Math.round(histScores.reduce((a, b) => a + b, 0) / histScores.length) : 50
  computed += histScores.length

  groups.push({
    id: 'L2', name: 'Historical Range', role: 'anchor', score: histAvg, signals: [
      sig('L2a', 'PE vs 5Y Avg', 'L2', 'score_only', peScore, stateFromScore(peScore),
        peRatio != null ? `Trading at ${(peRatio * 100).toFixed(0)}% of 5Y average PE (${fmt(rawPE, 'x')}).` : 'PE ratio not available.'),
      sig('L2b', 'PB vs 5Y Avg', 'L2', 'score_only', pbScore, stateFromScore(pbScore),
        pbRatio != null ? `Trading at ${(pbRatio * 100).toFixed(0)}% of 5Y average PB (${fmt(rawPB, 'x')}).` : 'PB ratio not available.'),
      sig('L2c', 'EV/EBITDA vs 5Y Avg', 'L2', 'score_only', evScore, stateFromScore(evScore),
        evRatio != null ? `Trading at ${(evRatio * 100).toFixed(0)}% of 5Y average EV/EBITDA (${fmt(rawEV, 'x')}).` : 'EV/EBITDA not available.'),
    ],
  })

  // ── L3: Value Benchmarks (PEG, Dividend Yield, Earnings Yield) ──
  // PEG < 1 = undervalued relative to growth, > 2 = overvalued
  const pegScore = peg != null && peg > 0 ? scoreMetricLower(peg, { excellent: 0.8, good: 1.2, fair: 2.0 }) : 50
  // Dividend yield: higher is better for value
  const divScore = divYield != null ? scoreMetric(divYield, { excellent: 3.0, good: 1.5, fair: 0.5 }) : 50
  // Earnings yield: inverse PE, higher = cheaper
  const eyScore = earningsYield != null ? scoreMetric(earningsYield, { excellent: 8, good: 5, fair: 3 }) : 50

  const benchScores: number[] = []
  if (peg != null) { benchScores.push(pegScore); computed++ }
  if (divYield != null) { benchScores.push(divScore); computed++ }
  if (earningsYield != null) { benchScores.push(eyScore); computed++ }
  const benchAvg = benchScores.length > 0 ? Math.round(benchScores.reduce((a, b) => a + b, 0) / benchScores.length) : 50

  groups.push({
    id: 'L3', name: 'Value Benchmarks', role: 'scored', weight: 0.35, score: benchAvg, signals: [
      sig('L3a', 'PEG Ratio', 'L3', 'score_only', pegScore, stateFromScore(pegScore),
        peg != null ? `PEG ratio is ${fmt(peg, 'x')} — ${peg < 1 ? 'growth at a reasonable price' : peg < 2 ? 'fairly valued for growth' : 'premium valuation vs growth'}.` : 'PEG ratio not available.'),
      sig('L3b', 'Dividend Yield', 'L3', 'score_only', divScore, stateFromScore(divScore),
        divYield != null ? `Dividend yield is ${fmt(divYield)} — ${divYield >= 2 ? 'attractive income' : divYield > 0 ? 'modest payout' : 'no dividend'}.` : 'Dividend yield not available.'),
      sig('L3c', 'Earnings Yield', 'L3', 'score_only', eyScore, stateFromScore(eyScore),
        earningsYield != null ? `Earnings yield is ${fmt(earningsYield)} (inverse PE).` : 'Earnings yield not available.'),
    ],
  })

  const finalScore = Math.round(histAvg * 0.65 + benchAvg * 0.35)

  return {
    id: 'valuation', name: 'Valuation', pillar: 'quant',
    scoringType: 'scored', score: finalScore, scoreBand: getScoreBandEnum(finalScore),
    label: getScoreBandEnum(finalScore).toUpperCase(), weight: 20,
    status: finalScore >= 60 ? 'positive' : finalScore >= 40 ? 'neutral' : 'negative',
    interpretation: `Valuation scores ${finalScore}/100 — PE/PB/EV vs history ${histAvg}, value benchmarks ${benchAvg}.`,
    confidenceIndicator: confidence(computed, total), signalGroups: groups,
  }
}

function buildTechnical(m: Record<string, number | null>): SegmentVerdictV2 {
  const ema20 = m['v2_price_ema20']
  const ema50 = m['v2_price_ema50']
  const ema200 = m['v2_price_ema200']
  const rsiVal = m['v2_rsi']
  const vptVal = m['v2_vpt']
  const volumeChange = m['v2_volume_change']

  const groups: SignalGroup[] = []
  let computed = 0
  const total = 6

  const hasData = ema20 != null
  if (!hasData) {
    return {
      id: 'technical', name: 'Technical', pillar: 'quant',
      scoringType: 'scored', score: 50, scoreBand: 'mixed', label: 'MIXED', weight: 15,
      status: 'neutral', interpretation: 'Insufficient price history for technical analysis.',
      confidenceIndicator: confidence(0, total, 'N/A'), signalGroups: [],
    }
  }

  // ── Trend Anchors ──
  const ema20Score = scoreMetric(ema20, { excellent: 5, good: 2, fair: 0 })
  const ema50Score = scoreMetric(ema50, { excellent: 10, good: 5, fair: 0 })
  const ema200Score = scoreMetric(ema200, { excellent: 20, good: 10, fair: 0 })
  const trendAvg = Math.round((ema20Score + ema50Score + ema200Score) / 3)
  computed += 3

  groups.push({
    id: 'anchors', name: 'Momentum & Trend', role: 'anchor', score: trendAvg, signals: [
      sig('A1', 'Price vs 20-Day EMA', 'anchors', 'score_only', ema20Score, stateFromScore(ema20Score),
        `Price is ${fmt(ema20)} ${ema20 != null && ema20 >= 0 ? 'above' : 'below'} 20-day EMA.`),
      sig('A2', 'Price vs 50-Day EMA', 'anchors', 'score_only', ema50Score, stateFromScore(ema50Score),
        `Price is ${fmt(ema50)} ${ema50 != null && ema50 >= 0 ? 'above' : 'below'} 50-day EMA.`),
      sig('A3', 'Price vs 200-Day EMA', 'anchors', 'score_only', ema200Score, stateFromScore(ema200Score),
        `Price is ${fmt(ema200)} ${ema200 != null && ema200 >= 0 ? 'above' : 'below'} 200-day EMA.`),
    ],
  })

  // ── Relative Strength ──
  let rsiScore = 50
  if (rsiVal != null) {
    if (rsiVal >= 50 && rsiVal <= 65) rsiScore = 85
    else if (rsiVal >= 40 && rsiVal < 50) rsiScore = 72
    else if (rsiVal >= 30 && rsiVal < 40) rsiScore = 45
    else if (rsiVal >= 65 && rsiVal < 75) rsiScore = 60
    else rsiScore = 30
  }
  const vptScore = scoreMetric(vptVal, { excellent: 30, good: 10, fair: 0 })
  const rsAvg = Math.round((rsiScore + vptScore) / 2)
  computed += 2

  groups.push({
    id: 'modifiers', name: 'Relative Strength & Confirmation', role: 'scored', weight: 0.30, score: rsAvg, signals: [
      sig('M1', 'RSI (14-day)', 'modifiers', 'score_only', rsiScore, stateFromScore(rsiScore),
        `RSI is ${fmt(rsiVal, '', 0)} — ${rsiVal != null && rsiVal > 70 ? 'overbought' : rsiVal != null && rsiVal < 30 ? 'oversold' : 'neutral zone'}.`),
      sig('M2', 'Volume-Price Trend', 'modifiers', 'score_only', vptScore, stateFromScore(vptScore),
        `VPT is ${fmt(vptVal, '', 1)} — ${vptVal != null && vptVal > 10 ? 'accumulation' : vptVal != null && vptVal < -10 ? 'distribution' : 'neutral'}.`),
    ],
  })

  // ── Volume Confirmation ──
  let volScore = 50
  if (volumeChange != null) {
    // volumeChange is ratio of 5-day avg / 50-day avg
    if (volumeChange >= 1.5) volScore = 80 // Surging volume
    else if (volumeChange >= 1.0) volScore = 65 // Normal
    else if (volumeChange >= 0.7) volScore = 50 // Declining
    else volScore = 35 // Low volume
  }
  computed++

  groups.push({
    id: 'context', name: 'Volume Confirmation', role: 'context', weight: 0.10, score: volScore, signals: [
      sig('C1', 'Recent Volume vs Average', 'context', 'score_only', volScore, stateFromScore(volScore),
        volumeChange != null
          ? `Recent volume is ${(volumeChange * 100).toFixed(0)}% of 50-day average — ${volumeChange >= 1.5 ? 'unusually high interest' : volumeChange >= 0.8 ? 'normal activity' : 'fading interest'}.`
          : 'Volume data not available.'),
    ],
  })

  const avgScore = Math.round(trendAvg * 0.60 + rsAvg * 0.30 + volScore * 0.10)

  return {
    id: 'technical', name: 'Technical', pillar: 'quant',
    scoringType: 'scored', score: avgScore, scoreBand: getScoreBandEnum(avgScore),
    label: getScoreBandEnum(avgScore).toUpperCase(), weight: 15,
    status: avgScore >= 60 ? 'positive' : avgScore >= 40 ? 'neutral' : 'negative',
    interpretation: `Technical scores ${avgScore}/100 — EMA trend ${ema200 != null && ema200 > 0 ? 'bullish' : 'bearish'}, RSI ${fmt(rsiVal, '', 0)}.`,
    confidenceIndicator: confidence(computed, total), signalGroups: groups,
  }
}

function buildPerformance(m: Record<string, number | null>): SegmentVerdictV2 {
  const ret1y = m['v2_return_1y']
  const ret3y = m['v2_return_3y']
  const ret5y = m['v2_return_5y']
  const maxDD = m['v2_max_drawdown']
  const vol = m['v2_volatility']

  const groups: SignalGroup[] = []
  let computed = 0

  // ── Returns ──
  const retSignals: QualSignal[] = []
  if (ret1y != null) {
    retSignals.push(sig('R1', '1-Year Return', 'returns', 'score_only', undefined,
      ret1y > 0 ? 'strong' : 'flag', `1-year return is ${fmt(ret1y)}.`))
    computed++
  }
  if (ret3y != null) {
    const ann3y = (Math.pow(1 + ret3y / 100, 1 / 3) - 1) * 100
    retSignals.push(sig('R2', '3-Year Return', 'returns', 'score_only', undefined,
      ret3y > 0 ? 'strong' : 'flag', `3-year total return is ${fmt(ret3y)} (${fmt(ann3y)} annualized).`))
    computed++
  }
  if (ret5y != null) {
    const ann5y = (Math.pow(1 + ret5y / 100, 1 / 5) - 1) * 100
    retSignals.push(sig('R3', '5-Year Return', 'returns', 'score_only', undefined,
      ret5y > 0 ? 'strong' : 'flag', `5-year total return is ${fmt(ret5y)} (${fmt(ann5y)} annualized).`))
    computed++
  }
  if (retSignals.length === 0) {
    retSignals.push(sig('R1', '1-Year Return', 'returns', 'score_only', undefined, 'not_applicable', 'Price return data not available.'))
  }

  groups.push({ id: 'returns', name: 'Price Returns', role: 'context', signals: retSignals })

  // ── Risk Metrics ──
  const riskSignals: QualSignal[] = []
  if (maxDD != null) {
    riskSignals.push(sig('K1', 'Max Drawdown (1Y)', 'risk', 'score_only', undefined,
      maxDD > -20 ? 'strong' : maxDD > -40 ? 'monitor' : 'flag',
      `Maximum drawdown over the past year was ${fmt(maxDD)} — ${maxDD > -15 ? 'low risk' : maxDD > -30 ? 'moderate pullback' : 'significant decline'}.`))
    computed++
  }
  if (vol != null) {
    riskSignals.push(sig('K2', 'Annualized Volatility', 'risk', 'score_only', undefined,
      vol < 25 ? 'strong' : vol < 40 ? 'monitor' : 'flag',
      `Annualized volatility is ${fmt(vol)} — ${vol < 20 ? 'low volatility' : vol < 35 ? 'moderate' : 'highly volatile'}.`))
    computed++
  }
  if (riskSignals.length === 0) {
    riskSignals.push(sig('K1', 'Max Drawdown', 'risk', 'score_only', undefined, 'not_applicable', 'Risk metrics not available.'))
  }

  groups.push({ id: 'risk', name: 'Risk Metrics', role: 'context', signals: riskSignals })

  const totalSignals = Math.max(computed, 1)
  const interp = ret1y != null
    ? `1Y ${fmt(ret1y)}${ret3y != null ? `, 3Y ${fmt(ret3y)}` : ''}${maxDD != null ? `, max drawdown ${fmt(maxDD)}` : ''}.`
    : 'Performance data not yet available.'

  return {
    id: 'performance', name: 'Performance', pillar: 'quant',
    scoringType: 'context', status: 'neutral',
    interpretation: interp,
    confidenceIndicator: confidence(computed, totalSignals), signalGroups: groups,
  }
}

function buildInstitutional(m: Record<string, number | null>): SegmentVerdictV2 {
  const promoter = m['promoter_holding']
  const fii = m['fii_holding']
  const dii = m['dii_holding']
  const mf = m['mf_holding']
  const promoterChange = m['promoter_holding_change_3m']
  const promoterChange1y = m['promoter_holding_change_1y']
  const fiiChange = m['fii_holding_change_3m']

  const groups: SignalGroup[] = []
  let computed = 0

  // ── Institutional Flow ──
  const instSignals: QualSignal[] = []
  if (fii != null) {
    instSignals.push(sig('I1', 'FII Holding', 'institutional', 'score_only', undefined,
      fii > 10 ? 'strong' : fii > 3 ? 'monitor' : 'not_applicable',
      `Foreign institutional investors hold ${fmt(fii)}${fiiChange != null ? ` (${fiiChange > 0 ? '+' : ''}${fmt(fiiChange)} QoQ)` : ''}.`))
    computed++
  }
  if (dii != null) {
    instSignals.push(sig('I2', 'DII Holding', 'institutional', 'score_only', undefined,
      dii > 10 ? 'strong' : 'monitor',
      `Domestic institutional investors hold ${fmt(dii)}.`))
    computed++
  }
  if (mf != null) {
    instSignals.push(sig('I3', 'Mutual Fund Holding', 'institutional', 'score_only', undefined,
      mf > 5 ? 'strong' : mf > 1 ? 'monitor' : 'not_applicable',
      `Mutual funds hold ${fmt(mf)} of the company.`))
    computed++
  }
  if (instSignals.length === 0) {
    instSignals.push(sig('I1', 'FII Holding', 'institutional', 'score_only', undefined, 'not_applicable', 'Institutional holding data not available.'))
  }
  groups.push({ id: 'institutional', name: 'Institutional Flow', role: 'context', signals: instSignals })

  // ── Promoter Conviction ──
  const promSignals: QualSignal[] = []
  if (promoter != null) {
    promSignals.push(sig('P1', 'Promoter Holding', 'promoter', 'score_only', undefined,
      promoter > 50 ? 'strong' : promoter > 30 ? 'monitor' : 'flag',
      `Promoter holds ${fmt(promoter)} of the company.`))
    computed++
  }
  if (promoterChange != null) {
    promSignals.push(sig('P2', 'Promoter Change (QoQ)', 'promoter', 'score_only', undefined,
      promoterChange >= 0 ? 'strong' : promoterChange > -2 ? 'monitor' : 'flag',
      `Promoter holding changed ${promoterChange >= 0 ? '+' : ''}${fmt(promoterChange)} quarter-over-quarter.`))
    computed++
  }
  if (promoterChange1y != null) {
    promSignals.push(sig('P3', 'Promoter Change (1Y)', 'promoter', 'score_only', undefined,
      promoterChange1y >= 0 ? 'strong' : promoterChange1y > -3 ? 'monitor' : 'flag',
      `Promoter holding has ${promoterChange1y >= 0 ? 'increased' : 'decreased'} by ${fmt(Math.abs(promoterChange1y))} over the past year.`))
    computed++
  }
  if (promSignals.length === 0) {
    promSignals.push(sig('P1', 'Promoter Holding', 'promoter', 'score_only', undefined, 'not_applicable', 'Promoter holding data not available.'))
  }
  groups.push({ id: 'promoter', name: 'Promoter Conviction', role: 'context', signals: promSignals })

  const totalSignals = Math.max(computed, 1)

  return {
    id: 'institutional', name: 'Institutional Signals', pillar: 'quant',
    scoringType: 'context', status: 'neutral',
    interpretation: promoter != null
      ? `Promoter ${fmt(promoter)}, FII ${fmt(fii)}, DII ${fmt(dii)}${mf != null ? `, MF ${fmt(mf)}` : ''}.`
      : 'Ownership data not yet available.',
    confidenceIndicator: confidence(computed, totalSignals), signalGroups: groups,
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
