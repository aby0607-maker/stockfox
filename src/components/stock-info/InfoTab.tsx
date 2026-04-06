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

interface CorporateActionItem {
  type: 'dividend' | 'bonus' | 'split' | 'rights' | 'buyback' | 'other'
  date: string
  purpose: string
}

interface InfoData {
  ttm: Record<string, number | null>
  shareholding: { Promoters: number; FII: number; DII: number; Public: number; MutualFund?: number } | null
  priceHistory: { time: string; value: number }[]
  quarterlyRevenue: { quarter: string; revenue: number; pat: number }[]
  peers: { symbol: string; name: string; pe?: number; mcap?: number; roe?: number }[]
  corporateActions: CorporateActionItem[]
}

async function fetchInfoData(symbol: string): Promise<InfoData> {
  const { getTTMData, getShareholdingHistory, getQuarterlyResults } = await import('@/services/cmots')
  const { getYahooHistoricalPrices } = await import('@/services/yahoo')
  const { generatePeerGroupDetailed } = await import('@/services/stockService')
  const { getCompanyBySymbol } = await import('@/services/cmots')
  const { getCorporateActions } = await import('@/services/bse')

  const coCode = await (async () => {
    const { getCoCode } = await import('@/services/cmots')
    return getCoCode(symbol)
  })()

  // Fetch all in parallel
  const [ttmRaw, shRaw, priceRaw, _qrRaw, company, corpActions] = await Promise.all([
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

  // Shareholding — CMOTS uses ForeignInstitution, MutualFund, OtherDomesticInstitution, Retail, Others
  let shareholding = null
  if (shRaw && shRaw.length > 0) {
    const latest = shRaw[0]
    const fii = latest.ForeignInstitution || 0
    const mf = latest.MutualFund || 0
    const odi = latest.OtherDomesticInstitution || 0
    const dii = mf + odi  // DII = Mutual Funds + Other Domestic Institutions
    shareholding = {
      Promoters: latest.Promoters || 0,
      FII: fii,
      DII: dii,
      Public: (latest.Retail || 0) + (latest.Others || 0),
      MutualFund: mf || undefined,
    }
  }

  // Price history for chart
  const priceHistory = priceRaw.map(r => ({
    time: r.Tradedate.split('T')[0],
    value: r.Dayclose,
  }))

  // Quarterly results
  const quarterlyRevenue: { quarter: string; revenue: number; pat: number }[] = []

  // Corporate Actions from BSE
  const corporateActions: CorporateActionItem[] = []
  if (corpActions?.actions) {
    for (const action of corpActions.actions) {
      const purpose = action.purpose.toLowerCase()
      const type: CorporateActionItem['type'] =
        purpose.includes('bonus') ? 'bonus' :
        purpose.includes('split') ? 'split' :
        purpose.includes('rights') ? 'rights' :
        purpose.includes('buyback') || purpose.includes('buy back') ? 'buyback' :
        purpose.includes('dividend') ? 'dividend' : 'other'
      corporateActions.push({
        type,
        date: action.ex_date,
        purpose: action.purpose,
      })
    }
  }

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

  return { ttm, shareholding, priceHistory, quarterlyRevenue, peers, corporateActions }
}

// ─── Components ─────────────────────────────────

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
    title: 'Valuation',
    icon: '📊',
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
    title: 'Profitability',
    icon: '💹',
    metrics: [
      { label: 'ROE', key: 'roe', unit: '%', interpret: v =>
        v >= 15 ? { sentiment: 'positive', hint: 'Strong' } :
        v >= 10 ? { sentiment: 'neutral', hint: 'Decent' } :
        { sentiment: 'negative', hint: 'Weak' }
      },
      { label: 'ROCE', key: 'roce', unit: '%', interpret: v =>
        v >= 15 ? { sentiment: 'positive', hint: 'Efficient' } :
        v >= 10 ? { sentiment: 'neutral', hint: 'Average' } :
        { sentiment: 'negative', hint: 'Low' }
      },
      { label: 'OPM', key: 'opm', unit: '%', interpret: v =>
        v >= 20 ? { sentiment: 'positive', hint: 'High margin' } :
        v >= 10 ? { sentiment: 'neutral', hint: 'Moderate' } :
        { sentiment: 'negative', hint: 'Thin margin' }
      },
    ],
  },
  {
    title: 'Financial Health',
    icon: '🛡️',
    metrics: [
      { label: 'D/E', key: 'de', unit: 'x', interpret: v =>
        v < 0.5 ? { sentiment: 'positive', hint: 'Low debt' } :
        v < 1 ? { sentiment: 'neutral', hint: 'Moderate' } :
        { sentiment: 'negative', hint: 'High debt' }
      },
      { label: 'Current Ratio', key: 'cr', unit: 'x', interpret: v =>
        v >= 1.5 ? { sentiment: 'positive', hint: 'Healthy' } :
        v >= 1 ? { sentiment: 'neutral', hint: 'Adequate' } :
        { sentiment: 'negative', hint: 'Tight' }
      },
      { label: 'EPS', key: 'eps', interpret: v =>
        v > 0 ? { sentiment: 'positive', hint: `₹${v.toFixed(0)}/share` } :
        { sentiment: 'negative', hint: 'Loss-making' }
      },
    ],
  },
  {
    title: 'Income & Size',
    icon: '🏢',
    metrics: [
      { label: 'Div. Yield', key: 'dy', unit: '%', interpret: v =>
        v >= 2 ? { sentiment: 'positive', hint: 'Good yield' } :
        v > 0 ? { sentiment: 'neutral', hint: 'Modest' } :
        { sentiment: 'none', hint: 'No dividend' }
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

function formatMetricValue(value: number | null, unit?: string): string {
  if (value == null) return '—'
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'x') return `${value.toFixed(2)}x`
  if (unit === 'Cr') {
    if (value >= 10000) return `₹${(value / 10000).toFixed(1)}L Cr`
    return `₹${value.toFixed(0)} Cr`
  }
  return `${value.toFixed(2)}`
}

function EnhancedMetricCard({ def, value }: { def: MetricDef; value: number | null }) {
  const formatted = formatMetricValue(value, def.unit)
  const interp = value != null && def.interpret ? def.interpret(value) : null
  const style = interp ? SENTIMENT_STYLES[interp.sentiment] : SENTIMENT_STYLES.none

  return (
    <div className={cn(
      'p-3 rounded-xl border transition-colors',
      'bg-dark-700/40',
      interp ? style.bg : 'border-white/5',
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] text-neutral-400 font-medium">{def.label}</span>
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

      {/* Section 2: Key Metrics — grouped by theme with sentiment */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl bg-dark-800 border border-white/5 p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Key Metrics</h3>
        </div>

        <div className="space-y-4">
          {METRIC_GROUPS.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs">{group.icon}</span>
                <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wide">{group.title}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {group.metrics.map(metric => (
                  <EnhancedMetricCard
                    key={metric.key}
                    def={metric}
                    value={data.ttm[metric.key]}
                  />
                ))}
              </div>
            </div>
          ))}
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
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Corporate Actions & Events</h3>
        </div>
        {data.corporateActions.length > 0 ? (
          <div className="space-y-2">
            {data.corporateActions.slice(0, 8).map((action, i) => {
              const icon = action.type === 'dividend' ? '💰' :
                action.type === 'bonus' ? '🎁' :
                action.type === 'split' ? '✂️' :
                action.type === 'buyback' ? '🔄' :
                action.type === 'rights' ? '📄' : '📋'
              const color = action.type === 'dividend' ? 'text-success-400' :
                action.type === 'bonus' ? 'text-primary-400' :
                action.type === 'split' ? 'text-warning-400' :
                action.type === 'buyback' ? 'text-cyan-400' : 'text-neutral-400'

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
        ) : (
          <p className="text-xs text-neutral-500">No corporate actions found in last 5 years.</p>
        )}
      </motion.div>
    </div>
  )
}
