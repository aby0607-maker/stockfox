/**
 * IndianAPI.in Fundamentals — Fetch and convert to CMOTS-compatible format
 *
 * Fetches annual P&L, balance sheet, cash flow, and quarterly results
 * from IndianAPI.in and converts them to CMOTSStatementRow[] format so that
 * the existing metricResolver and scoring engine work without modification.
 *
 * Data depth: 12 years (Mar 2014 → present) for annual data,
 * 13 quarters (Dec 2022 → present) for quarterly data.
 *
 * Used as a fallback when CMOTS has insufficient historical data for
 * 5Y CAGR calculations.
 */

import type { CMOTSStatementRow } from '@/types'
import type { FundamentalsBundle } from '@/services/cmots/fundamentals'
import { indianApiFetch } from './client'
import {
  type IndianAPIStatsResponse,
  PNL_FIELD_MAP,
  BS_FIELD_MAP,
  CF_FIELD_MAP,
  QR_FIELD_MAP,
  convertToCMOTSRows,
  synthesizeShareholdersFund,
} from './fieldMap'

const ANNUAL_CACHE_TTL = 24 * 60 * 60 * 1000  // 24 hours
const QUARTERLY_CACHE_TTL = 6 * 60 * 60 * 1000  // 6 hours

// ─── Stock name resolution ──────────────────────────

/**
 * BSE symbol → IndianAPI stock name lookup.
 * IndianAPI uses NSE symbols or common names.
 * For stocks where the BSE/CMOTS name differs, we maintain overrides here.
 */
const SYMBOL_OVERRIDES: Record<string, string> = {
  'ZOMATO': 'ETERNAL',
  'ETERNAL': 'ETERNAL',
  'AXISBANK': 'Axis Bank',
  'HDFCBANK': 'HDFC Bank',
  'ICICIBANK': 'ICICI Bank',
  'SBIN': 'State Bank of India',
  'KOTAKBANK': 'Kotak Mahindra Bank',
  'BHARTIARTL': 'Airtel',
  'BAJFINANCE': 'Bajaj Finance',
  'BAJFINSV': 'Bajaj Finserv',
  'MARUTI': 'Maruti Suzuki India',
  'LT': 'Larsen and Toubro',
  'HINDUNILVR': 'Hindustan Unilever',
  'ASIANPAINT': 'Asian Paints',
  'TITAN': 'Titan Company',
  'NESTLEIND': 'Nestle India',
  'BRITANNIA': 'Britannia Industries',
  'DRREDDY': "Dr. Reddy's Laboratories",
  'CIPLA': 'Cipla',
  'SUNPHARMA': 'Sun Pharmaceutical Industries',
  'POWERGRID': 'Power Grid Corporation of India',
  'NTPC': 'NTPC',
  'ITC': 'ITC',
  'TCS': 'TCS',
  'INFY': 'Infosys',
  'WIPRO': 'Wipro',
  'HCLTECH': 'HCL Technologies',
  'TECHM': 'Tech Mahindra',
  'TATAMOTORS': 'Tata Motors',
  'TATASTEEL': 'Tata Steel',
  'RELIANCE': 'Reliance',
  'ADANIENT': 'Adani Enterprises',
  'ADANIPORTS': 'Adani Ports and Special Economic Zone',
}

function resolveStockName(symbol: string): string {
  const upper = symbol.toUpperCase()
  return SYMBOL_OVERRIDES[upper] || symbol
}

// ─── Individual data fetchers ───────────────────────

/** Fetch annual P&L (yoy_results) */
export async function getAnnualPnL(symbol: string): Promise<CMOTSStatementRow[]> {
  const stockName = resolveStockName(symbol)
  const data = await indianApiFetch<IndianAPIStatsResponse>({
    endpoint: 'historical_stats',
    params: { stock_name: stockName, stats: 'yoy_results' },
    cacheTTL: ANNUAL_CACHE_TTL,
  })
  if (!data) return []
  return convertToCMOTSRows(data, PNL_FIELD_MAP)
}

/** Fetch balance sheet */
export async function getBalanceSheet(symbol: string): Promise<CMOTSStatementRow[]> {
  const stockName = resolveStockName(symbol)
  const data = await indianApiFetch<IndianAPIStatsResponse>({
    endpoint: 'historical_stats',
    params: { stock_name: stockName, stats: 'balancesheet' },
    cacheTTL: ANNUAL_CACHE_TTL,
  })
  if (!data) return []

  const rows = convertToCMOTSRows(data, BS_FIELD_MAP)

  const shFundRow = synthesizeShareholdersFund(data)
  if (shFundRow) rows.push(shFundRow)

  return rows
}

/** Fetch cash flow statement */
export async function getCashFlow(symbol: string): Promise<CMOTSStatementRow[]> {
  const stockName = resolveStockName(symbol)
  const data = await indianApiFetch<IndianAPIStatsResponse>({
    endpoint: 'historical_stats',
    params: { stock_name: stockName, stats: 'cashflow' },
    cacheTTL: ANNUAL_CACHE_TTL,
  })
  if (!data) return []
  return convertToCMOTSRows(data, CF_FIELD_MAP)
}

/** Fetch quarterly results */
export async function getQuarterlyResults(symbol: string): Promise<CMOTSStatementRow[]> {
  const stockName = resolveStockName(symbol)
  const data = await indianApiFetch<IndianAPIStatsResponse>({
    endpoint: 'historical_stats',
    params: { stock_name: stockName, stats: 'quarter_results' },
    cacheTTL: QUARTERLY_CACHE_TTL,
  })
  if (!data) return []
  return convertToCMOTSRows(data, QR_FIELD_MAP)
}

// ─── Bundle fetcher ─────────────────────────────────

/**
 * Fetch all IndianAPI fundamentals for a stock in one call.
 * Returns a FundamentalsBundle compatible with the scoring engine.
 *
 * Note: IndianAPI does not provide TTM or FinData (CMOTS-specific formats),
 * so those fields are returned as null/[].
 */
export async function getIndianAPIFundamentals(symbol: string): Promise<FundamentalsBundle> {
  const results = await Promise.allSettled([
    getAnnualPnL(symbol),
    getBalanceSheet(symbol),
    getCashFlow(symbol),
    getQuarterlyResults(symbol),
  ])

  const failedCount = results.filter(r => r.status === 'rejected').length
  if (failedCount > 0) {
    console.warn(`[IndianAPI] ${failedCount}/4 endpoints failed for ${symbol}`)
  }

  return {
    ttm: null,
    finData: [],
    pnl: results[0].status === 'fulfilled' ? results[0].value : [],
    balanceSheet: results[1].status === 'fulfilled' ? results[1].value : [],
    cashFlow: results[2].status === 'fulfilled' ? results[2].value : [],
    quarterly: results[3].status === 'fulfilled' ? results[3].value : [],
    shareholding: [],
  }
}

/**
 * Merge IndianAPI data into a CMOTS FundamentalsBundle as a fallback.
 *
 * Strategy: For each statement type, if CMOTS data is available, merge
 * IndianAPI year columns that CMOTS doesn't have. If CMOTS data is empty,
 * use IndianAPI data directly.
 *
 * This ensures: CMOTS accuracy for recent years + IndianAPI depth for historical years.
 */
export function mergeFundamentals(
  cmots: FundamentalsBundle,
  indianapi: FundamentalsBundle,
): FundamentalsBundle {
  return {
    ttm: cmots.ttm,
    finData: cmots.finData,
    pnl: mergeStatementRows(cmots.pnl, indianapi.pnl),
    balanceSheet: mergeStatementRows(cmots.balanceSheet, indianapi.balanceSheet),
    cashFlow: mergeStatementRows(cmots.cashFlow, indianapi.cashFlow),
    quarterly: mergeStatementRows(cmots.quarterly, indianapi.quarterly),
    shareholding: cmots.shareholding,
  }
}

/**
 * Merge IndianAPI rows into CMOTS rows at the row level.
 * CMOTS values always take precedence for overlapping year columns.
 */
function mergeStatementRows(
  cmotsRows: CMOTSStatementRow[],
  indianRows: CMOTSStatementRow[],
): CMOTSStatementRow[] {
  if (indianRows.length === 0) return cmotsRows
  if (cmotsRows.length === 0) return indianRows

  const cmotsMap = new Map<number, CMOTSStatementRow>()
  for (const row of cmotsRows) {
    cmotsMap.set(row.rowno, row)
  }

  const result = [...cmotsRows]

  for (const iaRow of indianRows) {
    const existing = cmotsMap.get(iaRow.rowno)
    if (existing) {
      for (const [key, value] of Object.entries(iaRow)) {
        if (/^Y\d{6}$/.test(key) && !(key in existing)) {
          existing[key] = value
        }
      }
    } else {
      result.push(iaRow)
      cmotsMap.set(iaRow.rowno, iaRow)
    }
  }

  return result
}
