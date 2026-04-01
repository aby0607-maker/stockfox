/**
 * IndianAPI.in → CMOTS Field Mapping & Data Conversion
 *
 * IndianAPI returns data as field-keyed objects with period keys:
 *   { "Sales": { "Mar 2014": 81809, "Mar 2015": 94648, ... }, ... }
 *
 * CMOTS returns row-based data:
 *   [{ COLUMNNAME: "Revenue from Operations", rowno: 1, Y202503: 255324, ... }]
 *
 * This module converts IndianAPI format → CMOTSStatementRow[] so existing
 * metricResolver logic works unchanged.
 */

import type { CMOTSStatementRow } from '@/types'

// ─── Period key → CMOTS year column conversion ─────────

const MONTH_MAP: Record<string, string> = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
  'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
  'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
}

/**
 * Convert IndianAPI period key to CMOTS year column format.
 * "Mar 2025" → "Y202503", "Sep 2025" → "Y202509"
 * "TTM" → null (skip TTM entries)
 */
export function periodToYearCol(period: string): string | null {
  if (period === 'TTM') return null
  const parts = period.split(' ')
  if (parts.length !== 2) return null
  const monthStr = MONTH_MAP[parts[0]]
  if (!monthStr) return null
  return `Y${parts[1]}${monthStr}`
}

// ─── IndianAPI → CMOTS row number mapping ───────────────

/** P&L field mappings: IndianAPI field name → CMOTS rowno */
export const PNL_FIELD_MAP: Record<string, number> = {
  'Sales':                1,
  'Revenue':              1,   // Banking variant
  'Operating Profit':     46,
  'Financing Profit':     46,  // Banking variant
  'Profit before tax':    28,
  'Other Income':         9,
  'Net Profit':           35,
  'EPS in Rs':            44,
  'Depreciation':         20,
  'Interest':             19,
  'Expenses':             6,
}

/** Balance Sheet field mappings */
export const BS_FIELD_MAP: Record<string, number> = {
  'Fixed Assets':         2,
  'Borrowings':           58,
  'Equity Capital':       76,
  'Reserves':             78,
  'Total Assets':         42,
  'Total Liabilities':    42,
  'CWIP':                 4,
  'Investments':          27,
  'Other Assets':         38,
  'Other Liabilities':    52,
}

export const BS_SHAREHOLDERS_FUND_ROWNO = 80

/** Cash Flow field mappings */
export const CF_FIELD_MAP: Record<string, number> = {
  'Cash from Operating Activity':  68,
  'Cash from Investing Activity':  69,
  'Cash from Financing Activity':  70,
  'Net Cash Flow':                 73,
}

/** Quarterly Results field mappings */
export const QR_FIELD_MAP: Record<string, number> = {
  'Sales':                1,
  'Revenue':              1,
  'Operating Profit':     14,
  'Financing Profit':     14,
  'Net Profit':           35,
  'EPS in Rs':            44,
}

// ─── Conversion functions ───────────────────────────────

/** Raw IndianAPI stats response: field → { period → value } */
export type IndianAPIStatsResponse = Record<string, Record<string, number>>

/**
 * Convert an IndianAPI stats response to an array of CMOTS-compatible statement rows.
 */
export function convertToCMOTSRows(
  data: IndianAPIStatsResponse,
  fieldMap: Record<string, number>,
): CMOTSStatementRow[] {
  const rows: CMOTSStatementRow[] = []

  for (const [fieldName, periodValues] of Object.entries(data)) {
    const rowno = fieldMap[fieldName]
    if (rowno === undefined) continue

    const row: CMOTSStatementRow = {
      COLUMNNAME: fieldName,
      RID: rowno,
      rowno,
    }

    for (const [period, value] of Object.entries(periodValues)) {
      const yearCol = periodToYearCol(period)
      if (!yearCol) continue
      row[yearCol] = value
    }

    rows.push(row)
  }

  return rows
}

/**
 * Synthesize a "Shareholders Fund" row from Equity Capital + Reserves.
 * CMOTS has this as a single row (rowno 80), but IndianAPI splits them.
 */
export function synthesizeShareholdersFund(
  data: IndianAPIStatsResponse,
): CMOTSStatementRow | null {
  const equity = data['Equity Capital']
  const reserves = data['Reserves']
  if (!equity && !reserves) return null

  const row: CMOTSStatementRow = {
    COLUMNNAME: "Total Shareholder's Fund",
    RID: BS_SHAREHOLDERS_FUND_ROWNO,
    rowno: BS_SHAREHOLDERS_FUND_ROWNO,
  }

  const allPeriods = new Set([
    ...Object.keys(equity || {}),
    ...Object.keys(reserves || {}),
  ])

  for (const period of allPeriods) {
    const yearCol = periodToYearCol(period)
    if (!yearCol) continue
    const eqVal = equity?.[period] ?? 0
    const resVal = reserves?.[period] ?? 0
    row[yearCol] = eqVal + resVal
  }

  return row
}

/**
 * Detect if a stock is a banking company based on IndianAPI P&L fields.
 */
export function isBankingStock(data: IndianAPIStatsResponse): boolean {
  return 'Revenue' in data && !('Sales' in data)
}
