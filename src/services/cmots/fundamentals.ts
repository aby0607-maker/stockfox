/**
 * CMOTS Fundamentals — TTM, FinData, P&L, Cash Flow, Balance Sheet, Quarterly
 *
 * Endpoints:
 *   /TTMData/{co_code}/s         — Current trailing-twelve-month ratios
 *   /FinData/{co_code}/s         — Yearly financial metrics (5 years)
 *   /ProftandLoss/{co_code}/s    — P&L statement rows with year columns
 *   /CashFlow/{co_code}/s        — Cash flow rows with year columns
 *   /BalanceSheet/{co_code}/s    — Balance sheet rows with year columns
 *   /QuarterlyResults/{co_code}/s — Quarterly result rows with quarter columns
 */

import type {
  CMOTSTTMRecord,
  CMOTSFinancialRecord,
  CMOTSStatementRow,
  CMOTSShareholding,
} from '@/types'
import { cmotsFetch, cmotsFetchOne } from './client'
import { getCoCode } from './companyMaster'
import { getShareholdingHistory } from './shareholding'

const CACHE_TTL = 60 * 60 * 1000  // 1 hour

// ── Individual endpoint fetchers ──

/** Get TTM (Trailing Twelve Month) ratios for a stock */
export async function getTTMData(symbol: string, resolvedCoCode?: number): Promise<CMOTSTTMRecord | null> {
  const coCode = resolvedCoCode ?? await getCoCode(symbol)
  if (!coCode) {
    console.warn(`[Fundamentals] TTM data unavailable for ${symbol}: could not resolve co_code`)
    return null
  }

  return await cmotsFetchOne<CMOTSTTMRecord>({
    endpoint: `/TTMData/${coCode}/s`,
    cacheTTL: CACHE_TTL,
  })
}

/** Get yearly financial data (FinData) — returns multiple years, sorted oldest first */
export async function getFinancialData(symbol: string, resolvedCoCode?: number): Promise<CMOTSFinancialRecord[]> {
  const coCode = resolvedCoCode ?? await getCoCode(symbol)
  if (!coCode) {
    console.warn(`[Fundamentals] FinData unavailable for ${symbol}: could not resolve co_code`)
    return []
  }

  const data = await cmotsFetch<CMOTSFinancialRecord>({
    endpoint: `/FinData/${coCode}/s`,
    cacheTTL: CACHE_TTL,
  })
  // Sort by yrc ascending (oldest first) for growth calculations
  return data.sort((a, b) => a.yrc - b.yrc)
}

/** Get P&L statement rows (row-based with year columns) */
export async function getProfitAndLoss(symbol: string, resolvedCoCode?: number): Promise<CMOTSStatementRow[]> {
  const coCode = resolvedCoCode ?? await getCoCode(symbol)
  if (!coCode) {
    console.warn(`[Fundamentals] P&L data unavailable for ${symbol}: could not resolve co_code`)
    return []
  }

  return await cmotsFetch<CMOTSStatementRow>({
    endpoint: `/ProftandLoss/${coCode}/s`,
    cacheTTL: CACHE_TTL,
  })
}

/** Get cash flow statement rows (row-based with year columns) */
export async function getCashFlow(symbol: string, resolvedCoCode?: number): Promise<CMOTSStatementRow[]> {
  const coCode = resolvedCoCode ?? await getCoCode(symbol)
  if (!coCode) {
    console.warn(`[Fundamentals] Cash flow data unavailable for ${symbol}: could not resolve co_code`)
    return []
  }

  return await cmotsFetch<CMOTSStatementRow>({
    endpoint: `/CashFlow/${coCode}/s`,
    cacheTTL: CACHE_TTL,
  })
}

/** Get balance sheet rows (row-based with year columns) */
export async function getBalanceSheet(symbol: string, resolvedCoCode?: number): Promise<CMOTSStatementRow[]> {
  const coCode = resolvedCoCode ?? await getCoCode(symbol)
  if (!coCode) {
    console.warn(`[Fundamentals] Balance sheet data unavailable for ${symbol}: could not resolve co_code`)
    return []
  }

  return await cmotsFetch<CMOTSStatementRow>({
    endpoint: `/BalanceSheet/${coCode}/s`,
    cacheTTL: CACHE_TTL,
  })
}

/** Get quarterly results rows (row-based with quarter columns like Y202512) */
export async function getQuarterlyResults(symbol: string, resolvedCoCode?: number): Promise<CMOTSStatementRow[]> {
  const coCode = resolvedCoCode ?? await getCoCode(symbol)
  if (!coCode) {
    console.warn(`[Fundamentals] Quarterly results unavailable for ${symbol}: could not resolve co_code`)
    return []
  }

  return await cmotsFetch<CMOTSStatementRow>({
    endpoint: `/QuarterlyResults/${coCode}/s`,
    cacheTTL: CACHE_TTL,
  })
}

// ── Convenience: fetch all fundamental data in parallel ──

export interface FundamentalsBundle {
  ttm: CMOTSTTMRecord | null
  finData: CMOTSFinancialRecord[]
  pnl: CMOTSStatementRow[]
  cashFlow: CMOTSStatementRow[]
  balanceSheet: CMOTSStatementRow[]
  quarterly: CMOTSStatementRow[]
  shareholding: CMOTSShareholding[]
}

/** Timeout (ms) for the entire parallel fundamentals fetch */
const FUNDAMENTALS_TIMEOUT_MS = 30_000

/**
 * Fetch all fundamental data for a stock in one call.
 * Resolves co_code once, then passes it to all 7 endpoints fetched
 * in parallel with a 30s timeout.
 */
export async function getAllFundamentals(symbol: string): Promise<FundamentalsBundle> {
  const coCode = await getCoCode(symbol)
  if (!coCode) {
    console.warn(`[Fundamentals] Could not resolve co_code for ${symbol} — returning empty bundle`)
    return {
      ttm: null,
      finData: [],
      pnl: [],
      cashFlow: [],
      balanceSheet: [],
      quarterly: [],
      shareholding: [],
    }
  }

  const dataPromise = Promise.all([
    getTTMData(symbol, coCode),
    getFinancialData(symbol, coCode),
    getProfitAndLoss(symbol, coCode),
    getCashFlow(symbol, coCode),
    getBalanceSheet(symbol, coCode),
    getQuarterlyResults(symbol, coCode),
    getShareholdingHistory(symbol, coCode),
  ])

  let timeoutId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`[Fundamentals] Timeout after ${FUNDAMENTALS_TIMEOUT_MS}ms fetching data for ${symbol}`)),
      FUNDAMENTALS_TIMEOUT_MS,
    )
  })

  try {
    const [ttm, finData, pnl, cashFlow, balanceSheet, quarterly, shareholding] = await Promise.race([
      dataPromise,
      timeoutPromise,
    ])
    return { ttm, finData, pnl, cashFlow, balanceSheet, quarterly, shareholding }
  } finally {
    clearTimeout(timeoutId!)
  }
}

// ── Statement row helpers (exported for metricResolver) ──

/**
 * Extract a numeric value from a statement row for a given year column.
 * Year columns look like "Y202503" or "Y202412".
 */
export function getStatementValue(row: CMOTSStatementRow, yearCol: string): number | null {
  const val = row[yearCol]
  if (val === undefined || val === null || val === '') return null
  const num = typeof val === 'number' ? val : parseFloat(String(val))
  return isNaN(num) ? null : num
}

/**
 * Find a row in a statement by its rowno.
 */
export function findStatementRow(rows: CMOTSStatementRow[], rowno: number): CMOTSStatementRow | null {
  return rows.find(r => r.rowno === rowno) ?? null
}

/**
 * Get the sorted year column names from a statement row (newest first).
 * Filters to columns matching /^Y\d{6}$/ pattern.
 */
export function getYearColumns(row: CMOTSStatementRow): string[] {
  return Object.keys(row)
    .filter(k => /^Y\d{6}$/.test(k))
    .sort((a, b) => b.localeCompare(a))  // Newest first
}
