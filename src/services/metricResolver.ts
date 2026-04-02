/**
 * Metric Resolver — Maps CMOTS data to scoring metric IDs
 *
 * Bridge between raw CMOTS API responses and the scoring engine's
 * abstract metric IDs. All field name mapping, growth derivation,
 * and ratio computation happens here.
 *
 * Simplified from backtesting version: no asOfDate windowing,
 * no batch processing, no custom metrics.
 *
 * Data flow:
 *   CMOTS endpoints → fundamentals.ts (raw fetch) → THIS FILE → quantScoringService
 */

import type { CMOTSTTMRecord, CMOTSFinancialRecord, CMOTSStatementRow, CMOTSShareholding } from '@/types'
import { getAllFundamentals, findStatementRow, getStatementValue, getYearColumns } from '@/services/cmots/fundamentals'
import { getCompanyBySymbol } from '@/services/cmots/companyMaster'
import { getHistoricalPrices } from '@/services/cmots/priceData'
import { ema, rsi, volumePriceTrend, priceVsEMA } from '@/lib/technicalCalc'

// ─── Return Type ─────────────────────────────────

export interface ResolvedMetrics {
  data: Record<string, number | null>
  context?: Record<string, { startValue?: number; endValue?: number }>
}

// ─── Row Numbers (from CMOTS API testing) ────────

// P&L rows
const PNL_ROW_EBITDA = 46
const PNL_ROW_PAT = 35
const PNL_ROW_REVENUE = 1
const PNL_ROW_EPS = 44

// Cash Flow rows
const CF_ROW_OCF = 68

// Balance Sheet rows
const BS_ROW_FIXED_ASSETS = 2
const BS_ROW_CASH = 29
const BS_ROW_ST_BORROWINGS = 44
const BS_ROW_LT_BORROWINGS = 58
const BS_ROW_SHAREHOLDERS_FUND = 80
const BS_ROW_SHARES_OUTSTANDING = 91

// Quarterly rows
const QR_ROW_REVENUE = 1
const QR_ROW_OP_PROFIT = 14

// ─── Core Mapping Function ──────────────────────

type TechnicalResult = {
  ema20Dev: number; ema50Dev: number; ema200Dev: number
  rsi: number; vpt: number
  volumeChange: number | null; priceChange: number | null
}

/**
 * Map all available CMOTS data to flat metric values for the scoring engine.
 */
function mapCMOTSToMetricIds(
  ttm: CMOTSTTMRecord | null,
  finData: CMOTSFinancialRecord[],
  pnl: CMOTSStatementRow[],
  cashFlow: CMOTSStatementRow[],
  balanceSheet: CMOTSStatementRow[],
  quarterly: CMOTSStatementRow[],
  technicalData?: TechnicalResult,
  shareholding?: CMOTSShareholding[],
  priceHistory?: { date: string; price: number }[],
): Record<string, number | null> {
  const metrics: Record<string, number | null> = {}

  // ── Growth Metrics ──
  metrics['v2_revenue_growth'] = computeRevenueGrowth(finData, pnl)
  metrics['v2_ebitda_growth'] = computeRowGrowth(pnl, PNL_ROW_EBITDA)
  metrics['v2_earnings_growth'] = computeRowGrowth(pnl, PNL_ROW_PAT)

  // ── Profitability: ROE (5Y average) ──
  if (balanceSheet.length > 0 && pnl.length > 0) {
    metrics['v2_roe'] = computeAvgROE(pnl, balanceSheet)
  } else {
    metrics['v2_roe'] = ttm?.roe_ttm ?? null
  }

  // ── Profitability: TTM ratios (pass-through) ──
  metrics['v2_roce'] = ttm?.roce_ttm ?? null
  metrics['v2_opm'] = ttm?.operatingprofitmargin ?? null
  metrics['v2_npm'] = ttm?.netprofitmargin ?? null
  metrics['v2_roa'] = ttm?.returnonassets ?? null

  // ── Profitability: ROE multi-year trend (slope) ──
  metrics['v2_roe_trend'] = computeROETrend(pnl, balanceSheet)

  // ── Financial Health: TTM ratios ──
  metrics['v2_current_ratio'] = ttm?.currentratio ?? null
  metrics['v2_quick_ratio'] = ttm?.quickratio ?? null
  metrics['v2_debt_to_equity'] = ttm?.debttoequity ?? null
  metrics['v2_asset_turnover'] = ttm?.assetturnover_ttm ?? null

  // ── Financial Health: Interest Coverage from FinData ──
  metrics['v2_interest_coverage'] = finData.length > 0
    ? finData[finData.length - 1].interestcoverageratio : null

  // ── Financial Health: Accruals Ratio (PAT - OCF) / Total Assets ──
  const latestPAT = getLatestStatementValue(pnl, PNL_ROW_PAT)
  const latestOCF = getLatestStatementValue(cashFlow, CF_ROW_OCF)
  const latestTotalAssets = finData.length > 0 ? finData[finData.length - 1].totalassets : null
  metrics['v2_accruals_ratio'] = latestPAT != null && latestOCF != null && latestTotalAssets != null && latestTotalAssets !== 0
    ? ((latestPAT - latestOCF) / latestTotalAssets) * 100 : null

  // ── Financial Health: FCF Yield (FCF per share / price) ──
  const fcfPerShare = finData.length > 0 ? finData[finData.length - 1].freecashflowpershare : null
  const latestPrice = priceHistory && priceHistory.length > 0
    ? priceHistory[priceHistory.length - 1].price : null
  metrics['v2_fcf_yield'] = fcfPerShare != null && latestPrice != null && latestPrice > 0
    ? (fcfPerShare / latestPrice) * 100 : null

  // ── Valuation: PEG and Dividend Yield ──
  metrics['v2_peg_ratio'] = ttm?.pegratio ?? null
  metrics['v2_dividend_yield'] = ttm?.dividendyield ?? null
  metrics['v2_earnings_yield'] = ttm?.pe_ttm != null && ttm.pe_ttm > 0
    ? (1 / ttm.pe_ttm) * 100 : null

  // ── Performance: Period returns from price history ──
  if (priceHistory && priceHistory.length > 0) {
    const currentP = priceHistory[priceHistory.length - 1].price
    metrics['v2_return_1y'] = computePeriodReturn(priceHistory, currentP, 252)
    metrics['v2_return_3y'] = computePeriodReturn(priceHistory, currentP, 756)
    metrics['v2_return_5y'] = computePeriodReturn(priceHistory, currentP, 1260)
    metrics['v2_max_drawdown'] = computeMaxDrawdown(priceHistory.map(p => p.price))
    metrics['v2_volatility'] = computeAnnualizedVolatility(priceHistory.map(p => p.price))
  } else {
    metrics['v2_return_1y'] = null
    metrics['v2_return_3y'] = null
    metrics['v2_return_5y'] = null
    metrics['v2_max_drawdown'] = null
    metrics['v2_volatility'] = null
  }

  // ── Institutional: MF holding ──
  if (shareholding && shareholding.length > 0) {
    metrics['mf_holding'] = shareholding[0].MutualFund
    metrics['promoter_pledge'] = null // Not available from CMOTS shareholding endpoint

    if (shareholding.length >= 4) {
      // 1-year promoter change (4 quarters back)
      metrics['promoter_holding_change_1y'] = shareholding[0].Promoters - shareholding[3].Promoters
    } else {
      metrics['promoter_holding_change_1y'] = null
    }
  } else {
    metrics['mf_holding'] = null
    metrics['promoter_pledge'] = null
    metrics['promoter_holding_change_1y'] = null
  }

  // ── Cash Flow Quality: OCF / EBITDA ──
  const ocf = getLatestStatementValue(cashFlow, CF_ROW_OCF)
  const ebitdaVal = getLatestStatementValue(pnl, PNL_ROW_EBITDA)
  metrics['v2_ocf_ebitda'] = ocf != null && ebitdaVal != null && ebitdaVal !== 0
    ? (ocf / ebitdaVal) * 100
    : null

  // ── Leverage: Debt/EBITDA ──
  if (balanceSheet.length > 0 && pnl.length > 0) {
    metrics['v2_debt_ebitda'] = computeDebtEBITDA(pnl, balanceSheet)
  } else {
    metrics['v2_debt_ebitda'] = null
  }

  // ── Gross Block Growth ──
  if (balanceSheet.length > 0) {
    metrics['v2_gross_block'] = computeStatementGrowth(balanceSheet, BS_ROW_FIXED_ASSETS)
  } else {
    metrics['v2_gross_block'] = computeFinDataGrowth(finData, 'totalassets')
  }

  // ── Valuation: PE, PB, EV/EBITDA as RATIOS vs 5Y Average ──
  const currentPE = ttm?.pe_ttm ?? null
  const currentPB = ttm?.pb_ttm ?? null
  const currentEV = ttm?.ev_ebitda ?? null
  metrics['raw_pe'] = currentPE
  metrics['raw_pb'] = currentPB
  metrics['raw_ev'] = currentEV

  if (priceHistory && priceHistory.length > 0) {
    const avg = compute5YAvgValuation(pnl, balanceSheet, priceHistory)
    metrics['v2_pe_vs_5y'] = currentPE != null && avg.avgPE != null && avg.avgPE > 0
      ? currentPE / avg.avgPE : null
    metrics['v2_pb_vs_5y'] = currentPB != null && avg.avgPB != null && avg.avgPB > 0
      ? currentPB / avg.avgPB : null
    metrics['v2_ev_vs_5y'] = currentEV != null && avg.avgEV != null && avg.avgEV > 0
      ? currentEV / avg.avgEV : null
    metrics['hist_avg_pe'] = avg.avgPE
    metrics['hist_avg_pb'] = avg.avgPB
    metrics['hist_avg_ev'] = avg.avgEV
  } else {
    metrics['v2_pe_vs_5y'] = null
    metrics['v2_pb_vs_5y'] = null
    metrics['v2_ev_vs_5y'] = null
    metrics['hist_avg_pe'] = null
    metrics['hist_avg_pb'] = null
    metrics['hist_avg_ev'] = null
  }

  // ── Quarterly Momentum ──
  const { revenueMultiplier, ebitdaMultiplier } = computeQuarterlyMultipliers(quarterly)
  metrics['v2_revenue_multiplier'] = revenueMultiplier
  metrics['v2_ebitda_multiplier'] = ebitdaMultiplier

  // ── Technical Metrics ──
  if (technicalData) {
    metrics['v2_price_ema20'] = technicalData.ema20Dev
    metrics['v2_price_ema50'] = technicalData.ema50Dev
    metrics['v2_price_ema200'] = technicalData.ema200Dev
    metrics['v2_rsi'] = technicalData.rsi
    metrics['v2_vpt'] = technicalData.vpt
    metrics['v2_volume_change'] = technicalData.volumeChange
    metrics['v2_price_change'] = technicalData.priceChange
  } else {
    metrics['v2_price_ema20'] = null
    metrics['v2_price_ema50'] = null
    metrics['v2_price_ema200'] = null
    metrics['v2_rsi'] = null
    metrics['v2_vpt'] = null
    metrics['v2_volume_change'] = null
    metrics['v2_price_change'] = null
  }

  // ── Ownership Metrics ──
  if (shareholding && shareholding.length > 0) {
    const latest = shareholding[0]
    metrics['promoter_holding'] = latest.Promoters
    metrics['fii_holding'] = latest.ForeignInstitution
    metrics['dii_holding'] = latest.MutualFund + latest.OtherDomesticInstitution

    const prev = shareholding[1]
    if (prev) {
      metrics['promoter_holding_change_3m'] = latest.Promoters - prev.Promoters
      metrics['fii_holding_change_3m'] = latest.ForeignInstitution - prev.ForeignInstitution
    } else {
      metrics['promoter_holding_change_3m'] = null
      metrics['fii_holding_change_3m'] = null
    }
  } else {
    metrics['promoter_holding'] = null
    metrics['fii_holding'] = null
    metrics['dii_holding'] = null
    metrics['promoter_holding_change_3m'] = null
    metrics['fii_holding_change_3m'] = null
  }

  return metrics
}

// ─── Valuation Helpers ───────────────────────────

function compute5YAvgValuation(
  pnl: CMOTSStatementRow[],
  balanceSheet: CMOTSStatementRow[],
  priceHistory: { date: string; price: number }[],
): { avgPE: number | null; avgPB: number | null; avgEV: number | null } {
  const epsRow = findStatementRow(pnl, PNL_ROW_EPS)
  const ebitdaRow = findStatementRow(pnl, PNL_ROW_EBITDA)
  const shFundRow = findStatementRow(balanceSheet, BS_ROW_SHAREHOLDERS_FUND)
  const sharesRow = findStatementRow(balanceSheet, BS_ROW_SHARES_OUTSTANDING)
  const ltDebtRow = findStatementRow(balanceSheet, BS_ROW_LT_BORROWINGS)
  const stDebtRow = findStatementRow(balanceSheet, BS_ROW_ST_BORROWINGS)
  const cashRow = findStatementRow(balanceSheet, BS_ROW_CASH)

  const referenceRow = epsRow || ebitdaRow || shFundRow
  if (!referenceRow) return { avgPE: null, avgPB: null, avgEV: null }

  const yearCols = getYearColumns(referenceRow)
  if (yearCols.length === 0) return { avgPE: null, avgPB: null, avgEV: null }

  const peValues: number[] = []
  const pbValues: number[] = []
  const evValues: number[] = []

  for (const col of yearCols) {
    const year = parseInt(col.slice(1, 5))
    const month = parseInt(col.slice(5, 7))
    const lastDay = new Date(year, month, 0).getDate()
    const fyEndDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const fyPrice = findClosestPrice(priceHistory, fyEndDate)
    if (fyPrice == null || fyPrice <= 0) continue

    if (epsRow) {
      const eps = getStatementValue(epsRow, col)
      if (eps != null && eps > 0) peValues.push(fyPrice / eps)
    }

    if (shFundRow && sharesRow) {
      const shFund = getStatementValue(shFundRow, col)
      const shares = getStatementValue(sharesRow, col)
      if (shFund != null && shares != null && shares > 0) {
        const bvPerShare = (shFund * 10000000) / shares
        if (bvPerShare > 0) pbValues.push(fyPrice / bvPerShare)
      }
    }

    if (ebitdaRow && sharesRow) {
      const ebitda = getStatementValue(ebitdaRow, col)
      const shares = getStatementValue(sharesRow, col)
      if (ebitda != null && ebitda > 0 && shares != null && shares > 0) {
        const mcapCr = (fyPrice * shares) / 10000000
        const ltDebt = ltDebtRow ? (getStatementValue(ltDebtRow, col) ?? 0) : 0
        const stDebt = stDebtRow ? (getStatementValue(stDebtRow, col) ?? 0) : 0
        const cash = cashRow ? (getStatementValue(cashRow, col) ?? 0) : 0
        const ev = mcapCr + ltDebt + stDebt - cash
        if (ev > 0) evValues.push(ev / ebitda)
      }
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  return { avgPE: avg(peValues), avgPB: avg(pbValues), avgEV: avg(evValues) }
}

// ─── Profitability & Leverage ────────────────────

function computeAvgROE(pnl: CMOTSStatementRow[], balanceSheet: CMOTSStatementRow[]): number | null {
  const patRow = findStatementRow(pnl, PNL_ROW_PAT)
  const shFundRow = findStatementRow(balanceSheet, BS_ROW_SHAREHOLDERS_FUND)
  if (!patRow || !shFundRow) return null

  const patCols = getYearColumns(patRow)
  const shFundCols = getYearColumns(shFundRow)
  if (patCols.length === 0 || shFundCols.length === 0) return null

  const roeValues: number[] = []
  for (const col of patCols) {
    if (!shFundCols.includes(col)) continue
    const pat = getStatementValue(patRow, col)
    const shFund = getStatementValue(shFundRow, col)
    if (pat != null && shFund != null && shFund !== 0) {
      roeValues.push((pat / shFund) * 100)
    }
  }

  if (roeValues.length === 0) return null
  return roeValues.reduce((a, b) => a + b, 0) / roeValues.length
}

function computeDebtEBITDA(pnl: CMOTSStatementRow[], balanceSheet: CMOTSStatementRow[]): number | null {
  const ebitdaRow = findStatementRow(pnl, PNL_ROW_EBITDA)
  if (!ebitdaRow) return null

  const ebitdaCols = getYearColumns(ebitdaRow)
  if (ebitdaCols.length === 0) return null
  const ebitdaVal = getStatementValue(ebitdaRow, ebitdaCols[0])
  if (!ebitdaVal || ebitdaVal === 0) return null

  const ltRow = findStatementRow(balanceSheet, BS_ROW_LT_BORROWINGS)
  const stRow = findStatementRow(balanceSheet, BS_ROW_ST_BORROWINGS)
  const ltCols = ltRow ? getYearColumns(ltRow) : []
  const stCols = stRow ? getYearColumns(stRow) : []
  const ltDebt = ltCols.length > 0 && ltRow ? (getStatementValue(ltRow, ltCols[0]) ?? 0) : 0
  const stDebt = stCols.length > 0 && stRow ? (getStatementValue(stRow, stCols[0]) ?? 0) : 0

  return (ltDebt + stDebt) / ebitdaVal
}

// ─── Growth Helpers ──────────────────────────────

function computeRevenueGrowth(finData: CMOTSFinancialRecord[], pnl: CMOTSStatementRow[]): number | null {
  if (finData.length >= 2) {
    const oldest = finData[0]
    const latest = finData[finData.length - 1]
    if (oldest.revenue !== 0 && (oldest.revenue > 0) === (latest.revenue > 0)) {
      return computeCAGR(oldest.revenue, latest.revenue, finData.length - 1)
    }
  }
  return computeRowGrowth(pnl, PNL_ROW_REVENUE)
}

function computeRowGrowth(rows: CMOTSStatementRow[], rowno: number): number | null {
  const row = findStatementRow(rows, rowno)
  if (!row) return null

  const yearCols = getYearColumns(row)
  if (yearCols.length < 2) return null

  const latest = getStatementValue(row, yearCols[0])
  const oldest = getStatementValue(row, yearCols[yearCols.length - 1])
  if (latest == null || oldest == null || oldest === 0) return null
  if ((oldest < 0) !== (latest < 0)) return null
  return computeCAGR(oldest, latest, yearCols.length - 1)
}

function computeStatementGrowth(rows: CMOTSStatementRow[], rowno: number): number | null {
  return computeRowGrowth(rows, rowno)
}

function computeFinDataGrowth(finData: CMOTSFinancialRecord[], field: keyof CMOTSFinancialRecord): number | null {
  if (finData.length < 2) return null
  const oldest = finData[0][field] as number
  const latest = finData[finData.length - 1][field] as number
  if (oldest == null || latest == null || oldest === 0) return null
  if ((oldest < 0) !== (latest < 0)) return null
  return computeCAGR(oldest, latest, finData.length - 1)
}

function computeCAGR(start: number, end: number, years: number): number {
  if (years <= 0 || start === 0) return 0
  const ratio = end / start
  if (ratio < 0) return 0
  return (Math.pow(ratio, 1 / years) - 1) * 100
}

function getLatestStatementValue(rows: CMOTSStatementRow[], rowno: number): number | null {
  const row = findStatementRow(rows, rowno)
  if (!row) return null
  const yearCols = getYearColumns(row)
  if (yearCols.length === 0) return null
  return getStatementValue(row, yearCols[0])
}

// ─── Quarterly Momentum ─────────────────────────

function computeQuarterlyMultipliers(quarterly: CMOTSStatementRow[]): {
  revenueMultiplier: number | null; ebitdaMultiplier: number | null
} {
  if (quarterly.length === 0) return { revenueMultiplier: null, ebitdaMultiplier: null }

  const revenueRow = findStatementRow(quarterly, QR_ROW_REVENUE)
  const revenueMultiplier = revenueRow ? computeYoYMultiplier(revenueRow) : null

  const ebitdaRow = findStatementRow(quarterly, QR_ROW_OP_PROFIT)
  const ebitdaMultiplier = ebitdaRow ? computeYoYMultiplier(ebitdaRow) : null

  return { revenueMultiplier, ebitdaMultiplier }
}

function computeYoYMultiplier(row: CMOTSStatementRow): number | null {
  const yearCols = getYearColumns(row)
  if (yearCols.length < 5) return null

  const latestCol = yearCols[0]
  const latestMonth = latestCol.slice(5)
  const sameQuarterLastYear = yearCols.find(col => col !== latestCol && col.slice(5) === latestMonth)
  if (!sameQuarterLastYear) return null

  const current = getStatementValue(row, latestCol)
  const previous = getStatementValue(row, sameQuarterLastYear)
  if (current == null || previous == null || previous === 0) return null
  return current / previous
}

// ─── Technical from OHLCV ────────────────────────

function computeTechnicalFromPrices(
  closes: number[], volumes: number[],
): TechnicalResult | null {
  if (closes.length < 200) return null

  const currentPrice = closes[closes.length - 1]
  const ema20 = ema(closes, 20)
  const ema50 = ema(closes, 50)
  const ema200 = ema(closes, 200)

  const latestEma20 = ema20.length > 0 ? ema20[ema20.length - 1] : null
  const latestEma50 = ema50.length > 0 ? ema50[ema50.length - 1] : null
  const latestEma200 = ema200.length > 0 ? ema200[ema200.length - 1] : null
  if (latestEma20 == null || latestEma50 == null || latestEma200 == null) return null

  const rsiValue = rsi(closes)
  const vptValue = volumePriceTrend(closes, volumes)

  let volumeChange: number | null = null
  let priceChange: number | null = null
  if (closes.length >= 50 && volumes.length >= 50) {
    const avg5Vol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5
    const avg50Vol = volumes.slice(-50).reduce((a, b) => a + b, 0) / 50
    volumeChange = avg50Vol > 0 ? avg5Vol / avg50Vol : null

    const price5DAgo = closes[closes.length - 6]
    if (price5DAgo > 0) priceChange = ((currentPrice - price5DAgo) / price5DAgo) * 100
  }

  return {
    ema20Dev: priceVsEMA(currentPrice, latestEma20),
    ema50Dev: priceVsEMA(currentPrice, latestEma50),
    ema200Dev: priceVsEMA(currentPrice, latestEma200),
    rsi: rsiValue ?? 50,
    vpt: vptValue ?? 0,
    volumeChange,
    priceChange,
  }
}

/** Fetch 6 years of OHLCV data for technical + valuation computation */
async function fetchPriceData(stockId: string): Promise<{
  technicalData: TechnicalResult | null
  priceHistory: { date: string; price: number }[]
}> {
  try {
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const prices = await getHistoricalPrices(stockId, from, to)
    if (!prices || prices.length === 0) return { technicalData: null, priceHistory: [] }

    prices.sort((a, b) => a.Tradedate.localeCompare(b.Tradedate))

    const closes = prices.map(p => p.Dayclose)
    const volumes = prices.map(p => p.TotalVolume)
    const technicalData = closes.length >= 200 ? computeTechnicalFromPrices(closes, volumes) : null

    const priceHistory = prices.map(p => ({
      date: p.Tradedate.split('T')[0],
      price: p.Dayclose,
    }))

    return { technicalData, priceHistory }
  } catch (err) {
    console.warn(`[MetricResolver] Failed to fetch price data for ${stockId}`, err)
    return { technicalData: null, priceHistory: [] }
  }
}

// ─── Price Lookup ────────────────────────────────

/** Binary search for price on or before target date. O(log n). */
function findClosestPrice(
  priceHistory: { date: string; price: number }[],
  targetDate: string,
): number | null {
  if (priceHistory.length === 0) return null
  if (priceHistory[0].date > targetDate) return null

  const hi = priceHistory.length - 1
  if (priceHistory[hi].date <= targetDate) return priceHistory[hi].price

  let lo = 0
  let h = hi
  while (lo < h) {
    const mid = (lo + h + 1) >> 1
    if (priceHistory[mid].date <= targetDate) lo = mid
    else h = mid - 1
  }
  return priceHistory[lo].date <= targetDate ? priceHistory[lo].price : null
}

// ─── ROE Trend ──────────────────────────────────

function computeROETrend(
  pnl: CMOTSStatementRow[], balanceSheet: CMOTSStatementRow[],
): number | null {
  const patRow = findStatementRow(pnl, PNL_ROW_PAT)
  const shFundRow = findStatementRow(balanceSheet, BS_ROW_SHAREHOLDERS_FUND)
  if (!patRow || !shFundRow) return null

  const patCols = getYearColumns(patRow)
  const shFundCols = getYearColumns(shFundRow)
  const roeValues: number[] = []

  for (const col of patCols) {
    if (!shFundCols.includes(col)) continue
    const pat = getStatementValue(patRow, col)
    const shFund = getStatementValue(shFundRow, col)
    if (pat != null && shFund != null && shFund !== 0) {
      roeValues.push((pat / shFund) * 100)
    }
  }

  if (roeValues.length < 3) return null
  // Simple trend: (latest - oldest) / years — positive = improving
  const latest = roeValues[0] // Most recent year first
  const oldest = roeValues[roeValues.length - 1]
  return (latest - oldest) / roeValues.length
}

// ─── Performance Helpers ────────────────────────

function computePeriodReturn(
  priceHistory: { date: string; price: number }[],
  currentPrice: number,
  tradingDays: number,
): number | null {
  if (priceHistory.length < tradingDays) return null
  const pastIdx = priceHistory.length - 1 - tradingDays
  if (pastIdx < 0) return null
  const pastPrice = priceHistory[pastIdx].price
  if (pastPrice <= 0) return null
  return ((currentPrice - pastPrice) / pastPrice) * 100
}

function computeMaxDrawdown(prices: number[]): number | null {
  if (prices.length < 20) return null
  // Use last 252 trading days (1 year) for drawdown
  const slice = prices.slice(-Math.min(252, prices.length))
  let peak = slice[0]
  let maxDD = 0
  for (const p of slice) {
    if (p > peak) peak = p
    const dd = ((peak - p) / peak) * 100
    if (dd > maxDD) maxDD = dd
  }
  return -maxDD // Negative number (e.g., -15.3%)
}

function computeAnnualizedVolatility(prices: number[]): number | null {
  // Daily returns std dev × sqrt(252)
  const slice = prices.slice(-Math.min(252, prices.length))
  if (slice.length < 20) return null
  const returns: number[] = []
  for (let i = 1; i < slice.length; i++) {
    if (slice[i - 1] > 0) returns.push((slice[i] - slice[i - 1]) / slice[i - 1])
  }
  if (returns.length < 10) return null
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance) * Math.sqrt(252) * 100 // Annualized %
}

// ─── Growth Context ──────────────────────────────

function extractGrowthContext(
  pnl: CMOTSStatementRow[],
  finData: CMOTSFinancialRecord[],
): Record<string, { startValue?: number; endValue?: number }> {
  const context: Record<string, { startValue?: number; endValue?: number }> = {}

  if (finData.length >= 2) {
    context.v2_revenue_growth = {
      startValue: finData[0].revenue,
      endValue: finData[finData.length - 1].revenue,
    }
  } else {
    const revCtx = extractRowContext(pnl, PNL_ROW_REVENUE)
    if (revCtx) context.v2_revenue_growth = revCtx
  }

  const ebitdaCtx = extractRowContext(pnl, PNL_ROW_EBITDA)
  if (ebitdaCtx) context.v2_ebitda_growth = ebitdaCtx

  const patCtx = extractRowContext(pnl, PNL_ROW_PAT)
  if (patCtx) context.v2_earnings_growth = patCtx

  return context
}

function extractRowContext(rows: CMOTSStatementRow[], rowno: number): {
  startValue?: number; endValue?: number
} | null {
  const row = findStatementRow(rows, rowno)
  if (!row) return null
  const yearCols = getYearColumns(row)
  if (yearCols.length < 2) return null
  const latest = getStatementValue(row, yearCols[0])
  const oldest = getStatementValue(row, yearCols[yearCols.length - 1])
  if (latest == null && oldest == null) return null
  return { startValue: oldest ?? undefined, endValue: latest ?? undefined }
}

// ─── Public API ──────────────────────────────────

/**
 * Resolve all metric values for a stock given its NSE symbol.
 * Fetches fundamentals + price data in parallel, computes all metrics.
 * Returns null if no TTM data available.
 */
export async function resolveMetricValues(stockId: string): Promise<ResolvedMetrics | null> {
  const [fundamentals, priceResult] = await Promise.all([
    getAllFundamentals(stockId),
    fetchPriceData(stockId),
  ])

  const { ttm, finData, pnl, cashFlow, balanceSheet, quarterly, shareholding } = fundamentals

  if (!ttm) {
    console.warn(`[MetricResolver] No TTM data for ${stockId}, skipping`)
    return null
  }

  const data = mapCMOTSToMetricIds(
    ttm, finData, pnl, cashFlow, balanceSheet, quarterly,
    priceResult.technicalData ?? undefined,
    shareholding, priceResult.priceHistory,
  )
  const context = extractGrowthContext(pnl, finData)

  return {
    data,
    context: Object.keys(context).length > 0 ? context : undefined,
  }
}

/**
 * Get stock info for scoring result assembly.
 */
export async function getStockInfo(stockId: string): Promise<{
  id: string; name: string; symbol: string; sector: string; marketCap: number
} | null> {
  const company = await getCompanyBySymbol(stockId)
  if (!company) return null

  const mcapEstimate = company.mcaptype === 'Large Cap' ? 100000
    : company.mcaptype === 'Mid Cap' ? 25000 : 5000

  return {
    id: String(company.co_code),
    name: company.companyname,
    symbol: company.nsesymbol || company.bsecode || String(company.co_code),
    sector: company.sectorname,
    marketCap: mcapEstimate,
  }
}
