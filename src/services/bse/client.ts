/**
 * BSE India Client — Corporate announcements and actions
 *
 * Endpoints (proxied via /api/bse/):
 *   /AnnGetData/w  — Insider trading (SAST), related party, board meetings
 *   /CorporateAction/w — Bonus, split, rights, buybacks, dividends
 *
 * BSE APIs are public, no auth needed. We cache aggressively (24h)
 * since corporate filings change infrequently.
 */

import { cache } from '@/services/cache'
import { getCompanyBySymbol } from '@/services/cmots/companyMaster'

const API_BASE = '/api/bse'

// ── Types ──

export interface BSEAnnouncement {
  NEWS_DT: string          // "2025-03-15T00:00:00"
  NEWSSUB: string          // Summary text
  SCRIP_CD: number
  CATEGORYNAME: string     // "Insider Trading / SAST"
  SUBCATEGORYNAME: string
  HEADLINE: string
  ATTACHMENTNAME: string
}

export interface BSECorporateAction {
  scrip_code: string
  short_name: string
  ex_date: string          // "29/10/2025"
  purpose: string          // "Bonus issue 1:1", "Buy Back of Shares", etc.
  record_date: string
  comp_name: string
}

export interface BSEInsiderSummary {
  totalFilings: number
  recentFilings: BSEAnnouncement[]
  hasRecentActivity: boolean  // Any filing in last 6 months
  sentiment: 'buying' | 'selling' | 'mixed' | 'none'
}

export interface BSERelatedPartySummary {
  totalFilings: number
  recentFilings: BSEAnnouncement[]
  hasRecentDisclosures: boolean
}

export interface BSECorporateActionSummary {
  actions: BSECorporateAction[]
  bonusCount: number
  splitCount: number
  rightsCount: number
  buybackCount: number
  hasDilutiveActions: boolean  // Rights/bonus in last 3 years
  hasBuybacks: boolean
}

// ── Date Helpers ──

function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function getDateNYearsAgo(n: number): Date {
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d
}

// ── Fetch Helper ──

/**
 * BSE API returns responses wrapped in { Table: [...], Table1: [...] }.
 * The `tableKey` param selects which table to return (default: 'Table').
 */
async function bseFetch<T>(endpoint: string, params: Record<string, string>, tableKey = 'Table'): Promise<T | null> {
  const qs = new URLSearchParams(params).toString()
  const url = `${API_BASE}${endpoint}${qs ? `?${qs}` : ''}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[BSE] HTTP ${response.status} for ${endpoint}`)
      return null
    }

    const raw = await response.json()
    // BSE wraps responses: { Table: [...], Table1: [...] }
    const data = raw && typeof raw === 'object' && tableKey in raw ? raw[tableKey] : raw
    return data as T
  } catch (error) {
    console.warn(`[BSE] Error fetching ${endpoint}:`, error instanceof Error ? error.message : error)
    return null
  }
}

// ── Resolve BSE scrip code from symbol ──

async function getBseScripCode(symbol: string): Promise<string | null> {
  const company = await getCompanyBySymbol(symbol)
  if (!company?.bsecode) return null
  return company.bsecode
}

// ── Public API ──

/**
 * Fetch insider trading (SAST) filings for a stock.
 * Returns a summary of recent insider activity.
 */
export async function getInsiderTransactions(symbol: string): Promise<BSEInsiderSummary | null> {
  const cacheKey = `bse\0insider\0${symbol}`
  const cached = cache.get<BSEInsiderSummary>(cacheKey)
  if (cached !== undefined) return cached

  const scripCode = await getBseScripCode(symbol)
  if (!scripCode) {
    cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
    return null
  }

  const now = new Date()
  const threeYearsAgo = getDateNYearsAgo(3)

  const data = await bseFetch<BSEAnnouncement[]>('/AnnGetData/w', {
    strCat: 'Insider Trading / SAST',
    strPrevDate: formatDateDDMMYYYY(threeYearsAgo),
    strToDate: formatDateDDMMYYYY(now),
    strScrip: scripCode,
    strSearch: 'scrip',
    strType: 'C',
  })

  if (!data || !Array.isArray(data)) {
    cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
    return null
  }

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const recentFilings = data.filter(a => {
    const dt = new Date(a.NEWS_DT)
    return dt >= sixMonthsAgo
  })

  // Determine sentiment from headlines
  let buyCount = 0
  let sellCount = 0
  for (const filing of data.slice(0, 20)) {
    const text = (filing.NEWSSUB + ' ' + filing.HEADLINE).toLowerCase()
    if (text.includes('acquisition') || text.includes('purchase') || text.includes('bought')) buyCount++
    if (text.includes('disposal') || text.includes('sale') || text.includes('sold')) sellCount++
  }

  const sentiment: BSEInsiderSummary['sentiment'] =
    buyCount + sellCount === 0 ? 'none'
    : buyCount > sellCount * 1.5 ? 'buying'
    : sellCount > buyCount * 1.5 ? 'selling'
    : 'mixed'

  const result: BSEInsiderSummary = {
    totalFilings: data.length,
    recentFilings: data.slice(0, 5), // Keep top 5 most recent
    hasRecentActivity: recentFilings.length > 0,
    sentiment,
  }

  cache.set(cacheKey, result, { ttl: 24 * 60 * 60 * 1000 })
  return result
}

/**
 * Fetch related party transaction disclosures.
 */
export async function getRelatedPartyTransactions(symbol: string): Promise<BSERelatedPartySummary | null> {
  const cacheKey = `bse\0rpt\0${symbol}`
  const cached = cache.get<BSERelatedPartySummary>(cacheKey)
  if (cached !== undefined) return cached

  const scripCode = await getBseScripCode(symbol)
  if (!scripCode) {
    cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
    return null
  }

  const now = new Date()
  const twoYearsAgo = getDateNYearsAgo(2)

  const data = await bseFetch<BSEAnnouncement[]>('/AnnGetData/w', {
    strCat: 'Related Party Transactions',
    strPrevDate: formatDateDDMMYYYY(twoYearsAgo),
    strToDate: formatDateDDMMYYYY(now),
    strScrip: scripCode,
    strSearch: 'scrip',
    strType: 'C',
  })

  if (!data || !Array.isArray(data)) {
    cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
    return null
  }

  const oneYearAgo = getDateNYearsAgo(1)
  const recentFilings = data.filter(a => new Date(a.NEWS_DT) >= oneYearAgo)

  const result: BSERelatedPartySummary = {
    totalFilings: data.length,
    recentFilings: data.slice(0, 5),
    hasRecentDisclosures: recentFilings.length > 0,
  }

  cache.set(cacheKey, result, { ttl: 24 * 60 * 60 * 1000 })
  return result
}

/**
 * Fetch corporate actions (bonus, split, rights, buybacks) for a stock.
 *
 * BSE CorporateAction response structure:
 *   Table  = dividends:  { purpose_name, BCRD_from, Amount }
 *   Table1 = bonus/split: { XTYPE, BCRD_FROM, VALUE }
 *   Table2 = buybacks (if any)
 */
export async function getCorporateActions(symbol: string): Promise<BSECorporateActionSummary | null> {
  const cacheKey = `bse\0corpaction\0${symbol}`
  const cached = cache.get<BSECorporateActionSummary>(cacheKey)
  if (cached !== undefined) return cached

  const scripCode = await getBseScripCode(symbol)
  if (!scripCode) {
    cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
    return null
  }

  const params = {
    scripcode: scripCode,
    segment: 'Equity',
    purpose_code: '',
    from_date: formatDateDDMMYYYY(getDateNYearsAgo(5)),
    to_date: formatDateDDMMYYYY(new Date()),
  }

  // Fetch raw response to get both Table and Table1
  const qs = new URLSearchParams(params).toString()
  const url = `${API_BASE}/CorporateAction/w?${qs}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
      return null
    }

    const raw = await response.json()
    const dividends = Array.isArray(raw?.Table) ? raw.Table : []
    const bonusSplit = Array.isArray(raw?.Table1) ? raw.Table1 : []

    let bonusCount = 0
    let splitCount = 0
    let rightsCount = 0
    let buybackCount = 0
    let recentDilutive = false
    const threeYearsAgo = getDateNYearsAgo(3)
    const actions: BSECorporateAction[] = []

    // Parse Table1 (bonus/split/rights)
    for (const item of bonusSplit) {
      const xtype = String(item.XTYPE ?? '').toLowerCase()
      const dateStr = String(item.BCRD_FROM ?? '')
      const value = String(item.VALUE ?? '')

      if (xtype.includes('bonus')) bonusCount++
      else if (xtype.includes('split')) splitCount++
      else if (xtype.includes('rights')) rightsCount++
      else if (xtype.includes('buyback') || xtype.includes('buy back')) buybackCount++

      actions.push({
        scrip_code: scripCode,
        short_name: symbol,
        ex_date: dateStr,
        purpose: `${item.XTYPE} ${value}`.trim(),
        record_date: dateStr,
        comp_name: symbol,
      })

      // Check if dilutive action is recent
      if (xtype.includes('rights') || xtype.includes('bonus')) {
        const parsed = new Date(dateStr)
        if (!isNaN(parsed.getTime()) && parsed >= threeYearsAgo) recentDilutive = true
      }
    }

    // Parse dividends for buyback detection (some BSE entries mark buybacks in dividends table)
    for (const item of dividends) {
      const purpose = String(item.purpose_name ?? '').toLowerCase()
      if (purpose.includes('buyback') || purpose.includes('buy back')) buybackCount++
    }

    const result: BSECorporateActionSummary = {
      actions,
      bonusCount,
      splitCount,
      rightsCount,
      buybackCount,
      hasDilutiveActions: recentDilutive,
      hasBuybacks: buybackCount > 0,
    }

    cache.set(cacheKey, result, { ttl: 24 * 60 * 60 * 1000 })
    return result
  } catch (error) {
    console.warn(`[BSE] Error fetching corporate actions:`, error instanceof Error ? error.message : error)
    cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
    return null
  }
}

// ─── Scanner-Enrichment Queries ──────────────────────────────

export interface BSEScannerSignals {
  hasCreditDowngrade: boolean
  creditRatingText: string | null
  hasManagementChange: boolean
  managementChangeText: string | null
  hasAuditorChange: boolean
  auditorChangeText: string | null
}

/**
 * Fetch scanner-relevant signals from BSE announcements.
 * Queries Board Meeting + Company Update categories and parses headlines
 * for credit rating, management, and auditor change keywords.
 */
export async function getBSEScannerSignals(symbol: string): Promise<BSEScannerSignals> {
  const cacheKey = `bse\0scanner\0${symbol}`
  const cached = cache.get<BSEScannerSignals>(cacheKey)
  if (cached !== undefined) return cached

  const result: BSEScannerSignals = {
    hasCreditDowngrade: false, creditRatingText: null,
    hasManagementChange: false, managementChangeText: null,
    hasAuditorChange: false, auditorChangeText: null,
  }

  const scripCode = await getBseScripCode(symbol)
  if (!scripCode) {
    cache.set(cacheKey, result, { ttl: 24 * 60 * 60 * 1000 })
    return result
  }

  const now = new Date()
  const oneYearAgo = getDateNYearsAgo(1)
  const dateFrom = formatDateDDMMYYYY(oneYearAgo)
  const dateTo = formatDateDDMMYYYY(now)

  // Fetch Board Meeting + Company Update announcements in parallel
  const [boardMeetings, companyUpdates] = await Promise.all([
    bseFetch<BSEAnnouncement[]>('/AnnGetData/w', {
      strCat: 'Board Meeting', strPrevDate: dateFrom, strToDate: dateTo,
      strScrip: scripCode, strSearch: 'scrip', strType: 'C',
    }),
    bseFetch<BSEAnnouncement[]>('/AnnGetData/w', {
      strCat: 'Company Update', strPrevDate: dateFrom, strToDate: dateTo,
      strScrip: scripCode, strSearch: 'scrip', strType: 'C',
    }),
  ])

  // Parse Board Meeting headlines for management changes
  if (boardMeetings && Array.isArray(boardMeetings)) {
    for (const ann of boardMeetings.slice(0, 20)) {
      const text = `${ann.HEADLINE || ''} ${ann.NEWSSUB || ''}`.toLowerCase()
      if (text.match(/\b(resign|cessation|appointment|exit)\b.*\b(cfo|ceo|managing director|md|whole.?time director|chief)\b/) ||
          text.match(/\b(cfo|ceo|managing director|md|chief)\b.*\b(resign|cessation|appointment|exit)\b/)) {
        result.hasManagementChange = true
        result.managementChangeText = ann.HEADLINE || ann.NEWSSUB || 'Management change detected'
        break
      }
    }
  }

  // Parse Company Update headlines for credit rating + auditor
  if (companyUpdates && Array.isArray(companyUpdates)) {
    for (const ann of companyUpdates.slice(0, 30)) {
      const text = `${ann.HEADLINE || ''} ${ann.NEWSSUB || ''}`.toLowerCase()

      // Credit rating
      if (!result.hasCreditDowngrade && text.match(/\b(credit rating|crisil|icra|care rating|india rating|fitch|moody|downgrad)/)) {
        result.hasCreditDowngrade = text.includes('downgrad')
        result.creditRatingText = ann.HEADLINE || ann.NEWSSUB || 'Credit rating activity'
      }

      // Auditor change
      if (!result.hasAuditorChange && text.match(/\b(statutory auditor|auditor.*appoint|auditor.*resign|change.*auditor|auditor.*change)/)) {
        result.hasAuditorChange = true
        result.auditorChangeText = ann.HEADLINE || ann.NEWSSUB || 'Auditor change detected'
      }
    }
  }

  cache.set(cacheKey, result, { ttl: 24 * 60 * 60 * 1000 })
  return result
}

/**
 * Convert BSE scanner signals into scanner display values + red flags.
 */
export function bseScannerToValues(signals: BSEScannerSignals): Record<string, string> {
  const values: Record<string, string> = {}

  values['rf-credit-downgrade'] = signals.hasCreditDowngrade
    ? signals.creditRatingText || 'Downgrade detected'
    : signals.creditRatingText || 'Stable'

  values['rf-mgmt-churn'] = signals.hasManagementChange
    ? signals.managementChangeText || 'Change detected'
    : 'Stable'

  values['rf-auditor-change'] = signals.hasAuditorChange
    ? signals.auditorChangeText || 'Change detected'
    : 'No change'

  return values
}

export function bseScannerRedFlags(signals: BSEScannerSignals): { id: string; title: string; description: string; severity: 'hard' | 'soft' }[] {
  const flags: { id: string; title: string; description: string; severity: 'hard' | 'soft' }[] = []

  if (signals.hasCreditDowngrade) {
    flags.push({ id: 'BSE_CREDIT', title: 'Credit Rating Downgrade', description: signals.creditRatingText || 'Credit rating downgraded', severity: 'soft' })
  }
  if (signals.hasManagementChange) {
    flags.push({ id: 'BSE_MGMT', title: 'Key Management Change', description: signals.managementChangeText || 'CFO/CEO change detected', severity: 'soft' })
  }
  if (signals.hasAuditorChange) {
    flags.push({ id: 'BSE_AUDITOR', title: 'Auditor Change', description: signals.auditorChangeText || 'Statutory auditor changed', severity: 'soft' })
  }

  return flags
}
