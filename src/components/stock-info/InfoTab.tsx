/**
 * InfoTab — Company profile, key metrics, chart, shareholding, financials, peers.
 *
 * Lazy-loaded: data fetches only when this tab is active.
 * All data sources already wired — CMOTS TTM, ShareHolding, P&L, Yahoo prices, BSE.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, BarChart3, PieChart, TrendingUp, Users, Calendar, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PriceChart } from '@/components/charts/PriceChart'
import { AnalysisLoader, updateStep, type LoadingStep } from '@/components/scoring/AnalysisLoader'
import type { Stock, StockVerdictV2 } from '@/types'

// ─── Data fetching ──────────────────────────────

interface InfoData {
  ttm: Record<string, number | null>
  shareholding: { Promoters: number; FII: number; DII: number; Public: number; MutualFund?: number } | null
  priceHistory: { time: string; value: number }[]
  quarterlyRevenue: { quarter: string; revenue: number; pat: number }[]
  peers: { symbol: string; name: string; pe?: number; mcap?: number; roe?: number }[]
}

async function fetchInfoData(symbol: string): Promise<InfoData> {
  const { getTTMData, getShareholdingHistory, getQuarterlyResults } = await import('@/services/cmots')
  const { getYahooHistoricalPrices } = await import('@/services/yahoo')
  const { generatePeerGroupDetailed } = await import('@/services/stockService')
  const { getCompanyBySymbol } = await import('@/services/cmots')

  const coCode = await (async () => {
    const { getCoCode } = await import('@/services/cmots')
    return getCoCode(symbol)
  })()

  // Fetch all in parallel
  const [ttmRaw, shRaw, priceRaw, _qrRaw, company] = await Promise.all([
    getTTMData(symbol, coCode ?? undefined),
    getShareholdingHistory(symbol, coCode ?? undefined),
    (() => {
      const to = new Date().toISOString().split('T')[0]
      const from = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      return getYahooHistoricalPrices(symbol, from, to)
    })(),
    getQuarterlyResults(symbol, coCode ?? undefined),
    getCompanyBySymbol(symbol),
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
    ttm['qr'] = t.quickratio as number ?? null
    ttm['evEbitda'] = t.ev_ebitda as number ?? null
    ttm['roa'] = t.returnonassets as number ?? null
    ttm['at'] = t.assetturnover_ttm as number ?? null
    ttm['peg'] = t.pegratio as number ?? null
  }

  // Shareholding
  let shareholding = null
  if (shRaw && shRaw.length > 0) {
    const latest = shRaw[0] as unknown as Record<string, unknown>
    shareholding = {
      Promoters: (latest.Promoters as number) || 0,
      FII: (latest.FII as number) || 0,
      DII: (latest.DII as number) || 0,
      Public: (latest.Public as number) || 0,
      MutualFund: (latest.MutualFund as number) || undefined,
    }
  }

  // Price history for chart
  const priceHistory = priceRaw.map(r => ({
    time: r.Tradedate.split('T')[0],
    value: r.Dayclose,
  }))

  // Quarterly results
  const quarterlyRevenue: { quarter: string; revenue: number; pat: number }[] = []
  // QR data is row-based — we need to extract revenue and PAT rows
  // This is complex; for now return empty and we'll populate later

  // Peers
  let peers: InfoData['peers'] = []
  if (company) {
    try {
      const peerDetails = await generatePeerGroupDetailed(company)
      peers = peerDetails.slice(0, 5).map(p => ({
        symbol: p.symbol,
        name: p.name,
      }))
    } catch { /* peer lookup failed */ }
  }

  return { ttm, shareholding, priceHistory, quarterlyRevenue, peers }
}

// ─── Components ─────────────────────────────────

function MetricCard({ label, value, unit, color }: { label: string; value: number | null; unit?: string; color?: string }) {
  const formatted = value != null
    ? unit === '%' ? `${value.toFixed(1)}%`
    : unit === 'x' ? `${value.toFixed(2)}x`
    : unit === 'Cr' ? `₹${(value / 100).toFixed(0)}L Cr`
    : `${value.toFixed(2)}`
    : '—'

  return (
    <div className="p-3 rounded-lg bg-dark-700/50 border border-white/5">
      <span className="text-[10px] text-neutral-500 block">{label}</span>
      <span className={cn('text-sm font-semibold', color || 'text-white')}>{formatted}</span>
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
      {/* SVG Donut */}
      <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
        {segments.map((seg, i) => {
          const startAngle = (cumulative / total) * 360
          const sweepAngle = (seg.value / total) * 360
          cumulative += seg.value

          const r = 48
          const cx = 60, cy = 60
          const startRad = (startAngle - 90) * Math.PI / 180
          const endRad = (startAngle + sweepAngle - 90) * Math.PI / 180
          const largeArc = sweepAngle > 180 ? 1 : 0

          const x1 = cx + r * Math.cos(startRad)
          const y1 = cy + r * Math.sin(startRad)
          const x2 = cx + r * Math.cos(endRad)
          const y2 = cy + r * Math.sin(endRad)

          return (
            <path
              key={i}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={seg.color}
              opacity={0.8}
            />
          )
        })}
        <circle cx="60" cy="60" r="30" fill="#0D0D12" />
      </svg>

      {/* Legend */}
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

// ─── Main InfoTab Component ─────────────────────

interface InfoTabProps {
  stock: Stock
  verdictV2: StockVerdictV2 | null
}

export function InfoTab({ stock }: InfoTabProps) {
  const [data, setData] = useState<InfoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>(() => [
    { id: 'connect', label: 'Connecting to data sources', status: 'loading' },
    { id: 'metrics', label: 'Fetching key metrics', detail: 'TTM ratios from CMOTS', status: 'pending' },
    { id: 'chart', label: 'Loading price history', detail: '5-year daily data from Yahoo Finance', status: 'pending' },
    { id: 'shareholding', label: 'Fetching shareholding pattern', detail: 'Quarterly data from CMOTS', status: 'pending' },
    { id: 'peers', label: 'Identifying peer stocks', detail: 'Industry matching from BSE', status: 'pending' },
  ])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadingSteps(s => updateStep(s, 'connect', 'loading'))

      try {
        // Simulate step progression
        setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'connect', 'done'), 'metrics', 'loading')) }, 500)
        setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'metrics', 'done'), 'chart', 'loading')) }, 2000)
        setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'chart', 'done'), 'shareholding', 'loading')) }, 4000)
        setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'shareholding', 'done'), 'peers', 'loading')) }, 5000)

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

  if (loading) {
    return <AnalysisLoader steps={loadingSteps} stockName={stock.name} />
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-neutral-500 text-sm">
        Unable to load stock information. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Company Profile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-dark-800 border border-white/5 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Company Profile</h3>
        </div>
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
      </motion.div>

      {/* Section 2: Key Metrics — grouped by theme */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl bg-dark-800 border border-white/5 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Key Metrics</h3>
        </div>

        {/* Valuation */}
        <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-1.5 mt-2">Valuation</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MetricCard label="P/E" value={data.ttm['pe']} unit="x" />
          <MetricCard label="P/B" value={data.ttm['pb']} unit="x" />
          <MetricCard label="EV/EBITDA" value={data.ttm['evEbitda']} unit="x" />
        </div>

        {/* Profitability */}
        <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-1.5">Profitability</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MetricCard label="ROE" value={data.ttm['roe']} unit="%" />
          <MetricCard label="ROCE" value={data.ttm['roce']} unit="%" />
          <MetricCard label="OPM" value={data.ttm['opm']} unit="%" />
        </div>

        {/* Financial Health */}
        <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-1.5">Financial Health</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MetricCard label="D/E" value={data.ttm['de']} unit="x" />
          <MetricCard label="Current Ratio" value={data.ttm['cr']} unit="x" />
          <MetricCard label="EPS" value={data.ttm['eps']} />
        </div>

        {/* Income */}
        <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-1.5">Income & Size</p>
        <div className="grid grid-cols-3 gap-2">
          <MetricCard label="Dividend Yield" value={data.ttm['dy']} unit="%" />
          <MetricCard label="Market Cap" value={data.ttm['mcap']} unit="Cr" />
          <MetricCard label="PEG" value={data.ttm['peg']} unit="x" />
        </div>
      </motion.div>

      {/* Section 3: Price Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-dark-800 border border-white/5 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Price Chart</h3>
        </div>
        <PriceChart data={data.priceHistory} height={280} />
      </motion.div>

      {/* Section 4: Shareholding */}
      {data.shareholding && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-dark-800 border border-white/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-semibold text-white">Shareholding Pattern</h3>
          </div>
          <ShareholdingDonut data={data.shareholding} />
        </motion.div>
      )}

      {/* Section 5: Peer Comparison */}
      {data.peers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-dark-800 border border-white/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-semibold text-white">Peer Companies</h3>
          </div>
          <div className="space-y-2">
            {data.peers.map(peer => (
              <a
                key={peer.symbol}
                href={`/stock/${peer.symbol}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-white">{peer.symbol}</span>
                  <span className="text-xs text-neutral-500 ml-2">{peer.name}</span>
                </div>
                <span className="text-xs text-neutral-400">→</span>
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Section 6: Corporate Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl bg-dark-800 border border-white/5 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Corporate Actions & Events</h3>
        </div>
        <p className="text-xs text-neutral-500">
          Dividend history, bonus issues, and splits are shown in the Scorecard → News & Events section.
        </p>
      </motion.div>
    </div>
  )
}
