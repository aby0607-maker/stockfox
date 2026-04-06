#!/usr/bin/env node
/**
 * Enrichment Cron 3: Yahoo Finance data
 *
 * Reads existing stock-cache.json, enriches with:
 *   - 52-week high/low (from 1Y price history)
 *   - ESG scores (from Yahoo v10 quoteSummary)
 *   - 1Y return % (from price history)
 *
 * Writes back to the same stock-cache.json.
 *
 * Run: node scripts/enrich-yahoo.mjs [--tier=large|mid|small|all]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const CACHE_PATH = join(process.cwd(), 'public', 'data', 'stock-cache.json')
const YAHOO_BASE = 'https://query2.finance.yahoo.com'

// Stocks renamed on NSE — Yahoo uses the new name
const SYMBOL_RENAMES = { ZOMATO: 'ETERNAL' }

function toYahoo(sym) {
  const upper = sym.toUpperCase()
  return `${SYMBOL_RENAMES[upper] || upper}.NS`
}

// ─── Yahoo API Helpers ────────────────────────

async function fetch52WRange(symbol) {
  const yahooSym = toYahoo(symbol)
  const now = Math.floor(Date.now() / 1000)
  const oneYearAgo = now - 365 * 24 * 60 * 60
  try {
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(yahooSym)}?period1=${oneYearAgo}&period2=${now}&interval=1d`
    const res = await fetch(url, { headers: { 'User-Agent': 'StockFox/1.0' } })
    if (!res.ok) return null
    const json = await res.json()
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
    if (!closes?.length) return null

    const valid = closes.filter(c => c != null && c > 0)
    if (valid.length < 10) return null

    const high = Math.max(...valid)
    const low = Math.min(...valid)
    const current = valid[valid.length - 1]
    const first = valid[0]
    const return1Y = ((current - first) / first) * 100

    return {
      high52W: Math.round(high * 100) / 100,
      low52W: Math.round(low * 100) / 100,
      fromHigh: Math.round(((current - high) / high) * 10000) / 100,
      fromLow: Math.round(((current - low) / low) * 10000) / 100,
      return1Y: Math.round(return1Y * 100) / 100,
    }
  } catch { return null }
}

async function fetchESG(symbol) {
  const yahooSym = toYahoo(symbol)
  try {
    const url = `${YAHOO_BASE}/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?modules=esgScores`
    const res = await fetch(url, { headers: { 'User-Agent': 'StockFox/1.0' } })
    if (!res.ok) return null
    const json = await res.json()
    const esg = json?.quoteSummary?.result?.[0]?.esgScores
    if (!esg?.totalEsg?.raw) return null

    return {
      esgTotal: esg.totalEsg.raw,
      esgEnvironment: esg.environmentScore?.raw ?? null,
      esgSocial: esg.socialScore?.raw ?? null,
      esgGovernance: esg.governanceScore?.raw ?? null,
      esgRisk: esg.totalEsg.raw < 10 ? 'negligible' :
        esg.totalEsg.raw < 20 ? 'low' :
        esg.totalEsg.raw < 30 ? 'medium' :
        esg.totalEsg.raw < 40 ? 'high' : 'severe',
    }
  } catch { return null }
}

// ─── Main ─────────────────────────────────────

async function main() {
  console.log(`\n📈 Yahoo Finance Enrichment — ${new Date().toISOString()}\n`)

  if (!existsSync(CACHE_PATH)) {
    console.error('❌ No stock-cache.json found. Run precompute-stocks.mjs first.')
    process.exit(1)
  }

  const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  console.log(`📦 Loaded ${cache.stockCount} stocks from cache`)

  // Determine tier
  const tierArg = process.argv.find(a => a.startsWith('--tier='))?.split('=')[1]
  const stocks = tierArg === 'all'
    ? cache.stocks
    : tierArg
      ? cache.stocks.filter(s => s.mcapType === tierArg)
      : cache.stocks.filter(s => s.mcapType === 'Large Cap' || s.mcapType === 'Mid Cap')

  console.log(`🔄 Enriching ${stocks.length} stocks with Yahoo data...\n`)

  let enriched52W = 0
  let enrichedESG = 0
  const CONCURRENCY = 10  // Yahoo is more tolerant of concurrent requests

  for (let i = 0; i < stocks.length; i += CONCURRENCY) {
    const batch = stocks.slice(i, i + CONCURRENCY)

    await Promise.allSettled(batch.map(async stock => {
      // 52W range + 1Y return
      const range = await fetch52WRange(stock.symbol)
      if (range) {
        stock.high52W = range.high52W
        stock.low52W = range.low52W
        stock.fromHigh = range.fromHigh
        stock.fromLow = range.fromLow
        stock.return1Y = range.return1Y
        enriched52W++
      }

      // ESG (only for Large + Mid cap — coverage is poor for small caps)
      if (stock.mcapType === 'Large Cap' || stock.mcapType === 'Mid Cap') {
        const esg = await fetchESG(stock.symbol)
        if (esg) {
          Object.assign(stock, esg)
          enrichedESG++
        }
      }

      stock.yahooEnrichedAt = new Date().toISOString()
    }))

    const batchNum = Math.floor(i / CONCURRENCY) + 1
    const totalBatches = Math.ceil(stocks.length / CONCURRENCY)
    if (batchNum % 10 === 0 || batchNum === totalBatches) {
      console.log(`  Batch ${batchNum}/${totalBatches} — 52W: ${enriched52W}, ESG: ${enrichedESG}`)
    }
    await new Promise(r => setTimeout(r, 100))
  }

  // Write back
  cache.lastYahooEnriched = new Date().toISOString()
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))

  console.log(`\n✅ Done! 52W range: ${enriched52W} stocks, ESG: ${enrichedESG} stocks`)
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1) })
