/**
 * NSE Surveillance Service — ASM/GSM/Default/SMS status from daily REG_IND CSV
 *
 * NSE publishes a CSV at nsearchives.nseindia.com/content/cm/REG_INDDDMMYY.csv
 * every trading day. This file contains surveillance status for ALL NSE stocks.
 *
 * Columns used:
 *   - GSM: Graded Surveillance Measure (stages 0-6, 6 = GSM)
 *   - Long_Term_Additional_Surveillance_Measure: ASM (100 = clear, 1-4 = stages)
 *   - Short_Term_Additional_Surveillance_Measure: Short-term ASM
 *   - Unsolicited_SMS: Pump & dump flag (1 = watchlist)
 *   - Default: Default status
 *
 * Maps to Red Flag Scanner parameters:
 *   rf-asm (critical, -3 pts)
 *   rf-gsm (critical, -3 pts)
 *   rf-default (critical, -3 pts)
 *   rf-sms (critical, -3 pts)
 */

import { cache } from '@/services/cache'

export interface SurveillanceStatus {
  symbol: string
  isASM: boolean
  asmStage: number        // 0 = clear, 1-4 = stages
  isGSM: boolean
  gsmStage: number        // 0 = clear, 1-6 = stages
  isSMSAlert: boolean     // Pump & dump watchlist
  isDefault: boolean      // Default/ICA status
}

const CACHE_KEY = 'nse-surveillance'
const CACHE_TTL = 24 * 60 * 60 * 1000  // 24h — CSV updates daily

let fetchPromise: Promise<Map<string, SurveillanceStatus>> | null = null

/**
 * Build today's CSV URL. Format: REG_INDDDMMYY.csv
 */
function buildCsvUrl(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  return `/api/nse-archives/content/cm/REG_IND${dd}${mm}${yy}.csv`
}

/**
 * Parse the REG_IND CSV into a Map<symbol, SurveillanceStatus>.
 */
function parseCsv(csv: string): Map<string, SurveillanceStatus> {
  const map = new Map<string, SurveillanceStatus>()
  const lines = csv.split('\n')
  if (lines.length < 2) return map

  // Find column indices from header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const idx = {
    symbol: header.findIndex(h => h === 'Symbol' || h === 'SYMBOL'),
    gsm: header.findIndex(h => h.includes('GSM')),
    ltAsm: header.findIndex(h => h.includes('Long_Term') && h.includes('ASM')),
    stAsm: header.findIndex(h => h.includes('Short_Term') && h.includes('ASM')),
    sms: header.findIndex(h => h.includes('Unsolicited') || h.includes('SMS')),
    default: header.findIndex(h => h === 'Default' || h === 'DEFAULT'),
  }

  if (idx.symbol === -1) {
    console.warn('[NSE Surveillance] Could not find Symbol column in CSV header')
    return map
  }

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
    if (row.length < 2) continue

    const symbol = row[idx.symbol]?.toUpperCase()
    if (!symbol) continue

    const gsmVal = idx.gsm >= 0 ? parseInt(row[idx.gsm]) || 0 : 0
    const ltAsmVal = idx.ltAsm >= 0 ? parseInt(row[idx.ltAsm]) || 100 : 100
    const stAsmVal = idx.stAsm >= 0 ? parseInt(row[idx.stAsm]) || 100 : 100
    const smsVal = idx.sms >= 0 ? parseInt(row[idx.sms]) || 0 : 0
    const defaultVal = idx.default >= 0 ? parseInt(row[idx.default]) || 0 : 0

    // NSE encoding: 100 = clear sentinel for ASM/GSM. 0 = clear for SMS/Default.
    // ASM: 100 = clear, 1-4 = stages (lower = worse)
    const asmStage = ltAsmVal < 100 ? ltAsmVal : (stAsmVal < 100 ? stAsmVal : 0)

    // GSM: 0 = clear, 1-6 = stages. Values >= 100 are sentinel "clear" values.
    const gsmActive = gsmVal >= 1 && gsmVal < 10  // Only stages 1-6 are real GSM

    // SMS: Only value 1 = actively on watchlist. 0 or large values = clear.
    const smsActive = smsVal === 1

    // Default: Only value 1 = in default. 0 or large values = clear.
    const defaultActive = defaultVal === 1

    map.set(symbol, {
      symbol,
      isASM: asmStage > 0 && asmStage < 100,
      asmStage,
      isGSM: gsmActive,
      gsmStage: gsmActive ? gsmVal : 0,
      isSMSAlert: smsActive,
      isDefault: defaultActive,
    })
  }

  console.log(`[NSE Surveillance] Parsed ${map.size} stocks from REG_IND CSV`)
  return map
}

/**
 * Fetch and cache the surveillance status for all NSE stocks.
 */
async function ensureSurveillanceData(): Promise<Map<string, SurveillanceStatus>> {
  const cached = cache.get<Map<string, SurveillanceStatus>>(CACHE_KEY)
  if (cached) return cached

  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const url = buildCsvUrl()
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) })

      if (!response.ok) {
        // Try yesterday's file (weekends/holidays)
        const d = new Date()
        d.setDate(d.getDate() - 1)
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yy = String(d.getFullYear()).slice(2)
        const fallbackUrl = `/api/nse-archives/content/cm/REG_IND${dd}${mm}${yy}.csv`
        const fallbackResponse = await fetch(fallbackUrl, { signal: AbortSignal.timeout(15000) })

        if (!fallbackResponse.ok) {
          console.warn(`[NSE Surveillance] CSV unavailable (today + yesterday)`)
          return new Map()
        }
        const csv = await fallbackResponse.text()
        const map = parseCsv(csv)
        cache.set(CACHE_KEY, map, { ttl: CACHE_TTL })
        fetchPromise = null
        return map
      }

      const csv = await response.text()
      const map = parseCsv(csv)
      cache.set(CACHE_KEY, map, { ttl: CACHE_TTL })
      fetchPromise = null
      return map
    } catch (error) {
      console.warn('[NSE Surveillance] Failed to fetch CSV:', error instanceof Error ? error.message : error)
      fetchPromise = null
      return new Map()
    }
  })()

  return fetchPromise
}

/**
 * Get surveillance status for a single stock.
 */
export async function getSurveillanceStatus(symbol: string): Promise<SurveillanceStatus | null> {
  const map = await ensureSurveillanceData()
  return map.get(symbol.toUpperCase()) ?? null
}

/**
 * Convert surveillance status into scanner display values.
 * Maps to the 35-parameter Red Flag Scanner framework.
 */
export function surveillanceToScannerValues(status: SurveillanceStatus | null): Record<string, string> {
  if (!status) return {}

  const values: Record<string, string> = {}

  // rf-asm (critical, -3 pts)
  values['rf-asm'] = status.isASM ? `Stage ${status.asmStage} — ON ASM LIST` : 'Clear'

  // rf-gsm (critical, -3 pts)
  values['rf-gsm'] = status.isGSM ? `Stage ${status.gsmStage} — ON GSM LIST` : 'Clear'

  // rf-sms (critical, -3 pts)
  values['rf-sms'] = status.isSMSAlert ? 'ALERT — circulating in SMS/WhatsApp' : 'Clear'

  // rf-default (critical, -3 pts)
  values['rf-default'] = status.isDefault ? 'DEFAULT DETECTED' : 'Clear'

  return values
}

/**
 * Check if any critical surveillance flags are triggered.
 * Returns triggered flag IDs for the scanner framework.
 */
export function getSurveillanceRedFlags(status: SurveillanceStatus | null): { id: string; title: string; description: string; severity: 'hard' | 'soft' }[] {
  if (!status) return []

  const flags: { id: string; title: string; description: string; severity: 'hard' | 'soft' }[] = []

  if (status.isASM) {
    flags.push({
      id: 'SURV_ASM', title: 'On ASM List',
      description: `Stock is on NSE Additional Surveillance Measure (Stage ${status.asmStage}). Exchange flagged for unusual activity.`,
      severity: 'hard',
    })
  }
  if (status.isGSM) {
    flags.push({
      id: 'SURV_GSM', title: 'On GSM List',
      description: `Stock is on NSE Graded Surveillance Measure (Stage ${status.gsmStage}). Serious compliance concerns.`,
      severity: 'hard',
    })
  }
  if (status.isSMSAlert) {
    flags.push({
      id: 'SURV_SMS', title: 'Pump & Dump Alert',
      description: 'Stock is on NSE unsolicited SMS/WhatsApp watchlist. Possible manipulation in progress.',
      severity: 'hard',
    })
  }
  if (status.isDefault) {
    flags.push({
      id: 'SURV_DEFAULT', title: 'Default/ICA Flag',
      description: 'Company is flagged for default or under Inter-Creditor Agreement. Debt servicing concerns.',
      severity: 'hard',
    })
  }

  return flags
}
