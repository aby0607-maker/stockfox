/**
 * Qual Scoring Service — Computes Qual signals from 6 data sources
 *
 * Data source mapping:
 *   CMOTS:      ~25 signals — shareholding, TTM ratios, cash flow, quarterly,
 *               balance sheet (receivables, inventory, payables, intangibles,
 *               contingent liabilities, borrowings, CWIP, subsidiaries, reserves)
 *   Screener:   ~13 signals — pledge, dilution, capex, depreciation, buyback,
 *               pre-computed ratios (DSO, DIO, DPO, CCC, OPM — highest fidelity)
 *   BSE:        ~4 signals — insider transactions (SAST), related party txns,
 *               corporate actions (dilution/buyback)
 *   Trendlyne:  ~1 signal — board independence (directors composition)
 *   Finnhub:    ~2 signals — analyst consensus, earnings surprise (free tier)
 *   Computed:   ~2 signals — margin delivery (OPM trend), expense timing (Q4 spike)
 *   Remaining ~18 signals require editorial/NLP — marked not_applicable
 *
 * Demo stocks use full mock data from verdictsV2.ts.
 */

import type {
  CMOTSTTMRecord,
  CMOTSFinancialRecord,
  CMOTSStatementRow,
  CMOTSShareholding,
  ScreenerQualData,
  SegmentVerdictV2,
  SignalGroup,
  QualSignal,
} from '@/types'
import { getAllFundamentals, findStatementRow, getStatementValue, getYearColumns } from '@/services/cmots/fundamentals'
import { getScreenerQualData } from '@/services/screener'
import { getAnalystConsensus } from '@/services/finnhub'
import type { FinnhubConsensus } from '@/services/finnhub'
import { getInsiderTransactions, getRelatedPartyTransactions, getCorporateActions } from '@/services/bse'
import type { BSEInsiderSummary, BSERelatedPartySummary, BSECorporateActionSummary } from '@/services/bse'
import { getGovernanceData } from '@/services/trendlyne'
import type { TrendlyneGovernanceData } from '@/services/trendlyne'
import { scoreQualFactor, FACTOR_CONFIGS } from '@/lib/qualScoringEngine'
import { getQualFactorsFallback } from '@/data/verdictsV2'

// ─── P&L / Cash Flow / Balance Sheet Row Numbers (same as metricResolver) ────

const PNL_ROW_REVENUE = 1
const PNL_ROW_EBITDA = 46
const PNL_ROW_PAT = 35
const CF_ROW_OCF = 68
const QR_ROW_REVENUE = 1

// Balance Sheet rows (from CMOTS BalanceSheet endpoint)
const BS_ROW_INTANGIBLE_ASSETS = 5
const BS_ROW_CWIP = 7
const BS_ROW_INVESTMENTS_IN_SUBS = 10
const BS_ROW_INVENTORIES = 25
const BS_ROW_TRADE_RECEIVABLES = 31
const BS_ROW_TOTAL_ASSETS = 42
const BS_ROW_SHORT_TERM_BORROWINGS = 44
const BS_ROW_LEASE_LIABILITIES_CURRENT = 45
const BS_ROW_TRADE_PAYABLES = 46
const BS_ROW_LONG_TERM_BORROWINGS = 58
const BS_ROW_LEASE_LIABILITIES_NON_CURRENT = 62
const BS_ROW_RESERVES_AND_SURPLUS = 78
const BS_ROW_CONTINGENT_LIABILITIES = 83

// Quarterly P&L rows
const QR_ROW_PAT = 28

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

/**
 * Extract the latest two values from a CMOTS statement row (for trend computation).
 * Returns [latest, previous] or null if insufficient data.
 */
function getLatestTwoValues(rows: CMOTSStatementRow[], rowno: number): [number, number] | null {
  const row = findStatementRow(rows, rowno)
  if (!row) return null
  const cols = getYearColumns(row)
  if (cols.length < 2) return null
  const latest = getStatementValue(row, cols[0])
  const previous = getStatementValue(row, cols[1])
  if (latest == null || previous == null) return null
  return [latest, previous]
}

// ─── Factor Builders ────────────────────────────

interface FactorBuild {
  groups: SignalGroup[]
  computed: number
  total: number
}

/**
 * MG — Management & Governance
 * CMOTS:    A1 Promoter Holding, A2 Holding Trend (shareholding)
 * Screener: A3 Pledge Status (warehouse_set.pledged_percentage)
 * N/A:      A4-A5, Groups B & C (governance, capability — needs editorial)
 */
function buildMG(shareholding: CMOTSShareholding[], screener: ScreenerQualData | null, insiderTxns: BSEInsiderSummary | null = null, relatedParty: BSERelatedPartySummary | null = null, governance: TrendlyneGovernanceData | null = null): FactorBuild {
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

  // A3: Pledge Status — from Screener
  if (screener?.pledgePercent != null) {
    const pledge = screener.pledgePercent
    // High pledge = red flag (promoter may lose shares on margin call)
    const a3Score = pledge === 0 ? 90 : pledge < 10 ? 68 : pledge < 20 ? 45 : 20
    const a3State = pledge >= 20 ? 'flag' as const : stateFromScore(a3Score)
    aSignals.push(sig('A3', 'Pledge Status', 'A', 'hard', a3Score, a3State,
      pledge === 0
        ? 'No promoter shares pledged — clean shareholding.'
        : `${fmt(pledge)} of promoter shares pledged.${pledge >= 20 ? ' HIGH PLEDGE — significant forced-sale risk.' : ''}`,
      { isTriggered: pledge >= 20 }))
    computed++
  } else {
    aSignals.push(na('A3', 'Pledge Status', 'A', 'Pledge data requires Screener.in integration.'))
  }

  // A4: Insider Transactions — from BSE SAST filings
  if (insiderTxns) {
    const { totalFilings, hasRecentActivity, sentiment } = insiderTxns
    const a4Score = sentiment === 'buying' ? 85
      : sentiment === 'mixed' ? 65
      : sentiment === 'selling' ? 35
      : hasRecentActivity ? 60 : 55
    aSignals.push(sig('A4', 'Insider Transactions', 'A', 'score_only', a4Score, stateFromScore(a4Score),
      totalFilings > 0
        ? `${totalFilings} SAST filings (3Y). Recent insider sentiment: ${sentiment}.${sentiment === 'buying' ? ' Promoters are accumulating.' : sentiment === 'selling' ? ' Insider selling detected.' : ''}`
        : 'No insider trading filings found.'))
    computed++
  } else {
    aSignals.push(na('A4', 'Insider Transactions', 'A', 'BSE insider trading data not available.'))
  }

  // A5: Related Party Transactions — from BSE RPT disclosures
  if (relatedParty) {
    const { totalFilings, hasRecentDisclosures } = relatedParty
    // More frequent RPT disclosures = higher scrutiny needed
    const a5Score = totalFilings === 0 ? 80
      : totalFilings <= 3 ? 70
      : totalFilings <= 8 ? 55
      : 35
    aSignals.push(sig('A5', 'Related Party Transactions', 'A', 'score_only', a5Score,
      totalFilings > 8 ? 'flag' as const : stateFromScore(a5Score),
      totalFilings === 0
        ? 'No related party transaction disclosures — clean governance.'
        : `${totalFilings} RPT disclosures (2Y).${totalFilings > 8 ? ' HIGH frequency — warrants scrutiny.' : hasRecentDisclosures ? ' Recent disclosures on file.' : ''}`,
      { isTriggered: totalFilings > 8 }))
    computed++
  } else {
    aSignals.push(na('A5', 'Related Party Transactions', 'A', 'BSE RPT data not available.'))
  }

  groups.push({ id: 'A', name: 'Promoter Alignment', role: 'anchor', signals: aSignals })

  // ── Group B: Governance Structure ──
  {
    const bSignals: QualSignal[] = []

    bSignals.push(na('B1', 'Auditor Quality', 'B'))

    // B2: Board Independence — from Trendlyne directors data
    if (governance && governance.totalDirectors > 0) {
      const { independentPct, independentDirectors, totalDirectors, hasWomanDirector } = governance
      // SEBI mandates ≥33% independent directors for listed companies
      const b2Score = independentPct >= 50 ? 85 : independentPct >= 33 ? 68 : independentPct >= 20 ? 45 : 25
      bSignals.push(sig('B2', 'Board Independence', 'B', 'score_only', b2Score, stateFromScore(b2Score),
        `${independentDirectors} of ${totalDirectors} directors are independent (${fmt(independentPct)}).${hasWomanDirector ? '' : ' No woman director identified — SEBI compliance risk.'}`))
      computed++
    } else {
      bSignals.push(na('B2', 'Board Independence', 'B'))
    }

    bSignals.push(na('B3', 'Regulatory Compliance', 'B'))
    bSignals.push(na('B4', 'Compensation Structure', 'B'))
    bSignals.push(na('B5', 'Disclosure Quality', 'B'))
    bSignals.push(na('B6', 'Whistleblower Framework', 'B'))

    groups.push({ id: 'B', name: 'Governance Structure', role: 'scored', weight: 0.50, signals: bSignals })
  }

  // ── Group C: Management Capability (all not_applicable — needs editorial/NLP) ──
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
 * CMOTS:    A2 Debt Management, A4 Working Capital, C1 Dividend, C4 TSR proxy
 * Screener: A1 Equity Dilution (share capital), B1 Capex ROI, B3 Growth vs Maintenance Capex,
 *           C2 Buyback Discipline (share capital decrease), C3 Payout Sustainability
 * CMOTS BS: A3 Funding Mix (rows 44/58), B4 Investment Timing (row 7),
 *           B5 Subsidiary Health (row 10+5), B6 Capital Allocation (row 78),
 *           D1 M&A Track Record (row 5+83)
 * N/A:      B2 R&D Effectiveness (needs editorial)
 */
function buildCD(
  ttm: CMOTSTTMRecord | null,
  finData: CMOTSFinancialRecord[],
  screener: ScreenerQualData | null,
  balanceSheet: CMOTSStatementRow[] = [],
  corpActions: BSECorporateActionSummary | null = null,
): FactorBuild {
  const groups: SignalGroup[] = []
  let computed = 0
  const total = 15

  // ── Group A: Dilution & Funding (non-anchor, weight 0.30) ──
  const aSignals: QualSignal[] = []

  // A1: Equity Dilution — Screener share capital history + BSE corporate actions
  if (screener && screener.shareCapitalHistory.length >= 2) {
    const sc = screener.shareCapitalHistory
    const oldest = sc[0].value
    const latest = sc[sc.length - 1].value
    const dilution = oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0
    const bseNote = corpActions?.hasDilutiveActions ? ' Recent rights/bonus issue on BSE records.' : ''
    const a1Score = dilution <= 0 ? 85 : dilution < 5 ? 70 : dilution < 15 ? 50 : 25
    aSignals.push(sig('A1', 'Equity Dilution', 'A', 'score_only', a1Score, stateFromScore(a1Score),
      dilution <= 0
        ? `No equity dilution — share capital stable or reduced (buyback).${bseNote}`
        : `Share capital increased ${fmt(dilution)} over ${sc.length - 1} years.${dilution >= 15 ? ' Significant dilution risk.' : ''}${bseNote}`))
    computed++
  } else if (corpActions) {
    // Fallback: BSE corporate actions when Screener unavailable
    const { hasDilutiveActions, rightsCount, bonusCount } = corpActions
    const a1Score = !hasDilutiveActions ? 75 : rightsCount > 0 ? 40 : 60
    aSignals.push(sig('A1', 'Equity Dilution', 'A', 'score_only', a1Score, stateFromScore(a1Score),
      hasDilutiveActions
        ? `BSE records show ${rightsCount} rights + ${bonusCount} bonus issues in 5 years.${rightsCount > 0 ? ' Rights issues dilute existing shareholders.' : ''}`
        : 'No dilutive corporate actions (rights/bonus) in last 5 years.'))
    computed++
  } else {
    aSignals.push(na('A1', 'Equity Dilution', 'A', 'Share capital data not available.'))
  }

  const debtToEquity = ttm?.debttoequity ?? null
  const a2Score = scoreLower(debtToEquity, { excellent: 0.3, good: 1.0, fair: 2.0 })
  aSignals.push(sig('A2', 'Debt Management', 'A', 'score_only', a2Score, stateFromScore(a2Score),
    debtToEquity != null ? `Debt-to-equity at ${fmt(debtToEquity, 'x')} — ${debtToEquity <= 1 ? 'conservative' : 'elevated leverage'}.` : 'D/E data not available.'))
  if (debtToEquity != null) computed++

  // A3: Funding Mix — long-term vs short-term borrowings from CMOTS BS
  {
    const ltBorrow = getLatestValue(balanceSheet, BS_ROW_LONG_TERM_BORROWINGS)
    const stBorrow = getLatestValue(balanceSheet, BS_ROW_SHORT_TERM_BORROWINGS)
    if (ltBorrow != null && stBorrow != null && (ltBorrow + stBorrow) > 0) {
      const totalDebt = ltBorrow + stBorrow
      const ltPct = (ltBorrow / totalDebt) * 100
      // Higher long-term % = more stable funding, less refinancing risk
      const a3Score = ltPct >= 80 ? 85 : ltPct >= 60 ? 72 : ltPct >= 40 ? 55 : 30
      aSignals.push(sig('A3', 'Funding Mix', 'A', 'score_only', a3Score, stateFromScore(a3Score),
        `Long-term debt is ${fmt(ltPct)} of total borrowings (₹${totalDebt.toFixed(0)} Cr) — ${ltPct >= 70 ? 'stable maturity profile' : ltPct >= 50 ? 'balanced' : 'heavy short-term reliance, refinancing risk'}.`))
      computed++
    } else if (ltBorrow != null && stBorrow != null) {
      // Zero borrowings = debt-free
      aSignals.push(sig('A3', 'Funding Mix', 'A', 'score_only', 90, 'strong',
        'No borrowings on books — debt-free company.'))
      computed++
    } else {
      aSignals.push(na('A3', 'Funding Mix', 'A', 'Borrowings breakdown not available.'))
    }
  }

  // A4: Working Capital
  const wc = finData.length > 0 ? finData[finData.length - 1].workingcapital : null
  const a4Score = wc != null ? (wc > 0 ? 72 : wc > -500 ? 50 : 30) : 50
  aSignals.push(sig('A4', 'Working Capital', 'A', 'score_only', a4Score, stateFromScore(a4Score),
    wc != null ? `Working capital is ₹${Math.abs(wc).toFixed(0)} Cr ${wc >= 0 ? '(positive)' : '(negative)'}.` : 'Working capital data not available.'))
  if (wc != null) computed++

  groups.push({ id: 'A', name: 'Dilution & Funding', role: 'scored', weight: 0.30, signals: aSignals })

  // ── Group B: Capital Deployment Quality (weight 0.45) ──
  const bSignals: QualSignal[] = []

  // B1: Capex ROI — capex vs revenue growth from Screener
  if (screener && screener.capex.length >= 2 && screener.revenue.length >= 2) {
    const capexGrowth = computeGrowth(screener.capex)
    const revGrowth = computeGrowth(screener.revenue)
    if (capexGrowth != null && revGrowth != null) {
      const roi = revGrowth - capexGrowth // Revenue growing faster than capex = good ROI
      const b1Score = roi > 5 ? 82 : roi > 0 ? 68 : roi > -10 ? 50 : 30
      bSignals.push(sig('B1', 'Capex ROI', 'B', 'score_only', b1Score, stateFromScore(b1Score),
        `Revenue growth (${fmt(revGrowth)}) ${roi > 0 ? 'outpacing' : 'trailing'} capex growth (${fmt(capexGrowth)}).`))
      computed++
    } else {
      bSignals.push(na('B1', 'Capex ROI', 'B'))
    }
  } else {
    bSignals.push(na('B1', 'Capex ROI', 'B'))
  }

  bSignals.push(na('B2', 'R&D Effectiveness', 'B'))

  // B3: Growth vs Maintenance Capex — depreciation/capex ratio from Screener
  if (screener && screener.capex.length > 0 && screener.depreciation.length > 0) {
    const latestCapex = screener.capex[screener.capex.length - 1].value
    const latestDepr = screener.depreciation[screener.depreciation.length - 1].value
    if (latestCapex > 0) {
      const maintenanceRatio = (latestDepr / latestCapex) * 100
      // Low ratio = mostly growth capex. High ratio = mostly maintenance.
      const b3Score = maintenanceRatio < 50 ? 80 : maintenanceRatio < 80 ? 65 : maintenanceRatio < 100 ? 50 : 35
      bSignals.push(sig('B3', 'Growth vs Maintenance Capex', 'B', 'score_only', b3Score, stateFromScore(b3Score),
        `Depreciation is ${fmt(maintenanceRatio)} of capex — ${maintenanceRatio < 60 ? 'significant growth capex' : maintenanceRatio < 90 ? 'balanced' : 'mostly maintenance capex'}.`))
      computed++
    } else {
      bSignals.push(na('B3', 'Growth vs Maintenance Capex', 'B'))
    }
  } else {
    bSignals.push(na('B3', 'Growth vs Maintenance Capex', 'B'))
  }

  // B4: Investment Timing — CWIP trend vs revenue growth (CMOTS BS row 7)
  {
    const cwipPair = getLatestTwoValues(balanceSheet, BS_ROW_CWIP)
    const totalAssetsPair = getLatestTwoValues(balanceSheet, BS_ROW_TOTAL_ASSETS)
    if (cwipPair && totalAssetsPair && totalAssetsPair[0] > 0) {
      const cwipRatio = (cwipPair[0] / totalAssetsPair[0]) * 100
      const prevCwipRatio = totalAssetsPair[1] > 0 ? (cwipPair[1] / totalAssetsPair[1]) * 100 : null
      // Moderate CWIP = active investment. Very high = stalled projects.
      const b4Score = cwipRatio < 5 ? 68 : cwipRatio < 15 ? 80 : cwipRatio < 25 ? 60 : 35
      const trendText = prevCwipRatio != null
        ? ` CWIP ${cwipRatio > prevCwipRatio ? 'increasing' : 'declining'} (${fmt(prevCwipRatio)} → ${fmt(cwipRatio)}).`
        : ''
      bSignals.push(sig('B4', 'Investment Timing', 'B', 'score_only', b4Score, stateFromScore(b4Score),
        `CWIP is ${fmt(cwipRatio)} of total assets.${trendText}${cwipRatio >= 25 ? ' High CWIP — potential project execution delays.' : ''}`))
      computed++
    } else {
      bSignals.push(na('B4', 'Investment Timing', 'B', 'Capital work in progress data not available.'))
    }
  }

  // B5: Subsidiary Health — investments in subs trend + intangible stability (CMOTS BS rows 10, 5)
  {
    const subsPair = getLatestTwoValues(balanceSheet, BS_ROW_INVESTMENTS_IN_SUBS)
    const intPair = getLatestTwoValues(balanceSheet, BS_ROW_INTANGIBLE_ASSETS)
    if (subsPair || intPair) {
      let b5Score = 65 // default: neutral
      const parts: string[] = []

      if (subsPair && subsPair[1] > 0) {
        const subsGrowth = ((subsPair[0] - subsPair[1]) / subsPair[1]) * 100
        // Growing investment = expanding footprint. Shrinking = divestitures or write-downs.
        b5Score = subsGrowth > 5 ? 75 : subsGrowth > -5 ? 68 : subsGrowth > -20 ? 50 : 30
        parts.push(`Subsidiary investments ${subsGrowth > 0 ? 'grew' : 'declined'} ${fmt(Math.abs(subsGrowth))} YoY (₹${subsPair[0].toFixed(0)} Cr)`)
      }

      if (intPair && intPair[1] > 0) {
        const intGrowth = ((intPair[0] - intPair[1]) / intPair[1]) * 100
        // Rapidly growing intangibles without revenue support = impairment risk
        if (intGrowth > 30) b5Score = Math.min(b5Score, 45)
        parts.push(`intangibles ${intGrowth > 0 ? 'up' : 'down'} ${fmt(Math.abs(intGrowth))} YoY`)
      }

      bSignals.push(sig('B5', 'Subsidiary Health', 'B', 'score_only', b5Score, stateFromScore(b5Score),
        parts.join('; ') + '.'))
      computed++
    } else {
      bSignals.push(na('B5', 'Subsidiary Health', 'B', 'Subsidiary investment data not available.'))
    }
  }

  // B6: Capital Allocation Consistency — reserves trend + dividend pattern (CMOTS BS row 78 + FinData)
  {
    const resPair = getLatestTwoValues(balanceSheet, BS_ROW_RESERVES_AND_SURPLUS)
    if (resPair && resPair[1] > 0 && finData.length >= 3) {
      const resGrowth = ((resPair[0] - resPair[1]) / resPair[1]) * 100
      // Check if company is both retaining earnings AND returning capital
      const hasDiv = (ttm?.dividendyield ?? 0) > 0
      const isRetaining = resGrowth > 3

      const b6Score = isRetaining && hasDiv ? 82  // Best: retaining + returning
        : isRetaining ? 68                        // Good: retaining but no dividends
        : hasDiv ? 55                              // OK: distributing but not growing reserves
        : 35                                       // Poor: neither retaining nor returning
      bSignals.push(sig('B6', 'Capital Allocation Consistency', 'B', 'score_only', b6Score, stateFromScore(b6Score),
        `Reserves ${resGrowth > 0 ? 'grew' : 'declined'} ${fmt(Math.abs(resGrowth))} YoY to ₹${resPair[0].toFixed(0)} Cr. ${hasDiv ? 'Dividends paid.' : 'No dividends.'} ${isRetaining && hasDiv ? 'Balanced allocation.' : ''}`))
      computed++
    } else {
      bSignals.push(na('B6', 'Capital Allocation Consistency', 'B', 'Reserves data not available.'))
    }
  }

  groups.push({ id: 'B', name: 'Capital Deployment Quality', role: 'scored', weight: 0.45, signals: bSignals })

  // ── Group C: Capital Returns (ANCHOR) ──
  const cSignals: QualSignal[] = []

  const divYield = ttm?.dividendyield ?? null
  const c1Score = scoreHigher(divYield, { excellent: 3, good: 1.5, fair: 0.5 })
  cSignals.push(sig('C1', 'Dividend Track Record', 'C', 'score_only', c1Score, stateFromScore(c1Score),
    divYield != null ? `Dividend yield at ${fmt(divYield)} — ${divYield >= 1.5 ? 'meaningful shareholder returns' : divYield > 0 ? 'token dividend' : 'no dividends'}.` : 'Dividend data not available.'))
  if (divYield != null) computed++

  // C2: Buyback Discipline — Screener share capital + BSE buyback announcements
  {
    const screenerBuyback = screener && screener.shareCapitalHistory.length >= 2
      ? screener.shareCapitalHistory[screener.shareCapitalHistory.length - 1].value < screener.shareCapitalHistory[0].value
      : null
    const bseBuyback = corpActions?.hasBuybacks ?? null

    if (screenerBuyback != null || bseBuyback != null) {
      const hasBuyback = screenerBuyback === true || bseBuyback === true
      const bseCount = corpActions?.buybackCount ?? 0
      const c2Score = hasBuyback ? (bseCount >= 2 ? 85 : 78) : 50
      const detail = bseCount > 0 ? `${bseCount} buyback(s) in BSE corporate actions.` : ''
      cSignals.push(sig('C2', 'Buyback Discipline', 'C', 'score_only', c2Score, stateFromScore(c2Score),
        hasBuyback
          ? `Buyback activity detected — management returning capital to shareholders. ${detail}`.trim()
          : 'No buyback activity detected.'))
      computed++
    } else {
      cSignals.push(na('C2', 'Buyback Discipline', 'C'))
    }
  }

  // C3: Payout Sustainability — Dividend Payout % from Screener P&L
  if (screener && screener.dividendPayout.length > 0) {
    const latestPayoutPct = screener.dividendPayout[screener.dividendPayout.length - 1].value
    // Screener reports "Dividend Payout %" as percentage of net profit
    const c3Score = latestPayoutPct > 0 && latestPayoutPct <= 50 ? 78
      : latestPayoutPct > 50 && latestPayoutPct <= 80 ? 60
      : latestPayoutPct > 80 ? 35
      : 50
    cSignals.push(sig('C3', 'Payout Sustainability', 'C', 'score_only', c3Score, stateFromScore(c3Score),
      latestPayoutPct > 0
        ? `Dividend payout is ${fmt(latestPayoutPct)} of net profit — ${latestPayoutPct <= 50 ? 'conservative and sustainable' : latestPayoutPct <= 80 ? 'moderate' : 'high payout ratio, limited retention'}.`
        : 'No dividend payouts.'))
    computed++
  } else {
    cSignals.push(na('C3', 'Payout Sustainability', 'C'))
  }

  // C4: Total Shareholder Return proxy
  const c4Score = divYield != null ? (divYield >= 2 ? 72 : divYield >= 0.5 ? 55 : 40) : 50
  cSignals.push(sig('C4', 'Total Shareholder Return', 'C', 'score_only', c4Score, stateFromScore(c4Score),
    divYield != null ? `Dividend yield ${fmt(divYield)} contributes to total returns.` : 'TSR data limited.'))
  if (divYield != null) computed++

  groups.push({ id: 'C', name: 'Capital Returns', role: 'anchor', signals: cSignals })

  // ── Group D: Acquisition Track Record (CMOTS BS rows 5 + 83) ──
  {
    const dSignals: QualSignal[] = []
    const intPair = getLatestTwoValues(balanceSheet, BS_ROW_INTANGIBLE_ASSETS)
    const clPair = getLatestTwoValues(balanceSheet, BS_ROW_CONTINGENT_LIABILITIES)

    if (intPair || clPair) {
      let d1Score = 65
      const parts: string[] = []

      // Goodwill/intangibles declining = potential impairment (past M&A not performing)
      if (intPair && intPair[1] > 0) {
        const intChange = ((intPair[0] - intPair[1]) / intPair[1]) * 100
        if (intChange < -15) {
          d1Score = 40 // Significant write-down — past M&A value destruction
          parts.push(`Intangibles declined ${fmt(Math.abs(intChange))} YoY — potential impairment`)
        } else if (intChange > 30) {
          d1Score = 55 // Large increase — recent acquisitions, need to monitor integration
          parts.push(`Intangibles grew ${fmt(intChange)} YoY — recent acquisition activity`)
        } else {
          d1Score = 72
          parts.push(`Intangibles stable (${intChange > 0 ? '+' : ''}${fmt(intChange)} YoY)`)
        }
      }

      // Rising contingent liabilities alongside intangibles = M&A-related legal risk
      if (clPair && clPair[1] > 0) {
        const clChange = ((clPair[0] - clPair[1]) / clPair[1]) * 100
        if (clChange > 30) {
          d1Score = Math.min(d1Score, 45)
          parts.push(`contingent liabilities surged ${fmt(clChange)} YoY`)
        }
      }

      dSignals.push(sig('D1', 'M&A Track Record', 'D', 'score_only', d1Score, stateFromScore(d1Score),
        parts.join('; ') + '.'))
      computed++
    } else {
      dSignals.push(na('D1', 'M&A Track Record', 'D', 'Intangible assets data not available.'))
    }

    groups.push({ id: 'D', name: 'Acquisition Track Record', role: 'scored', weight: 0.25, signals: dSignals })
  }

  return { groups, computed, total }
}

/**
 * EQ — Earnings Quality
 * CMOTS:    A1 OCF/PAT, A2 FCF, A3 CCC (BS rows), B1-B4 (BS rows), D3 Tax Rate
 * Screener: A3/B1-B4 fallback (when CMOTS BS unavailable), D1 Revenue Patterns
 * N/A:      B5 Off-Balance Sheet, C1-C3 (reporting integrity — needs auditor data), D2
 *
 * CMOTS Balance Sheet rows used:
 *   Row 25: Inventories       → B2 Inventory Quality, A3 CCC (DIO)
 *   Row 31: Trade Receivables  → B1 Receivables Quality, A3 CCC (DSO)
 *   Row 42: Total Assets       → B4 Goodwill ratio denominator
 *   Row 46: Trade Payables     → A3 CCC (DPO)
 *   Row  5: Intangible Assets  → B4 Goodwill & Intangibles
 *   Row 83: Contingent Liab.   → B3 Contingent Liabilities
 */
function buildEQ(
  ttm: CMOTSTTMRecord | null,
  pnl: CMOTSStatementRow[],
  cashFlow: CMOTSStatementRow[],
  finData: CMOTSFinancialRecord[],
  screener: ScreenerQualData | null,
  balanceSheet: CMOTSStatementRow[] = [],
  quarterly: CMOTSStatementRow[] = [],
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

  // A3: Cash Conversion Cycle — Screener pre-computed → CMOTS BS → Screener raw → N/A
  {
    let ccc: number | null = null

    // Best: Screener pre-computed CCC (uses proper COGS, not proxy)
    if (screener && screener.cashConversionCycle.length > 0) {
      ccc = screener.cashConversionCycle[screener.cashConversionCycle.length - 1].value
    }

    // Fallback: CMOTS Balance Sheet (uses 60% revenue as COGS proxy)
    if (ccc == null) {
      const bsRec = getLatestValue(balanceSheet, BS_ROW_TRADE_RECEIVABLES)
      const bsInv = getLatestValue(balanceSheet, BS_ROW_INVENTORIES)
      const bsPay = getLatestValue(balanceSheet, BS_ROW_TRADE_PAYABLES)
      const pnlRev = getLatestValue(pnl, PNL_ROW_REVENUE)

      if (bsRec != null && pnlRev != null && pnlRev > 0) {
        const dso = (bsRec / pnlRev) * 365
        const cogsDenom = pnlRev * 0.6
        const dio = bsInv != null && cogsDenom > 0 ? (bsInv / cogsDenom) * 365 : 0
        const dpo = bsPay != null && cogsDenom > 0 ? (bsPay / cogsDenom) * 365 : 0
        ccc = dso + dio - dpo
      }
    }

    // Final fallback: Screener raw data
    if (ccc == null && screener && screener.tradeReceivables.length > 0 && screener.revenue.length > 0) {
      ccc = computeCCC(screener)
    }

    if (ccc != null) {
      const a3Score = ccc < 30 ? 85 : ccc < 60 ? 72 : ccc < 90 ? 50 : 30
      aSignals.push(sig('A3', 'Cash Conversion Cycle', 'A', 'score_only', a3Score, stateFromScore(a3Score),
        `Cash conversion cycle is ${ccc.toFixed(0)} days — ${ccc < 45 ? 'efficient working capital management' : ccc < 75 ? 'moderate' : 'extended cycle, cash tied up'}.`))
      computed++
    } else {
      aSignals.push(na('A3', 'Cash Conversion Cycle', 'A', 'Balance sheet data not available for CCC calculation.'))
    }
  }

  groups.push({ id: 'A', name: 'Cash Conversion', role: 'anchor', signals: aSignals })

  // ── Group B: Balance Sheet Quality (weight 0.60) ──
  const bSignals: QualSignal[] = []

  // B1: Receivables Quality — Screener Debtor Days → CMOTS BS → Screener raw
  {
    let b1Done = false

    // Best: Screener pre-computed Debtor Days
    if (screener && screener.debtorDays.length >= 2) {
      const dd = screener.debtorDays
      const latest = dd[dd.length - 1].value
      const prev = dd[dd.length - 2].value
      const b1Score = latest < 30 ? 85 : latest < 60 ? 72 : latest < 90 ? 50 : 30
      const change = latest - prev
      const trendText = ` Trend ${change > 0 ? 'worsening' : 'improving'} (${change > 0 ? '+' : ''}${change.toFixed(0)} days YoY).`
      bSignals.push(sig('B1', 'Receivables Quality', 'B', 'score_only', b1Score, stateFromScore(b1Score),
        `DSO at ${latest.toFixed(0)} days.${trendText}`))
      computed++
      b1Done = true
    }

    // Fallback: CMOTS BS
    if (!b1Done) {
      const bsRecPair = getLatestTwoValues(balanceSheet, BS_ROW_TRADE_RECEIVABLES)
      const pnlRev = getLatestValue(pnl, PNL_ROW_REVENUE)
      if (bsRecPair && pnlRev != null && pnlRev > 0) {
        const [latestRec, prevRec] = bsRecPair
        const dso = (latestRec / pnlRev) * 365
        const b1Score = dso < 30 ? 85 : dso < 60 ? 72 : dso < 90 ? 50 : 30
        const prevRevPair = getLatestTwoValues(pnl, PNL_ROW_REVENUE)
        let trendText = ''
        if (prevRevPair && prevRevPair[1] > 0) {
          const prevDso = (prevRec / prevRevPair[1]) * 365
          const dsoChange = dso - prevDso
          trendText = ` Trend ${dsoChange > 0 ? 'worsening' : 'improving'} (${dsoChange > 0 ? '+' : ''}${dsoChange.toFixed(0)} days YoY).`
        }
        bSignals.push(sig('B1', 'Receivables Quality', 'B', 'score_only', b1Score, stateFromScore(b1Score),
          `DSO at ~${dso.toFixed(0)} days.${trendText}`))
        computed++
        b1Done = true
      }
    }

    if (!b1Done) {
      bSignals.push(na('B1', 'Receivables Quality', 'B'))
    }
  }

  // B2: Inventory Quality — Screener Inventory Days → CMOTS BS → Screener raw
  {
    let b2Done = false

    // Best: Screener pre-computed Inventory Days
    if (screener && screener.inventoryDays.length >= 2) {
      const id = screener.inventoryDays
      const latest = id[id.length - 1].value
      const prev = id[id.length - 2].value
      const b2Score = latest < 30 ? 85 : latest < 60 ? 70 : latest < 120 ? 50 : 30
      const change = latest - prev
      const trendText = ` Trend ${change > 0 ? 'building up' : 'improving'} (${change > 0 ? '+' : ''}${change.toFixed(0)} days YoY).`
      bSignals.push(sig('B2', 'Inventory Quality', 'B', 'score_only', b2Score, stateFromScore(b2Score),
        `DIO at ${latest.toFixed(0)} days.${trendText}`))
      computed++
      b2Done = true
    }

    // Fallback: CMOTS BS
    if (!b2Done) {
      const bsInvPair = getLatestTwoValues(balanceSheet, BS_ROW_INVENTORIES)
      const pnlRev = getLatestValue(pnl, PNL_ROW_REVENUE)
      if (bsInvPair && pnlRev != null && pnlRev > 0) {
        const [latestInv, prevInv] = bsInvPair
        const cogsDenom = pnlRev * 0.6
        const dio = cogsDenom > 0 ? (latestInv / cogsDenom) * 365 : 0
        const b2Score = dio < 30 ? 85 : dio < 60 ? 70 : dio < 120 ? 50 : 30
        const prevRevPair = getLatestTwoValues(pnl, PNL_ROW_REVENUE)
        let trendText = ''
        if (prevRevPair && prevRevPair[1] > 0) {
          const prevCogs = prevRevPair[1] * 0.6
          const prevDio = prevCogs > 0 ? (prevInv / prevCogs) * 365 : 0
          const dioChange = dio - prevDio
          trendText = ` Trend ${dioChange > 0 ? 'building up' : 'improving'} (${dioChange > 0 ? '+' : ''}${dioChange.toFixed(0)} days YoY).`
        }
        bSignals.push(sig('B2', 'Inventory Quality', 'B', 'score_only', b2Score, stateFromScore(b2Score),
          `DIO at ~${dio.toFixed(0)} days.${trendText}`))
        computed++
        b2Done = true
      }
    }

    if (!b2Done) {
      bSignals.push(na('B2', 'Inventory Quality', 'B'))
    }
  }

  // B3: Contingent Liabilities — CMOTS BS primary (row 83), Screener fallback
  {
    let b3Done = false
    const bsCL = getLatestValue(balanceSheet, BS_ROW_CONTINGENT_LIABILITIES)
    const pnlRev = getLatestValue(pnl, PNL_ROW_REVENUE)

    if (bsCL != null && pnlRev != null && pnlRev > 0) {
      const clRatio = (bsCL / pnlRev) * 100
      const b3Score = clRatio < 5 ? 85 : clRatio < 15 ? 68 : clRatio < 30 ? 45 : 25
      bSignals.push(sig('B3', 'Contingent Liabilities', 'B', 'score_only', b3Score, stateFromScore(b3Score),
        `Contingent liabilities are ${fmt(clRatio)} of revenue — ${clRatio < 10 ? 'manageable' : clRatio < 25 ? 'material' : 'elevated risk'}.`))
      computed++
      b3Done = true
    }

    // Fallback: Screener
    if (!b3Done && screener && screener.contingentLiabilities.length > 0 && screener.revenue.length > 0) {
      const latestCL = screener.contingentLiabilities[screener.contingentLiabilities.length - 1].value
      const latestRev = screener.revenue[screener.revenue.length - 1].value
      if (latestRev > 0) {
        const clRatio = (latestCL / latestRev) * 100
        const b3Score = clRatio < 5 ? 85 : clRatio < 15 ? 68 : clRatio < 30 ? 45 : 25
        bSignals.push(sig('B3', 'Contingent Liabilities', 'B', 'score_only', b3Score, stateFromScore(b3Score),
          `Contingent liabilities are ${fmt(clRatio)} of revenue — ${clRatio < 10 ? 'manageable' : clRatio < 25 ? 'material' : 'elevated risk'}.`))
        computed++
        b3Done = true
      }
    }

    if (!b3Done) {
      bSignals.push(na('B3', 'Contingent Liabilities', 'B'))
    }
  }

  // B4: Goodwill & Intangibles — CMOTS BS primary (row 5), Screener fallback
  {
    let b4Done = false
    const bsIntangible = getLatestValue(balanceSheet, BS_ROW_INTANGIBLE_ASSETS)
    const bsTotalAssets = getLatestValue(balanceSheet, BS_ROW_TOTAL_ASSETS)

    if (bsIntangible != null && bsTotalAssets != null && bsTotalAssets > 0) {
      const intangibleRatio = (bsIntangible / bsTotalAssets) * 100
      const b4Score = intangibleRatio < 5 ? 85 : intangibleRatio < 15 ? 70 : intangibleRatio < 30 ? 50 : 25
      bSignals.push(sig('B4', 'Goodwill & Intangibles', 'B', 'score_only', b4Score, stateFromScore(b4Score),
        `Intangibles are ${fmt(intangibleRatio)} of total assets — ${intangibleRatio < 10 ? 'asset-light' : intangibleRatio < 20 ? 'moderate intangible base' : 'significant impairment risk'}.`))
      computed++
      b4Done = true
    }

    // Fallback: Screener goodwill + intangibles / finData totalassets
    if (!b4Done && screener && (screener.goodwill.length > 0 || screener.intangibleAssets.length > 0)) {
      const latestGW = screener.goodwill.length > 0 ? screener.goodwill[screener.goodwill.length - 1].value : 0
      const latestIA = screener.intangibleAssets.length > 0 ? screener.intangibleAssets[screener.intangibleAssets.length - 1].value : 0
      const totalIntangible = latestGW + latestIA
      const totalAssets = finData.length > 0 ? finData[finData.length - 1].totalassets : null
      if (totalAssets != null && totalAssets > 0) {
        const intangibleRatio = (totalIntangible / totalAssets) * 100
        const b4Score = intangibleRatio < 5 ? 85 : intangibleRatio < 15 ? 70 : intangibleRatio < 30 ? 50 : 25
        bSignals.push(sig('B4', 'Goodwill & Intangibles', 'B', 'score_only', b4Score, stateFromScore(b4Score),
          `Intangibles are ${fmt(intangibleRatio)} of total assets — ${intangibleRatio < 10 ? 'asset-light' : intangibleRatio < 20 ? 'moderate intangible base' : 'significant impairment risk'}.`))
        computed++
        b4Done = true
      }
    }

    if (!b4Done) {
      bSignals.push(na('B4', 'Goodwill & Intangibles', 'B'))
    }
  }

  // B5: Off-Balance Sheet Items — lease liabilities + contingent liabilities trend (CMOTS BS rows 45, 62, 83)
  {
    const leaseCurrent = getLatestValue(balanceSheet, BS_ROW_LEASE_LIABILITIES_CURRENT)
    const leaseNonCurrent = getLatestValue(balanceSheet, BS_ROW_LEASE_LIABILITIES_NON_CURRENT)
    const clPair = getLatestTwoValues(balanceSheet, BS_ROW_CONTINGENT_LIABILITIES)
    const totalAssets = getLatestValue(balanceSheet, BS_ROW_TOTAL_ASSETS)

    if ((leaseCurrent != null || leaseNonCurrent != null || clPair) && totalAssets != null && totalAssets > 0) {
      const totalLease = (leaseCurrent ?? 0) + (leaseNonCurrent ?? 0)
      const cl = clPair ? clPair[0] : 0
      const offBsTotal = totalLease + cl
      const offBsRatio = (offBsTotal / totalAssets) * 100
      // Trend: is CL growing?
      let clTrend = ''
      if (clPair && clPair[1] > 0) {
        const clGrowth = ((clPair[0] - clPair[1]) / clPair[1]) * 100
        if (clGrowth > 20) clTrend = ` Contingent liabilities surged ${fmt(clGrowth)} YoY.`
      }
      const b5Score = offBsRatio < 3 ? 85 : offBsRatio < 8 ? 72 : offBsRatio < 15 ? 55 : 30
      bSignals.push(sig('B5', 'Off-Balance Sheet Items', 'B', 'score_only', b5Score, stateFromScore(b5Score),
        `Off-BS exposure (leases + contingent liabilities) is ${fmt(offBsRatio)} of total assets.${clTrend}`))
      computed++
    } else {
      bSignals.push(na('B5', 'Off-Balance Sheet Items', 'B', 'Lease and contingent liability data not available.'))
    }
  }

  groups.push({ id: 'B', name: 'Balance Sheet Quality', role: 'scored', weight: 0.60, signals: bSignals })

  // ── Group C: Reporting Integrity (red_flag_only — needs auditor/editorial data) ──
  groups.push({
    id: 'C', name: 'Reporting Integrity', role: 'red_flag_only', signals: [
      na('C1', 'Restatement History', 'C'),
      na('C2', 'Accounting Policy Changes', 'C'),
      na('C3', 'Auditor Opinion', 'C'),
    ],
  })

  // ── Group D: Pattern Anomalies (weight 0.40) ──
  const dSignals: QualSignal[] = []

  // D1: Revenue Recognition Patterns — quarterly revenue seasonality from Screener
  if (screener && screener.revenue.length >= 4) {
    const rev = screener.revenue
    const values = rev.slice(-4).map(r => r.value).filter(v => v > 0)
    if (values.length >= 4) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      const cov = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0
      const d1Score = cov < 10 ? 82 : cov < 20 ? 68 : cov < 35 ? 50 : 30
      dSignals.push(sig('D1', 'Revenue Recognition Patterns', 'D', 'score_only', d1Score, stateFromScore(d1Score),
        `Revenue CoV at ${fmt(cov)} across recent years — ${cov < 15 ? 'consistent recognition' : cov < 25 ? 'moderate variability' : 'lumpy revenue pattern'}.`))
      computed++
    } else {
      dSignals.push(na('D1', 'Revenue Recognition Patterns', 'D'))
    }
  } else {
    dSignals.push(na('D1', 'Revenue Recognition Patterns', 'D'))
  }

  // D2: Expense Timing — detect Q4 expense bunching from quarterly data
  {
    const qRevRow = findStatementRow(quarterly, QR_ROW_REVENUE)
    const qPatRow = findStatementRow(quarterly, QR_ROW_PAT)
    if (qRevRow && qPatRow) {
      const cols = getYearColumns(qRevRow)
      const expenses: number[] = []
      for (const col of cols.slice(0, 8)) {
        const rev = getStatementValue(qRevRow, col)
        const pat = getStatementValue(qPatRow, col)
        if (rev != null && pat != null && rev > 0) expenses.push(rev - pat)
      }
      if (expenses.length >= 4) {
        // Compare last quarter (most recent) to avg of prior 3
        const last = expenses[0]
        const priorAvg = expenses.slice(1, 4).reduce((a, b) => a + b, 0) / 3
        if (priorAvg > 0) {
          const spikeRatio = ((last - priorAvg) / priorAvg) * 100
          const d2Score = Math.abs(spikeRatio) < 10 ? 82 : Math.abs(spikeRatio) < 20 ? 68 : Math.abs(spikeRatio) < 35 ? 50 : 30
          dSignals.push(sig('D2', 'Expense Timing', 'D', 'score_only', d2Score, stateFromScore(d2Score),
            `Latest quarter expenses ${spikeRatio > 0 ? 'up' : 'down'} ${fmt(Math.abs(spikeRatio))} vs prior 3Q avg — ${Math.abs(spikeRatio) < 15 ? 'stable expense pattern' : Math.abs(spikeRatio) < 30 ? 'moderate variance' : 'potential expense bunching'}.`))
          computed++
        } else {
          dSignals.push(na('D2', 'Expense Timing', 'D', 'Insufficient expense data.'))
        }
      } else {
        dSignals.push(na('D2', 'Expense Timing', 'D', 'Insufficient quarterly data for expense analysis.'))
      }
    } else {
      dSignals.push(na('D2', 'Expense Timing', 'D', 'Quarterly revenue/PAT data not available.'))
    }
  }

  // D3: Effective Tax Rate
  const npm = ttm?.netprofitmargin ?? null
  const opm = ttm?.operatingprofitmargin ?? null
  let impliedTaxRate: number | null = null
  if (npm != null && opm != null && opm > 0) {
    impliedTaxRate = (1 - (npm / (opm * 0.85))) * 100
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
 * Computable: A1 Analyst Consensus (Finnhub), A3 Earnings Surprise (quarterly PAT),
 *             A4 Quarterly Consistency (quarterly revenue CoV)
 * Not available: A2 Margin Delivery, Group B (ops KPIs)
 */
function buildExQ(quarterly: CMOTSStatementRow[], consensus: FinnhubConsensus | null, ttm: CMOTSTTMRecord | null, screener: ScreenerQualData | null): FactorBuild {
  const groups: SignalGroup[] = []
  let computed = 0
  const total = 6

  // ── Group A: Financial Delivery (anchor) ──
  const aSignals: QualSignal[] = []
  // A1: Analyst Consensus — from Finnhub recommendation trends
  if (consensus && consensus.totalAnalysts >= 3) {
    const buyPct = consensus.buyPct
    const a1Score = buyPct >= 70 ? 85 : buyPct >= 50 ? 72 : buyPct >= 30 ? 55 : 30
    const label = consensus.latestConsensus === 'strongBuy' ? 'Strong Buy'
      : consensus.latestConsensus === 'buy' ? 'Buy'
      : consensus.latestConsensus === 'hold' ? 'Hold'
      : consensus.latestConsensus === 'sell' ? 'Sell' : 'Mixed'
    aSignals.push(sig('A1', 'Analyst Consensus', 'A', 'score_only', a1Score, stateFromScore(a1Score),
      `${consensus.totalAnalysts} analysts: ${fmt(buyPct)} bullish. Consensus: ${label}.`))
    computed++
  } else {
    aSignals.push(na('A1', 'Analyst Consensus', 'A', consensus ? 'Too few analysts covering this stock.' : 'Analyst data not available.'))
  }
  // A2: Margin Delivery — is OPM trending up vs 3-year avg?
  {
    const opmHistory = screener?.opm ?? []
    const currentOpm = ttm?.operatingprofitmargin ?? null
    if (opmHistory.length >= 3 && currentOpm != null) {
      const hist = opmHistory.slice(-3)
      const avg3y = hist.reduce((s, v) => s + v.value, 0) / hist.length
      const delta = currentOpm - avg3y
      const a2Score = delta > 2 ? 85 : delta > 0 ? 72 : delta > -2 ? 55 : 30
      aSignals.push(sig('A2', 'Margin Delivery', 'A', 'score_only', a2Score, stateFromScore(a2Score),
        `Current OPM ${fmt(currentOpm)} vs 3-year avg ${fmt(avg3y)} — ${delta > 0 ? 'delivering above historical average' : 'below historical average'}.`))
      computed++
    } else if (currentOpm != null) {
      // Use TTM OPM alone — less informative but not N/A
      const a2Score = currentOpm > 15 ? 72 : currentOpm > 8 ? 58 : 40
      aSignals.push(sig('A2', 'Margin Delivery', 'A', 'score_only', a2Score, stateFromScore(a2Score),
        `Current OPM at ${fmt(currentOpm)} — insufficient history for trend comparison.`))
      computed++
    } else {
      aSignals.push(na('A2', 'Margin Delivery', 'A', 'OPM data not available.'))
    }
  }
  // A3: Earnings Surprise Pattern — QoQ PAT variability from quarterly results
  {
    const patRow = findStatementRow(quarterly, QR_ROW_PAT)
    if (patRow) {
      const cols = getYearColumns(patRow)
      const patValues: number[] = []
      for (const col of cols.slice(0, 8)) {
        const val = getStatementValue(patRow, col)
        if (val != null) patValues.push(val)
      }
      if (patValues.length >= 4) {
        // Compute QoQ changes to find surprise magnitude
        const qoqChanges: number[] = []
        for (let i = 0; i < patValues.length - 1; i++) {
          if (patValues[i + 1] !== 0) {
            qoqChanges.push(((patValues[i] - patValues[i + 1]) / Math.abs(patValues[i + 1])) * 100)
          }
        }
        if (qoqChanges.length >= 3) {
          // High variability = earnings surprises (could be positive or negative)
          const mean = qoqChanges.reduce((a, b) => a + Math.abs(b), 0) / qoqChanges.length
          const a3Score = mean < 10 ? 82 : mean < 25 ? 68 : mean < 50 ? 50 : 30
          aSignals.push(sig('A3', 'Earnings Surprise Pattern', 'A', 'score_only', a3Score, stateFromScore(a3Score),
            `Average QoQ PAT swing is ${fmt(mean)} — ${mean < 15 ? 'predictable earnings' : mean < 30 ? 'moderate variability' : 'volatile, surprise-prone'}.`))
          computed++
        } else {
          aSignals.push(na('A3', 'Earnings Surprise Pattern', 'A', 'Insufficient quarterly profit data.'))
        }
      } else {
        aSignals.push(na('A3', 'Earnings Surprise Pattern', 'A', 'Insufficient quarterly data.'))
      }
    } else {
      aSignals.push(na('A3', 'Earnings Surprise Pattern', 'A', 'Quarterly PAT data not available.'))
    }
  }

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

/** Compute CAGR from Screener year-value pairs */
function computeGrowth(data: { year: string; value: number }[]): number | null {
  if (data.length < 2) return null
  const oldest = data[0].value
  const latest = data[data.length - 1].value
  if (oldest <= 0 || latest <= 0) return null
  const years = data.length - 1
  return (Math.pow(latest / oldest, 1 / years) - 1) * 100
}



/** Compute Cash Conversion Cycle from Screener data */
function computeCCC(screener: ScreenerQualData): number | null {
  const rev = screener.revenue
  const rec = screener.tradeReceivables
  const inv = screener.inventories
  const pay = screener.tradePayables
  const cogs = screener.cogs

  if (rev.length === 0) return null

  const latestRev = rev[rev.length - 1].value
  if (latestRev <= 0) return null

  // DSO: Trade Receivables / (Revenue / 365)
  const latestRec = rec.length > 0 ? rec[rec.length - 1].value : 0
  const dso = (latestRec / latestRev) * 365

  // DIO: Inventory / (COGS / 365) — use revenue as proxy if COGS unavailable
  const latestInv = inv.length > 0 ? inv[inv.length - 1].value : 0
  const cogsDenom = cogs.length > 0 ? cogs[cogs.length - 1].value : latestRev * 0.6 // 60% as proxy
  const dio = cogsDenom > 0 ? (latestInv / cogsDenom) * 365 : 0

  // DPO: Trade Payables / (COGS / 365)
  const latestPay = pay.length > 0 ? pay[pay.length - 1].value : 0
  const dpo = cogsDenom > 0 ? (latestPay / cogsDenom) * 365 : 0

  return dso + dio - dpo
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
 * Compute qual factors for any stock via live multi-source APIs.
 * Falls back to mock data for demo stocks only if all API sources fail.
 */
export async function computeQualFactors(symbol: string): Promise<SegmentVerdictV2[]> {
  // Fetch all data sources in parallel (CMOTS + Screener + Finnhub + BSE + Trendlyne)
  const [bundle, screener, consensus, insiderTxns, relatedParty, corpActions, governance] = await Promise.all([
    getAllFundamentals(symbol),
    getScreenerQualData(symbol),
    getAnalystConsensus(symbol),
    getInsiderTransactions(symbol),
    getRelatedPartyTransactions(symbol),
    getCorporateActions(symbol),
    getGovernanceData(symbol),
  ])
  const { ttm, finData, pnl, cashFlow, balanceSheet, quarterly, shareholding } = bundle

  // If no CMOTS data at all, fall back to mock for demo stocks
  if (!ttm && finData.length === 0 && pnl.length === 0) {
    const fallback = getQualFactorsFallback(symbol.toLowerCase())
    if (fallback) {
      console.info(`[Qual] CMOTS unavailable for ${symbol}, using mock fallback`)
      return fallback
    }
  }

  if (screener) {
    console.info(`[Qual] Screener data available for ${symbol} — enriching signals`)
  }
  if (consensus) {
    console.info(`[Qual] Finnhub consensus available for ${symbol} — ${consensus.totalAnalysts} analysts`)
  }
  if (insiderTxns || relatedParty || corpActions) {
    console.info(`[Qual] BSE data available for ${symbol} — insider:${!!insiderTxns} rpt:${!!relatedParty} actions:${!!corpActions}`)
  }
  if (governance) {
    console.info(`[Qual] Trendlyne governance available for ${symbol} — ${governance.totalDirectors} directors`)
  }

  return [
    assembleQualFactor('management_governance', 'Management & Governance', 20, buildMG(shareholding, screener, insiderTxns, relatedParty, governance)),
    assembleQualFactor('business_quality', 'Business Quality', 25, buildBQ(ttm, finData, pnl, cashFlow)),
    assembleQualFactor('capital_discipline', 'Capital Discipline', 20, buildCD(ttm, finData, screener, balanceSheet, corpActions)),
    assembleQualFactor('earnings_quality', 'Earnings Quality', 20, buildEQ(ttm, pnl, cashFlow, finData, screener, balanceSheet, quarterly)),
    assembleQualFactor('execution_quality', 'Execution Quality', 15, buildExQ(quarterly, consensus, ttm, screener)),
  ]
}
