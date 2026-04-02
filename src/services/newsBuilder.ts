/**
 * News Builder — Google News RSS + BSE filings → display formats
 *
 * Primary: Google News RSS (free, no API key, Indian stock coverage)
 * Secondary: BSE insider transactions + corporate actions (cached 24h)
 *
 * Produces NewsItem[], UpcomingEvent[], and NewsEvent[] for the UI.
 */

import type { NewsEvent } from '@/types'
import type { NewsItem, UpcomingEvent } from '@/data/news'
import { getInsiderTransactions, getCorporateActions } from '@/services/bse'
import { cache } from '@/services/cache'
import { classifyNewsEvent, classifyCorporateAction, classifyInsiderFiling } from '@/data/newsEventTaxonomy'

// ─── Date Helpers ──────────────────────────────────

/** Parse BSE date formats: "29/10/2025" or "2025-03-15T00:00:00" → ISO date string */
function parseBSEDate(raw: string): string {
  if (!raw) return ''
  // ISO format
  if (raw.includes('-') && raw.length >= 10) return raw.split('T')[0]
  // DD/MM/YYYY format
  const parts = raw.split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  return raw
}

function isFutureDate(dateStr: string): boolean {
  if (!dateStr) return false
  const today = new Date().toISOString().split('T')[0]
  return dateStr > today
}

function isRecentDate(dateStr: string, monthsAgo: number): boolean {
  if (!dateStr) return false
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - monthsAgo)
  return dateStr >= cutoff.toISOString().split('T')[0]
}

// ─── Sentiment Detection ──────────────────────────

function detectInsiderSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase()
  if (lower.includes('acquisition') || lower.includes('purchase') || lower.includes('bought')) return 'positive'
  if (lower.includes('disposal') || lower.includes('sale') || lower.includes('sold')) return 'negative'
  return 'neutral'
}

function detectActionSentiment(purpose: string): 'positive' | 'negative' | 'neutral' {
  const lower = purpose.toLowerCase()
  if (lower.includes('dividend') || lower.includes('buy back') || lower.includes('buyback')) return 'positive'
  if (lower.includes('bonus') || lower.includes('split')) return 'positive'
  if (lower.includes('rights')) return 'neutral'
  return 'neutral'
}

// ─── Google News RSS ─────────────────────────────

const GNEWS_CACHE_TTL = 60 * 60 * 1000 // 1 hour

const POSITIVE_KEYWORDS = /\b(surge|rally|profit|upgrade|buy|growth|record|strong|beats|rises|gains|soars|jumps|bullish|outperform|boost|recovery)\b/i
const NEGATIVE_KEYWORDS = /\b(fall|drop|decline|loss|downgrade|sell|weak|crash|slump|plunge|bearish|underperform|warning|concern|risk|fraud|scam)\b/i

function detectNewsSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const posMatch = text.match(POSITIVE_KEYWORDS)
  const negMatch = text.match(NEGATIVE_KEYWORDS)
  if (posMatch && !negMatch) return 'positive'
  if (negMatch && !posMatch) return 'negative'
  return 'neutral'
}

function categorizeNews(text: string): NewsItem['category'] {
  const lower = text.toLowerCase()
  if (lower.includes('earning') || lower.includes('revenue') || lower.includes('profit') || lower.includes('result') || lower.includes('quarter')) return 'earnings'
  if (lower.includes('sebi') || lower.includes('rbi') || lower.includes('regulat') || lower.includes('compliance')) return 'regulatory'
  if (lower.includes('sector') || lower.includes('industry') || lower.includes('market')) return 'sector'
  if (lower.includes('ceo') || lower.includes('board') || lower.includes('appoint') || lower.includes('resign')) return 'management'
  if (lower.includes('product') || lower.includes('launch') || lower.includes('expansion') || lower.includes('partnership')) return 'product'
  return 'market'
}

/** Parse RFC 2822 date from RSS (e.g., "Wed, 02 Apr 2026 05:30:00 GMT") → ISO string */
function parseRSSDate(rfc2822: string): string {
  try {
    const d = new Date(rfc2822)
    return isNaN(d.getTime()) ? '' : d.toISOString()
  } catch {
    return ''
  }
}

/**
 * Fetch stock news from Google News RSS.
 * Returns up to 10 recent news items. Results cached 1 hour.
 */
async function fetchGoogleNews(companyName: string, stockId: string): Promise<NewsItem[]> {
  const query = encodeURIComponent(`${companyName} stock`)
  const cacheKey = `gnews\0${query}`
  const cached = cache.get<NewsItem[]>(cacheKey)
  if (cached !== undefined) return cached

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)
    const response = await fetch(
      `/api/gnews/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`,
      { signal: controller.signal },
    )
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[GoogleNews] HTTP ${response.status} for ${companyName}`)
      return []
    }

    const xml = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const rssItems = doc.querySelectorAll('item')

    const items: NewsItem[] = []
    rssItems.forEach((item, i) => {
      if (i >= 10) return // cap at 10
      const title = item.querySelector('title')?.textContent?.trim() || ''
      const link = item.querySelector('link')?.textContent?.trim() || ''
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || ''
      const source = item.querySelector('source')?.textContent?.trim() || 'Google News'

      if (!title) return

      const timestamp = parseRSSDate(pubDate)
      if (!timestamp) return

      const classified = classifyNewsEvent(title)
      items.push({
        id: `gnews-${i}-${Date.now()}`,
        stockId,
        headline: title,
        summary: title,
        source,
        timestamp,
        category: categorizeNews(title),
        sentiment: detectNewsSentiment(title),
        impactSegments: classified.impactSegments,
        importance: isRecentDate(timestamp.split('T')[0], 1) ? 'high' : 'medium',
        url: link || undefined,
      })
    })

    cache.set(cacheKey, items, { ttl: GNEWS_CACHE_TTL })
    return items
  } catch (error) {
    console.warn(`[GoogleNews] Failed for ${companyName}:`, error instanceof Error ? error.message : error)
    return []
  }
}

// ─── NewsItem[] (Google News + BSE filings) ─────

/**
 * Build NewsItem[] from Google News RSS + BSE insider filings + corporate actions.
 * Google News provides market headlines; BSE provides regulatory filings.
 * Returns top 10 items sorted by date desc.
 */
export async function buildNewsItems(symbol: string, companyName?: string): Promise<NewsItem[]> {
  const [insiderData, corpData, googleNews] = await Promise.all([
    getInsiderTransactions(symbol),
    getCorporateActions(symbol),
    companyName ? fetchGoogleNews(companyName, symbol.toLowerCase()) : Promise.resolve([]),
  ])

  const items: NewsItem[] = []
  const stockId = symbol.toLowerCase()

  // Insider filings → news items (classified via taxonomy)
  if (insiderData?.recentFilings) {
    for (const filing of insiderData.recentFilings) {
      const date = parseBSEDate(filing.NEWS_DT)
      const text = filing.HEADLINE || filing.NEWSSUB || ''
      const classified = classifyInsiderFiling(text)
      items.push({
        id: `bse-insider-${filing.SCRIP_CD}-${date}`,
        stockId,
        headline: text || 'Insider Transaction',
        summary: filing.NEWSSUB || filing.HEADLINE || '',
        source: 'BSE Filing',
        timestamp: filing.NEWS_DT,
        category: 'management',
        sentiment: detectInsiderSentiment(text),
        impactSegments: classified.impactSegments,
        importance: isRecentDate(date, 3) ? 'high' : 'medium',
      })
    }
  }

  // Corporate actions → news items (classified via taxonomy)
  if (corpData?.actions) {
    for (const action of corpData.actions) {
      const date = parseBSEDate(action.ex_date)
      const classified = classifyCorporateAction(action.purpose)
      items.push({
        id: `bse-action-${action.scrip_code}-${date}`,
        stockId,
        headline: `${action.short_name}: ${action.purpose}`,
        summary: `Corporate action — ${action.purpose}. Ex-date: ${action.ex_date}`,
        source: 'BSE',
        timestamp: `${date}T00:00:00`,
        category: 'market',
        sentiment: detectActionSentiment(action.purpose),
        impactSegments: classified.impactSegments,
        importance: isRecentDate(date, 3) ? 'high' : 'medium',
      })
    }
  }

  // Merge Google News (first — more relevant) + BSE filings
  const allItems = [...googleNews, ...items]

  // Sort by date desc, take top 10
  allItems.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return allItems.slice(0, 10)
}

// ─── Gap 3: UpcomingEvent[] ──────────────────────

/**
 * Build UpcomingEvent[] from BSE corporate actions with future ex-dates.
 */
export async function buildUpcomingEvents(symbol: string): Promise<UpcomingEvent[]> {
  const corpData = await getCorporateActions(symbol)
  if (!corpData?.actions) return []

  const events: UpcomingEvent[] = []
  const stockId = symbol.toLowerCase()

  for (const action of corpData.actions) {
    const date = parseBSEDate(action.ex_date)
    if (!isFutureDate(date)) continue

    const purpose = action.purpose.toLowerCase()
    const type: UpcomingEvent['type'] =
      purpose.includes('dividend') ? 'dividend' :
      purpose.includes('bonus') || purpose.includes('split') ? 'result' :
      purpose.includes('agm') ? 'agm' :
      'board_meeting'

    events.push({
      id: `bse-event-${action.scrip_code}-${date}`,
      stockId,
      type,
      title: action.purpose,
      date,
      description: `${action.comp_name} — ${action.purpose}`,
      importance: purpose.includes('bonus') || purpose.includes('split') || purpose.includes('buyback') ? 'high' : 'medium',
    })
  }

  // Sort by date asc (nearest first)
  events.sort((a, b) => a.date.localeCompare(b.date))
  return events
}

// ─── Gap 4: NewsEvent[] (V2 verdict format) ──────

/**
 * Build V2 NewsEvent[] from Google News + BSE data for embedding in StockVerdictV2.
 * Returns top 10 events categorized by bucket.
 */
export async function buildNewsEvents(symbol: string, companyName?: string): Promise<NewsEvent[]> {
  const [insiderData, corpData, googleNews] = await Promise.all([
    getInsiderTransactions(symbol),
    getCorporateActions(symbol),
    companyName ? fetchGoogleNews(companyName, symbol.toLowerCase()) : Promise.resolve([]),
  ])

  const events: NewsEvent[] = []
  let counter = 0

  // Insider filings → classified via taxonomy
  if (insiderData?.recentFilings) {
    for (const filing of insiderData.recentFilings.slice(0, 5)) {
      const date = parseBSEDate(filing.NEWS_DT)
      const text = filing.HEADLINE || filing.NEWSSUB || ''
      const classified = classifyInsiderFiling(text)
      const sentiment = detectInsiderSentiment(text)
      events.push({
        id: `news-insider-${++counter}`,
        type: classified.id,
        bucket: classified.bucket,
        title: text || 'Insider Transaction',
        source: 'BSE SAST Filing',
        date,
        severity: sentiment === 'positive' ? 'positive' : sentiment === 'negative' ? 'watch' : classified.defaultSeverity,
        investorMeaning: classified.investorMeaning,
        impactSegments: classified.impactSegments,
      })
    }
  }

  // Corporate actions → classified via taxonomy
  if (corpData?.actions) {
    for (const action of corpData.actions.slice(0, 5)) {
      const date = parseBSEDate(action.ex_date)
      const classified = classifyCorporateAction(action.purpose)
      events.push({
        id: `news-action-${++counter}`,
        type: classified.id,
        bucket: classified.bucket,
        title: action.purpose,
        source: 'BSE Corporate Actions',
        date,
        severity: classified.defaultSeverity,
        investorMeaning: classified.investorMeaning,
        impactSegments: classified.impactSegments,
      })
    }
  }

  // Google News → classified via 48-type taxonomy
  for (const gn of googleNews.slice(0, 6)) {
    const date = gn.timestamp.split('T')[0]
    const classified = classifyNewsEvent(gn.headline)
    events.push({
      id: `news-gnews-${++counter}`,
      type: classified.id,
      bucket: classified.bucket,
      title: gn.headline,
      source: gn.source,
      date,
      severity: gn.sentiment === 'positive' ? 'positive' : gn.sentiment === 'negative' ? 'watch' : classified.defaultSeverity,
      investorMeaning: classified.investorMeaning,
      impactSegments: classified.impactSegments,
    })
  }

  // Sort by date desc, return top 10
  events.sort((a, b) => b.date.localeCompare(a.date))
  return events.slice(0, 10)
}
