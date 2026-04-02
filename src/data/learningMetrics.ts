/**
 * Learning Mode — Preview Metrics per Segment
 *
 * Maps each V2 segment/factor ID to the raw metric keys (from resolvedMetrics)
 * that should be shown to the user BEFORE they rate the segment.
 * These are the same values the scoring engine used — the user sees the evidence
 * but must interpret whether it's "good" or "bad" on their own.
 */

export interface PreviewMetric {
  key: string         // resolvedMetrics key (e.g., 'v2_interest_coverage')
  label: string       // Display name (e.g., 'Interest Coverage')
  unit: string        // '%', 'x', 'Rs Cr', etc.
  format: 'decimal1' | 'decimal2' | 'percent' | 'integer' | 'currency'
  hint?: string       // Optional 1-line hint (shown AFTER reveal, not before)
}

export const SEGMENT_PREVIEW_METRICS: Record<string, PreviewMetric[]> = {
  // ── Quant Segments ──
  financial_health: [
    { key: 'v2_interest_coverage', label: 'Interest Coverage', unit: 'x', format: 'decimal1', hint: 'Higher = more comfortable debt service' },
    { key: 'v2_debt_ebitda', label: 'Debt/EBITDA', unit: 'x', format: 'decimal1', hint: 'Lower = less leveraged' },
    { key: 'v2_cfo_vs_pat', label: 'OCF/PAT', unit: '%', format: 'integer', hint: 'Higher = profits backed by real cash' },
    { key: 'v2_fcf_yield', label: 'FCF Yield', unit: '%', format: 'decimal1', hint: 'Higher = more free cash per rupee invested' },
    { key: 'v2_accruals_ratio', label: 'Accruals Ratio', unit: '%', format: 'decimal1', hint: 'Lower = higher earnings quality' },
  ],
  profitability: [
    { key: 'raw_roe', label: 'ROE', unit: '%', format: 'decimal1', hint: 'Return generated on shareholder equity' },
    { key: 'v2_roce', label: 'ROCE', unit: '%', format: 'decimal1', hint: 'Return on total capital employed' },
    { key: 'raw_opm', label: 'Operating Margin', unit: '%', format: 'decimal1', hint: 'How much of revenue becomes operating profit' },
    { key: 'raw_npm', label: 'Net Profit Margin', unit: '%', format: 'decimal1', hint: 'Bottom-line profitability' },
  ],
  growth: [
    { key: 'v2_revenue_cagr_3y', label: 'Revenue CAGR (3Y)', unit: '%', format: 'decimal1', hint: 'Compound annual revenue growth' },
    { key: 'v2_pat_cagr_3y', label: 'PAT CAGR (3Y)', unit: '%', format: 'decimal1', hint: 'Compound annual profit growth' },
    { key: 'v2_ebitda_growth', label: 'EBITDA Growth', unit: '%', format: 'decimal1', hint: 'Operating profit growth' },
  ],
  valuation: [
    { key: 'raw_pe', label: 'P/E Ratio', unit: 'x', format: 'decimal1', hint: 'Price relative to earnings — lower may be cheaper' },
    { key: 'raw_pb', label: 'P/B Ratio', unit: 'x', format: 'decimal1', hint: 'Price relative to book value' },
    { key: 'raw_ev', label: 'EV/EBITDA', unit: 'x', format: 'decimal1', hint: 'Enterprise value relative to operating profit' },
    { key: 'v2_peg_ratio', label: 'PEG Ratio', unit: 'x', format: 'decimal2', hint: 'PE adjusted for growth — <1 may be undervalued' },
  ],
  technical: [
    { key: 'v2_rsi', label: 'RSI (14-day)', unit: '', format: 'integer', hint: '<30 oversold, >70 overbought' },
    { key: 'v2_price_ema200', label: 'Price vs 200-EMA', unit: '%', format: 'decimal1', hint: 'Positive = above long-term average' },
    { key: 'v2_volatility', label: 'Annualized Volatility', unit: '%', format: 'integer', hint: 'Higher = more price swings' },
  ],
  performance: [
    { key: 'v2_return_1y', label: '1-Year Return', unit: '%', format: 'decimal1' },
    { key: 'v2_return_3y', label: '3-Year Return', unit: '%', format: 'decimal1' },
    { key: 'v2_max_drawdown', label: 'Max Drawdown', unit: '%', format: 'decimal1', hint: 'Worst peak-to-trough decline' },
  ],
  institutional: [
    { key: 'promoter_holding', label: 'Promoter Holding', unit: '%', format: 'decimal1' },
    { key: 'fii_holding', label: 'FII Holding', unit: '%', format: 'decimal1' },
    { key: 'dii_holding', label: 'DII Holding', unit: '%', format: 'decimal1' },
    { key: 'promoter_holding_change_1y', label: 'Promoter Change (1Y)', unit: 'pp', format: 'decimal1', hint: 'Positive = promoter increasing stake' },
  ],

  // ── Qual Factors ──
  management_governance: [
    { key: 'promoter_holding', label: 'Promoter Holding', unit: '%', format: 'decimal1', hint: 'Higher = more skin in the game' },
    { key: 'promoter_pledge', label: 'Promoter Pledge', unit: '%', format: 'decimal1', hint: '0% ideal — pledging = borrowing against shares' },
    { key: 'promoter_holding_change_1y', label: 'Promoter Change (1Y)', unit: 'pp', format: 'decimal1' },
  ],
  business_quality: [
    { key: 'v2_roce', label: 'ROCE', unit: '%', format: 'decimal1', hint: 'Consistency matters more than level' },
    { key: 'raw_opm', label: 'Operating Margin', unit: '%', format: 'decimal1' },
    { key: 'v2_cfo_vs_pat', label: 'Cash Backing (OCF/PAT)', unit: '%', format: 'integer' },
  ],
  capital_discipline: [
    { key: 'v2_debt_ebitda', label: 'Debt/EBITDA', unit: 'x', format: 'decimal1' },
    { key: 'v2_dividend_yield', label: 'Dividend Yield', unit: '%', format: 'decimal1' },
    { key: 'v2_shares_change', label: 'Shares Outstanding Change', unit: '%', format: 'decimal1', hint: 'Negative = buyback, Positive = dilution' },
  ],
  earnings_quality: [
    { key: 'v2_cfo_vs_pat', label: 'OCF/PAT Ratio', unit: '%', format: 'integer', hint: '>80% ideal — profits converting to cash' },
    { key: 'v2_fcf_yield', label: 'FCF Yield', unit: '%', format: 'decimal1' },
    { key: 'v2_accruals_ratio', label: 'Accruals Ratio', unit: '%', format: 'decimal1', hint: 'Lower = more reliable earnings' },
  ],
  execution_quality: [
    { key: 'raw_opm', label: 'Operating Margin', unit: '%', format: 'decimal1', hint: 'Consistency over time matters' },
    { key: 'v2_roce', label: 'ROCE', unit: '%', format: 'decimal1' },
  ],

  // ── Risk ──
  red_flag_scanner: [
    { key: 'promoter_holding', label: 'Promoter Holding', unit: '%', format: 'decimal1' },
    { key: 'v2_interest_coverage', label: 'Interest Coverage', unit: 'x', format: 'decimal1' },
    { key: 'v2_debt_ebitda', label: 'Debt/EBITDA', unit: 'x', format: 'decimal1' },
    { key: 'v2_volatility', label: 'Volatility', unit: '%', format: 'integer' },
  ],
}

/**
 * Format a metric value for display.
 */
export function formatMetricValue(value: number | null, metric: PreviewMetric): string {
  if (value == null) return 'N/A'
  switch (metric.format) {
    case 'decimal1': return `${value.toFixed(1)}${metric.unit}`
    case 'decimal2': return `${value.toFixed(2)}${metric.unit}`
    case 'percent': return `${value.toFixed(1)}%`
    case 'integer': return `${Math.round(value)}${metric.unit}`
    case 'currency': return `₹${value.toLocaleString('en-IN')}`
    default: return String(value)
  }
}

/**
 * Rating bands — maps user's qualitative guess to a numeric range.
 */
export type RatingBand = 'very_weak' | 'weak' | 'mixed' | 'good' | 'strong'

export const RATING_BANDS: { band: RatingBand; label: string; range: [number, number]; emoji: string; color: string }[] = [
  { band: 'very_weak', label: 'Very Weak', range: [0, 20], emoji: '😟', color: 'text-destructive-400' },
  { band: 'weak', label: 'Weak', range: [20, 40], emoji: '😕', color: 'text-warning-400' },
  { band: 'mixed', label: 'Mixed', range: [40, 60], emoji: '😐', color: 'text-neutral-400' },
  { band: 'good', label: 'Good', range: [60, 80], emoji: '😊', color: 'text-teal-400' },
  { band: 'strong', label: 'Strong', range: [80, 100], emoji: '🔥', color: 'text-success-400' },
]

/**
 * Determine accuracy of user's guess vs system score.
 */
export function getAccuracy(userBand: RatingBand, systemScore: number): { result: 'match' | 'close' | 'miss'; label: string; emoji: string; color: string } {
  const bandDef = RATING_BANDS.find(b => b.band === userBand)!
  const [lo, hi] = bandDef.range
  if (systemScore >= lo && systemScore < hi) {
    return { result: 'match', label: 'Spot On!', emoji: '🎯', color: 'text-success-400' }
  }
  // Close = within 1 band (±20 points)
  if (systemScore >= lo - 20 && systemScore < hi + 20) {
    return { result: 'close', label: 'Close!', emoji: '👍', color: 'text-teal-400' }
  }
  return { result: 'miss', label: 'Off Target', emoji: '📚', color: 'text-warning-400' }
}

/**
 * Gamification badges based on accuracy.
 */
export function getLearningBadge(matchCount: number, totalRated: number): { title: string; emoji: string; description: string } {
  if (totalRated === 0) return { title: 'Getting Started', emoji: '🌱', description: 'Rate your first segment!' }
  const accuracy = matchCount / totalRated
  if (accuracy >= 0.8 && totalRated >= 8) return { title: 'Market Guru', emoji: '🧠', description: `${Math.round(accuracy * 100)}% accuracy — you read stocks like a pro` }
  if (accuracy >= 0.6 && totalRated >= 6) return { title: 'Sharp Analyst', emoji: '📊', description: `${Math.round(accuracy * 100)}% accuracy — solid analytical skills` }
  if (accuracy >= 0.4 && totalRated >= 4) return { title: 'Rising Researcher', emoji: '🔍', description: `${Math.round(accuracy * 100)}% accuracy — keep practicing!` }
  if (totalRated >= 3) return { title: 'Curious Explorer', emoji: '🗺️', description: `${Math.round(accuracy * 100)}% accuracy — learning every session` }
  return { title: 'First Steps', emoji: '👣', description: `${totalRated} segments rated — keep going!` }
}
