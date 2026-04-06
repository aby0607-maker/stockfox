/**
 * Valuation Service — Graham Number, DCF Fair Value, Earnings Yield
 *
 * Computes intrinsic value estimates using data already available from
 * CMOTS TTM (EPS, Book Value, FCF) and CMOTS CashFlow statements.
 *
 * All computations are client-side — no new API calls needed.
 *
 * Models:
 * 1. Graham Number = sqrt(22.5 x EPS x BVPS)
 * 2. DCF Fair Value = sum(projected FCF / (1+WACC)^t) + terminal value
 * 3. Earnings Yield = EPS / CMP (inverse P/E)
 * 4. PEG-implied fair value = Fair P/E x EPS
 */

export interface ValuationEstimate {
  grahamNumber: number | null        // Intrinsic value per Graham formula
  grahamMargin: number | null        // % margin of safety (negative = overvalued)
  dcfFairValue: number | null        // DCF-based intrinsic value
  dcfMargin: number | null           // % margin of safety
  earningsYield: number | null       // EPS / CMP as %
  pegImpliedPE: number | null        // PEG-implied fair P/E
  pegFairValue: number | null        // PEG-implied fair value per share
  verdict: 'undervalued' | 'fairly_valued' | 'overvalued' | null
}

interface ValuationInputs {
  eps: number | null           // TTM Earnings Per Share
  bookValuePerShare: number | null  // From P/B ratio: CMP / PB
  currentPrice: number         // Current market price
  pe: number | null            // P/E ratio
  pb: number | null            // P/B ratio
  roe: number | null           // Return on Equity %
  growthRate: number | null    // Revenue/EPS growth rate % (5Y CAGR)
  fcfHistory: number[]         // Last 3-5 years of FCF (Cr)
  sharesOutstanding: number | null  // Number of shares
}

/**
 * Graham Number = sqrt(22.5 x EPS x BVPS)
 *
 * Benjamin Graham's conservative estimate of intrinsic value.
 * Assumes P/E should not exceed 15x and P/B should not exceed 1.5x.
 * Works best for stable, profitable companies. Meaningless for loss-making or high-growth.
 */
function computeGrahamNumber(eps: number | null, bvps: number | null): number | null {
  if (eps == null || bvps == null || eps <= 0 || bvps <= 0) return null
  return Math.sqrt(22.5 * eps * bvps)
}

/**
 * Simple DCF = sum of projected FCF discounted at WACC + terminal value
 *
 * Uses 5Y FCF CAGR to project future cash flows. Falls back to 8% growth
 * if insufficient FCF history. Terminal growth rate: 3% (GDP proxy).
 * WACC: 12% for Indian equities (equity risk premium + risk-free rate).
 *
 * Returns per-share fair value.
 */
function computeDCF(
  fcfHistory: number[],
  sharesOutstanding: number | null,
  growthOverride?: number | null,
): number | null {
  if (fcfHistory.length < 2 || !sharesOutstanding || sharesOutstanding <= 0) return null

  // Compute FCF growth rate from history
  const firstFCF = fcfHistory[0]
  const lastFCF = fcfHistory[fcfHistory.length - 1]
  if (firstFCF <= 0 || lastFCF <= 0) return null

  const years = fcfHistory.length - 1
  const fcfCAGR = growthOverride != null
    ? growthOverride / 100
    : (Math.pow(lastFCF / firstFCF, 1 / years) - 1)

  // Cap growth rate between -5% and 25%
  const growthRate = Math.max(-0.05, Math.min(0.25, fcfCAGR))
  const WACC = 0.12          // 12% discount rate for Indian equities
  const TERMINAL_GROWTH = 0.03  // 3% terminal growth (India GDP proxy)
  const PROJECTION_YEARS = 5

  let totalPV = 0
  let projectedFCF = lastFCF

  // Project and discount FCF for projection years
  for (let t = 1; t <= PROJECTION_YEARS; t++) {
    projectedFCF = projectedFCF * (1 + growthRate)
    totalPV += projectedFCF / Math.pow(1 + WACC, t)
  }

  // Terminal value (Gordon Growth Model)
  const terminalFCF = projectedFCF * (1 + TERMINAL_GROWTH)
  const terminalValue = terminalFCF / (WACC - TERMINAL_GROWTH)
  const pvTerminal = terminalValue / Math.pow(1 + WACC, PROJECTION_YEARS)

  const enterpriseValue = totalPV + pvTerminal
  const fairValuePerShare = enterpriseValue / (sharesOutstanding / 10000000) // shares in crores context

  // Sanity check — if the result is absurdly high or negative, return null
  if (fairValuePerShare <= 0 || fairValuePerShare > 100000) return null
  return fairValuePerShare
}

/**
 * Compute all valuation estimates for a stock.
 *
 * @param inputs - All available financial data
 * @returns ValuationEstimate with Graham, DCF, and other metrics
 */
export function computeValuation(inputs: ValuationInputs): ValuationEstimate {
  const { eps, bookValuePerShare, currentPrice, pe, roe, growthRate, fcfHistory, sharesOutstanding } = inputs

  // 1. Graham Number
  const bvps = bookValuePerShare ?? (inputs.pb != null && inputs.pb > 0 ? currentPrice / inputs.pb : null)
  const grahamNumber = computeGrahamNumber(eps, bvps)
  const grahamMargin = grahamNumber != null
    ? ((grahamNumber - currentPrice) / currentPrice) * 100
    : null

  // 2. DCF Fair Value
  const dcfFairValue = computeDCF(fcfHistory, sharesOutstanding, growthRate)
  const dcfMargin = dcfFairValue != null
    ? ((dcfFairValue - currentPrice) / currentPrice) * 100
    : null

  // 3. Earnings Yield = EPS / CMP
  const earningsYield = eps != null && eps > 0 && currentPrice > 0
    ? (eps / currentPrice) * 100
    : null

  // 4. PEG-implied fair value
  // If PEG = 1 is fair, then Fair P/E = Growth Rate
  // PEG-implied fair value = Growth Rate x EPS
  const impliedGrowth = growthRate ?? (roe != null ? roe : null)
  const pegImpliedPE = impliedGrowth != null && impliedGrowth > 0 ? impliedGrowth : null
  const pegFairValue = pegImpliedPE != null && eps != null && eps > 0
    ? pegImpliedPE * eps
    : null

  // Overall verdict — average of available margins
  const margins = [grahamMargin, dcfMargin].filter(m => m != null) as number[]
  let verdict: ValuationEstimate['verdict'] = null
  if (margins.length > 0) {
    const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length
    verdict = avgMargin > 15 ? 'undervalued' : avgMargin < -15 ? 'overvalued' : 'fairly_valued'
  }

  return {
    grahamNumber, grahamMargin,
    dcfFairValue, dcfMargin,
    earningsYield,
    pegImpliedPE, pegFairValue,
    verdict,
  }
}

/**
 * Extract FCF history from CMOTS CashFlow statement rows.
 * FCF = Operating Cash Flow (rowno ~1 or ~15) - Capex (usually negative, rowno ~20-25)
 *
 * This is a helper to be called from the InfoTab when CashFlow data is available.
 */
export function extractFCFFromCashFlow(
  cashFlowRows: { COLUMNNAME: string; rowno: number; [key: string]: string | number }[]
): { year: string; fcf: number }[] {
  // Find OCF row (typically rowno 1 = "Cash from Operating Activity")
  const ocfRow = cashFlowRows.find(r =>
    r.rowno <= 3 && (r.COLUMNNAME || '').toLowerCase().includes('operat')
  )
  // Find Capex row (typically "Purchase of Fixed Assets" or similar)
  const capexRow = cashFlowRows.find(r =>
    (r.COLUMNNAME || '').toLowerCase().includes('fixed asset') ||
    (r.COLUMNNAME || '').toLowerCase().includes('capex') ||
    (r.COLUMNNAME || '').toLowerCase().includes('purchase of')
  )

  if (!ocfRow) return []

  const yearCols = Object.keys(ocfRow).filter(k => k.startsWith('Y') && k.length >= 7).sort()
  const results: { year: string; fcf: number }[] = []

  for (const col of yearCols) {
    const ocf = typeof ocfRow[col] === 'number' ? ocfRow[col] as number : 0
    const capex = capexRow && typeof capexRow[col] === 'number' ? Math.abs(capexRow[col] as number) : 0
    results.push({ year: col.replace('Y', ''), fcf: ocf - capex })
  }

  return results
}
