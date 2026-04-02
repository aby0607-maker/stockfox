/**
 * Screener.in Company Data — HTML parsing + qual data extraction
 *
 * Screener serves financial data as server-rendered HTML tables.
 * This module parses the HTML and extracts line items needed for
 * ~18 qual signals that CMOTS cannot provide:
 *
 *   MG:  Pledge %
 *   CD:  Share capital (dilution), capex, depreciation, buyback
 *   EQ:  Receivables, inventory, goodwill, intangibles, contingent liabilities,
 *        trade payables, COGS (for CCC)
 */

import type { ScreenerQualData } from '@/types'
import { screenerFetchHtml } from './client'

// ── HTML Parsing Helpers ──

interface ParsedRow {
  name: string
  values: { label: string; value: number }[]
}

/**
 * Parse a Screener <table class="data-table"> into structured rows.
 */
function parseTable(tableHtml: string): { headers: string[]; rows: ParsedRow[] } {
  // Extract headers from <thead>
  const headerMatch = tableHtml.match(/<thead>([\s\S]*?)<\/thead>/)
  const headers: string[] = []
  if (headerMatch) {
    const thMatches = [...headerMatch[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)]
    for (const m of thMatches) {
      headers.push(m[1].replace(/<[^>]+>/g, '').trim())
    }
  }

  // Extract data rows from <tbody>
  const bodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/)
  const rows: ParsedRow[] = []
  if (bodyMatch) {
    const trMatches = [...bodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    for (const tr of trMatches) {
      const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(c => c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/,/g, '').trim())
      if (cells.length < 2) continue

      const name = cells[0].replace(/\+$/, '').trim()
      const values: { label: string; value: number }[] = []
      for (let i = 1; i < cells.length && i < headers.length; i++) {
        const numStr = cells[i].replace(/%/g, '').trim()
        const value = parseFloat(numStr)
        if (!isNaN(value) && headers[i]) {
          values.push({ label: headers[i], value })
        }
      }
      if (name && values.length > 0) {
        rows.push({ name, values })
      }
    }
  }

  return { headers: headers.slice(1), rows }
}

/**
 * Extract a named section's first <table> from the HTML.
 */
function extractSectionTable(html: string, sectionId: string): string | null {
  const idx = html.indexOf(`id="${sectionId}"`)
  if (idx < 0) return null
  const tableStart = html.indexOf('<table', idx)
  if (tableStart < 0) return null
  const tableEnd = html.indexOf('</table>', tableStart)
  if (tableEnd < 0) return null
  return html.substring(tableStart, tableEnd + 8)
}

/**
 * Find a parsed row by name (case-insensitive partial match).
 */
function findRow(rows: ParsedRow[], ...searchTerms: string[]): ParsedRow | null {
  for (const term of searchTerms) {
    const lower = term.toLowerCase()
    const row = rows.find(r => r.name.toLowerCase().includes(lower))
    if (row) return row
  }
  return null
}

/**
 * Convert a ParsedRow's values to year-value pairs.
 */
function toYearValues(row: ParsedRow | null): { year: string; value: number }[] {
  if (!row) return []
  return row.values
    .filter(v => v.label && !v.label.toLowerCase().includes('ttm') && !v.label.toLowerCase().includes('trailing'))
    .map(v => ({ year: v.label, value: v.value }))
}

/**
 * Negate values (for converting negative cash flow items to positive capex).
 */
function negateValues(data: { year: string; value: number }[]): { year: string; value: number }[] {
  return data.map(d => ({ year: d.year, value: -d.value }))
}

// ── Shareholding Parsing ──

function parseShareholding(html: string): { promoterHolding: number | null; pledgePercent: number | null } {
  const tableHtml = extractSectionTable(html, 'quarterly-shp')
  if (!tableHtml) return { promoterHolding: null, pledgePercent: null }

  const { rows } = parseTable(tableHtml)

  const promoterRow = rows.find(r => r.name.toLowerCase().includes('promoter'))
  const latestPromoter = promoterRow?.values?.length
    ? promoterRow.values[promoterRow.values.length - 1].value
    : null

  // Pledge row may not exist (0% pledge = row absent)
  const pledgeRow = rows.find(r => r.name.toLowerCase().includes('pledge'))
  const latestPledge = pledgeRow?.values?.length
    ? pledgeRow.values[pledgeRow.values.length - 1].value
    : 0

  return { promoterHolding: latestPromoter, pledgePercent: latestPledge }
}

// ── Main Extraction ──

/**
 * Parse Screener HTML into ScreenerQualData.
 */
export function parseScreenerHtml(html: string): ScreenerQualData {
  // Parse financial tables
  const bsTable = extractSectionTable(html, 'balance-sheet')
  const plTable = extractSectionTable(html, 'profit-loss')
  const cfTable = extractSectionTable(html, 'cash-flow')
  const ratiosTable = extractSectionTable(html, 'ratios')

  const bs = bsTable ? parseTable(bsTable).rows : []
  const pl = plTable ? parseTable(plTable).rows : []
  const cf = cfTable ? parseTable(cfTable).rows : []
  const ratios = ratiosTable ? parseTable(ratiosTable).rows : []

  // Parse shareholding for pledge data
  const { promoterHolding, pledgePercent } = parseShareholding(html)

  return {
    pledgePercent,
    promoterHolding,

    // Balance sheet items (Screener consolidated view has aggregated rows)
    // Detailed items like receivables/inventory only available on standalone view
    shareCapitalHistory: toYearValues(findRow(bs, 'equity capital', 'share capital')),
    tradeReceivables: toYearValues(findRow(bs, 'trade receivables', 'sundry debtors', 'debtors')),
    inventories: toYearValues(findRow(bs, 'inventories', 'inventory')),
    goodwill: toYearValues(findRow(bs, 'goodwill')),
    intangibleAssets: toYearValues(findRow(bs, 'intangible assets', 'other intangible')),
    contingentLiabilities: toYearValues(findRow(bs, 'contingent liabilities')),
    tradePayables: toYearValues(findRow(bs, 'trade payables', 'sundry creditors', 'creditors')),

    // P&L items — "Sales" and "Depreciation" are standard Screener row names
    revenue: toYearValues(findRow(pl, 'sales', 'revenue from operations', 'net sales')),
    cogs: toYearValues(findRow(pl, 'expenses', 'material cost', 'cost of materials')),

    // Cash flow items — Screener uses "Cash from Investing Activity" not line-item capex
    // We negate investing cash flow as a capex proxy (not perfect but directional)
    capex: negateValues(toYearValues(findRow(cf, 'cash from investing', 'investing activity'))),
    depreciation: toYearValues(findRow(pl, 'depreciation')),
    dividendPayout: toYearValues(findRow(pl, 'dividend payout')),

    // Pre-computed ratios — 12-year history, avoids COGS proxy approximation
    debtorDays: toYearValues(findRow(ratios, 'debtor days')),
    inventoryDays: toYearValues(findRow(ratios, 'inventory days')),
    daysPay: toYearValues(findRow(ratios, 'days payable')),
    cashConversionCycle: toYearValues(findRow(ratios, 'cash conversion cycle')),
    workingCapitalDays: toYearValues(findRow(ratios, 'working capital days')),
    roce: toYearValues(findRow(ratios, 'roce')),
    opm: toYearValues(findRow(ratios, 'opm', 'operating profit margin')),
  }
}

/**
 * Fetch and extract qual data for a stock symbol.
 * Returns null if Screener data is unavailable (never throws).
 */
export async function getScreenerQualData(symbol: string): Promise<ScreenerQualData | null> {
  const html = await screenerFetchHtml(symbol)
  if (!html) return null
  return parseScreenerHtml(html)
}
