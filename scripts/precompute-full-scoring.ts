#!/usr/bin/env npx tsx
/**
 * Full 3-Pillar Scoring Pipeline — Pre-computes StockFox scores for all stocks.
 *
 * Uses the ACTUAL scoring services from src/ (not duplicated logic).
 * Runs server-side via tsx with @/ path aliases resolved.
 *
 * Output: public/data/stock-cache.json + Vercel Blob upload + GitHub Release
 *
 * Tiered frequency:
 *   Large + Mid Cap: daily (full scoring + all data sources)
 *   Small Cap: every 3 days (full scoring)
 *
 * 4 profile scores per stock: Priya, Kavya, Meera, Sneha
 *
 * Usage:
 *   CMOTS_API_TOKEN=xxx npx tsx scripts/precompute-full-scoring.ts --tier=all
 */

// ─── Override fetch base URL for server-side execution ──────
// The scoring services use `/api/cmots/...` which needs a proxy in browser.
// Server-side, we call CMOTS directly. We override globalThis.fetch to intercept.

const CMOTS_BASE = 'https://deltastockzapis.cmots.com/api'
const CMOTS_TOKEN = process.env.CMOTS_API_TOKEN
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO = 'aby0607-maker/stockfox'

if (!CMOTS_TOKEN) { console.error('❌ CMOTS_API_TOKEN not set'); process.exit(1) }

// Intercept fetch calls to proxy URLs and redirect to real APIs
const originalFetch = globalThis.fetch
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url

  // Intercept /api/cmots/* → CMOTS direct
  if (url.startsWith('/api/cmots/')) {
    const cmotPath = url.replace('/api/cmots', '')
    const targetUrl = `${CMOTS_BASE}${cmotPath}`
    return originalFetch(targetUrl, {
      ...init,
      headers: { ...init?.headers as Record<string, string>, 'Authorization': `Bearer ${CMOTS_TOKEN}`, 'Content-Type': 'application/json' },
    })
  }

  // Intercept /api/yahoo/* → Yahoo Finance direct
  if (url.startsWith('/api/yahoo/')) {
    const yahooPath = url.replace('/api/yahoo', '')
    const qs = url.includes('?') ? '' : ''
    const targetUrl = `https://query2.finance.yahoo.com${yahooPath}`
    return originalFetch(targetUrl, {
      ...init,
      headers: { ...init?.headers as Record<string, string>, 'User-Agent': 'Mozilla/5.0 (compatible; StockFox/1.0)' },
    })
  }

  // Intercept /api/bse/* → BSE India direct
  if (url.startsWith('/api/bse/')) {
    const bsePath = url.replace('/api/bse', '')
    const targetUrl = `https://api.bseindia.com/BseIndiaAPI/api${bsePath}`
    return originalFetch(targetUrl, {
      ...init,
      headers: { ...init?.headers as Record<string, string>, 'Accept': 'application/json' },
    })
  }

  // Intercept /api/screener/* → Screener.in direct
  if (url.startsWith('/api/screener/')) {
    const screenerPath = url.replace('/api/screener', '')
    const targetUrl = `https://www.screener.in${screenerPath}`
    return originalFetch(targetUrl, init)
  }

  // Intercept /api/finnhub/* → Finnhub direct
  if (url.startsWith('/api/finnhub/')) {
    const finnhubPath = url.replace('/api/finnhub', '')
    const apiKey = process.env.FINNHUB_API_KEY || ''
    const sep = finnhubPath.includes('?') ? '&' : '?'
    const targetUrl = `https://finnhub.io/api/v1${finnhubPath}${sep}token=${apiKey}`
    return originalFetch(targetUrl, init)
  }

  // Intercept /api/trendlyne/* → Trendlyne direct
  if (url.startsWith('/api/trendlyne/')) {
    const trendPath = url.replace('/api/trendlyne', '')
    const targetUrl = `https://trendlyne.com${trendPath}`
    return originalFetch(targetUrl, init)
  }

  // Intercept /api/indianapi/* → IndianAPI direct
  if (url.startsWith('/api/indianapi/')) {
    const iaPath = url.replace('/api/indianapi', '')
    const apiKey = process.env.INDIANAPI_KEY || ''
    const targetUrl = `https://api.indianapi.in${iaPath}`
    return originalFetch(targetUrl, {
      ...init,
      headers: { ...init?.headers as Record<string, string>, 'X-Api-Key': apiKey },
    })
  }

  // Intercept /api/nse-archives/* → NSE direct
  if (url.startsWith('/api/nse-archives/')) {
    const nsePath = url.replace('/api/nse-archives', '')
    const targetUrl = `https://nsearchives.nseindia.com${nsePath}`
    return originalFetch(targetUrl, init)
  }

  // Pass through everything else (external URLs)
  return originalFetch(input, init)
}

// ─── Now import the actual scoring services ─────────────────

import { getCompanyMaster, getCompanyBySymbol, getTTMData } from '@/services/cmots'
import { resolveMetricValues } from '@/services/metricResolver'
import { computeQuantSegments } from '@/services/quantScoringService'
import { computeQualFactors } from '@/services/qualScoringService'
import { computeRiskFromScanner, buildScannerValuesFromMetrics, buildScannerValuesFromSegments } from '@/services/redFlagScannerService'
import { buildNewsEvents } from '@/services/newsBuilder'
import { getSurveillanceStatus, surveillanceToScannerValues } from '@/services/nse'
import { getBSEScannerSignals, bseScannerToValues } from '@/services/bse'
import { ACTIVE_PROFILE_IDS, getProfileWeightsV2 } from '@/data/profiles'
import { getScoreBandEnum, getOverallVerdict } from '@/lib/scoring'
import type { SegmentVerdictV2, PillarVerdict } from '@/types'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// ─── Config ─────────────────────────────────────

const tierArg = process.argv.find(a => a.startsWith('--tier='))?.split('=')[1]
const dayOfWeek = new Date().getDay()
const tiersToRefresh = tierArg === 'all'
  ? ['Large Cap', 'Mid Cap', 'Small Cap']
  : tierArg ? [tierArg]
  : dayOfWeek % 2 === 1
    ? ['Large Cap', 'Mid Cap', 'Small Cap']
    : ['Large Cap', 'Mid Cap']

console.log(`\n🦊 StockFox Full Scoring Pipeline — ${new Date().toISOString()}`)
console.log(`📅 Tiers: ${tiersToRefresh.join(', ')}`)
console.log(`👤 Profiles: ${ACTIVE_PROFILE_IDS.join(', ')}\n`)

// ─── Pillar builder (same as verdictService.ts) ─────────────

function buildPillarVerdictV2(
  pillar: 'quant' | 'qual' | 'risk',
  name: string,
  segments: SegmentVerdictV2[],
  profileSegmentWeights?: Record<string, number>,
): PillarVerdict {
  const scoredSegments = segments.filter(s => s.scoringType === 'scored' && s.score !== undefined)
  const getWeight = (seg: SegmentVerdictV2) => profileSegmentWeights?.[seg.id] ?? seg.weight ?? 0
  const totalWeight = scoredSegments.reduce((sum, seg) => sum + getWeight(seg), 0) || 1
  const weightedScore = totalWeight > 0
    ? Math.round(scoredSegments.reduce((sum, seg) => sum + (seg.score ?? 50) * getWeight(seg), 0) / totalWeight)
    : 50

  return {
    pillar, name, score: weightedScore,
    scoreBand: getScoreBandEnum(weightedScore),
    label: getOverallVerdict(weightedScore).label,
    summary: '',
    segments,
  }
}

// ─── Main pipeline ──────────────────────────────

async function main() {
  const startTime = Date.now()

  // Step 1: Load company master + price feed
  console.log('📋 Loading company master...')
  const companies = await getCompanyMaster()
  if (!companies?.length) { console.error('❌ Failed'); process.exit(1) }
  console.log(`   ✓ ${companies.length} companies`)

  // Step 2: Filter by tier
  const nseCompanies = companies.filter(c => c.nsesymbol && (c.nselistedflag === 'Y' || c.nselistedflag === 'Yes'))
  const tiers: Record<string, typeof nseCompanies> = {
    'Large Cap': nseCompanies.filter(c => c.mcaptype === 'Large Cap'),
    'Mid Cap': nseCompanies.filter(c => c.mcaptype === 'Mid Cap'),
    'Small Cap': nseCompanies.filter(c => c.mcaptype !== 'Large Cap' && c.mcaptype !== 'Mid Cap'),
  }

  console.log(`\n📊 Universe:`)
  for (const [tier, stocks] of Object.entries(tiers)) {
    const active = tiersToRefresh.includes(tier)
    console.log(`   ${active ? '✅' : '⏭️'} ${tier}: ${stocks.length} stocks`)
  }

  // Load existing cache
  const cachePath = join(process.cwd(), 'public', 'data', 'stock-cache.json')
  const existingStocks = new Map<string, any>()
  if (existsSync(cachePath)) {
    try {
      const existing = JSON.parse(readFileSync(cachePath, 'utf8'))
      for (const s of existing.stocks) existingStocks.set(s.symbol, s)
      console.log(`   📦 Existing cache: ${existingStocks.size} stocks`)
    } catch { /* no cache */ }
  }

  // Step 3: Full scoring for each stock
  const stocksToProcess = tiersToRefresh.flatMap(tier => tiers[tier] || [])
  console.log(`\n🔬 Full scoring for ${stocksToProcess.length} stocks...\n`)

  const CONCURRENCY = 3  // Lower concurrency for full scoring (many API calls per stock)
  let successCount = 0, failCount = 0
  const results = new Map(existingStocks)

  async function scoreStock(company: typeof nseCompanies[0]) {
    const symbol = company.nsesymbol.toUpperCase()
    try {
      // Resolve all raw metrics (TTM + P&L + BS + CF + QR + Shareholding + Prices)
      const resolved = await resolveMetricValues(symbol)
      if (!resolved) return null

      // Compute Quant segments (7 segments, 57 signals)
      const quantSegments = await computeQuantSegments(symbol)

      // Compute Qual factors (5 factors, 57 signals)
      const qualFactors = await computeQualFactors(symbol)

      // Compute Risk (red flag scanner)
      const surveillance = await getSurveillanceStatus(symbol).catch(() => null)
      const bseSignals = await getBSEScannerSignals(symbol).catch(() => ({ creditRating: [], managementChanges: [], auditorChanges: [] }))

      const metricScannerValues = buildScannerValuesFromMetrics(resolved.data, quantSegments, qualFactors)
      const segmentScannerValues = buildScannerValuesFromSegments(quantSegments, qualFactors)
      const scannerValues = { ...metricScannerValues, ...segmentScannerValues }
      if (surveillance) Object.assign(scannerValues, surveillanceToScannerValues(surveillance))
      Object.assign(scannerValues, bseScannerToValues(bseSignals))

      const riskResult = computeRiskFromScanner(scannerValues, quantSegments, qualFactors)

      // Compute 4 profile-specific scores
      const profileScores: Record<string, { score: number; verdict: string; label: string }> = {}

      for (const profileId of ACTIVE_PROFILE_IDS) {
        const weights = getProfileWeightsV2(profileId)
        const pw = weights.pillarWeights

        const quantPillar = buildPillarVerdictV2('quant', 'Quant', quantSegments, weights.quantWeights)
        const qualPillar = buildPillarVerdictV2('qual', 'Qual', qualFactors, weights.qualWeights)
        const riskPillar: PillarVerdict = {
          pillar: 'risk', name: 'Risk', score: riskResult.score,
          scoreBand: getScoreBandEnum(riskResult.score), label: riskResult.label,
          summary: riskResult.summary, segments: [riskResult.segment],
        }

        const totalWeight = pw.quant + pw.qual + pw.risk
        const overallScore = Math.round(
          (quantPillar.score * pw.quant + qualPillar.score * pw.qual + riskPillar.score * pw.risk) / totalWeight
        )
        const overall = getOverallVerdict(overallScore)

        profileScores[profileId] = {
          score: overallScore,
          verdict: overall.verdict,
          label: overall.label,
        }
      }

      // Get TTM for display metrics
      const ttm = await getTTMData(symbol).catch(() => null) as any

      // Yahoo 52W data
      let range52W: any = null
      try {
        const now = Math.floor(Date.now() / 1000)
        const oneYearAgo = now - 365 * 24 * 60 * 60
        const yahooSymbol = `${symbol}.NS`
        const yahooRes = await originalFetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${oneYearAgo}&period2=${now}&interval=1d`, {
          headers: { 'User-Agent': 'StockFox/1.0' },
        })
        if (yahooRes.ok) {
          const yahooData = await yahooRes.json()
          const closes = yahooData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((c: any) => c != null && c > 0)
          if (closes?.length > 10) {
            const high = Math.max(...closes), low = Math.min(...closes), cur = closes[closes.length - 1]
            range52W = {
              high52W: Math.round(high * 100) / 100,
              low52W: Math.round(low * 100) / 100,
              fromHigh: Math.round(((cur - high) / high) * 10000) / 100,
              fromLow: Math.round(((cur - low) / low) * 10000) / 100,
              return1Y: Math.round(((cur - closes[0]) / closes[0]) * 10000) / 100,
            }
          }
        }
      } catch { /* Yahoo failed */ }

      // Build segment scores for the cache (profile-independent)
      const segmentScores: Record<string, number | undefined> = {}
      for (const seg of quantSegments) { if (seg.score != null) segmentScores[seg.id] = seg.score }
      for (const seg of qualFactors) { if (seg.score != null) segmentScores[seg.id] = seg.score }
      segmentScores['risk'] = riskResult.score

      return {
        symbol,
        name: company.companyshortname || company.companyname,
        sector: company.sectorname,
        industry: company.industryname,
        mcapType: company.mcaptype,
        coCode: company.co_code,
        bseCode: company.bsecode || null,

        // 4 profile scores
        scores: profileScores,
        // Default score (Priya — baseline)
        score: profileScores['priya']?.score ?? 0,
        verdict: profileScores['priya']?.label ?? '—',

        // Segment-level scores (profile-independent)
        segments: segmentScores,

        // Key display metrics from TTM
        price: null, // Filled from BSE price feed below
        changePercent: null,
        pe: ttm?.pe_ttm ?? null,
        pb: ttm?.pb_ttm ?? null,
        roe: ttm?.roe_ttm ?? null,
        roce: ttm?.roce_ttm ?? null,
        opm: ttm?.operatingprofitmargin ?? null,
        de: ttm?.debttoequity ?? null,
        eps: ttm?.eps_ttm ?? null,
        mcap: ttm?.mcap ?? null,
        dy: ttm?.dividendyield ?? null,
        evEbitda: ttm?.ev_ebitda ?? null,

        // Ownership
        promoterHolding: resolved.data?.['promoter_holding'] ?? null,

        // 52W range
        ...(range52W || {}),

        // Risk summary
        riskScore: riskResult.score,
        riskFlags: riskResult.flagCount,

        // Scoring metadata
        scoringVersion: 'full-3pillar',
        lastUpdated: new Date().toISOString(),
      }
    } catch (err) {
      return null
    }
  }

  // Process in batches
  for (let i = 0; i < stocksToProcess.length; i += CONCURRENCY) {
    const batch = stocksToProcess.slice(i, i + CONCURRENCY)
    const batchNum = Math.floor(i / CONCURRENCY) + 1
    const totalBatches = Math.ceil(stocksToProcess.length / CONCURRENCY)

    const batchResults = await Promise.allSettled(batch.map(scoreStock))

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.set(r.value.symbol, r.value)
        successCount++
      } else {
        failCount++
      }
    }

    if (batchNum % 5 === 0 || batchNum === totalBatches) {
      const pct = Math.round((i + batch.length) / stocksToProcess.length * 100)
      console.log(`  [${pct}%] Batch ${batchNum}/${totalBatches} — ${successCount} ✓ ${failCount} ✗`)
    }

    await new Promise(r => setTimeout(r, 200))
  }

  // Step 4: Add prices from BSE delayed feed
  console.log('\n💰 Fetching BSE prices...')
  const priceRes = await originalFetch(`${CMOTS_BASE}/BSEDelayedPriceFeed`, {
    headers: { 'Authorization': `Bearer ${CMOTS_TOKEN}`, 'Content-Type': 'application/json' },
  })
  if (priceRes.ok) {
    const priceJson = await priceRes.json()
    const prices = priceJson?.data || []
    let priced = 0
    for (const p of prices) {
      const stock = results.get(String(p.co_code)) || [...results.values()].find(s => s.coCode === p.co_code)
      if (stock) {
        stock.price = p.price || null
        stock.changePercent = p.change ?? null
        priced++
      }
    }
    console.log(`   ✓ ${priced} stocks priced`)
  }

  // Step 5: Peer rankings per sector (cap-agnostic)
  console.log('\n🏆 Computing peer rankings...')
  const allStocks = [...results.values()]
  const bySector = new Map<string, any[]>()
  for (const stock of allStocks) {
    const sector = stock.sector || 'Unknown'
    if (!bySector.has(sector)) bySector.set(sector, [])
    bySector.get(sector)!.push(stock)
  }

  // Rank per profile
  for (const profileId of ACTIVE_PROFILE_IDS) {
    for (const [sector, stocks] of bySector) {
      stocks.sort((a: any, b: any) => {
        const scoreA = a.scores?.[profileId]?.score ?? a.score ?? 0
        const scoreB = b.scores?.[profileId]?.score ?? b.score ?? 0
        return scoreB - scoreA
      })
      stocks.forEach((stock: any, i: number) => {
        if (!stock.peerRanks) stock.peerRanks = {}
        stock.peerRanks[profileId] = { rank: i + 1, total: stocks.length, category: sector }
      })
    }
  }
  // Default ranking = Priya
  for (const stock of allStocks) {
    stock.peerRank = stock.peerRanks?.['priya']?.rank ?? 1
    stock.peerTotal = stock.peerRanks?.['priya']?.total ?? 1
    stock.peerCategory = stock.peerRanks?.['priya']?.category ?? stock.sector
  }
  console.log(`   ✓ Ranked across ${bySector.size} sectors × ${ACTIVE_PROFILE_IDS.length} profiles`)

  // Step 6: Write output
  const output = {
    version: '3.0',
    scoringVersion: 'full-3pillar',
    profiles: [...ACTIVE_PROFILE_IDS],
    generatedAt: new Date().toISOString(),
    tiersRefreshed: tiersToRefresh,
    stockCount: allStocks.length,
    breakdown: {
      largeCap: allStocks.filter(s => s.mcapType === 'Large Cap').length,
      midCap: allStocks.filter(s => s.mcapType === 'Mid Cap').length,
      smallCap: allStocks.filter(s => s.mcapType !== 'Large Cap' && s.mcapType !== 'Mid Cap').length,
    },
    sectorCount: bySector.size,
    stocks: allStocks,
  }

  const outputJSON = JSON.stringify(output)
  mkdirSync(join(process.cwd(), 'public', 'data'), { recursive: true })
  writeFileSync(cachePath, JSON.stringify(output, null, 2))
  const sizeMB = (outputJSON.length / (1024 * 1024)).toFixed(1)
  console.log(`\n💾 Local: ${cachePath} (${sizeMB} MB)`)

  // Step 7: Upload to Vercel Blob
  if (BLOB_TOKEN) {
    console.log('☁️  Uploading to Vercel Blob...')
    try {
      const { put } = await import('@vercel/blob')
      const blob = await put('v2-stock-data/latest.json', outputJSON, {
        access: 'public', token: BLOB_TOKEN, contentType: 'application/json',
        addRandomSuffix: false, allowOverwrite: true,
      })
      console.log(`   ✓ Blob: ${blob.url}`)
    } catch (err: any) { console.warn(`   ⚠ Blob failed: ${err.message}`) }
  }

  // Step 8: GitHub Release
  if (GITHUB_TOKEN) {
    const dateTag = new Date().toISOString().split('T')[0]
    const releaseName = `v2-historical-scoring-${dateTag}`
    console.log(`📦 GitHub Release: ${releaseName}...`)
    try {
      const releaseRes = await originalFetch(`https://api.github.com/repos/${REPO}/releases`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag_name: releaseName,
          name: `V2 Historical Scoring — ${dateTag}`,
          body: `Full 3-pillar scoring for ${allStocks.length} stocks.\n\nProfiles: ${ACTIVE_PROFILE_IDS.join(', ')}\nLarge: ${output.breakdown.largeCap}, Mid: ${output.breakdown.midCap}, Small: ${output.breakdown.smallCap}`,
          draft: false, prerelease: true,
        }),
      })
      if (releaseRes.ok) {
        const release = await releaseRes.json()
        const uploadUrl = release.upload_url.replace('{?name,label}', '?name=stock-cache.json')
        await originalFetch(uploadUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
          body: outputJSON,
        })
        console.log(`   ✓ ${release.html_url}`)
      }
    } catch (err: any) { console.warn(`   ⚠ Release failed: ${err.message}`) }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  console.log(`\n✅ Done in ${elapsed} min — ${successCount} stocks fully scored, ${failCount} failed`)
  console.log(`   📊 ${allStocks.length} total in cache (${sizeMB} MB)`)
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1) })
