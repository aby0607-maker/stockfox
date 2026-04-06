/**
 * Red Flag Scanner Service — 35-parameter risk framework
 *
 * Single source of truth for risk detection + scoring.
 * Consumes red flags from Quant segments + Qual factors,
 * maps them to the 35-parameter scanner, and produces the Risk pillar score.
 *
 * Used by:
 *   - verdictService.ts  → Risk pillar score + segment
 *   - RedFlagScanner.tsx  → UI rendering
 */

import type { RedFlagSeverity, StockVerdict, StockVerdictV2, SegmentVerdictV2 } from '@/types'
import { getScoreBandEnum } from '@/lib/scoring'

// ─── V2 Signal → Scanner Parameter Mapping ──────────────────

const V2_TO_SCANNER_MAP: Record<string, string> = {
  // Quant: Financial Health
  'G1': 'rf-icr',                // Solvency risk → Interest Coverage
  'G4': 'rf-neg-ocf',            // Cash flow viability → Negative OCF
  'M2': 'rf-debt-rising',        // High leverage → Debt Increasing

  // Quant: Profitability
  'PROF_OPM': 'rf-earnings-cash', // Negative OPM → Earnings divergence
  'PROF_ROCE': 'rf-working-capital', // Low ROCE → operational stress signal
  'PROF_ROE': 'rf-working-capital',

  // Quant: Growth
  'GRW_REV': 'rf-analyst-downgrade', // Shrinking revenue
  'GRW_PAT': 'rf-earnings-cash',     // Earnings decline

  // Quant: Valuation
  'VAL_PE': 'rf-short-interest',      // Extreme PE
  'VAL_PB': 'rf-short-interest',      // Extreme PB
  'VAL_HIST': 'rf-short-interest',    // Well above historical

  // Quant: Technical
  'TECH_EMA200': 'rf-peer-underperform', // Below 200-day EMA
  'TECH_RSI': 'rf-peer-underperform',    // Deeply oversold

  // Quant: Performance
  'PERF_RET': 'rf-peer-underperform', // Severe decline
  'PERF_DD': 'rf-volatility',         // Deep drawdown
  'PERF_VOL': 'rf-volatility',        // Extreme volatility

  // Quant: Institutional
  // Note: INST_PROM_LOW (low holding) is intentionally unmapped — it flows as an additional flag.
  // rf-pledge is about pledging (borrowing against shares), not holding level.
  'INST_PROM_DROP': 'rf-promoter-exit', // Promoter decline

  // NSE Surveillance flags (from REG_IND CSV)
  'SURV_ASM': 'rf-asm',              // ASM list
  'SURV_GSM': 'rf-gsm',              // GSM list
  'SURV_SMS': 'rf-sms',              // Pump & dump SMS alert
  'SURV_DEFAULT': 'rf-default',      // Default/ICA flag

  // BSE Scanner signals (from Board Meeting + Company Update announcements)
  'BSE_CREDIT': 'rf-credit-downgrade',  // Credit rating downgrade
  'BSE_MGMT': 'rf-mgmt-churn',          // Key management change
  'BSE_AUDITOR': 'rf-auditor-change',    // Auditor change
}

// ─── 35-Parameter Framework Definition ──────────────────────

export interface ScannerFlag {
  id: string
  severity: RedFlagSeverity
  title: string
  source: string
  threshold: string
  currentValue: string
  isTriggered: boolean
  description: string
  action: string
  scoreImpact: number
}

function buildScannerFramework(): ScannerFlag[] {
  return [
    // ===== CRITICAL (8 flags) — Score Impact: -2 to -3 pts =====
    { id: 'rf-asm', severity: 'critical', title: 'ASM List', source: 'BSE/NSE', threshold: 'On list', currentValue: 'Clear', isTriggered: false, description: 'Stock on Additional Surveillance Measure', action: 'Exchange flagged for unusual activity', scoreImpact: -3 },
    { id: 'rf-gsm', severity: 'critical', title: 'GSM List', source: 'BSE/NSE', threshold: 'On list', currentValue: 'Clear', isTriggered: false, description: 'Stock on Graded Surveillance Measure', action: 'Serious compliance/trading concerns', scoreImpact: -3 },
    { id: 'rf-default', severity: 'critical', title: 'Default Probability >15%', source: 'ML Model', threshold: '>15%', currentValue: '2%', isTriggered: false, description: 'High likelihood of debt default', action: 'Company may not survive', scoreImpact: -3 },
    { id: 'rf-pledge', severity: 'critical', title: 'Promoter Pledging >20%', source: 'Ownership', threshold: '>20%', currentValue: '0%', isTriggered: false, description: 'No promoter pledging', action: 'Forced selling risk in downturn', scoreImpact: -2 },
    { id: 'rf-sms', severity: 'critical', title: 'Pump & Dump Alert', source: 'External', threshold: 'Circulating', currentValue: 'Clear', isTriggered: false, description: 'Stock circulating in SMS/WhatsApp tips', action: 'Manipulation in progress', scoreImpact: -3 },
    { id: 'rf-audit', severity: 'critical', title: 'Auditor Qualification', source: 'Annual Report', threshold: 'Qualified/Adverse', currentValue: 'Clean', isTriggered: false, description: 'Clean audit report', action: 'Accounting irregularities', scoreImpact: -3 },
    { id: 'rf-icr', severity: 'critical', title: 'Interest Coverage <1.5x', source: 'Ratios', threshold: '<1.5x', currentValue: '∞', isTriggered: false, description: 'No debt, comfortable coverage', action: 'Cannot service debt', scoreImpact: -2 },
    { id: 'rf-shell', severity: 'critical', title: 'Shell Company Flag', source: 'MCA/Exchange', threshold: 'Flagged', currentValue: 'Clear', isTriggered: false, description: 'Not flagged as shell company', action: 'No real business operations', scoreImpact: -3 },

    // ===== HIGH (12 flags) — Score Impact: -1 to -1.5 pts =====
    { id: 'rf-pledge-rising', severity: 'high', title: 'Promoter Pledging Rising', source: 'Ownership', threshold: '>5% QoQ', currentValue: '0%', isTriggered: false, description: 'Pledging stable', action: 'Monitor promoter position', scoreImpact: -1.5 },
    { id: 'rf-promoter-exit', severity: 'high', title: 'Promoter Stake Declining', source: 'Ownership', threshold: '>3% in 6M', currentValue: 'Stable', isTriggered: false, description: 'Promoter stake stable', action: 'Insider selling signal', scoreImpact: -1.5 },
    { id: 'rf-smart-money-exit', severity: 'high', title: 'FII + DII Both Exiting', source: 'Ownership', threshold: '>2% in 3M', currentValue: 'Stable', isTriggered: false, description: 'Institutional ownership stable', action: 'Smart money leaving', scoreImpact: -1.5 },
    { id: 'rf-neg-ocf', severity: 'high', title: 'Negative OCF 3 Quarters', source: 'Cash Flow', threshold: '3 consecutive', currentValue: 'Positive', isTriggered: false, description: 'Operating cash flow positive', action: 'Profits not converting to cash', scoreImpact: -1.5 },
    { id: 'rf-earnings-cash', severity: 'high', title: 'Earnings vs Cash Divergence', source: 'Financials', threshold: 'PAT↑ OCF↓', currentValue: 'Aligned', isTriggered: false, description: 'PAT and OCF aligned', action: 'Possible earnings manipulation', scoreImpact: -1.5 },
    { id: 'rf-rpt', severity: 'high', title: 'Related Party Transactions', source: 'Income Statement', threshold: '>10% revenue', currentValue: '3%', isTriggered: false, description: 'RPT within acceptable limits', action: 'Self-dealing concerns', scoreImpact: -1 },
    { id: 'rf-receivables', severity: 'high', title: 'Revenue Recognition Red Flag', source: 'Balance Sheet', threshold: 'Recv 2x Rev growth', currentValue: 'Normal', isTriggered: false, description: 'Receivables growth normal', action: 'Fake sales booking', scoreImpact: -1.5 },
    { id: 'rf-auditor-change', severity: 'high', title: 'Auditor Change', source: 'Annual Report', threshold: 'Unexplained', currentValue: 'No change', isTriggered: false, description: 'Stable auditor relationship', action: 'Covering up issues', scoreImpact: -1 },
    { id: 'rf-mgmt-churn', severity: 'high', title: 'Management Churn', source: 'Filings', threshold: 'CFO/CEO exit', currentValue: 'Stable', isTriggered: false, description: 'Stable management team', action: 'Governance instability', scoreImpact: -1 },
    { id: 'rf-credit-downgrade', severity: 'high', title: 'Credit Rating Downgrade', source: 'Rating Agency', threshold: 'Downgrade', currentValue: 'Stable', isTriggered: false, description: 'Credit rating stable', action: 'Credit quality deteriorating', scoreImpact: -1.5 },
    { id: 'rf-sebi', severity: 'high', title: 'SEBI Order/Investigation', source: 'SEBI', threshold: 'Active', currentValue: 'Clear', isTriggered: false, description: 'No SEBI action', action: 'Regulatory trouble', scoreImpact: -1.5 },
    { id: 'rf-forensic', severity: 'high', title: 'Forensic Accounting Concerns', source: 'Research', threshold: 'Flagged', currentValue: 'Clear', isTriggered: false, description: 'No forensic flags', action: 'Accounting red flags', scoreImpact: -1.5 },

    // ===== MEDIUM (10 flags) — Score Impact: -0.5 pts =====
    { id: 'rf-short-interest', severity: 'medium', title: 'High Short Interest', source: 'F&O Data', threshold: '>2x avg OI', currentValue: 'Normal', isTriggered: false, description: 'Normal short interest', action: 'Bears betting against', scoreImpact: -0.5 },
    { id: 'rf-analyst-downgrade', severity: 'medium', title: 'Analyst Downgrade Cluster', source: 'Broker Ratings', threshold: '3+ in 30 days', currentValue: '0', isTriggered: false, description: 'No recent downgrades', action: 'Consensus turning negative', scoreImpact: -0.5 },
    { id: 'rf-debt-rising', severity: 'medium', title: 'Debt Increasing Rapidly', source: 'Balance Sheet', threshold: 'D/E +0.5x YoY', currentValue: '0', isTriggered: false, description: 'Debt-free company', action: 'Leverage risk building', scoreImpact: -0.5 },
    { id: 'rf-contingent', severity: 'medium', title: 'Contingent Liabilities High', source: 'Balance Sheet', threshold: '>20% net worth', currentValue: '5%', isTriggered: false, description: 'Low contingent liabilities', action: 'Hidden obligations', scoreImpact: -0.5 },
    { id: 'rf-inventory', severity: 'medium', title: 'Inventory Pileup', source: 'Balance Sheet', threshold: '>30% YoY', currentValue: 'N/A', isTriggered: false, description: 'Service company - N/A', action: 'Demand slowdown signal', scoreImpact: -0.5 },
    { id: 'rf-customer-conc', severity: 'medium', title: 'Customer Concentration', source: 'Income Statement', threshold: '>25% revenue', currentValue: '8%', isTriggered: false, description: 'Diversified customer base', action: 'Single point of failure', scoreImpact: -0.5 },
    { id: 'rf-promoter-loans', severity: 'medium', title: 'Promoter Entity Loans', source: 'Related Party', threshold: 'Present', currentValue: 'None', isTriggered: false, description: 'No loans to promoter entities', action: 'Cash siphoning risk', scoreImpact: -0.5 },
    { id: 'rf-dilution', severity: 'medium', title: 'Frequent Equity Dilution', source: 'Capital Structure', threshold: '>2 raises in 3Y', currentValue: '1', isTriggered: false, description: 'Limited dilution', action: 'Shareholder dilution', scoreImpact: -0.5 },
    { id: 'rf-dividend-cut', severity: 'medium', title: 'Dividend Cut/Skip', source: 'Dividend History', threshold: '>50% cut', currentValue: 'N/A', isTriggered: false, description: 'Growth company - no dividend', action: 'Cash flow stress', scoreImpact: -0.5 },
    { id: 'rf-working-capital', severity: 'medium', title: 'Working Capital Deterioration', source: 'Balance Sheet', threshold: 'CCC +30 days', currentValue: 'Improving', isTriggered: false, description: 'Working capital healthy', action: 'Operational stress', scoreImpact: -0.5 },

    // ===== MONITOR (5 flags) — Informational, no score impact =====
    { id: 'rf-volatility', severity: 'monitor', title: 'Volatility Warning', source: 'Price Data', threshold: 'Beta >1.5', currentValue: '1.3', isTriggered: false, description: 'Moderate volatility', action: 'High price swings', scoreImpact: 0 },
    { id: 'rf-liquidity', severity: 'monitor', title: 'Liquidity Warning', source: 'Volume', threshold: '<₹1 Cr daily', currentValue: '₹150 Cr', isTriggered: false, description: 'Good liquidity', action: 'Hard to exit', scoreImpact: 0 },
    { id: 'rf-sector-headwind', severity: 'monitor', title: 'Sector Headwind', source: 'News', threshold: 'Regulatory/macro', currentValue: 'None', isTriggered: false, description: 'No sector headwinds', action: 'External risk factor', scoreImpact: 0 },
    { id: 'rf-peer-underperform', severity: 'monitor', title: 'Peer Underperformance', source: 'Price', threshold: '-20% vs peers', currentValue: '+5%', isTriggered: false, description: 'Outperforming peers', action: 'Relative weakness', scoreImpact: 0 },
    { id: 'rf-insider-selling', severity: 'monitor', title: 'Insider Selling Pattern', source: 'SAST', threshold: 'Multiple insiders', currentValue: 'None', isTriggered: false, description: 'No insider selling', action: 'Confidence concern', scoreImpact: 0 },
  ]
}

// ─── V2 Red Flag Extraction ─────────────────────────────────

interface V2Flag {
  signalId: string
  title: string
  description: string
  severity: string
  source: string
}

/** Collect all redFlags from quant + qual segments */
export function extractRedFlagsFromSegments(
  quantSegments: SegmentVerdictV2[],
  qualFactors: SegmentVerdictV2[],
): V2Flag[] {
  const flags: V2Flag[] = []
  for (const seg of [...quantSegments, ...qualFactors]) {
    if (seg.redFlags) {
      for (const rf of seg.redFlags) {
        flags.push({
          signalId: rf.signalId,
          title: rf.title,
          description: rf.description,
          severity: rf.severity,
          source: rf.source,
        })
      }
    }
  }
  return flags
}

/** Extract V2 flags from an assembled StockVerdictV2 (for UI use) */
function extractV2RedFlagsFromVerdict(verdictV2: StockVerdictV2): V2Flag[] {
  const flags: V2Flag[] = []
  for (const pillar of verdictV2.pillars) {
    for (const segment of pillar.segments) {
      if (segment.redFlags) {
        for (const rf of segment.redFlags) {
          flags.push({ signalId: rf.signalId, title: rf.title, description: rf.description, severity: rf.severity, source: rf.source })
        }
      }
    }
  }
  return flags
}

// ─── Framework Assembly (merge V1 + V2 flags into 35 params) ─

export interface ScannerFrameworkResult {
  triggeredCount: number
  totalParameters: number
  scoreImpact: number
  flags: ScannerFlag[]
  triggeredFlags: ScannerFlag[]
  bySeverity: Record<string, ScannerFlag[]>
  triggeredBySeverity: Record<string, ScannerFlag[]>
}

export function generateRedFlagFramework(
  verdict?: StockVerdict | null,
  verdictV2?: StockVerdictV2 | null,
  v2FlagsDirect?: V2Flag[],
  currentValues?: Record<string, string>,
): ScannerFrameworkResult {
  const allFlags = buildScannerFramework()

  // Apply stock-specific current values if provided (updates both currentValue and description)
  if (currentValues) {
    for (const flag of allFlags) {
      if (currentValues[flag.id] !== undefined) {
        flag.currentValue = currentValues[flag.id]
        flag.description = currentValues[flag.id]
      }
    }
  }

  // V1 overrides (demo stocks with full mock)
  const v1TriggeredFlags = verdict?.redFlags?.map(f => ({
    ...f,
    severity: (f.severity as RedFlagSeverity) || 'medium' as RedFlagSeverity,
    isTriggered: true,
    source: 'Analysis',
    currentValue: (f as unknown as ScannerFlag).currentValue || 'Triggered',
    threshold: (f as unknown as ScannerFlag).threshold || 'Exceeded',
    scoreImpact: f.severity === 'critical' ? -2.5 : f.severity === 'high' ? -1.25 : -0.5
  })) || []

  // V2 flags: either from direct segment data or from assembled verdict
  const v2Flags = v2FlagsDirect || (verdictV2 ? extractV2RedFlagsFromVerdict(verdictV2) : [])
  const v2TriggeredIds = new Set<string>()
  const v2AdditionalFlags: ScannerFlag[] = []

  for (const v2f of v2Flags) {
    const scannerId = V2_TO_SCANNER_MAP[v2f.signalId]
    if (scannerId) {
      v2TriggeredIds.add(scannerId)
    } else {
      v2AdditionalFlags.push({
        id: `v2-${v2f.signalId}`,
        severity: (v2f.severity === 'hard' ? 'high' : 'medium') as RedFlagSeverity,
        title: v2f.title,
        source: v2f.source,
        threshold: 'Exceeded',
        currentValue: 'Triggered',
        isTriggered: true,
        description: v2f.description,
        action: v2f.description,
        scoreImpact: v2f.severity === 'hard' ? -1.5 : -0.5,
      })
    }
  }

  // Merge: V1 overrides first, then V2 triggers light up scanner params
  const mergedFlags = allFlags.map(flag => {
    const v1Override = v1TriggeredFlags.find(tf => tf.id === flag.id || tf.title === flag.title)
    if (v1Override) return { ...flag, ...v1Override, isTriggered: true }
    if (v2TriggeredIds.has(flag.id)) {
      const v2Source = v2Flags.find(f => V2_TO_SCANNER_MAP[f.signalId] === flag.id)
      return { ...flag, isTriggered: true, currentValue: 'Triggered', description: v2Source?.description || flag.description }
    }
    return flag
  })

  const additionalTriggered = [
    ...v1TriggeredFlags.filter(tf => !allFlags.some(f => f.id === tf.id || f.title === tf.title)),
    ...v2AdditionalFlags,
  ]

  const finalFlags: ScannerFlag[] = [...mergedFlags, ...additionalTriggered]
  const triggered = finalFlags.filter(f => f.isTriggered)

  // Score impact capped at -5
  const rawScoreImpact = triggered.reduce((sum, f) => sum + (f.scoreImpact || 0), 0)
  const scoreImpact = Math.max(-5, rawScoreImpact)

  return {
    triggeredCount: triggered.length,
    totalParameters: 35,
    scoreImpact,
    flags: finalFlags,
    triggeredFlags: triggered,
    bySeverity: {
      critical: finalFlags.filter(f => f.severity === 'critical'),
      high: finalFlags.filter(f => f.severity === 'high'),
      medium: finalFlags.filter(f => f.severity === 'medium'),
      monitor: finalFlags.filter(f => f.severity === 'monitor'),
    },
    triggeredBySeverity: {
      critical: triggered.filter(f => f.severity === 'critical'),
      high: triggered.filter(f => f.severity === 'high'),
      medium: triggered.filter(f => f.severity === 'medium'),
      monitor: triggered.filter(f => f.severity === 'monitor'),
    },
  }
}

// ─── Risk Score Computation ─────────────────────────────────

/**
 * Compute the Risk pillar score + segment from scanner output.
 *
 * Scoring: Start at 80 (baseline "low risk").
 * Each triggered flag applies its scoreImpact (severity-weighted).
 * Capped at [10, 80].
 */
export function computeRiskFromScanner(
  quantSegments: SegmentVerdictV2[],
  qualFactors: SegmentVerdictV2[],
  verdict?: StockVerdict | null,
  currentValues?: Record<string, string>,
): { score: number; label: string; summary: string; segment: SegmentVerdictV2 } {
  const v2Flags = extractRedFlagsFromSegments(quantSegments, qualFactors)
  const framework = generateRedFlagFramework(verdict, null, v2Flags, currentValues)

  // Risk score: 80 + sum of scoreImpacts (each is negative), clamped [10, 80]
  const riskScore = Math.max(10, Math.min(80, 80 + framework.scoreImpact))

  const label = riskScore >= 75 ? 'LOW RISK'
    : riskScore >= 55 ? 'MODERATE'
    : riskScore >= 35 ? 'ELEVATED'
    : 'HIGH RISK'

  const { triggeredBySeverity } = framework
  const critCount = triggeredBySeverity.critical.length
  const highCount = triggeredBySeverity.high.length
  const medCount = triggeredBySeverity.medium.length

  const summary = framework.triggeredCount === 0
    ? 'All clear — 0/35 risk parameters triggered'
    : `${framework.triggeredCount}/35 flagged` +
      (critCount > 0 ? ` (${critCount} critical)` : '') +
      (highCount > 0 ? ` (${highCount} high)` : '') +
      (medCount > 0 ? ` (${medCount} medium)` : '')

  const segment: SegmentVerdictV2 = {
    id: 'red_flag_scanner', name: 'Red Flag Scanner', pillar: 'risk',
    scoringType: 'scored',
    score: riskScore,
    scoreBand: getScoreBandEnum(riskScore),
    label,
    status: riskScore >= 60 ? 'positive' : riskScore >= 40 ? 'neutral' : 'negative',
    interpretation: summary,
    confidenceIndicator: {
      signalsComputed: framework.triggeredCount,
      signalsTotal: framework.totalParameters,
      dataRange: '35-parameter scan',
      state: 'full',
      tooltip: `${framework.triggeredCount} of ${framework.totalParameters} risk checks triggered`,
    },
    signalGroups: [],
  }

  return { score: riskScore, label, summary, segment }
}

// ─── Dynamic Scanner Values from CMOTS Metrics ───────────────

/**
 * Build human-readable scanner display values from resolved CMOTS metrics.
 * Maps available metric keys → 35 scanner parameter IDs.
 * Returns only the parameters where we have data; unmapped ones keep defaults.
 */
export function buildScannerValuesFromMetrics(m: Record<string, number | null>): Record<string, string> {
  const v: Record<string, string> = {}

  // ── Critical ──
  // rf-icr: Interest Coverage
  const icr = m['v2_interest_coverage']
  if (icr != null) {
    v['rf-icr'] = icr > 100 ? '∞ (zero/minimal debt)' : `${icr.toFixed(1)}x`
  }

  // rf-pledge: Promoter Pledging (CMOTS rarely provides this — usually null)
  const pledge = m['promoter_pledge']
  if (pledge != null) {
    v['rf-pledge'] = `${pledge.toFixed(1)}%`
  }

  // ── High ──
  // rf-promoter-exit: Promoter stake declining
  const promHolding = m['promoter_holding']
  const promChange1y = m['promoter_holding_change_1y']
  if (promHolding != null) {
    const trend = promChange1y != null
      ? (promChange1y > 0.5 ? ' (rising)' : promChange1y < -0.5 ? ' (declining)' : ' (stable)')
      : ''
    v['rf-promoter-exit'] = `${promHolding.toFixed(1)}%${trend}`
  }

  // rf-smart-money-exit: FII + DII both exiting
  const fii = m['fii_holding']
  const dii = m['dii_holding']
  const fiiChange = m['fii_holding_change_3m']
  if (fii != null && dii != null) {
    const trend = fiiChange != null
      ? (fiiChange < -2 ? ' (declining)' : fiiChange > 2 ? ' (rising)' : ' (stable)')
      : ''
    v['rf-smart-money-exit'] = `FII ${fii.toFixed(1)}%, DII ${dii.toFixed(1)}%${trend}`
  }

  // rf-neg-ocf: Negative OCF
  const cfoVsPat = m['v2_cfo_vs_pat']
  if (cfoVsPat != null) {
    v['rf-neg-ocf'] = cfoVsPat > 0 ? `OCF/PAT ${cfoVsPat.toFixed(0)}% (positive)` : `OCF/PAT ${cfoVsPat.toFixed(0)}% (negative)`
  }

  // rf-earnings-cash: Earnings vs Cash divergence
  if (cfoVsPat != null) {
    v['rf-earnings-cash'] = cfoVsPat >= 50 ? 'PAT and OCF aligned' : `OCF/PAT ${cfoVsPat.toFixed(0)}% (divergence)`
  }

  // rf-credit-downgrade: Credit rating (we don't have this from CMOTS, skip)

  // ── Medium ──
  // rf-debt-rising: Debt increasing
  const debtEbitda = m['v2_debt_ebitda']
  if (debtEbitda != null) {
    v['rf-debt-rising'] = debtEbitda < 0.01 ? 'Zero/minimal debt' : `Debt/EBITDA ${debtEbitda.toFixed(1)}x`
  }

  // rf-short-interest: Valuation extremes (mapped from PE/PB)
  const pe = m['raw_pe']
  const pb = m['raw_pb']
  if (pe != null || pb != null) {
    const parts: string[] = []
    if (pe != null) parts.push(`PE ${pe.toFixed(1)}`)
    if (pb != null) parts.push(`PB ${pb.toFixed(1)}`)
    v['rf-short-interest'] = parts.join(', ')
  }

  // rf-dilution: Equity dilution
  const sharesChange = m['v2_shares_change']
  if (sharesChange != null) {
    v['rf-dilution'] = sharesChange > 1 ? `Shares +${sharesChange.toFixed(1)}% (dilution)` :
      sharesChange < -1 ? `Shares ${sharesChange.toFixed(1)}% (buyback)` : 'Shares stable'
  }

  // rf-dividend-cut: Dividend
  const divYield = m['v2_dividend_yield']
  if (divYield != null) {
    v['rf-dividend-cut'] = divYield > 0 ? `Yield ${divYield.toFixed(1)}%` : 'No dividend'
  }

  // rf-working-capital: Working capital
  const roce = m['v2_roce'] ?? m['raw_roce']
  if (roce != null) {
    v['rf-working-capital'] = `ROCE ${roce.toFixed(1)}%`
  }

  // ── Monitor ──
  // rf-volatility: Beta / volatility
  const vol = m['v2_volatility']
  const maxDD = m['v2_max_drawdown']
  if (vol != null) {
    v['rf-volatility'] = `Volatility ${vol.toFixed(0)}%` + (maxDD != null ? `, Max DD ${maxDD.toFixed(0)}%` : '')
  }

  // rf-peer-underperform: Returns
  const ret1y = m['v2_return_1y']
  if (ret1y != null) {
    v['rf-peer-underperform'] = `${ret1y >= 0 ? '+' : ''}${ret1y.toFixed(0)}% 1Y return`
  }

  // rf-sector-headwind: (no CMOTS data for this — stays default)

  // rf-liquidity: Volume change ratio as proxy
  const volChange = m['v2_volume_change']
  if (volChange != null) {
    v['rf-liquidity'] = volChange >= 1.5 ? `Volume ${(volChange * 100).toFixed(0)}% of avg (high)`
      : volChange >= 0.8 ? `Volume ${(volChange * 100).toFixed(0)}% of avg (normal)`
      : `Volume ${(volChange * 100).toFixed(0)}% of avg (low)`
  }

  // Institutional context (not a scanner flag, but enriches promoter-related flags)
  const mf = m['mf_holding']
  if (mf != null && fii != null) {
    // Already covered by rf-smart-money-exit above
  }

  // Technical context for monitor flags
  const rsi = m['v2_rsi']
  const ema200 = m['v2_price_ema200']
  if (rsi != null && ema200 != null) {
    // Enrich peer-underperform with technical context
    const techNote = rsi < 30 ? ' (oversold)' : rsi > 70 ? ' (overbought)' : ''
    const emaNote = ema200 > 0 ? ', above 200 EMA' : ', below 200 EMA'
    if (ret1y != null) {
      v['rf-peer-underperform'] = `${ret1y >= 0 ? '+' : ''}${ret1y.toFixed(0)}% 1Y${techNote}${emaNote}`
    }
  }

  return v
}

// ─── Scanner Values from Verdict Segments (quant + qual signals) ──

/**
 * Extract additional scanner display values from scored verdict segments.
 * These supplement CMOTS metrics with data from Screener, BSE, Finnhub, etc.
 * that flows through the quant/qual scoring pipeline.
 */
export function buildScannerValuesFromSegments(
  quantSegments: SegmentVerdictV2[],
  qualFactors: SegmentVerdictV2[],
  priceRecords?: { TotalVolume: number }[],
): Record<string, string> {
  const v: Record<string, string> = {}

  // Helper: find a signal by ID across all signal groups in a segment
  const findSignal = (segments: SegmentVerdictV2[], segId: string, sigId: string) => {
    const seg = segments.find(s => s.id === segId)
    if (!seg?.signalGroups) return null
    for (const g of seg.signalGroups) {
      const sig = g.signals.find(s => s.id === sigId)
      if (sig) return sig
    }
    return null
  }

  // ── From Quant: Financial Health gates ──

  // rf-default → Altman Z-score proxy (G1 gate)
  const g1 = findSignal(quantSegments, 'financial_health', 'G1')
  if (g1?.gateValue) {
    const zScore = parseFloat(g1.gateValue)
    if (!isNaN(zScore)) {
      v['rf-default'] = zScore < 1.1 ? `Z-score ${zScore.toFixed(1)} — distress zone`
        : zScore < 2.6 ? `Z-score ${zScore.toFixed(1)} — grey zone`
        : `Z-score ${zScore.toFixed(1)} — safe zone`
    }
  }

  // rf-forensic → Beneish M-score proxy (G2 gate if it exists)
  const g2 = findSignal(quantSegments, 'financial_health', 'G2')
  if (g2?.gateValue) {
    const mScore = parseFloat(g2.gateValue)
    if (!isNaN(mScore)) {
      v['rf-forensic'] = mScore > -1.78 ? `M-score ${mScore.toFixed(2)} — manipulation risk`
        : `M-score ${mScore.toFixed(2)} — likely clean`
    }
  }

  // ── From Qual: Management & Governance ──

  // rf-pledge → Promoter pledging from MG-A3
  const a3 = findSignal(qualFactors, 'management_governance', 'A3')
  if (a3 && a3.state !== 'not_applicable' && a3.userText) {
    // Extract pledge % from userText (e.g., "Promoter pledging at 5.2%")
    const pledgeMatch = a3.userText.match(/([\d.]+)%\s*pledge/i) || a3.userText.match(/pledge[^.]*?([\d.]+)%/i)
    if (pledgeMatch) {
      v['rf-pledge'] = `${pledgeMatch[1]}% pledged`
    } else if (a3.score != null && a3.score >= 80) {
      v['rf-pledge'] = 'No/minimal pledging'
    }
    // rf-pledge-rising: infer from score trend if available
    if (a3.state === 'flag') {
      v['rf-pledge-rising'] = 'Elevated pledging detected'
    } else {
      v['rf-pledge-rising'] = 'Pledging stable'
    }
  }

  // rf-rpt → Related party transactions from MG-A5
  const a5 = findSignal(qualFactors, 'management_governance', 'A5')
  if (a5 && a5.state !== 'not_applicable') {
    v['rf-rpt'] = a5.state === 'flag' ? 'High RPT activity'
      : a5.state === 'strong' ? 'RPT within limits'
      : a5.userText?.slice(0, 50) || 'RPT data available'
  }

  // rf-insider-selling → Insider sentiment from MG-A4
  const a4 = findSignal(qualFactors, 'management_governance', 'A4')
  if (a4 && a4.state !== 'not_applicable') {
    v['rf-insider-selling'] = a4.state === 'flag' ? 'Net insider selling detected'
      : a4.state === 'strong' ? 'Net insider buying'
      : 'Mixed insider activity'
  }

  // ── From Qual: Earnings Quality ──

  // rf-receivables → Receivables quality from EQ-B1
  const eqB1 = findSignal(qualFactors, 'earnings_quality', 'B1')
  if (eqB1 && eqB1.state !== 'not_applicable') {
    v['rf-receivables'] = eqB1.state === 'flag' ? 'Receivables growing faster than revenue'
      : eqB1.state === 'strong' ? 'Receivables healthy'
      : eqB1.userText?.slice(0, 50) || 'Receivables data available'
  }

  // rf-inventory → Inventory quality from EQ-B2
  const eqB2 = findSignal(qualFactors, 'earnings_quality', 'B2')
  if (eqB2 && eqB2.state !== 'not_applicable') {
    v['rf-inventory'] = eqB2.state === 'flag' ? 'Inventory pileup detected'
      : eqB2.state === 'strong' ? 'Inventory levels healthy'
      : eqB2.userText?.slice(0, 50) || 'Inventory data available'
  }

  // rf-contingent → Contingent liabilities from EQ-B3
  const eqB3 = findSignal(qualFactors, 'earnings_quality', 'B3')
  if (eqB3 && eqB3.state !== 'not_applicable') {
    v['rf-contingent'] = eqB3.state === 'flag' ? 'High contingent liabilities'
      : eqB3.state === 'strong' ? 'Low contingent liabilities'
      : eqB3.userText?.slice(0, 50) || 'Contingent liability data available'
  }

  // ── From Qual: Execution Quality ──

  // rf-analyst-downgrade → Analyst consensus from ExQ-A1
  const exA1 = findSignal(qualFactors, 'execution_quality', 'A1')
  if (exA1 && exA1.state !== 'not_applicable') {
    v['rf-analyst-downgrade'] = exA1.state === 'flag' ? 'Analyst downgrades detected'
      : exA1.state === 'strong' ? 'Analyst consensus positive'
      : exA1.userText?.slice(0, 50) || 'Analyst data available'
  }

  // ── From Qual: Capital Discipline ──

  // rf-promoter-loans → Promoter entity loans from CD signals
  const cdA3 = findSignal(qualFactors, 'capital_discipline', 'A3')
  if (cdA3 && cdA3.state !== 'not_applicable') {
    if (cdA3.state === 'flag') {
      v['rf-promoter-loans'] = 'Promoter borrowing concerns'
    } else {
      v['rf-promoter-loans'] = 'No promoter loan concerns'
    }
  }

  // ── From Price Data: Volume / Liquidity ──

  if (priceRecords && priceRecords.length > 0) {
    // Compute average daily volume from last 30 trading days
    const recent = priceRecords.slice(-30)
    const avgVolume = recent.reduce((sum, r) => sum + (r.TotalVolume || 0), 0) / recent.length
    const avgValueCr = avgVolume / 10_000_000  // Rough: volume × assumed avg price / 1 Cr

    if (avgVolume > 0) {
      v['rf-liquidity'] = avgValueCr >= 100 ? `₹${Math.round(avgValueCr)} Cr/day avg`
        : avgValueCr >= 10 ? `₹${Math.round(avgValueCr)} Cr/day avg`
        : `₹${avgValueCr.toFixed(1)} Cr/day (low)`
    }
  }

  return v
}
