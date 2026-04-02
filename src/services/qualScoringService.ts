/**
 * Qual Scoring Service — Computes Qual signals from CMOTS data
 *
 * Of ~60 total Qual signals, ~15 can be derived from CMOTS:
 *   - Shareholding → MG (promoter holding, trend)
 *   - TTM ratios → BQ (ROCE, OPM), CD (D/E, dividend), EQ (OCF/PAT)
 *   - Cash flow / P&L → EQ (cash conversion)
 *   - Quarterly results → ExQ (consistency)
 *
 * The remaining ~45 signals require annual reports, auditor info,
 * board composition, and management commentary — marked not_applicable
 * with cmots_gap confidence state.
 *
 * Demo stocks use full mock data from verdictsV2.ts.
 */

import type {
  CMOTSTTMRecord,
  CMOTSFinancialRecord,
  CMOTSStatementRow,
  CMOTSShareholding,
  SegmentVerdictV2,
  SignalGroup,
  QualSignal,
} from '@/types'
import { getAllFundamentals, findStatementRow, getStatementValue, getYearColumns } from '@/services/cmots/fundamentals'
import { scoreQualFactor, FACTOR_CONFIGS } from '@/lib/qualScoringEngine'
import { getQualFactorsFallback } from '@/data/verdictsV2'

// ─── P&L / Cash Flow Row Numbers (same as metricResolver) ────

const PNL_ROW_EBITDA = 46
const PNL_ROW_PAT = 35
const CF_ROW_OCF = 68
const QR_ROW_REVENUE = 1

// ─── Signal Helpers ─────────────────────────────

function sig(
  id: string, name: string, group: string,
  tier: QualSignal['escalationTier'],
  score: number | undefined,
  state: QualSignal['state'],
  userText: string,
  extras?: Partial<QualSignal>,
): QualSignal {
  return {
    id, name, group, escalationTier: tier,
    score, state, userText,
    isTriggered: extras?.isTriggered ?? false,
    version: 'v1',
    ...extras,
  }
}

/** Create a not_applicable signal (excluded from scoring, shows in UI as unavailable) */
function na(id: string, name: string, group: string, reason = 'Requires annual report data not yet available via API'): QualSignal {
  return sig(id, name, group, 'score_only', undefined, 'not_applicable', reason)
}

function scoreHigher(value: number | null, thresholds: { excellent: number; good: number; fair: number }): number {
  if (value == null) return 50
  if (value >= thresholds.excellent) return 90
  if (value >= thresholds.good) return 72
  if (value >= thresholds.fair) return 55
  return 30
}

function scoreLower(value: number | null, thresholds: { excellent: number; good: number; fair: number }): number {
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

function getLatestValue(rows: CMOTSStatementRow[], rowno: number): number | null {
  const row = findStatementRow(rows, rowno)
  if (!row) return null
  const cols = getYearColumns(row)
  return cols.length > 0 ? getStatementValue(row, cols[0]) : null
}

// ─── Factor Builders ────────────────────────────

interface FactorBuild {
  groups: SignalGroup[]
  computed: number
  total: number
}

/**
 * MG — Management & Governance
 * Computable: A1 Promoter Holding, A2 Holding Trend (from shareholding)
 * Not available: A3-A5 (pledge, insider txns, RPT), Groups B & C (governance, capability)
 */
function buildMG(shareholding: CMOTSShareholding[]): FactorBuild {
  const groups: SignalGroup[] = []
  let computed = 0
  const total = 14

  // ── Group A: Promoter Alignment (anchor) ──
  const aSignals: QualSignal[] = []

  if (shareholding.length > 0) {
    const latest = shareholding[0]
    const promoter = latest.Promoters

    // A1: Promoter Holding level
    const a1Score = scoreHigher(promoter, { excellent: 60, good: 40, fair: 25 })
    aSignals.push(sig('A1', 'Promoter Skin in the Game', 'A', 'hard', a1Score, stateFromScore(a1Score),
      `Promoter holds ${fmt(promoter)} of the company.${promoter < 25 ? ' Low promoter holding — alignment risk.' : ''}`))
    computed++

    // A2: Holding Trend
    if (shareholding.length >= 3) {
      const oldest = shareholding[shareholding.length - 1]
      const change = latest.Promoters - oldest.Promoters
      const a2Score = change > 1 ? 82 : change > -1 ? 65 : change > -5 ? 45 : 25
      aSignals.push(sig('A2', 'Holding Trend', 'A', 'score_only', a2Score, stateFromScore(a2Score),
        `Promoter holding ${change > 0 ? 'increased' : change < 0 ? 'decreased' : 'stable'} by ${fmt(Math.abs(change))} over ${shareholding.length} quarters.`))
      computed++
    } else {
      aSignals.push(na('A2', 'Holding Trend', 'A', 'Insufficient shareholding history for trend analysis.'))
    }
  } else {
    aSignals.push(na('A1', 'Promoter Skin in the Game', 'A', 'Shareholding data not available.'))
    aSignals.push(na('A2', 'Holding Trend', 'A', 'Shareholding data not available.'))
  }

  // A3-A5: not available from CMOTS
  aSignals.push(na('A3', 'Pledge Status', 'A', 'Pledge data requires additional data source.'))
  aSignals.push(na('A4', 'Insider Transactions', 'A'))
  aSignals.push(na('A5', 'Related Party Transactions', 'A'))

  groups.push({ id: 'A', name: 'Promoter Alignment', role: 'anchor', signals: aSignals })

  // ── Group B: Governance Structure (all not_applicable) ──
  groups.push({
    id: 'B', name: 'Governance Structure', role: 'scored', weight: 0.50, signals: [
      na('B1', 'Auditor Quality', 'B'),
      na('B2', 'Board Independence', 'B'),
      na('B3', 'Regulatory Compliance', 'B'),
      na('B4', 'Compensation Structure', 'B'),
      na('B5', 'Disclosure Quality', 'B'),
      na('B6', 'Whistleblower Framework', 'B'),
    ],
  })

  // ── Group C: Management Capability (all not_applicable) ──
  groups.push({
    id: 'C', name: 'Management Capability', role: 'scored', weight: 0.50, signals: [
      na('C1', 'Capital Allocation Track Record', 'C'),
      na('C2', 'Execution vs Guidance', 'C'),
      na('C3', 'Strategic Clarity', 'C'),
    ],
  })

  return { groups, computed, total }
}

/**
 * BQ — Business Quality
 * Computable: A1 ROCE, A2 OPM, A3 Margin Trend, A5 ROCE vs WACC, D1 Cash Backing, D2 Accrual
 * Not available: A4 Revenue Quality, Groups B & C (concentration, pricing power)
 */
function buildBQ(
  ttm: CMOTSTTMRecord | null,
  finData: CMOTSFinancialRecord[],
  pnl: CMOTSStatementRow[],
  cashFlow: CMOTSStatementRow[],
): FactorBuild {
  const groups: SignalGroup[] = []
  let computed = 0
  const total = 11

  // ── Group A: Margin & Return Durability (anchor) ──
  const aSignals: QualSignal[] = []

  const roce = ttm?.roce_ttm ?? null
  const a1Score = scoreHigher(roce, { excellent: 20, good: 15, fair: 10 })
  aSignals.push(sig('A1', 'ROCE Consistency', 'A', 'score_only', a1Score, stateFromScore(a1Score),
    roce != null ? `ROCE at ${fmt(roce)} — ${roce >= 15 ? 'strong capital efficiency' : roce >= 10 ? 'adequate returns' : 'below cost of capital'}.` : 'ROCE data not available.'))
  if (roce != null) computed++

  const opm = ttm?.operatingprofitmargin ?? null
  const a2Score = scoreHigher(opm, { excellent: 20, good: 12, fair: 5 })
  aSignals.push(sig('A2', 'Operating Margin Stability', 'A', 'score_only', a2Score, stateFromScore(a2Score),
    opm != null ? `Operating margin at ${fmt(opm)}.` : 'OPM data not available.'))
  if (opm != null) computed++

  // A3: Margin expansion trend — compute from FinData revenue growth trend
  const marginTrend = computeMarginTrend(finData)
  const a3Score = marginTrend != null
    ? (marginTrend > 2 ? 82 : marginTrend > 0 ? 65 : marginTrend > -3 ? 50 : 30)
    : 50
  aSignals.push(sig('A3', 'Margin Expansion Trend', 'A', 'score_only', a3Score, stateFromScore(a3Score),
    marginTrend != null ? `Revenue growth trend ${marginTrend > 0 ? 'positive' : 'declining'} at ${fmt(marginTrend)} CAGR.` : 'Insufficient data for trend analysis.'))
  if (marginTrend != null) computed++

  aSignals.push(na('A4', 'Revenue Quality', 'A', 'Revenue quality assessment requires qualitative analysis.'))

  // A5: ROCE vs WACC proxy (12% for India)
  const a5Score = roce != null ? (roce >= 15 ? 85 : roce >= 12 ? 68 : roce >= 8 ? 45 : 25) : 50
  aSignals.push(sig('A5', 'Return vs Cost of Capital', 'A', 'score_only', a5Score, stateFromScore(a5Score),
    roce != null ? `ROCE ${fmt(roce)} vs ~12% WACC proxy — ${roce >= 12 ? 'value-creating' : 'below hurdle rate'}.` : 'ROCE data not available.'))
  if (roce != null) computed++ // shares computation with A1 but counts as separate signal

  groups.push({ id: 'A', name: 'Margin & Return Durability', role: 'anchor', signals: aSignals })

  // ── Group B: Revenue Fragility (not_applicable — qualitative) ──
  // B is red_flag_only in the config, not in nonAnchorWeights
  groups.push({
    id: 'B', name: 'Revenue Fragility', role: 'red_flag_only', signals: [
      na('B1', 'Customer Concentration', 'B', 'Requires segment reporting analysis.'),
      na('B2', 'Geographic Concentration', 'B'),
      na('B3', 'Product Concentration', 'B'),
    ],
  })

  // ── Group CD: Earnings Backing (combined C+D per FACTOR_CONFIG) ──
  const cdSignals: QualSignal[] = []

  // D1: Cash Backing — OCF from cash flow
  const ocf = getLatestValue(cashFlow, CF_ROW_OCF)
  const ebitda = getLatestValue(pnl, PNL_ROW_EBITDA)
  const ocfEbitda = ocf != null && ebitda != null && ebitda !== 0 ? (ocf / ebitda) * 100 : null
  const d1Score = scoreHigher(ocfEbitda, { excellent: 80, good: 50, fair: 30 })
  cdSignals.push(sig('D1', 'Cash Backing', 'CD', 'score_only', d1Score, stateFromScore(d1Score),
    ocfEbitda != null ? `OCF is ${fmt(ocfEbitda)} of EBITDA — ${ocfEbitda >= 50 ? 'strong' : 'weak'} cash conversion.` : 'Cash flow data not available.'))
  if (ocfEbitda != null) computed++

  // D2: Accrual Ratio — (PAT - OCF) / Total Assets
  const pat = getLatestValue(pnl, PNL_ROW_PAT)
  const totalAssets = finData.length > 0 ? finData[finData.length - 1].totalassets : null
  let accrualRatio: number | null = null
  if (pat != null && ocf != null && totalAssets != null && totalAssets !== 0) {
    accrualRatio = ((pat - ocf) / totalAssets) * 100
  }
  const d2Score = accrualRatio != null ? scoreLower(accrualRatio, { excellent: 0, good: 5, fair: 15 }) : 50
  cdSignals.push(sig('D2', 'Accrual Ratio', 'CD', 'score_only', d2Score, stateFromScore(d2Score),
    accrualRatio != null ? `Accrual ratio at ${fmt(accrualRatio)} — ${accrualRatio <= 5 ? 'earnings are cash-backed' : 'high accruals relative to assets'}.` : 'Insufficient data.'))
  if (accrualRatio != null) computed++

  cdSignals.push(na('C1', 'Pricing Power Evidence', 'CD', 'Pricing power requires qualitative analysis.'))

  groups.push({ id: 'CD', name: 'Earnings Backing', role: 'scored', weight: 1.0, signals: cdSignals })

  return { groups, computed, total }
}

/**
 * CD — Capital Discipline
 * Computable: C1 Dividend, C4 TSR proxy, A2 Debt Management, A4 Working Capital
 * Not available: A1 Dilution, A3 Funding Mix, C2 Buyback, C3 Payout, Groups B & D
 */
function buildCD(
  ttm: CMOTSTTMRecord | null,
  finData: CMOTSFinancialRecord[],
): FactorBuild {
  const groups: SignalGroup[] = []
  let computed = 0
  const total = 15

  // ── Group A: Dilution & Funding (non-anchor, weight 0.30) ──
  const aSignals: QualSignal[] = []
  aSignals.push(na('A1', 'Equity Dilution', 'A', 'Share capital change analysis requires deeper balance sheet parsing.'))

  const debtToEquity = ttm?.debttoequity ?? null
  const a2Score = scoreLower(debtToEquity, { excellent: 0.3, good: 1.0, fair: 2.0 })
  aSignals.push(sig('A2', 'Debt Management', 'A', 'score_only', a2Score, stateFromScore(a2Score),
    debtToEquity != null ? `Debt-to-equity at ${fmt(debtToEquity, 'x')} — ${debtToEquity <= 1 ? 'conservative' : 'elevated leverage'}.` : 'D/E data not available.'))
  if (debtToEquity != null) computed++

  aSignals.push(na('A3', 'Funding Mix', 'A'))

  // A4: Working Capital
  const wc = finData.length > 0 ? finData[finData.length - 1].workingcapital : null
  const a4Score = wc != null ? (wc > 0 ? 72 : wc > -500 ? 50 : 30) : 50
  aSignals.push(sig('A4', 'Working Capital', 'A', 'score_only', a4Score, stateFromScore(a4Score),
    wc != null ? `Working capital is ₹${Math.abs(wc).toFixed(0)} Cr ${wc >= 0 ? '(positive)' : '(negative)'}.` : 'Working capital data not available.'))
  if (wc != null) computed++

  groups.push({ id: 'A', name: 'Dilution & Funding', role: 'scored', weight: 0.30, signals: aSignals })

  // ── Group B: Capital Deployment Quality (all not_applicable, weight 0.45) ──
  groups.push({
    id: 'B', name: 'Capital Deployment Quality', role: 'scored', weight: 0.45, signals: [
      na('B1', 'Capex ROI', 'B'),
      na('B2', 'R&D Effectiveness', 'B'),
      na('B3', 'Growth vs Maintenance Capex', 'B'),
      na('B4', 'Investment Timing', 'B'),
      na('B5', 'Subsidiary Health', 'B'),
      na('B6', 'Capital Allocation Consistency', 'B'),
    ],
  })

  // ── Group C: Capital Returns (ANCHOR, weight N/A — it's the anchor) ──
  const cSignals: QualSignal[] = []

  const divYield = ttm?.dividendyield ?? null
  const c1Score = scoreHigher(divYield, { excellent: 3, good: 1.5, fair: 0.5 })
  cSignals.push(sig('C1', 'Dividend Track Record', 'C', 'score_only', c1Score, stateFromScore(c1Score),
    divYield != null ? `Dividend yield at ${fmt(divYield)} — ${divYield >= 1.5 ? 'meaningful shareholder returns' : divYield > 0 ? 'token dividend' : 'no dividends'}.` : 'Dividend data not available.'))
  if (divYield != null) computed++

  cSignals.push(na('C2', 'Buyback Discipline', 'C', 'Buyback history requires additional data source.'))
  cSignals.push(na('C3', 'Payout Sustainability', 'C'))

  // C4: Total Shareholder Return proxy — dividend yield as indicator
  const c4Score = divYield != null ? (divYield >= 2 ? 72 : divYield >= 0.5 ? 55 : 40) : 50
  cSignals.push(sig('C4', 'Total Shareholder Return', 'C', 'score_only', c4Score, stateFromScore(c4Score),
    divYield != null ? `Dividend yield ${fmt(divYield)} contributes to total returns.` : 'TSR data limited.'))
  if (divYield != null) computed++

  groups.push({ id: 'C', name: 'Capital Returns', role: 'anchor', signals: cSignals })

  // ── Group D: Acquisition Track Record (not_applicable, weight 0.25) ──
  groups.push({
    id: 'D', name: 'Acquisition Track Record', role: 'scored', weight: 0.25, signals: [
      na('D1', 'M&A Track Record', 'D'),
    ],
  })

  return { groups, computed, total }
}

/**
 * EQ — Earnings Quality
 * Computable: A1 OCF/PAT, A2 FCF indicator, D3 Tax Rate
 * Not available: A3 CCC, Groups B (balance sheet detail), C (reporting integrity), D1-D2
 */
function buildEQ(
  ttm: CMOTSTTMRecord | null,
  pnl: CMOTSStatementRow[],
  cashFlow: CMOTSStatementRow[],
  finData: CMOTSFinancialRecord[],
): FactorBuild {
  const groups: SignalGroup[] = []
  let computed = 0
  const total = 14

  // ── Group A: Cash Conversion (anchor) ──
  const aSignals: QualSignal[] = []

  const ocf = getLatestValue(cashFlow, CF_ROW_OCF)
  const pat = getLatestValue(pnl, PNL_ROW_PAT)
  let ocfPat: number | null = null
  if (ocf != null && pat != null && pat !== 0) {
    ocfPat = (ocf / pat) * 100
  }
  const a1Score = ocfPat != null ? scoreHigher(ocfPat, { excellent: 100, good: 70, fair: 40 }) : 50
  aSignals.push(sig('A1', 'OCF to PAT', 'A', 'score_only', a1Score, stateFromScore(a1Score),
    ocfPat != null ? `OCF/PAT at ${fmt(ocfPat)} — ${ocfPat >= 70 ? 'earnings are well cash-backed' : 'cash conversion needs monitoring'}.` : 'Cash flow data not available.'))
  if (ocfPat != null) computed++

  // A2: FCF indicator
  const fcfPerShare = finData.length > 0 ? finData[finData.length - 1].freecashflowpershare : null
  const a2Score = fcfPerShare != null ? (fcfPerShare > 10 ? 85 : fcfPerShare > 0 ? 65 : 30) : 50
  aSignals.push(sig('A2', 'Free Cash Flow', 'A', 'score_only', a2Score, stateFromScore(a2Score),
    fcfPerShare != null ? `FCF per share is ₹${fcfPerShare.toFixed(1)} — ${fcfPerShare > 0 ? 'positive' : 'negative'} free cash flow.` : 'FCF data not available.'))
  if (fcfPerShare != null) computed++

  aSignals.push(na('A3', 'Cash Conversion Cycle', 'A', 'CCC requires detailed receivables/payables data.'))

  groups.push({ id: 'A', name: 'Cash Conversion', role: 'anchor', signals: aSignals })

  // ── Group B: Balance Sheet Quality (not_applicable, weight 0.60) ──
  groups.push({
    id: 'B', name: 'Balance Sheet Quality', role: 'scored', weight: 0.60, signals: [
      na('B1', 'Receivables Quality', 'B', 'Requires detailed balance sheet row parsing.'),
      na('B2', 'Inventory Quality', 'B'),
      na('B3', 'Contingent Liabilities', 'B'),
      na('B4', 'Goodwill & Intangibles', 'B'),
      na('B5', 'Off-Balance Sheet Items', 'B'),
    ],
  })

  // ── Group C: Reporting Integrity (red_flag_only, not in weights) ──
  groups.push({
    id: 'C', name: 'Reporting Integrity', role: 'red_flag_only', signals: [
      na('C1', 'Restatement History', 'C'),
      na('C2', 'Accounting Policy Changes', 'C'),
      na('C3', 'Auditor Opinion', 'C'),
    ],
  })

  // ── Group D: Pattern Anomalies (weight 0.40) ──
  const dSignals: QualSignal[] = []
  dSignals.push(na('D1', 'Revenue Recognition Patterns', 'D'))
  dSignals.push(na('D2', 'Expense Timing', 'D'))

  // D3: Effective Tax Rate
  const npm = ttm?.netprofitmargin ?? null
  const opm = ttm?.operatingprofitmargin ?? null
  let impliedTaxRate: number | null = null
  if (npm != null && opm != null && opm > 0) {
    // Rough proxy: tax burden = 1 - (NPM / OPM adjusted)
    // Normal Indian corp tax is ~25%. Flag if very low or very high.
    impliedTaxRate = (1 - (npm / (opm * 0.85))) * 100 // rough estimate
  }
  const d3Score = impliedTaxRate != null
    ? (impliedTaxRate >= 20 && impliedTaxRate <= 30 ? 78 : impliedTaxRate >= 15 ? 60 : 40)
    : 50
  dSignals.push(sig('D3', 'Tax Rate Anomalies', 'D', 'score_only', d3Score, stateFromScore(d3Score),
    impliedTaxRate != null ? `Implied effective tax rate ~${fmt(impliedTaxRate)} — ${impliedTaxRate >= 20 && impliedTaxRate <= 30 ? 'within normal range' : 'warrants investigation'}.` : 'Tax rate data not available.'))
  if (impliedTaxRate != null) computed++

  groups.push({ id: 'D', name: 'Pattern Anomalies', role: 'scored', weight: 0.40, signals: dSignals })

  return { groups, computed, total }
}

/**
 * ExQ — Execution Quality
 * Computable: A4 Quarterly Consistency (from quarterly results CoV)
 * Not available: A1-A3 (guidance vs delivery), Group B (ops KPIs)
 *
 * Note: Only 1 anchor signal available, needs 2 minimum → will be suppressed by engine.
 * We override to show 'limited data' instead of 'red flag'.
 */
function buildExQ(quarterly: CMOTSStatementRow[]): FactorBuild {
  const groups: SignalGroup[] = []
  let computed = 0
  const total = 6

  // ── Group A: Financial Delivery (anchor) ──
  const aSignals: QualSignal[] = []
  aSignals.push(na('A1', 'Revenue Growth vs Guidance', 'A', 'Guidance data not available via API.'))
  aSignals.push(na('A2', 'Margin Delivery', 'A'))
  aSignals.push(na('A3', 'Earnings Surprise Pattern', 'A'))

  // A4: Quarterly Consistency — CoV of quarterly revenue
  const qrCoV = computeQuarterlyCoV(quarterly)
  if (qrCoV != null) {
    // Lower CoV = more consistent = better
    const a4Score = qrCoV < 10 ? 85 : qrCoV < 20 ? 70 : qrCoV < 35 ? 50 : 30
    aSignals.push(sig('A4', 'Quarterly Consistency', 'A', 'score_only', a4Score, stateFromScore(a4Score),
      `Revenue CoV at ${fmt(qrCoV)} — ${qrCoV < 15 ? 'highly consistent' : qrCoV < 25 ? 'moderate variability' : 'volatile'} quarter-to-quarter.`))
    computed++
  } else {
    aSignals.push(na('A4', 'Quarterly Consistency', 'A', 'Insufficient quarterly data.'))
  }

  groups.push({ id: 'A', name: 'Financial Delivery', role: 'anchor', signals: aSignals })

  // ── Group B: Operational Delivery (not_applicable) ──
  groups.push({
    id: 'B', name: 'Operational Delivery', role: 'scored', weight: 1.0, signals: [
      na('B1', 'Operational KPI Achievement', 'B'),
      na('B2', 'Market Share Trajectory', 'B'),
    ],
  })

  return { groups, computed, total }
}

// ─── Calculation Helpers ────────────────────────

function computeMarginTrend(finData: CMOTSFinancialRecord[]): number | null {
  if (finData.length < 2) return null
  const oldest = finData[0].revenue
  const latest = finData[finData.length - 1].revenue
  if (oldest === 0 || (oldest < 0) !== (latest < 0)) return null
  const years = finData.length - 1
  if (years <= 0) return null
  const ratio = latest / oldest
  if (ratio < 0) return null
  return (Math.pow(ratio, 1 / years) - 1) * 100
}

function computeQuarterlyCoV(quarterly: CMOTSStatementRow[]): number | null {
  const revRow = findStatementRow(quarterly, QR_ROW_REVENUE)
  if (!revRow) return null

  const cols = getYearColumns(revRow)
  if (cols.length < 4) return null // Need at least 4 quarters

  const values: number[] = []
  for (const col of cols.slice(0, 8)) { // Last 8 quarters max
    const val = getStatementValue(revRow, col)
    if (val != null && val > 0) values.push(val)
  }
  if (values.length < 4) return null

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return null
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  return (Math.sqrt(variance) / mean) * 100
}

// ─── Factor Assembly ────────────────────────────

function assembleQualFactor(
  factorId: string,
  factorName: string,
  weight: number,
  build: FactorBuild,
): SegmentVerdictV2 {
  const config = FACTOR_CONFIGS[factorId]

  // If no config or zero computed signals, return placeholder
  if (!config || build.computed === 0) {
    return {
      id: factorId,
      name: factorName,
      pillar: 'qual',
      scoringType: 'scored',
      score: 50,
      scoreBand: 'mixed',
      label: 'LIMITED DATA',
      weight,
      status: 'neutral',
      interpretation: `${factorName}: Insufficient data from current API sources. ${build.computed} of ${build.total} signals available.`,
      confidenceIndicator: {
        signalsComputed: build.computed,
        signalsTotal: build.total,
        state: 'cmots_gap',
        tooltip: `${build.computed} of ${build.total} signals computed — remaining require annual report and editorial data`,
      },
      signalGroups: build.groups,
    }
  }

  // Run through the scoring engine
  const result = scoreQualFactor(build.groups, config)

  // Override suppressed state to cmots_gap when it's a data gap, not a red flag
  const isTrueRedFlag = result.hardFlags.length > 0
  const isSuppressedFromDataGap = result.isSuppressed && !isTrueRedFlag

  const score = isSuppressedFromDataGap ? 50 : result.score
  const scoreBand = isSuppressedFromDataGap ? 'mixed' as const : result.scoreBand
  const label = isSuppressedFromDataGap ? 'LIMITED DATA' : result.label

  // Override confidence state to cmots_gap when significant data gaps exist
  const confidenceState = build.computed < build.total * 0.5 ? 'cmots_gap' as const : result.confidence.state

  return {
    id: factorId,
    name: factorName,
    pillar: 'qual',
    scoringType: 'scored',
    score,
    scoreBand,
    label,
    weight,
    status: score >= 60 ? 'positive' : score >= 40 ? 'neutral' : 'negative',
    interpretation: isSuppressedFromDataGap
      ? `${factorName}: Limited data — ${build.computed} of ${build.total} signals computed from API. Score based on available signals only.`
      : `${factorName} scores ${score}/100 based on ${build.computed} computed signals.`,
    confidenceIndicator: {
      signalsComputed: build.computed,
      signalsTotal: build.total,
      state: confidenceState,
      tooltip: `${build.computed} of ${build.total} signals computed — remaining require annual report and editorial data`,
    },
    signalGroups: build.groups,
    redFlags: [...result.hardFlags, ...result.softFlags],
  }
}

// ─── Public API ─────────────────────────────────

/**
 * Compute qual factors for any stock.
 * Demo stocks use full mock data; others compute from CMOTS.
 */
export async function computeQualFactors(symbol: string): Promise<SegmentVerdictV2[]> {
  // Demo stocks: use existing rich mock data
  const demoKey = symbol.toLowerCase()
  const fallback = getQualFactorsFallback(demoKey)
  if (fallback) return fallback

  // Fetch fundamentals (will hit localStorage cache if already fetched for quant)
  const bundle = await getAllFundamentals(symbol)
  const { ttm, finData, pnl, cashFlow, quarterly, shareholding } = bundle

  return [
    assembleQualFactor('management_governance', 'Management & Governance', 20, buildMG(shareholding)),
    assembleQualFactor('business_quality', 'Business Quality', 25, buildBQ(ttm, finData, pnl, cashFlow)),
    assembleQualFactor('capital_discipline', 'Capital Discipline', 20, buildCD(ttm, finData)),
    assembleQualFactor('earnings_quality', 'Earnings Quality', 20, buildEQ(ttm, pnl, cashFlow, finData)),
    assembleQualFactor('execution_quality', 'Execution Quality', 15, buildExQ(quarterly)),
  ]
}
