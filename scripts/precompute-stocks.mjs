#!/usr/bin/env node
/**
 * Pre-compute stock data for the full CMOTS universe.
 *
 * Tiered refresh strategy:
 *   Large Cap  (~100 stocks) — daily
 *   Mid Cap    (~400 stocks) — daily
 *   Small Cap  (~5,900 stocks) — every 3 days (Mon/Wed/Fri)
 *
 * Dual output:
 *   1. Vercel Blob: v2-stock-data/latest.json (hot — Dashboard reads this)
 *   2. GitHub Release: v2-stock-data-YYYY-MM-DD (cold — historical archive)
 *
 * Run: CMOTS_API_TOKEN=xxx BLOB_READ_WRITE_TOKEN=xxx node scripts/precompute-stocks.mjs
 * Flags: --tier=large|mid|small|all (default: based on day of week)
 */

const CMOTS_BASE = 'https://deltastockzapis.cmots.com/api'

// ─── Config ───────────────────────────────────

const TOKEN = process.env.CMOTS_API_TOKEN
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
const GITHUB_TOKEN = process.env.GITHUB_TOKEN  // For creating releases
const REPO = 'aby0607-maker/stockfox'

if (!TOKEN) { console.error('❌ CMOTS_API_TOKEN not set'); process.exit(1) }

// Determine which tiers to refresh today
const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon, ..., 5=Fri
const tierArg = process.argv.find(a => a.startsWith('--tier='))?.split('=')[1]
const tiersToRefresh = tierArg === 'all'
  ? ['Large Cap', 'Mid Cap', 'Small Cap']
  : tierArg
    ? [tierArg]
    : dayOfWeek % 2 === 1 // Mon(1), Wed(3), Fri(5) = odd days
      ? ['Large Cap', 'Mid Cap', 'Small Cap']  // Full refresh
      : ['Large Cap', 'Mid Cap']               // Tue/Thu = Large + Mid only

console.log(`📅 Tiers to refresh today: ${tiersToRefresh.join(', ')}`)

// ─── CMOTS API ────────────────────────────────

const RATE_LIMIT_DELAY = 100 // 100ms between requests = ~10 req/sec
let requestCount = 0

async function cmotsFetch(endpoint) {
  requestCount++
  if (requestCount % 10 === 0) await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY))
  try {
    const res = await fetch(`${CMOTS_BASE}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.success && Array.isArray(json.data) ? json.data : null
  } catch { return null }
}

// ─── Scoring ──────────────────────────────────

function quickScore(ttm) {
  const pe = ttm.pe_ttm ?? 25
  const roe = ttm.roe_ttm ?? 10
  const de = ttm.debttoequity ?? 0.5
  const opm = ttm.operatingprofitmargin ?? 15
  const peS = pe > 0 && pe < 200 ? Math.max(0, Math.min(100, 100 - pe * 1.5)) : 50
  const roeS = Math.min(100, Math.max(0, roe * 4.5))
  const deS = de >= 0 ? Math.max(0, Math.min(100, 100 - de * 40)) : 50
  const opmS = Math.min(100, Math.max(0, opm * 3.5))
  return Math.round(peS * 0.25 + roeS * 0.3 + deS * 0.2 + opmS * 0.25)
}

function getVerdict(score) {
  if (score >= 80) return 'Strong Buy'
  if (score >= 65) return 'Buy'
  if (score >= 50) return 'Hold'
  if (score >= 35) return 'Sell'
  return 'Strong Sell'
}

// ─── Main Pipeline ────────────────────────────

async function main() {
  const startTime = Date.now()
  console.log(`\n🦊 StockFox V2 Stock Data — ${new Date().toISOString()}\n`)

  // Step 1: Fetch company master
  console.log('📋 Fetching company master...')
  const companies = await cmotsFetch('/companymaster')
  if (!companies?.length) { console.error('❌ Company master failed'); process.exit(1) }
  console.log(`   ✓ ${companies.length} companies loaded`)

  // Step 2: Fetch BSE price feed (single call)
  console.log('💰 Fetching BSE delayed prices...')
  const allPrices = await cmotsFetch('/BSEDelayedPriceFeed')
  const priceMap = new Map()
  if (allPrices) {
    for (const p of allPrices) priceMap.set(String(p.co_code), p)
    console.log(`   ✓ ${priceMap.size} price records`)
  }

  // Step 3: Filter companies by tier
  const nseCompanies = companies.filter(c => c.nsesymbol && (c.nselistedflag === 'Y' || c.nselistedflag === 'Yes'))
  const tiers = {
    'Large Cap': nseCompanies.filter(c => c.mcaptype === 'Large Cap'),
    'Mid Cap': nseCompanies.filter(c => c.mcaptype === 'Mid Cap'),
    'Small Cap': nseCompanies.filter(c => c.mcaptype !== 'Large Cap' && c.mcaptype !== 'Mid Cap'),
  }

  console.log(`\n📊 Universe breakdown:`)
  for (const [tier, stocks] of Object.entries(tiers)) {
    const willRefresh = tiersToRefresh.includes(tier)
    console.log(`   ${willRefresh ? '✅' : '⏭️'} ${tier}: ${stocks.length} stocks ${willRefresh ? '(refreshing)' : '(skipping today)'}`)
  }

  // Step 4: Load existing cache (to preserve non-refreshed tiers)
  let existingStocks = new Map()
  const { readFileSync, existsSync } = await import('fs')
  const { join } = await import('path')
  const cachePath = join(process.cwd(), 'public', 'data', 'stock-cache.json')
  if (existsSync(cachePath)) {
    try {
      const existing = JSON.parse(readFileSync(cachePath, 'utf8'))
      for (const s of existing.stocks) existingStocks.set(s.symbol, s)
      console.log(`   📦 Loaded ${existingStocks.size} stocks from existing cache`)
    } catch { /* no existing cache */ }
  }

  // Step 5: Fetch TTM data for stocks in active tiers
  const stocksToProcess = tiersToRefresh.flatMap(tier => tiers[tier] || [])
  console.log(`\n🔄 Processing ${stocksToProcess.length} stocks...\n`)

  let successCount = 0
  let failCount = 0
  const batchSize = 50
  const results = new Map(existingStocks)  // Start with existing data

  // Process in parallel batches (20 concurrent — CMOTS handles this fine)
  const CONCURRENCY = 20

  // Yahoo symbol mapping
  const YAHOO_RENAMES = { ZOMATO: 'ETERNAL' }
  function toYahoo(sym) { const u = sym.toUpperCase(); return `${YAHOO_RENAMES[u] || u}.NS` }

  async function fetch52W(symbol) {
    const now = Math.floor(Date.now() / 1000)
    const oneYearAgo = now - 365 * 24 * 60 * 60
    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahoo(symbol))}?period1=${oneYearAgo}&period2=${now}&interval=1d`
      const res = await fetch(url, { headers: { 'User-Agent': 'StockFox/1.0' } })
      if (!res.ok) return null
      const json = await res.json()
      const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
      if (!closes?.length) return null
      const valid = closes.filter(c => c != null && c > 0)
      if (valid.length < 10) return null
      const high = Math.max(...valid), low = Math.min(...valid), cur = valid[valid.length - 1], first = valid[0]
      return { high52W: Math.round(high * 100) / 100, low52W: Math.round(low * 100) / 100, fromHigh: Math.round(((cur - high) / high) * 10000) / 100, fromLow: Math.round(((cur - low) / low) * 10000) / 100, return1Y: Math.round(((cur - first) / first) * 10000) / 100 }
    } catch { return null }
  }

  async function fetchBSEInsider(bseCode) {
    if (!bseCode) return null
    try {
      const to = new Date(), from = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
      const url = `https://api.bseindia.com/BseIndiaAPI/api/AnnualReportHDR/w?strCat=Insider+Trading+/+SAST&scripcode=${bseCode}&FromDate=${fmt(from)}&ToDate=${fmt(to)}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) return null
      const data = await res.json()
      const filings = Array.isArray(data?.Table) ? data.Table : []
      if (filings.length === 0) return { sentiment: 'none', filings: 0 }
      let buy = 0, sell = 0
      for (const f of filings) { const h = (f.HEADLINE || '').toLowerCase(); if (h.includes('acqui') || h.includes('purchase')) buy++; if (h.includes('dispos') || h.includes('sale')) sell++ }
      return { sentiment: buy > sell ? 'buying' : sell > buy ? 'selling' : buy > 0 ? 'mixed' : 'none', filings: filings.length }
    } catch { return null }
  }

  async function fetchBSECorpActions(bseCode) {
    if (!bseCode) return null
    try {
      const to = new Date(), from = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
      const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
      const url = `https://api.bseindia.com/BseIndiaAPI/api/CorporateAction/w?scripcode=${bseCode}&segment=Equity&purpose_code=&from_date=${fmt(from)}&to_date=${fmt(to)}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) return null
      const data = await res.json()
      return { dividendCount: Array.isArray(data?.Table) ? data.Table.length : 0, bonusSplitCount: Array.isArray(data?.Table1) ? data.Table1.length : 0 }
    } catch { return null }
  }

  async function processStock(company) {
    const symbol = company.nsesymbol.toUpperCase()
    const bseCode = company.bsecode || null
    const isTopTier = company.mcaptype === 'Large Cap' || company.mcaptype === 'Mid Cap'

    // Core: CMOTS TTM + Shareholding
    let ttmData = await cmotsFetch(`/TTMData/${company.co_code}/s`)
    if (!ttmData?.length) {
      await new Promise(r => setTimeout(r, 500))
      ttmData = await cmotsFetch(`/TTMData/${company.co_code}/s`)
    }
    if (!ttmData?.length) return null

    const shData = await cmotsFetch(`/Aggregate-Share-Holding/${company.co_code}`)

    const ttm = ttmData[0]
    const priceFeed = priceMap.get(String(company.co_code))
    let promoterHolding = null
    if (shData?.length) {
      shData.sort((a, b) => b.YRC - a.YRC)
      promoterHolding = shData[0].Promoters || null
    }

    const entry = {
      symbol,
      name: company.companyshortname || company.companyname,
      sector: company.sectorname,
      industry: company.industryname,
      mcapType: company.mcaptype,
      coCode: company.co_code,
      bseCode,
      score: quickScore(ttm),
      verdict: getVerdict(quickScore(ttm)),
      price: priceFeed?.price || null,
      changePercent: priceFeed?.change ?? null,
      pe: ttm.pe_ttm ?? null,
      pb: ttm.pb_ttm ?? null,
      roe: ttm.roe_ttm ?? null,
      roce: ttm.roce_ttm ?? null,
      opm: ttm.operatingprofitmargin ?? null,
      de: ttm.debttoequity ?? null,
      eps: ttm.eps_ttm ?? null,
      mcap: ttm.mcap ?? null,
      dy: ttm.dividendyield ?? null,
      evEbitda: ttm.ev_ebitda ?? null,
      promoterHolding,
      lastUpdated: new Date().toISOString(),
    }

    // Enrichment: Yahoo 52W (all stocks) + BSE insider/corp actions (Large+Mid only)
    const [range, insider, corpActions] = await Promise.all([
      fetch52W(symbol),
      isTopTier ? fetchBSEInsider(bseCode) : null,
      isTopTier ? fetchBSECorpActions(bseCode) : null,
    ])

    if (range) {
      entry.high52W = range.high52W
      entry.low52W = range.low52W
      entry.fromHigh = range.fromHigh
      entry.fromLow = range.fromLow
      entry.return1Y = range.return1Y
    }
    if (insider) {
      entry.insiderSentiment = insider.sentiment
      entry.insiderFilings = insider.filings
    }
    if (corpActions) {
      entry.dividendCount = corpActions.dividendCount
      entry.corpActionCount = corpActions.dividendCount + corpActions.bonusSplitCount
    }

    return entry
  }

  for (let i = 0; i < stocksToProcess.length; i += CONCURRENCY) {
    const batch = stocksToProcess.slice(i, i + CONCURRENCY)
    const batchNum = Math.floor(i / CONCURRENCY) + 1
    const totalBatches = Math.ceil(stocksToProcess.length / CONCURRENCY)

    const batchResults = await Promise.allSettled(batch.map(processStock))

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.set(r.value.symbol, r.value)
        successCount++
      } else {
        failCount++
      }
    }

    if (batchNum % 10 === 0 || batchNum === totalBatches) {
      console.log(`  Batch ${batchNum}/${totalBatches} — ${successCount} ✓ ${failCount} ✗`)
    }

    // Brief delay between batches
    await new Promise(r => setTimeout(r, 100))
  }

  // Step 6: Compute peer rankings — by industry (CMOTS industry field)
  // Industry is more granular than sector: "Banks - Private Sector" vs "Banks"
  // Falls back to sector if industry has fewer than 3 stocks
  console.log('\n🏆 Computing peer rankings (industry-based)...')
  const allStocks = [...results.values()]

  // Build industry groups
  const byIndustry = new Map()
  const bySector = new Map()
  for (const stock of allStocks) {
    const industry = stock.industry || stock.sector || 'Unknown'
    const sector = stock.sector || 'Unknown'
    if (!byIndustry.has(industry)) byIndustry.set(industry, [])
    byIndustry.get(industry).push(stock)
    if (!bySector.has(sector)) bySector.set(sector, [])
    bySector.get(sector).push(stock)
  }
  // Sort each group by score
  for (const [, stocks] of byIndustry) stocks.sort((a, b) => b.score - a.score)
  for (const [, stocks] of bySector) stocks.sort((a, b) => b.score - a.score)

  let rankedIndustries = 0
  for (const stock of allStocks) {
    const industry = stock.industry || stock.sector || 'Unknown'
    const industryPeers = byIndustry.get(industry) || [stock]

    if (industryPeers.length >= 3) {
      // Good peer group — use industry
      const rank = industryPeers.findIndex(s => s.symbol === stock.symbol) + 1
      stock.peerRank = rank
      stock.peerTotal = industryPeers.length
      stock.peerCategory = industry
    } else {
      // Too few industry peers — fall back to sector
      const sector = stock.sector || 'Unknown'
      const sectorPeers = bySector.get(sector) || [stock]
      const rank = sectorPeers.findIndex(s => s.symbol === stock.symbol) + 1
      stock.peerRank = rank
      stock.peerTotal = sectorPeers.length
      stock.peerCategory = sector
    }
  }
  rankedIndustries = byIndustry.size
  console.log(`   ✓ Ranked across ${rankedIndustries} industries (fallback to ${bySector.size} sectors)`)

  // Step 7: Build output
  const output = {
    version: '2.0',
    generatedAt: new Date().toISOString(),
    tiersRefreshed: tiersToRefresh,
    stockCount: allStocks.length,
    breakdown: {
      largeCap: allStocks.filter(s => s.mcapType === 'Large Cap').length,
      midCap: allStocks.filter(s => s.mcapType === 'Mid Cap').length,
      smallCap: allStocks.filter(s => s.mcapType !== 'Large Cap' && s.mcapType !== 'Mid Cap').length,
    },
    industryCount: rankedIndustries,
    sectorCount: bySector.size,
    stocks: allStocks,
  }

  const outputJSON = JSON.stringify(output)
  const outputPretty = JSON.stringify(output, null, 2)
  const sizeMB = (outputJSON.length / (1024 * 1024)).toFixed(1)

  // Step 8: Write to local file (for Vercel deploy / fallback)
  const { writeFileSync, mkdirSync } = await import('fs')
  mkdirSync(join(process.cwd(), 'public', 'data'), { recursive: true })
  writeFileSync(cachePath, outputPretty)
  console.log(`\n💾 Local: ${cachePath} (${sizeMB} MB)`)

  // Step 9: Upload to Vercel Blob (hot cache)
  if (BLOB_TOKEN) {
    console.log('☁️  Uploading to Vercel Blob...')
    try {
      const { put } = await import('@vercel/blob')
      const blob = await put('v2-stock-data/latest.json', outputJSON, {
        access: 'public',
        token: BLOB_TOKEN,
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      console.log(`   ✓ Blob uploaded: ${blob.url}`)
    } catch (err) {
      console.warn(`   ⚠ Blob upload failed: ${err.message}`)
      // Try with private access if public fails
      try {
        const { put } = await import('@vercel/blob')
        const blob = await put('v2-stock-data/latest.json', outputJSON, {
          access: 'public',  // Vercel Blob requires public access for put
          token: BLOB_TOKEN,
          contentType: 'application/json',
          addRandomSuffix: false,
        allowOverwrite: true,
        })
        console.log(`   ✓ Blob uploaded (retry): ${blob.url}`)
      } catch (retryErr) {
        console.warn(`   ⚠ Blob retry also failed: ${retryErr.message}`)
      }
    }
  } else {
    console.log('⏭️  Skipping Vercel Blob (BLOB_READ_WRITE_TOKEN not set)')
  }

  // Step 10: Create GitHub Release (cold archive)
  if (GITHUB_TOKEN) {
    const dateTag = new Date().toISOString().split('T')[0]
    const releaseName = `v2-historical-scoring-${dateTag}`
    console.log(`📦 Creating GitHub Release: ${releaseName}...`)
    try {
      // Create release under "V2 Historical Scoring" naming convention
      const releaseRes = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_name: releaseName,
          name: `V2 Historical Scoring — ${dateTag}`,
          body: `Pre-computed stock data for ${allStocks.length} stocks.\n\n` +
            `- Large Cap: ${output.breakdown.largeCap}\n` +
            `- Mid Cap: ${output.breakdown.midCap}\n` +
            `- Small Cap: ${output.breakdown.smallCap}\n` +
            `- Sectors: ${rankedSectors}\n` +
            `- Tiers refreshed: ${tiersToRefresh.join(', ')}\n\n` +
            `Generated at ${output.generatedAt}`,
          draft: false,
          prerelease: true,
        }),
      })

      if (releaseRes.ok) {
        const release = await releaseRes.json()
        // Upload JSON as release asset
        const uploadUrl = release.upload_url.replace('{?name,label}', `?name=stock-cache.json`)
        const assetRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: outputJSON,
        })
        if (assetRes.ok) {
          console.log(`   ✓ Release created with asset: ${release.html_url}`)
        } else {
          console.warn(`   ⚠ Asset upload failed: ${assetRes.status}`)
        }
      } else {
        const err = await releaseRes.text()
        // If tag already exists, that's fine (re-run on same day)
        if (err.includes('already_exists')) {
          console.log(`   ℹ Release ${releaseName} already exists (re-run today)`)
        } else {
          console.warn(`   ⚠ Release creation failed: ${releaseRes.status} ${err}`)
        }
      }
    } catch (err) {
      console.warn(`   ⚠ GitHub Release error: ${err.message}`)
    }
  } else {
    console.log('⏭️  Skipping GitHub Release (GITHUB_TOKEN not set)')
  }

  // Done
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  console.log(`\n✅ Done in ${elapsed}s — ${successCount} stocks scored, ${failCount} failed`)
  console.log(`   📊 ${allStocks.length} total in cache (${sizeMB} MB)`)
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1) })
