/**
 * CMOTS Company Master — Company lookup with co_code as canonical identifier
 *
 * The CMOTS API uses `co_code` (integer) as its primary identifier.
 * This module maintains a cached lookup map keyed by String(co_code).
 *
 * BSE-only: CMOTS is a BSE data provider. The company master is filtered
 * to only include active BSE-listed companies.
 */

import type { CMOTSCompany } from '@/types'
import { cmotsFetch } from './client'

const CACHE_TTL = 24 * 60 * 60 * 1000  // 24 hours

// ── co_code → Company lookup cache ──
let companyMap: Map<string, CMOTSCompany> | null = null
let companyMapPromise: Promise<Map<string, CMOTSCompany>> | null = null

/** Build the lookup map keyed by String(co_code). Also supports lookup by bsecode/nsesymbol. */
async function ensureCompanyMap(): Promise<Map<string, CMOTSCompany>> {
  if (companyMap) return companyMap

  // Deduplicate concurrent calls during initial load
  if (companyMapPromise) return companyMapPromise

  companyMapPromise = (async () => {
    const data = await cmotsFetch<CMOTSCompany>({
      endpoint: '/companymaster',
      cacheTTL: CACHE_TTL,
      persist: true,
    })
    const companies = data.filter(c => c.bselistedflag === 'Y' || c.BSEStatus === 'Active')

    const map = new Map<string, CMOTSCompany>()
    for (const c of companies) {
      // Primary key: co_code (canonical identifier used by all CMOTS endpoints)
      map.set(String(c.co_code), c)
      // Secondary keys for backward compat / search: bsecode, nsesymbol
      if (c.bsecode) map.set(c.bsecode.toUpperCase(), c)
      if (c.nsesymbol) map.set(c.nsesymbol.toUpperCase(), c)
    }
    companyMap = map
    companyMapPromise = null
    console.log(`[CompanyMaster] Loaded ${companies.length} BSE companies`)
    return map
  })()

  return companyMapPromise
}

// ── Public API ──

/** Get all companies (BSE-active universe). */
export async function getCompanyMaster(): Promise<CMOTSCompany[]> {
  const data = await cmotsFetch<CMOTSCompany>({
    endpoint: '/companymaster',
    cacheTTL: CACHE_TTL,
    persist: true,
  })
  return data.filter(c => c.bselistedflag === 'Y' || c.BSEStatus === 'Active')
}

/** Resolve a symbol (NSE or BSE) to its co_code. Returns null if not found. */
export async function getCoCode(symbol: string): Promise<number | null> {
  const map = await ensureCompanyMap()
  const company = map.get(symbol.toUpperCase())
  return company?.co_code ?? null
}

/** Get company details by symbol (NSE or BSE code) */
export async function getCompanyBySymbol(symbol: string): Promise<CMOTSCompany | null> {
  const map = await ensureCompanyMap()
  return map.get(symbol.toUpperCase()) ?? null
}

/** Search companies by name or symbol (client-side filter) */
export async function searchCompanies(query: string): Promise<CMOTSCompany[]> {
  const q = query.toLowerCase()

  const map = await ensureCompanyMap()
  const results: CMOTSCompany[] = []
  const seen = new Set<number>()
  for (const company of map.values()) {
    if (seen.has(company.co_code)) continue
    if (
      company.companyname.toLowerCase().includes(q) ||
      company.nsesymbol?.toLowerCase().includes(q) ||
      company.bsecode?.toLowerCase().includes(q) ||
      company.companyshortname?.toLowerCase().includes(q)
    ) {
      seen.add(company.co_code)
      results.push(company)
    }
    if (results.length >= 50) break  // Cap results
  }
  return results
}

/** Clear the in-memory company map (useful for testing) */
export function clearCompanyCache(): void {
  companyMap = null
  companyMapPromise = null
}
