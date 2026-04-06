#!/usr/bin/env node
/**
 * Pre-compute stock data for Dashboard + warm cache.
 *
 * Fetches TTM data from CMOTS for all watchlist stocks,
 * computes quick scores and peer rankings, writes to public/data/stock-cache.json.
 *
 * Run locally: CMOTS_API_TOKEN=xxx node scripts/precompute-stocks.mjs
 * Run via GitHub Actions: nightly at 1 AM IST (19:30 UTC)
 */

const CMOTS_BASE = 'https://deltastockzapis.cmots.com/api'

// Default watchlist + popular Indian stocks to pre-cache
const STOCK_UNIVERSE = [
  'ETERNAL', 'AXISBANK', 'TCS',     // Default watchlist
  'RELIANCE', 'HDFCBANK', 'INFY',    // Blue chips
  'ICICIBANK', 'SBIN', 'BHARTIARTL', // Banking + Telecom
  'ITC', 'HINDUNILVR', 'KOTAKBANK',  // FMCG + Banking
  'LT', 'MARUTI', 'TATAMOTORS',      // Infra + Auto
  'WIPRO', 'HCLTECH', 'TECHM',       // IT
  'SUNPHARMA', 'DRREDDY',            // Pharma
  'BAJFINANCE', 'BAJAJFINSV',        // NBFC
  'TATASTEEL', 'JSWSTEEL',           // Metals
  'POWERGRID', 'NTPC',               // Power
  'ADANIPORTS', 'ADANIENT',          // Adani
  'NESTLEIND', 'ASIANPAINT',         // Consumer
  'DMART', 'PAYTM', 'NYKAA',         // New economy
  'SWIGGY', 'POLICYBZR',             // Recent IPOs
]

const TOKEN = process.env.CMOTS_API_TOKEN
if (!TOKEN) {
  console.error('❌ CMOTS_API_TOKEN not set')
  process.exit(1)
}

async function cmotsFetch(endpoint) {
  const url = `${CMOTS_BASE}${endpoint}`
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.success && Array.isArray(json.data) ? json.data : null
  } catch (err) {
    console.warn(`  ⚠ API error for ${endpoint}: ${err.message}`)
    return null
  }
}

// Quick score from TTM data (same formula as Dashboard)
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

async function main() {
  console.log(`\n🦊 StockFox Pre-computation — ${new Date().toISOString()}`)
  console.log(`   Processing ${STOCK_UNIVERSE.length} stocks...\n`)

  // Step 1: Fetch company master to resolve symbols → co_codes
  console.log('📋 Fetching company master...')
  const companies = await cmotsFetch('/companymaster')
  if (!companies || companies.length === 0) {
    console.error('❌ Company master fetch failed')
    process.exit(1)
  }
  console.log(`   ✓ ${companies.length} companies loaded`)

  const symbolMap = new Map()
  for (const c of companies) {
    if (c.nsesymbol) symbolMap.set(c.nsesymbol.toUpperCase(), c)
  }

  // Step 2: Fetch BSE delayed price feed (single call for all stocks)
  console.log('💰 Fetching BSE delayed prices...')
  const allPrices = await cmotsFetch('/BSEDelayedPriceFeed')
  const priceMap = new Map()
  if (allPrices) {
    for (const p of allPrices) {
      priceMap.set(String(p.co_code), p)
    }
    console.log(`   ✓ ${priceMap.size} price records loaded`)
  } else {
    console.log('   ⚠ Price feed unavailable')
  }

  // Step 3: Fetch TTM for each stock
  const results = []
  let successCount = 0
  let failCount = 0

  for (const symbol of STOCK_UNIVERSE) {
    const company = symbolMap.get(symbol)
    if (!company) {
      console.log(`  ⏭ ${symbol} — not found in company master`)
      failCount++
      continue
    }

    process.stdout.write(`  📊 ${symbol}...`)

    // Fetch TTM data
    const ttmData = await cmotsFetch(`/TTMData/${company.co_code}/s`)
    if (!ttmData || ttmData.length === 0) {
      console.log(' ⚠ no TTM data')
      failCount++
      continue
    }

    const ttm = ttmData[0]
    const score = quickScore(ttm)
    const verdict = getVerdict(score)

    // Look up price from pre-fetched feed
    let price = null
    let changePercent = null
    const priceFeed = priceMap.get(String(company.co_code))
    if (priceFeed) {
      price = priceFeed.price || null
      changePercent = priceFeed.change ?? null
    }

    // Fetch shareholding (latest quarter)
    let promoterHolding = null
    const shData = await cmotsFetch(`/Aggregate-Share-Holding/${company.co_code}`)
    if (shData && shData.length > 0) {
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

      // Pre-computed scores
      score,
      verdict,

      // Live price data
      price,
      changePercent,

      // Key TTM metrics
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

      // Ownership
      promoterHolding,

      // Metadata
      lastUpdated: new Date().toISOString(),
    }

    results.push(entry)
    successCount++
    console.log(` ✓ score=${score} ${verdict} ₹${price || '—'}`)
  }

  // Step 4: Compute peer rankings within each sector
  console.log('\n🏆 Computing peer rankings...')
  const bySector = new Map()
  for (const stock of results) {
    const sector = stock.sector || 'Unknown'
    if (!bySector.has(sector)) bySector.set(sector, [])
    bySector.get(sector).push(stock)
  }
  for (const [sector, stocks] of bySector) {
    stocks.sort((a, b) => b.score - a.score)
    stocks.forEach((stock, i) => {
      stock.peerRank = i + 1
      stock.peerTotal = stocks.length
      stock.peerCategory = sector
    })
    console.log(`  ${sector}: ${stocks.map(s => `${s.symbol}(#${s.peerRank})`).join(', ')}`)
  }

  // Step 5: Write output
  const output = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    stockCount: results.length,
    stocks: results,
  }

  const { writeFileSync } = await import('fs')
  const { join } = await import('path')
  const outPath = join(process.cwd(), 'public', 'data', 'stock-cache.json')
  writeFileSync(outPath, JSON.stringify(output, null, 2))

  console.log(`\n✅ Done! ${successCount} stocks cached, ${failCount} failed`)
  console.log(`   Output: ${outPath} (${(JSON.stringify(output).length / 1024).toFixed(1)} KB)`)
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
