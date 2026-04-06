/**
 * InfoTab — Comprehensive stock info: profile, metrics, chart, shareholding,
 * promoter deep-dive, sector context, quarterly financials, peer table, dividends.
 *
 * Lazy-loaded: data fetches only when this tab is active.
 * Data sources: CMOTS TTM/ShareHolding/P&L/BS/QR, Yahoo Finance, BSE Corp Actions/Insider.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, BarChart3, PieChart, TrendingUp, TrendingDown, Users, Calendar, ExternalLink, Shield, ArrowUpRight, ArrowDownRight, Minus, Target, TableProperties } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PriceChart } from '@/components/charts/PriceChart'
import { AnalysisLoader, updateStep, type LoadingStep } from '@/components/scoring/AnalysisLoader'
import type { Stock, StockVerdictV2, CMOTSShareholding } from '@/types'

// ─── Data types ────────────────────────────────

interface CorporateActionItem {
  type: 'dividend' | 'bonus' | 'split' | 'rights' | 'buyback' | 'other'
  date: string
  purpose: string
  amount?: string
}

interface PromoterInfo {
  holding: number
  pledgePct: number | null
  quarterlyTrend: { quarter: string; holding: number }[]
  insiderSentiment: 'buying' | 'selling' | 'mixed' | 'none'
  insiderFilings: number
}

interface SectorContext {
  sectorName: string
  sectorAvgPE: number | null
  sectorAvgROE: number | null
  sectorAvgDE: number | null
  stockVsSectorPE: 'below' | 'inline' | 'above' | null
  peerCount: number
}

interface PriceContext52W {
  high: number
  low: number
  current: number
  fromHigh: number  // % below 52W high (negative)
  fromLow: number   // % above 52W low (positive)
}

interface QuarterlyFinancial {
  quarter: string
  revenue: number | null
  pat: number | null
}

interface PeerRow {
  symbol: string
  name: string
  mcap?: number | null
  pe?: number | null
  roe?: number | null
  de?: number | null
}

interface InfoData {
  ttm: Record<string, number | null>
  shareholding: { Promoters: number; FII: number; DII: number; Public: number; MutualFund?: number } | null
  priceHistory: { time: string; value: number }[]
  peers: PeerRow[]
  corporateActions: CorporateActionItem[]
  mcapRank: { rank: number; total: number } | null
  promoter: PromoterInfo | null
  sectorContext: SectorContext | null
  price52W: PriceContext52W | null
  quarterlyFinancials: QuarterlyFinancial[]
  dividendHistory: { date: string; amount: string; purpose: string }[]
}

// ─── Data fetching ──────────────────────────────

async function fetchInfoData(symbol: string): Promise<InfoData> {
  const { getTTMData, getShareholdingHistory, getQuarterlyResults } = await import('@/services/cmots')
  const { getYahooHistoricalPrices } = await import('@/services/yahoo')
  const { generatePeerGroupDetailed } = await import('@/services/stockService')
  const { getCompanyBySymbol, getCompanyMaster } = await import('@/services/cmots')
  const { getCorporateActions, getInsiderTransactions } = await import('@/services/bse')

  const coCode = await (async () => {
    const { getCoCode } = await import('@/services/cmots')
    return getCoCode(symbol)
  })()

  // Fetch all in parallel
  const [ttmRaw, shRaw, priceRaw, qrRaw, company, corpActions, insiderData] = await Promise.all([
    getTTMData(symbol, coCode ?? undefined),
    getShareholdingHistory(symbol, coCode ?? undefined),
    (() => {
      const to = new Date().toISOString().split('T')[0]
      const from = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      return getYahooHistoricalPrices(symbol, from, to)
    })(),
    getQuarterlyResults(symbol, coCode ?? undefined),
    getCompanyBySymbol(symbol),
    getCorporateActions(symbol),
    getInsiderTransactions(symbol).catch(() => null),
  ])

  // TTM metrics
  const ttm: Record<string, number | null> = {}
  if (ttmRaw) {
    const t = ttmRaw as unknown as Record<string, unknown>
    ttm['pe'] = t.pe_ttm as number ?? null
    ttm['pb'] = t.pb_ttm as number ?? null
    ttm['eps'] = t.eps_ttm as number ?? null
    ttm['roe'] = t.roe_ttm as number ?? null
    ttm['roce'] = t.roce_ttm as number ?? null
    ttm['opm'] = t.operatingprofitmargin as number ?? null
    ttm['npm'] = t.netprofitmargin as number ?? null
    ttm['de'] = t.debttoequity as number ?? null
    ttm['dy'] = t.dividendyield as number ?? null
    ttm['mcap'] = t.mcap as number ?? null
    ttm['cr'] = t.currentratio as number ?? null
    ttm['evEbitda'] = t.ev_ebitda as number ?? null
    ttm['peg'] = t.pegratio as number ?? null
  }

  // Shareholding — map CMOTS field names to display labels
  let shareholding: InfoData['shareholding'] = null
  if (shRaw && shRaw.length > 0) {
    const latest = shRaw[0]
    const fii = latest.ForeignInstitution || 0
    const mf = latest.MutualFund || 0
    const odi = latest.OtherDomesticInstitution || 0
    shareholding = {
      Promoters: latest.Promoters || 0,
      FII: fii,
      DII: mf + odi,
      Public: (latest.Retail || 0) + (latest.Others || 0),
      MutualFund: mf || undefined,
    }
  }

  // Promoter Deep Dive — trend from shareholding history + insider transactions
  let promoter: InfoData['promoter'] = null
  if (shRaw && shRaw.length > 0) {
    const quarterlyTrend = shRaw.slice(0, 8).reverse().map((sh: CMOTSShareholding) => ({
      quarter: `Q${String(sh.YRC).slice(-2)}`,
      holding: sh.Promoters || 0,
    }))
    promoter = {
      holding: shRaw[0].Promoters || 0,
      pledgePct: null, // CMOTS Aggregate doesn't have pledge; would need DetailedShareholding
      quarterlyTrend,
      insiderSentiment: insiderData?.sentiment || 'none',
      insiderFilings: insiderData?.totalFilings || 0,
    }
  }

  // Price history for chart
  const priceHistory = priceRaw.map(r => ({
    time: r.Tradedate.split('T')[0],
    value: r.Dayclose,
  }))

  // 52W Price Context
  let price52W: InfoData['price52W'] = null
  if (priceRaw.length > 0) {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
    const yearPrices = priceRaw.filter(r => new Date(r.Tradedate).getTime() >= oneYearAgo)
    if (yearPrices.length > 0) {
      const high = Math.max(...yearPrices.map(r => r.Dayclose))
      const low = Math.min(...yearPrices.map(r => r.Dayclose))
      const current = yearPrices[yearPrices.length - 1].Dayclose
      price52W = {
        high, low, current,
        fromHigh: ((current - high) / high) * 100,
        fromLow: ((current - low) / low) * 100,
      }
    }
  }

  // Quarterly Financials from QR data (rows: revenue=rowno 1, PAT=rowno varies)
  const quarterlyFinancials: QuarterlyFinancial[] = []
  if (qrRaw && qrRaw.length > 0) {
    // Find revenue row (rowno 1) and PAT row (usually rowno ~20-30, look for "Profit" in COLUMNNAME)
    const revenueRow = qrRaw.find(r => r.rowno === 1)
    const patRow = qrRaw.find(r => {
      const name = (r.COLUMNNAME || '').toLowerCase()
      return name.includes('profit after tax') || name.includes('net profit') || r.rowno === 26
    })
    if (revenueRow) {
      const yearCols = Object.keys(revenueRow).filter(k => k.startsWith('Y') && k.length >= 7).sort().slice(-6)
      for (const col of yearCols) {
        const rev = typeof revenueRow[col] === 'number' ? revenueRow[col] as number : null
        const pat = patRow && typeof patRow[col] === 'number' ? patRow[col] as number : null
        quarterlyFinancials.push({ quarter: col.replace('Y', ''), revenue: rev, pat })
      }
    }
  }

  // Corporate Actions from BSE
  const corporateActions: CorporateActionItem[] = []
  const dividendHistory: InfoData['dividendHistory'] = []
  if (corpActions?.actions) {
    for (const action of corpActions.actions) {
      const purpose = action.purpose.toLowerCase()
      const type: CorporateActionItem['type'] =
        purpose.includes('bonus') ? 'bonus' :
        purpose.includes('split') ? 'split' :
        purpose.includes('rights') ? 'rights' :
        purpose.includes('buyback') || purpose.includes('buy back') ? 'buyback' :
        purpose.includes('dividend') ? 'dividend' : 'other'
      corporateActions.push({ type, date: action.ex_date, purpose: action.purpose })
      if (type === 'dividend') {
        dividendHistory.push({ date: action.ex_date, amount: action.purpose, purpose: action.purpose })
      }
    }
  }

  // Peers — fetch with TTM data for comparison table
  let peers: PeerRow[] = []
  if (company) {
    try {
      const peerDetails = await generatePeerGroupDetailed(company)
      const peerSlice = peerDetails.slice(0, 5)
      const peerTTMs = await Promise.all(
        peerSlice.map(async p => {
          try {
            const pTTM = await getTTMData(p.symbol)
            const t = pTTM as unknown as Record<string, unknown> | null
            return {
              symbol: p.symbol, name: p.name,
              mcap: (t?.mcap as number) ?? null,
              pe: (t?.pe_ttm as number) ?? null,
              roe: (t?.roe_ttm as number) ?? null,
              de: (t?.debttoequity as number) ?? null,
            }
          } catch { return { symbol: p.symbol, name: p.name } }
        })
      )
      peers = peerTTMs
    } catch { /* peer lookup failed */ }
  }

  // Market cap rank
  let mcapRank: InfoData['mcapRank'] = null
  const stockMcap = ttm['mcap']
  if (stockMcap != null && peers.length > 0) {
    const allMcaps = [{ symbol, mcap: stockMcap }, ...peers.filter(p => p.mcap != null).map(p => ({ symbol: p.symbol, mcap: p.mcap! }))]
    allMcaps.sort((a, b) => b.mcap - a.mcap)
    const rank = allMcaps.findIndex(m => m.symbol === symbol) + 1
    mcapRank = { rank, total: allMcaps.length }
  }

  // Sector Context — compute sector averages from company master
  let sectorContext: InfoData['sectorContext'] = null
  if (company) {
    try {
      const allCompanies = await getCompanyMaster()
      const sectorPeers = allCompanies.filter(c =>
        c.sectorname === company.sectorname && c.nsesymbol && c.co_code !== company.co_code
      )
      // Fetch TTM for a sample of sector peers (max 10 for speed)
      const samplePeers = sectorPeers.slice(0, 10)
      const sectorTTMs = await Promise.all(
        samplePeers.map(async p => {
          try {
            const t = await getTTMData(p.nsesymbol)
            const raw = t as unknown as Record<string, unknown> | null
            return { pe: raw?.pe_ttm as number, roe: raw?.roe_ttm as number, de: raw?.debttoequity as number }
          } catch { return null }
        })
      )
      const validPEs = sectorTTMs.filter(t => t?.pe != null && t.pe > 0).map(t => t!.pe)
      const validROEs = sectorTTMs.filter(t => t?.roe != null).map(t => t!.roe)
      const validDEs = sectorTTMs.filter(t => t?.de != null).map(t => t!.de)
      const avgPE = validPEs.length > 0 ? validPEs.reduce((a, b) => a + b, 0) / validPEs.length : null
      const avgROE = validROEs.length > 0 ? validROEs.reduce((a, b) => a + b, 0) / validROEs.length : null
      const avgDE = validDEs.length > 0 ? validDEs.reduce((a, b) => a + b, 0) / validDEs.length : null
      const stockPE = ttm['pe']
      const stockVsSectorPE: SectorContext['stockVsSectorPE'] =
        stockPE != null && avgPE != null
          ? stockPE < avgPE * 0.85 ? 'below' : stockPE > avgPE * 1.15 ? 'above' : 'inline'
          : null

      sectorContext = {
        sectorName: company.sectorname,
        sectorAvgPE: avgPE,
        sectorAvgROE: avgROE,
        sectorAvgDE: avgDE,
        stockVsSectorPE,
        peerCount: sectorPeers.length,
      }
    } catch { /* sector context failed */ }
  }

  return {
    ttm, shareholding, priceHistory, peers, corporateActions, mcapRank,
    promoter, sectorContext, price52W, quarterlyFinancials, dividendHistory,
  }
}

// ─── Metric interpretation engine ──────────────

type MetricSentiment = 'positive' | 'neutral' | 'negative' | 'none'

interface MetricDef {
  label: string
  key: string
  unit?: string
  interpret?: (v: number) => { sentiment: MetricSentiment; hint: string }
}

const METRIC_GROUPS: { title: string; icon: string; metrics: MetricDef[] }[] = [
  {
    title: 'Valuation', icon: '📊',
    metrics: [
      { label: 'P/E', key: 'pe', unit: 'x', interpret: v =>
        v < 15 ? { sentiment: 'positive', hint: 'Undervalued' } :
        v < 25 ? { sentiment: 'neutral', hint: 'Fair' } :
        v < 40 ? { sentiment: 'negative', hint: 'Expensive' } :
        { sentiment: 'negative', hint: 'Very expensive' }
      },
      { label: 'P/B', key: 'pb', unit: 'x', interpret: v =>
        v < 2 ? { sentiment: 'positive', hint: 'Attractive' } :
        v < 4 ? { sentiment: 'neutral', hint: 'Fair' } :
        { sentiment: 'negative', hint: 'Premium' }
      },
      { label: 'EV/EBITDA', key: 'evEbitda', unit: 'x', interpret: v =>
        v < 10 ? { sentiment: 'positive', hint: 'Cheap' } :
        v < 20 ? { sentiment: 'neutral', hint: 'Fair' } :
        { sentiment: 'negative', hint: 'Expensive' }
      },
    ],
  },
  {
    title: 'Profitability', icon: '💹',
    metrics: [
      { label: 'ROE', key: 'roe', unit: '%', interpret: v =>
        v >= 15 ? { sentiment: 'positive', hint: 'Strong' } : v >= 10 ? { sentiment: 'neutral', hint: 'Decent' } : { sentiment: 'negative', hint: 'Weak' }
      },
      { label: 'ROCE', key: 'roce', unit: '%', interpret: v =>
        v >= 15 ? { sentiment: 'positive', hint: 'Efficient' } : v >= 10 ? { sentiment: 'neutral', hint: 'Average' } : { sentiment: 'negative', hint: 'Low' }
      },
      { label: 'OPM', key: 'opm', unit: '%', interpret: v =>
        v >= 20 ? { sentiment: 'positive', hint: 'High margin' } : v >= 10 ? { sentiment: 'neutral', hint: 'Moderate' } : { sentiment: 'negative', hint: 'Thin margin' }
      },
    ],
  },
  {
    title: 'Financial Health', icon: '🛡️',
    metrics: [
      { label: 'D/E', key: 'de', unit: 'x', interpret: v =>
        v < 0.5 ? { sentiment: 'positive', hint: 'Low debt' } : v < 1 ? { sentiment: 'neutral', hint: 'Moderate' } : { sentiment: 'negative', hint: 'High debt' }
      },
      { label: 'Current Ratio', key: 'cr', unit: 'x', interpret: v =>
        v >= 1.5 ? { sentiment: 'positive', hint: 'Healthy' } : v >= 1 ? { sentiment: 'neutral', hint: 'Adequate' } : { sentiment: 'negative', hint: 'Tight' }
      },
      { label: 'EPS', key: 'eps', interpret: v =>
        v > 0 ? { sentiment: 'positive', hint: `₹${v.toFixed(0)}/share` } : { sentiment: 'negative', hint: 'Loss-making' }
      },
    ],
  },
  {
    title: 'Income & Size', icon: '🏢',
    metrics: [
      { label: 'Div. Yield', key: 'dy', unit: '%', interpret: v =>
        v >= 2 ? { sentiment: 'positive', hint: 'Good yield' } : v > 0 ? { sentiment: 'neutral', hint: 'Modest' } : { sentiment: 'none', hint: 'No dividend' }
      },
      { label: 'Market Cap', key: 'mcap', unit: 'Cr' },
      { label: 'PEG', key: 'peg', unit: 'x', interpret: v =>
        v > 0 && v < 1 ? { sentiment: 'positive', hint: 'Undervalued' } :
        v >= 1 && v < 2 ? { sentiment: 'neutral', hint: 'Fair' } :
        v < 0 ? { sentiment: 'none', hint: 'Negative growth' } :
        { sentiment: 'negative', hint: 'Overvalued' }
      },
    ],
  },
]

const SENTIMENT_STYLES: Record<MetricSentiment, { dot: string; text: string; bg: string }> = {
  positive: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'border-emerald-500/15' },
  neutral:  { dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'border-amber-500/15' },
  negative: { dot: 'bg-red-400',     text: 'text-red-400',     bg: 'border-red-500/15' },
  none:     { dot: 'bg-neutral-600', text: 'text-neutral-500', bg: 'border-white/5' },
}

function fmtVal(value: number | null, unit?: string): string {
  if (value == null) return '—'
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'x') return `${value.toFixed(2)}x`
  if (unit === 'Cr') return value >= 10000 ? `₹${(value / 10000).toFixed(1)}L Cr` : `₹${value.toFixed(0)} Cr`
  return `${value.toFixed(2)}`
}

// ─── UI Components ─────────────────────────────

function EnhancedMetricCard({ def, value, badge }: { def: MetricDef; value: number | null; badge?: string }) {
  const formatted = fmtVal(value, def.unit)
  const interp = value != null && def.interpret ? def.interpret(value) : null
  const style = interp ? SENTIMENT_STYLES[interp.sentiment] : SENTIMENT_STYLES.none

  return (
    <div className={cn('p-3 rounded-xl border bg-dark-700/40', interp ? style.bg : 'border-white/5')}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-neutral-400 font-medium">{def.label}</span>
        {badge && <span className="text-[9px] font-bold text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded-full">{badge}</span>}
      </div>
      <span className="text-base font-bold text-white block leading-tight">{formatted}</span>
      {interp && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
          <span className={cn('text-[10px] font-medium', style.text)}>{interp.hint}</span>
        </div>
      )}
    </div>
  )
}

function ShareholdingDonut({ data }: { data: { Promoters: number; FII: number; DII: number; Public: number } }) {
  const segments = [
    { label: 'Promoters', value: data.Promoters, color: '#8b5cf6' },
    { label: 'FII', value: data.FII, color: '#06b6d4' },
    { label: 'DII', value: data.DII, color: '#10b981' },
    { label: 'Public', value: data.Public, color: '#6b7280' },
  ].filter(s => s.value > 0)
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  let cumulative = 0

  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
        {segments.map((seg, i) => {
          const startAngle = (cumulative / total) * 360
          const sweepAngle = (seg.value / total) * 360
          cumulative += seg.value
          const r = 48, cx = 60, cy = 60
          const s = (startAngle - 90) * Math.PI / 180
          const e = (startAngle + sweepAngle - 90) * Math.PI / 180
          return (
            <path key={i}
              d={`M ${cx} ${cy} L ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${sweepAngle > 180 ? 1 : 0} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)} Z`}
              fill={seg.color} opacity={0.8}
            />
          )
        })}
        <circle cx="60" cy="60" r="30" fill="#0D0D12" />
      </svg>
      <div className="space-y-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-neutral-400">{seg.label}</span>
            <span className="text-xs font-medium text-white ml-auto">{seg.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Section wrapper with consistent styling */
function Section({ icon, title, children, delay = 0 }: { icon: React.ReactNode; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-2xl bg-dark-800 border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  )
}

// ─── Main InfoTab Component ─────────────────────

interface InfoTabProps { stock: Stock; verdictV2: StockVerdictV2 | null }

export function InfoTab({ stock }: InfoTabProps) {
  const [data, setData] = useState<InfoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>(() => [
    { id: 'connect', label: 'Connecting to data sources', status: 'loading' },
    { id: 'metrics', label: 'Fetching key metrics & financials', detail: 'TTM ratios + quarterly results', status: 'pending' },
    { id: 'chart', label: 'Loading 5-year price history', detail: 'Yahoo Finance', status: 'pending' },
    { id: 'shareholding', label: 'Analyzing ownership & promoters', detail: 'CMOTS + BSE insider filings', status: 'pending' },
    { id: 'sector', label: 'Computing sector benchmarks', detail: 'Sector averages from CMOTS', status: 'pending' },
    { id: 'peers', label: 'Building peer comparison', detail: 'Industry matching + TTM data', status: 'pending' },
  ])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadingSteps(s => updateStep(s, 'connect', 'loading'))
      try {
        setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'connect', 'done'), 'metrics', 'loading')) }, 500)
        setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'metrics', 'done'), 'chart', 'loading')) }, 2000)
        setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'chart', 'done'), 'shareholding', 'loading')) }, 4000)
        setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'shareholding', 'done'), 'sector', 'loading')) }, 6000)
        setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'sector', 'done'), 'peers', 'loading')) }, 8000)

        const result = await fetchInfoData(stock.symbol)
        if (!cancelled) {
          setData(result)
          setLoadingSteps(s => s.map(step => ({ ...step, status: 'done' as const })))
          setLoading(false)
        }
      } catch (err) {
        console.warn('[InfoTab] Failed to load data:', err)
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [stock.symbol])

  if (loading) return <AnalysisLoader steps={loadingSteps} stockName={stock.name} />
  if (!data) return <div className="text-center py-12 text-neutral-500 text-sm">Unable to load stock information.</div>

  return (
    <div className="space-y-4">

      {/* ═══ 1. Company Profile ═══ */}
      <Section icon={<Building2 className="w-4 h-4 text-primary-400" />} title="Company Profile">
        <div className="space-y-2 text-xs text-neutral-400">
          <div className="flex gap-4">
            <span><span className="text-neutral-500">Sector:</span> {stock.sector}</span>
            {stock.subSector && <span><span className="text-neutral-500">Industry:</span> {stock.subSector}</span>}
          </div>
          <div className="flex gap-4">
            <span><span className="text-neutral-500">Symbol:</span> {stock.symbol}</span>
            <a href={`https://www.nseindia.com/get-quotes/equity?symbol=${stock.symbol}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-400 hover:underline">
              NSE <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </Section>

      {/* ═══ 2. 52W Price Context ═══ */}
      {data.price52W && (
        <Section icon={<Target className="w-4 h-4 text-primary-400" />} title="52-Week Range" delay={0.03}>
          <div className="space-y-3">
            {/* Range bar */}
            <div className="relative h-2 rounded-full bg-dark-700 overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500/60 via-amber-500/60 to-emerald-500/60" style={{ width: '100%' }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-primary-500 shadow-lg"
                style={{ left: `${Math.max(2, Math.min(98, ((data.price52W.current - data.price52W.low) / (data.price52W.high - data.price52W.low)) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-red-400">₹{data.price52W.low.toFixed(0)}</span>
              <span className="text-white font-semibold">₹{data.price52W.current.toFixed(0)}</span>
              <span className="text-emerald-400">₹{data.price52W.high.toFixed(0)}</span>
            </div>
            {/* Distance badges */}
            <div className="flex gap-2">
              <div className="flex-1 p-2 rounded-lg bg-dark-700/50 border border-white/5 text-center">
                <span className="text-[9px] text-neutral-500 block">From 52W High</span>
                <span className={cn('text-sm font-bold', data.price52W.fromHigh >= -10 ? 'text-emerald-400' : data.price52W.fromHigh >= -25 ? 'text-amber-400' : 'text-red-400')}>
                  {data.price52W.fromHigh.toFixed(1)}%
                </span>
              </div>
              <div className="flex-1 p-2 rounded-lg bg-dark-700/50 border border-white/5 text-center">
                <span className="text-[9px] text-neutral-500 block">From 52W Low</span>
                <span className={cn('text-sm font-bold', data.price52W.fromLow >= 50 ? 'text-emerald-400' : 'text-amber-400')}>
                  +{data.price52W.fromLow.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ═══ 3. Key Metrics ═══ */}
      <Section icon={<BarChart3 className="w-4 h-4 text-primary-400" />} title="Key Metrics" delay={0.05}>
        <div className="space-y-4">
          {METRIC_GROUPS.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs">{group.icon}</span>
                <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wide">{group.title}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {group.metrics.map(metric => (
                  <EnhancedMetricCard key={metric.key} def={metric} value={data.ttm[metric.key]}
                    badge={metric.key === 'mcap' && data.mcapRank ? `#${data.mcapRank.rank}/${data.mcapRank.total}` : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ 4. Sector Context ═══ */}
      {data.sectorContext && (
        <Section icon={<Building2 className="w-4 h-4 text-cyan-400" />} title={`Sector: ${data.sectorContext.sectorName}`} delay={0.08}>
          <p className="text-[10px] text-neutral-500 mb-3">Compared against {data.sectorContext.peerCount} companies in this sector</p>
          <div className="grid grid-cols-3 gap-2">
            {/* PE vs Sector */}
            <div className="p-3 rounded-xl bg-dark-700/40 border border-white/5">
              <span className="text-[10px] text-neutral-400 block">Sector Avg P/E</span>
              <span className="text-sm font-bold text-white">{data.sectorContext.sectorAvgPE?.toFixed(1) ?? '—'}x</span>
              {data.sectorContext.stockVsSectorPE && (
                <div className="flex items-center gap-1 mt-1">
                  {data.sectorContext.stockVsSectorPE === 'below' ? <ArrowDownRight className="w-3 h-3 text-emerald-400" /> :
                   data.sectorContext.stockVsSectorPE === 'above' ? <ArrowUpRight className="w-3 h-3 text-red-400" /> :
                   <Minus className="w-3 h-3 text-amber-400" />}
                  <span className={cn('text-[10px] font-medium',
                    data.sectorContext.stockVsSectorPE === 'below' ? 'text-emerald-400' :
                    data.sectorContext.stockVsSectorPE === 'above' ? 'text-red-400' : 'text-amber-400')}>
                    {data.sectorContext.stockVsSectorPE === 'below' ? 'Below sector' :
                     data.sectorContext.stockVsSectorPE === 'above' ? 'Above sector' : 'In line'}
                  </span>
                </div>
              )}
            </div>
            {/* Sector ROE */}
            <div className="p-3 rounded-xl bg-dark-700/40 border border-white/5">
              <span className="text-[10px] text-neutral-400 block">Sector Avg ROE</span>
              <span className="text-sm font-bold text-white">{data.sectorContext.sectorAvgROE?.toFixed(1) ?? '—'}%</span>
              {data.ttm['roe'] != null && data.sectorContext.sectorAvgROE != null && (
                <div className="flex items-center gap-1 mt-1">
                  {data.ttm['roe']! > data.sectorContext.sectorAvgROE ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                  <span className={cn('text-[10px] font-medium', data.ttm['roe']! > data.sectorContext.sectorAvgROE ? 'text-emerald-400' : 'text-red-400')}>
                    {data.ttm['roe']! > data.sectorContext.sectorAvgROE ? 'Above sector' : 'Below sector'}
                  </span>
                </div>
              )}
            </div>
            {/* Sector D/E */}
            <div className="p-3 rounded-xl bg-dark-700/40 border border-white/5">
              <span className="text-[10px] text-neutral-400 block">Sector Avg D/E</span>
              <span className="text-sm font-bold text-white">{data.sectorContext.sectorAvgDE?.toFixed(2) ?? '—'}x</span>
              {data.ttm['de'] != null && data.sectorContext.sectorAvgDE != null && (
                <div className="flex items-center gap-1 mt-1">
                  {data.ttm['de']! < data.sectorContext.sectorAvgDE ? <ArrowDownRight className="w-3 h-3 text-emerald-400" /> : <ArrowUpRight className="w-3 h-3 text-red-400" />}
                  <span className={cn('text-[10px] font-medium', data.ttm['de']! < data.sectorContext.sectorAvgDE ? 'text-emerald-400' : 'text-red-400')}>
                    {data.ttm['de']! < data.sectorContext.sectorAvgDE ? 'Lower debt' : 'Higher debt'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ═══ 5. Price Chart ═══ */}
      <Section icon={<TrendingUp className="w-4 h-4 text-primary-400" />} title="Price Chart" delay={0.1}>
        <PriceChart data={data.priceHistory} height={280} />
      </Section>

      {/* ═══ 6. Promoter Deep Dive ═══ */}
      {data.promoter && (
        <Section icon={<Shield className="w-4 h-4 text-primary-400" />} title="Promoter Analysis" delay={0.12}>
          <div className="space-y-3">
            {/* Promoter holding + insider sentiment */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-dark-700/40 border border-white/5">
                <span className="text-[10px] text-neutral-400 block">Promoter Holding</span>
                <span className="text-lg font-bold text-white">{data.promoter.holding.toFixed(1)}%</span>
                {data.promoter.pledgePct != null && (
                  <span className={cn('text-[10px] block mt-0.5', data.promoter.pledgePct > 20 ? 'text-red-400' : data.promoter.pledgePct > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                    Pledge: {data.promoter.pledgePct.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="p-3 rounded-xl bg-dark-700/40 border border-white/5">
                <span className="text-[10px] text-neutral-400 block">Insider Activity</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {data.promoter.insiderSentiment === 'buying' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                   data.promoter.insiderSentiment === 'selling' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                   <Minus className="w-4 h-4 text-neutral-500" />}
                  <span className={cn('text-sm font-semibold capitalize',
                    data.promoter.insiderSentiment === 'buying' ? 'text-emerald-400' :
                    data.promoter.insiderSentiment === 'selling' ? 'text-red-400' :
                    data.promoter.insiderSentiment === 'mixed' ? 'text-amber-400' : 'text-neutral-500')}>
                    {data.promoter.insiderSentiment === 'none' ? 'No activity' : data.promoter.insiderSentiment}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 block mt-0.5">{data.promoter.insiderFilings} BSE filings</span>
              </div>
            </div>
            {/* Quarterly promoter trend — mini bar chart */}
            {data.promoter.quarterlyTrend.length > 1 && (
              <div>
                <span className="text-[10px] text-neutral-500 mb-2 block">Promoter Holding Trend (Quarterly)</span>
                <div className="flex items-end gap-1 h-16">
                  {data.promoter.quarterlyTrend.map((q, i) => {
                    const maxH = Math.max(...data.promoter!.quarterlyTrend.map(t => t.holding))
                    const minH = Math.min(...data.promoter!.quarterlyTrend.map(t => t.holding))
                    const range = maxH - minH || 1
                    const pct = ((q.holding - minH) / range) * 70 + 30 // 30-100% height
                    const isLast = i === data.promoter!.quarterlyTrend.length - 1
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="text-[8px] text-neutral-500">{q.holding.toFixed(0)}%</span>
                        <div className={cn('w-full rounded-t', isLast ? 'bg-primary-500' : 'bg-primary-500/30')} style={{ height: `${pct}%` }} />
                        <span className="text-[7px] text-neutral-600">{q.quarter}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ═══ 7. Shareholding Pattern ═══ */}
      {data.shareholding && (
        <Section icon={<PieChart className="w-4 h-4 text-primary-400" />} title="Shareholding Pattern" delay={0.15}>
          <ShareholdingDonut data={data.shareholding} />
        </Section>
      )}

      {/* ═══ 8. Quarterly Financials ═══ */}
      {data.quarterlyFinancials.length > 0 && (
        <Section icon={<BarChart3 className="w-4 h-4 text-emerald-400" />} title="Quarterly Financials" delay={0.17}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-neutral-500 py-1.5 font-medium">Quarter</th>
                  {data.quarterlyFinancials.map(q => (
                    <th key={q.quarter} className="text-right text-neutral-500 py-1.5 font-medium px-1">{q.quarter.slice(0, 4)}-{q.quarter.slice(4)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-2 text-neutral-400">Revenue</td>
                  {data.quarterlyFinancials.map(q => (
                    <td key={q.quarter} className="text-right py-2 text-white font-medium px-1">
                      {q.revenue != null ? `₹${(q.revenue).toFixed(0)}` : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 text-neutral-400">PAT</td>
                  {data.quarterlyFinancials.map(q => (
                    <td key={q.quarter} className={cn('text-right py-2 font-medium px-1', q.pat != null && q.pat < 0 ? 'text-red-400' : 'text-white')}>
                      {q.pat != null ? `₹${(q.pat).toFixed(0)}` : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ═══ 9. Peer Comparison Table ═══ */}
      {data.peers.length > 0 && (
        <Section icon={<TableProperties className="w-4 h-4 text-primary-400" />} title="Peer Comparison" delay={0.2}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-neutral-500 py-1.5 font-medium">Company</th>
                  <th className="text-right text-neutral-500 py-1.5 font-medium">M.Cap</th>
                  <th className="text-right text-neutral-500 py-1.5 font-medium">P/E</th>
                  <th className="text-right text-neutral-500 py-1.5 font-medium">ROE</th>
                  <th className="text-right text-neutral-500 py-1.5 font-medium">D/E</th>
                </tr>
              </thead>
              <tbody>
                {/* Current stock highlighted */}
                <tr className="border-b border-primary-500/20 bg-primary-500/5">
                  <td className="py-2 text-primary-400 font-semibold">{stock.symbol} ★</td>
                  <td className="text-right py-2 text-white font-medium">{fmtVal(data.ttm['mcap'], 'Cr')}</td>
                  <td className="text-right py-2 text-white font-medium">{fmtVal(data.ttm['pe'], 'x')}</td>
                  <td className="text-right py-2 text-white font-medium">{fmtVal(data.ttm['roe'], '%')}</td>
                  <td className="text-right py-2 text-white font-medium">{fmtVal(data.ttm['de'], 'x')}</td>
                </tr>
                {data.peers.map(peer => (
                  <tr key={peer.symbol} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-2">
                      <a href={`/stock/${peer.symbol}`} className="text-white hover:text-primary-400 transition-colors">{peer.symbol}</a>
                    </td>
                    <td className="text-right py-2 text-neutral-400">{fmtVal(peer.mcap ?? null, 'Cr')}</td>
                    <td className="text-right py-2 text-neutral-400">{fmtVal(peer.pe ?? null, 'x')}</td>
                    <td className="text-right py-2 text-neutral-400">{fmtVal(peer.roe ?? null, '%')}</td>
                    <td className="text-right py-2 text-neutral-400">{fmtVal(peer.de ?? null, 'x')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ═══ 10. Dividend History ═══ */}
      {data.dividendHistory.length > 0 && (
        <Section icon={<span className="text-sm">💰</span>} title="Dividend History" delay={0.22}>
          <div className="space-y-2">
            {data.dividendHistory.slice(0, 10).map((div, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className="text-xs text-white">{div.purpose}</span>
                <span className="text-[10px] text-neutral-500">{div.date}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ 11. Corporate Actions ═══ */}
      {data.corporateActions.filter(a => a.type !== 'dividend').length > 0 && (
        <Section icon={<Calendar className="w-4 h-4 text-primary-400" />} title="Corporate Actions" delay={0.25}>
          <div className="space-y-2">
            {data.corporateActions.filter(a => a.type !== 'dividend').slice(0, 8).map((action, i) => {
              const icon = action.type === 'bonus' ? '🎁' : action.type === 'split' ? '✂️' : action.type === 'buyback' ? '🔄' : action.type === 'rights' ? '📄' : '📋'
              const color = action.type === 'bonus' ? 'text-primary-400' : action.type === 'split' ? 'text-warning-400' : action.type === 'buyback' ? 'text-cyan-400' : 'text-neutral-400'
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium', color)}>{action.purpose}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Ex-date: {action.date}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
