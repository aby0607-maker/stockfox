/**
 * Trendlyne Client — Board composition & governance data
 *
 * Trendlyne uses internal numeric IDs — we resolve via their autocomplete API.
 * Data flows:
 *   1. Resolve symbol → Trendlyne ID via /member/api/ac_snames/stock/
 *   2. Fetch /equity/overview-second-part/{id}/ for directors, executives
 *   3. Parse board composition → MG.B2 Board Independence
 *
 * All responses cached 24h (governance data is annual).
 */

import { cache } from '@/services/cache'

const API_BASE = '/api/trendlyne'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// ── Types ──

interface TrendlyneDirector {
  name: string
  designation: string
  qualification?: string
  salary?: number
}

export interface TrendlyneGovernanceData {
  trendlyneId: number
  directors: TrendlyneDirector[]
  totalDirectors: number
  independentDirectors: number
  independentPct: number
  hasWomanDirector: boolean
  executiveDirectors: number
  topExecutives: number
}

// ── Symbol Resolution ──

/**
 * Resolve stock symbol to Trendlyne internal ID.
 *
 * Strategy: Trendlyne's autocomplete API requires an active session.
 * Instead, we fetch the Screener stock page (already cached) and look for
 * a Trendlyne link, or fall back to fetching the Trendlyne equity page
 * using a constructed slug to extract the internal ID from the HTML.
 *
 * The Trendlyne overview endpoint requires this internal ID (e.g., 1127 for
 * Reliance) — BSE codes and ISIN do NOT work.
 */
async function resolveTrendlyneId(symbol: string): Promise<number | null> {
  const cacheKey = `tl\0id\0${symbol.toUpperCase()}`
  const cached = cache.get<number>(cacheKey)
  if (cached !== undefined) return cached

  try {
    // Try fetching the Trendlyne equity page with a guessed slug pattern
    // Trendlyne URL: /equity/{id}/{TICKER}/{slug}/
    // We can try common patterns to find the page
    const ticker = symbol.toUpperCase()
    const slug = ticker.toLowerCase().replace(/[^a-z0-9]/g, '-')

    // Try a search-by-render approach: fetch a page that might contain the ID
    // The SWOT page sometimes works with just the ticker
    const searchUrls = [
      `${API_BASE}/equity/swot-buy-or-sell/0/${ticker}/${slug}/strengths/`,
    ]

    for (const url of searchUrls) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10_000)
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'text/html' },
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const html = await response.text()
          // Extract ID from overview-second-part/{id}/ pattern in the HTML
          const match = html.match(/overview-second-part\/(\d+)/)
          if (match) {
            const id = parseInt(match[1], 10)
            cache.set(cacheKey, id, { ttl: CACHE_TTL })
            return id
          }
        }
      } catch {
        clearTimeout(timeoutId)
      }
    }

    // Resolution failed — cache miss to avoid repeated attempts
    console.info(`[Trendlyne] Could not resolve ID for ${ticker}`)
    cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
    return null
  } catch (error) {
    console.warn(`[Trendlyne] Error resolving ${symbol}:`, error instanceof Error ? error.message : error)
    return null
  }
}

// ── Governance Data ──

/**
 * Fetch board composition and governance data.
 * Returns null if unavailable (never throws).
 */
export async function getGovernanceData(symbol: string): Promise<TrendlyneGovernanceData | null> {
  const cacheKey = `tl\0gov\0${symbol.toUpperCase()}`
  const cached = cache.get<TrendlyneGovernanceData>(cacheKey)
  if (cached !== undefined) return cached

  const trendlyneId = await resolveTrendlyneId(symbol)
  if (!trendlyneId) {
    cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
    return null
  }

  try {
    const url = `${API_BASE}/equity/overview-second-part/${trendlyneId}/`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[Trendlyne] HTTP ${response.status} for overview ${trendlyneId}`)
      cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
      return null
    }

    // The response can be HTML or JSON depending on headers
    const contentType = response.headers.get('content-type') ?? ''
    let directorsData: TrendlyneDirector[] = []

    if (contentType.includes('json')) {
      const json = await response.json()
      directorsData = parseDirectorsFromJson(json)
    } else {
      const html = await response.text()
      directorsData = parseDirectorsFromHtml(html)
    }

    if (directorsData.length === 0) {
      cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
      return null
    }

    let independentCount = 0
    let executiveCount = 0
    let hasWomanDirector = false

    for (const d of directorsData) {
      const desig = d.designation.toLowerCase()
      if (desig.includes('independent') || desig.includes('non-executive independent')) {
        independentCount++
      } else if (desig.includes('executive') || desig.includes('managing') || desig.includes('chairman')) {
        executiveCount++
      }
      // Simple heuristic for woman director check
      if (desig.includes('woman') || d.name.match(/\b(mrs|ms|smt)\b/i)) {
        hasWomanDirector = true
      }
    }

    const result: TrendlyneGovernanceData = {
      trendlyneId,
      directors: directorsData,
      totalDirectors: directorsData.length,
      independentDirectors: independentCount,
      independentPct: directorsData.length > 0 ? (independentCount / directorsData.length) * 100 : 0,
      hasWomanDirector,
      executiveDirectors: executiveCount,
      topExecutives: 0,
    }

    cache.set(cacheKey, result, { ttl: CACHE_TTL })
    return result
  } catch (error) {
    console.warn(`[Trendlyne] Error fetching governance for ${symbol}:`, error instanceof Error ? error.message : error)
    cache.set(cacheKey, null, { ttl: 6 * 60 * 60 * 1000 })
    return null
  }
}

// ── Parsers ──

function parseDirectorsFromJson(json: Record<string, unknown>): TrendlyneDirector[] {
  const directors: TrendlyneDirector[] = []

  // Trendlyne structure: { body: { companyProfileData: { directorsTableData: [...] } } }
  const body = json.body as Record<string, unknown> | undefined
  const cpd = body?.companyProfileData as Record<string, unknown> | undefined
  const dirArr = cpd?.directorsTableData

  if (Array.isArray(dirArr)) {
    for (const d of dirArr) {
      if (d && typeof d === 'object') {
        directors.push({
          name: String((d as Record<string, unknown>).name ?? ''),
          designation: String((d as Record<string, unknown>).designation ?? ''),
          qualification: (d as Record<string, unknown>).qualification ? String((d as Record<string, unknown>).qualification) : undefined,
          salary: typeof (d as Record<string, unknown>).salary_gross === 'number' ? (d as Record<string, unknown>).salary_gross as number : undefined,
        })
      }
    }
  }

  return directors.filter(d => d.name.length > 0)
}

function parseDirectorsFromHtml(html: string): TrendlyneDirector[] {
  const directors: TrendlyneDirector[] = []

  // Look for director cards / tables in HTML
  // Pattern: <div> with director name and designation
  const directorPattern = /<(?:div|tr|li)[^>]*class="[^"]*(?:director|board-member|management)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|tr|li)>/gi
  const matches = [...html.matchAll(directorPattern)]

  for (const match of matches) {
    const block = match[1]
    const nameMatch = block.match(/<(?:h[3-6]|strong|b|span)[^>]*>([\s\S]*?)<\/(?:h[3-6]|strong|b|span)>/)
    const desigMatch = block.match(/(?:designation|title|role)[^>]*>([\s\S]*?)<\//)

    if (nameMatch) {
      directors.push({
        name: nameMatch[1].replace(/<[^>]+>/g, '').trim(),
        designation: desigMatch ? desigMatch[1].replace(/<[^>]+>/g, '').trim() : 'Director',
      })
    }
  }

  // Fallback: look for JSON-LD structured data
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch && directors.length === 0) {
    try {
      const ld = JSON.parse(jsonLdMatch[1])
      if (ld.member && Array.isArray(ld.member)) {
        for (const m of ld.member) {
          directors.push({
            name: String(m.name ?? ''),
            designation: String(m.jobTitle ?? m.roleName ?? 'Director'),
          })
        }
      }
    } catch { /* ignore parse errors */ }
  }

  return directors.filter(d => d.name.length > 0)
}
