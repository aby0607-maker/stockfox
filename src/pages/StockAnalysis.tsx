import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Share2, AlertTriangle, TrendingUp, TrendingDown, Sparkles, ChevronRight, Check, X, Calendar, GitCompare, UserCheck, History, ShieldCheck, PenLine, BookmarkPlus, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { resolveStock } from '@/services/stockService'
import { buildVerdictForStock } from '@/services/verdictService'
import { buildNewsItems, buildUpcomingEvents } from '@/services/newsBuilder'
import { LearningProgress } from '@/components/learning/LearningProgress'
import { ScoringMethodologyModal } from '@/components/scoring/ScoringMethodologyModal'
import { AnalysisLoader, createLoadingSteps, updateStep, type LoadingStep } from '@/components/scoring/AnalysisLoader'
import { LearningCompletion } from '@/components/learning/LearningCompletion'
import { getAccuracy } from '@/data/learningMetrics'
import { InfoTab } from '@/components/stock-info/InfoTab'
import { formatEventDate, getEventIcon, type NewsItem, type UpcomingEvent } from '@/data/news'
import { DemoModeToggle, SpotlightTour } from '@/components/demo'
import { getSpotlightsForLocation } from '@/data/featureSpotlights'
import { OverallVerdictCard, PillarCard, PillarDrillDown, QualFactorTab, NewsEventSection } from '@/components/scoring'
import { RedFlagScanner } from '@/components/stock-analysis/RedFlagScanner'
import type { Stock, StockVerdictV2, VerdictPillar, Signal } from '@/types'

// Skeleton components for loading state
// SkeletonBlock removed — replaced by AnalysisLoader

// ============== PROS/CONS COMPONENT ==============
function ProsCons({ signals, concerns }: { signals: Signal[]; concerns: Signal[] }) {
  const pros = signals.filter(s => s.isPositive !== false)
  const cons = concerns.length > 0 ? concerns : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 gap-3"
    >
      {/* Pros */}
      <div className="rounded-2xl border border-success-500/20 bg-success-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-success-500/20 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-success-400" />
          </div>
          <span className="font-semibold text-white text-sm">Strengths</span>
        </div>
        <div className="space-y-2">
          {pros.slice(0, 4).map((signal, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{signal.title}</p>
                {signal.description && (
                  <p className="text-xs text-neutral-400 mt-0.5">{signal.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cons */}
      <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-warning-500/20 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-400" />
          </div>
          <span className="font-semibold text-white text-sm">Weaknesses</span>
        </div>
        <div className="space-y-2">
          {cons.length > 0 ? cons.slice(0, 4).map((concern, i) => (
            <div key={i} className="flex items-start gap-2">
              <X className="w-4 h-4 text-warning-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{concern.title}</p>
                {concern.description && (
                  <p className="text-xs text-neutral-400 mt-0.5">{concern.description}</p>
                )}
              </div>
            </div>
          )) : (
            <p className="text-sm text-neutral-500">No significant concerns</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============== NEWS SECTION COMPONENT ==============
// V1 NewsSection component removed — V2 uses NewsEventSection from scoring components

// ============== MAIN COMPONENT ==============
export function StockAnalysis() {
  const { ticker, '*': subpath } = useParams<{ ticker: string; '*': string }>()
  const navigate = useNavigate()
  const { currentProfile, demoMode, toggleDemoMode } = useAppStore()

  // Tab routing: /stock/RELIANCE = scorecard, /stock/RELIANCE/info = info
  const activeTab = subpath === 'info' ? 'info' : 'scorecard'
  const setActiveTab = (tab: 'scorecard' | 'info') => {
    navigate(tab === 'info' ? `/stock/${ticker}/info` : `/stock/${ticker}`, { replace: true })
  }

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false) // Background refresh in progress
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>(createLoadingSteps())
  const [stock, setStock] = useState<Stock | null>(null)
  const [verdictV2, setVerdictV2] = useState<StockVerdictV2 | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])

  // V2 pillar navigation state
  const [selectedPillar, setSelectedPillar] = useState<VerdictPillar | null>(null)
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null)

  // Methodology modal state
  const [showMethodology, setShowMethodology] = useState(false)

  // Learning mode state
  const [learningMode, setLearningMode] = useState(false)
  const [learningRatings, setLearningRatings] = useState<Record<string, {
    segmentId: string
    segmentName?: string
    userBand: import('@/data/learningMetrics').RatingBand
    systemScore: number
    revealed: boolean
    accuracy: 'match' | 'close' | 'miss'
  }>>({})


  // Spotlight tour — only when demo mode is active
  const spotlights = getSpotlightsForLocation('stock-analysis')
  const showSpotlights = demoMode

  useEffect(() => {
    if (!ticker || !currentProfile) return
    let cancelled = false

    setIsLoading(true)

    const symbol = ticker
    const profileId = currentProfile.id

    async function loadStock() {
      // ═══ Strategy: Cache-first, silent background refresh ═══
      // 1. Check pre-computed cache for full 3-pillar scoring
      // 2. If cached: render instantly, then refresh silently in background
      // 3. If not cached: show AnalysisLoader, run live pipeline

      // Step 0: Try cache for instant render
      const { getCachedStock } = await import('@/services/stockCacheService')
      const cachedStock = await getCachedStock(symbol.toUpperCase())
      // Check for full scoring: has per-profile scores OR scoringVersion flag
      const cached = cachedStock as any
      const hasCachedScoring = cached && (cached.scores || cached.scoringVersion === 'full-3pillar')
      console.info(`[StockAnalysis] Cache check for ${symbol}: ${hasCachedScoring ? 'HIT — instant render' : 'MISS — live pipeline'}`, cached ? { scoringVersion: cached.scoringVersion, hasScores: !!cached.scores, score: cached.score } : 'not in cache')

      if (hasCachedScoring && !cancelled) {
        // ═══ INSTANT PATH: Render from cache (<1 second) ═══
        const cached = cachedStock as any
        const profileScore = cached.scores?.[profileId]
        const { getOverallVerdict } = await import('@/lib/scoring')
        const overall = getOverallVerdict(profileScore?.score ?? cached.score ?? 50)

        // Build a minimal Stock object from cache
        const cachedStockObj = {
          id: cached.symbol,
          symbol: cached.symbol,
          name: cached.name,
          sector: cached.sector,
          subSector: cached.industry || '',
          currentPrice: cached.price || 0,
          changePercent: cached.changePercent || 0,
          previousClose: 0, change: 0, marketCap: cached.mcap || 0,
          high52w: cached.high52W || 0, low52w: cached.low52W || 0,
          peerGroup: [],
        } as unknown as Stock
        setStock(cachedStockObj)

        // Build full V2 verdict from cached segment scores
        const { getScoreBandEnum } = await import('@/lib/scoring')
        const segs = cached.segments || {}

        // Reconstruct pillar objects from cached segment scores
        const makeSegment = (id: string, name: string, pillar: 'quant' | 'qual' | 'risk', score: number | undefined) => ({
          id, name, pillar, scoringType: 'scored' as const,
          score: score ?? undefined, scoreBand: score != null ? getScoreBandEnum(score) : undefined,
          label: score != null ? getScoreBandEnum(score) : undefined,
          status: (score ?? 50) >= 60 ? 'positive' as const : (score ?? 50) < 45 ? 'negative' as const : 'neutral' as const,
          interpretation: '', signalGroups: [], redFlags: [],
          confidenceIndicator: { state: 'partial' as const, computed: 0, total: 0, detail: 'From pre-computed cache' },
        })

        const quantSegs = [
          makeSegment('financial_health', 'Financial Health', 'quant', segs.financial_health),
          makeSegment('profitability', 'Profitability', 'quant', segs.profitability),
          makeSegment('growth', 'Growth', 'quant', segs.growth),
          makeSegment('valuation', 'Valuation', 'quant', segs.valuation),
          makeSegment('technical', 'Technical', 'quant', segs.technical),
          makeSegment('performance', 'Performance', 'quant', segs.performance),
          makeSegment('institutional_signals', 'Institutional Signals', 'quant', segs.institutional_signals),
        ]
        const qualSegs = [
          makeSegment('management_governance', 'Management & Governance', 'qual', segs.management_governance),
          makeSegment('business_quality', 'Business Quality', 'qual', segs.business_quality),
          makeSegment('capital_discipline', 'Capital Discipline', 'qual', segs.capital_discipline),
          makeSegment('earnings_quality', 'Earnings Quality', 'qual', segs.earnings_quality),
          makeSegment('execution_quality', 'Execution Quality', 'qual', segs.execution_quality),
        ]
        const riskSeg = makeSegment('risk', 'Risk Score', 'risk', segs.risk ?? cached.riskScore)

        const makePillar = (pillar: 'quant' | 'qual' | 'risk', name: string, segments: any[]) => {
          const scored = segments.filter((s: any) => s.score != null)
          const avg = scored.length > 0 ? Math.round(scored.reduce((sum: number, s: any) => sum + s.score, 0) / scored.length) : 50
          return {
            pillar, name, score: avg,
            scoreBand: getScoreBandEnum(avg),
            label: getOverallVerdict(avg).label,
            summary: `Based on ${scored.length} pre-computed segment scores`,
            segments,
          }
        }

        const pillars = [
          makePillar('quant', 'Quant Score', quantSegs),
          makePillar('qual', 'Qual Score', qualSegs),
          makePillar('risk', 'Risk Score', [riskSeg]),
        ]

        const cachedVerdict = {
          overallVerdict: overall.verdict,
          overallScore: profileScore?.score ?? cached.score,
          overallLabel: profileScore?.label ?? overall.label,
          overallSummary: `Pre-computed score. Live analysis refreshing in background...`,
          pillars,
          newsEvents: [],
          ticker: cached.symbol,
          stockName: cached.name,
          sector: cached.sector,
          lastUpdated: cached.lastUpdated || '',
          stockId: cached.symbol,
          profileId,
          topSignals: [],
          topConcerns: [],
          verdictRationale: '',
          positionSizing: '',
          entryGuidance: '',
          peerRank: cached.peerRanks?.[profileId]?.rank ?? cached.peerRank,
          peerTotal: cached.peerRanks?.[profileId]?.total ?? cached.peerTotal,
          peerCategory: cached.peerRanks?.[profileId]?.category ?? cached.peerCategory,
        } as StockVerdictV2
        setVerdictV2(cachedVerdict)
        setIsLoading(false)

        // ═══ BACKGROUND REFRESH: Run live scoring silently ═══
        setIsRefreshing(true)
        const resolved = await resolveStock(symbol)
        if (resolved && !cancelled) {
          setStock(resolved) // Update with live price
          try {
            const liveVerdict = await buildVerdictForStock(resolved, profileId)
            if (!cancelled && liveVerdict) {
              // Always update with live data (has full signal groups, interpretations, etc.)
              setVerdictV2(liveVerdict)
            }
          } catch { /* Background refresh failed — cached data stays */ }

          // Background news
          try {
            const [newsItems, events] = await Promise.all([
              buildNewsItems(symbol, resolved.name),
              buildUpcomingEvents(symbol),
            ])
            if (!cancelled) { setNews(newsItems); setUpcomingEvents(events) }
          } catch { /* News failed */ }
        }
        if (!cancelled) setIsRefreshing(false)

      } else {
        // ═══ LIVE PATH: Full scoring with AnalysisLoader ═══
        setLoadingSteps(createLoadingSteps())

        // Step 1: Resolve stock from BSE/NSE
        setLoadingSteps(s => updateStep(s, 'resolve', 'loading'))
        const resolved = await resolveStock(symbol)
        if (cancelled || !resolved) {
          if (!cancelled) {
            setStock(null)
            setVerdictV2(null)
            setLoadingSteps(s => updateStep(s, 'resolve', 'error', 'Stock not found'))
          }
          setIsLoading(false)
          return
        }
        setLoadingSteps(s => updateStep(s, 'resolve', 'done', `${resolved.name} found on ${resolved.sector}`))
        setStock(resolved)

        // Steps 2-5: Build V2 verdict
        setLoadingSteps(s => updateStep(s, 'fundamentals', 'loading'))
        let liveVerdict: StockVerdictV2 | null = null
        try {
          const verdictPromise = buildVerdictForStock(resolved, profileId)
          const stepTimers = [
            setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'fundamentals', 'done'), 'quant', 'loading')) }, 2000),
            setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'quant', 'done'), 'qual', 'loading')) }, 5000),
            setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'qual', 'done'), 'risk', 'loading')) }, 8000),
            setTimeout(() => { if (!cancelled) setLoadingSteps(s => updateStep(updateStep(s, 'risk', 'done'), 'personalize', 'loading')) }, 10000),
          ]
          liveVerdict = await verdictPromise
          stepTimers.forEach(clearTimeout)
          setLoadingSteps(s => {
            let updated = s
            for (const id of ['fundamentals', 'quant', 'qual', 'risk', 'personalize']) {
              updated = updateStep(updated, id, 'done')
            }
            return updated
          })
        } catch (err) {
          console.warn('Failed to build verdict for', symbol, err)
          setLoadingSteps(s => updateStep(s, 'quant', 'error', 'Scoring failed'))
        }

        if (cancelled) return

        // Step 7: News & events
        setLoadingSteps(s => updateStep(s, 'news', 'loading'))
        let newsItems: NewsItem[] = []
        let events: UpcomingEvent[] = []
        try {
          ;[newsItems, events] = await Promise.all([
            buildNewsItems(symbol, resolved.name),
            buildUpcomingEvents(symbol),
          ])
        } catch { /* News/events unavailable */ }
        setLoadingSteps(s => updateStep(s, 'news', 'done'))

        if (cancelled) return

        setStock(resolved)
        setVerdictV2(liveVerdict)
        setNews(newsItems)
        setUpcomingEvents(events)
      }
      setSelectedPillar(null)
      setSelectedFactorId(null)
      setIsLoading(false)
    }

    loadStock()
    return () => { cancelled = true }
  }, [ticker, currentProfile])


  if (!ticker || !currentProfile) return null

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pb-24">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <ArrowLeft className="w-4 h-4" />
          Back
        </div>
        <AnalysisLoader steps={loadingSteps} stockName={stock?.name || ticker} />
      </div>
    )
  }

  // Stock not found at all
  if (!stock) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-2xl bg-dark-800 border border-white/5 text-center py-12 px-6">
          <h2 className="text-xl font-semibold text-white mb-2">Stock Not Found</h2>
          <p className="text-neutral-400">
            We couldn't find analysis for "{ticker.toUpperCase()}"
          </p>
        </div>
      </div>
    )
  }

  // Stock found via CMOTS but no scoring data yet (no V1 or V2 verdict)
  if (!verdictV2) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-2xl bg-dark-800 border border-white/5 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{stock.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-neutral-400">{stock.symbol}</span>
                {stock.sector && (
                  <span className="text-xs text-neutral-500 bg-dark-700 px-2 py-0.5 rounded">{stock.sector}</span>
                )}
              </div>
            </div>
            {stock.currentPrice > 0 && (
              <div className="text-right">
                <div className="text-xl font-semibold text-white">{formatCurrency(stock.currentPrice)}</div>
              </div>
            )}
          </div>
          <div className="border-t border-white/5 pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Analysis Coming Soon</h2>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              We found {stock.name} in our database. Full scoring analysis across Quant, Qual, and Risk pillars will be available shortly.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Back button + Mode Toggle + Demo Toggle */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between"
      >
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          {/* Demo Mode Toggle */}
          <DemoModeToggle
            isEnabled={demoMode}
            onToggle={toggleDemoMode}
          />
          {/* DIY/DFY toggle removed — V2 is DFY-only */}
        </div>
      </motion.div>

      {/* ============== HERO CARD ============== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-dark-800 border border-white/5 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{stock.name}</h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                {stock.sector} • {stock.symbol}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${stock.name} Analysis`,
                      text: verdictV2
                        ? `StockFox: ${stock.symbol} Score ${verdictV2.overallScore}/100 — ${verdictV2.overallLabel}`
                        : `StockFox: ${stock.symbol} Analysis`,
                      url: window.location.href,
                    })
                  } else {
                    navigator.clipboard.writeText(window.location.href)
                  }
                }}
                className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors" aria-label="Save">
                <BookmarkPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Price row */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-white">{formatCurrency(stock.currentPrice)}</span>
            <span className={cn(
              'text-sm font-medium flex items-center gap-1',
              stock.changePercent >= 0 ? 'text-success-400' : 'text-destructive-400'
            )}>
              {stock.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {formatPercent(stock.changePercent)}
            </span>
          </div>

          {/* 52W Range — shows when price data available (Yahoo fallback) */}
          {stock.high52w > 0 && stock.low52w > 0 && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
              <span>52W: {formatCurrency(stock.low52w)}</span>
              <div className="flex-1 max-w-24 h-1 bg-dark-600 rounded-full relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary-400 rounded-full -ml-1"
                  style={{ left: `${Math.min(100, Math.max(0, ((stock.currentPrice - stock.low52w) / (stock.high52w - stock.low52w)) * 100))}%` }}
                />
              </div>
              <span>{formatCurrency(stock.high52w)}</span>
            </div>
          )}
        </div>

        {/* HERO: V2 Overall Verdict — hidden in learning mode */}
        {verdictV2 && !learningMode && (
          <div className="p-5 pt-0" data-spotlight="hero-card">
            <OverallVerdictCard
              verdict={verdictV2}
              profileName={currentProfile.investmentThesis}
            />
          </div>
        )}
        {verdictV2 && learningMode && (
          <div className="p-5 pt-0 text-center">
            <span className="text-3xl font-bold text-primary-400">?</span>
            <span className="text-sm text-neutral-500 ml-1">/100</span>
            <p className="text-xs text-primary-400 mt-1">Rate all segments to reveal the overall score</p>
          </div>
        )}

        {/* "How we score" button — Spinny-style trigger */}
        {verdictV2 && (
          <div className="px-5 pb-3">
            <button
              onClick={() => setShowMethodology(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-dark-700/50 border border-white/5 hover:border-primary-500/30 transition-colors"
            >
              <span className="text-[11px] text-neutral-400">⭐ See how scores are calculated?</span>
              <span className="text-neutral-600">›</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Methodology Modal */}
      <ScoringMethodologyModal
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        profile={currentProfile}
      />

      {/* ============== STICKY TAB BAR ============== */}
      <div className="sticky top-0 z-30 bg-dark-900/95 backdrop-blur-md border-b border-white/5 -mx-4 px-4 py-2">
        <div className="flex gap-1">
          {[
            { id: 'scorecard' as const, label: 'Scorecard' },
            { id: 'info' as const, label: 'Info' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============== TAB CONTENT ============== */}
      {activeTab === 'info' ? (
        <InfoTab stock={stock} verdictV2={verdictV2} />
      ) : (
      <>
      {/* ============== QUICK VALIDATION CTA - Below Score Card ============== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3"
      >
        {/* Ask AI - Primary CTA */}
        <Link
          to="/chat"
          className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-primary-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
          data-spotlight="ask-ai-cta"
        >
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-white block">Ask AI</span>
            <span className="text-[10px] text-neutral-400">Get instant answers about {stock.symbol}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-purple-400 transition-colors" />
        </Link>

        {/* Consult Advisor */}
        <Link
          to="/advisors"
          className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-dark-800 border border-white/5 hover:border-warning-500/30 transition-all group"
          data-spotlight="consult-expert"
        >
          <div className="w-10 h-10 rounded-full bg-warning-500/10 flex items-center justify-center group-hover:bg-warning-500/20 transition-colors">
            <UserCheck className="w-5 h-5 text-warning-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-white block">Consult Expert</span>
            <span className="text-[10px] text-neutral-400">SEBI Registered Advisors</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-warning-400 transition-colors" />
        </Link>
      </motion.div>

      {/* ============== V2: 3-PILLAR CARDS + DRILL-DOWN ============== */}
      {verdictV2 && (
        <AnimatePresence mode="wait">
          {!selectedPillar ? (
            /* Pillar overview: 3 cards */
            <motion.div
              key="pillar-overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Analysis Pillars
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setLearningMode(!learningMode)
                      if (!learningMode) setLearningRatings({})
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border',
                      learningMode
                        ? 'bg-primary-500/20 border-primary-500/40 text-primary-400'
                        : 'bg-dark-700 border-white/10 text-neutral-500 hover:border-primary-500/30',
                    )}
                  >
                    <span>🎓</span>
                    <span>{learningMode ? 'Learning ON' : 'Learn Mode'}</span>
                  </button>
                  {!learningMode && (
                    <span className="text-[10px] text-neutral-600">
                      {verdictV2.pillars.reduce((n, p) => n + p.segments.length, 0)} dimensions analysed
                    </span>
                  )}
                </div>
              </div>

              {/* Learning progress bar */}
              {learningMode && (
                <LearningProgress ratings={learningRatings} totalSegments={11} />
              )}
              {verdictV2.pillars.map((pillar, i) => {
                // In learning mode, check if all scored segments in this pillar have been rated
                const scoredSegs = pillar.segments.filter(s => s.scoringType === 'scored' && s.score !== undefined)
                const allRated = learningMode && scoredSegs.length > 0 && scoredSegs.every(s => learningRatings[s.id]?.revealed)
                return (
                  <PillarCard
                    key={pillar.pillar}
                    pillar={pillar}
                    delay={i * 0.08}
                    onClick={() => setSelectedPillar(pillar.pillar)}
                    learningMode={learningMode}
                    pillarRevealed={allRated}
                  />
                )
              })}
            </motion.div>
          ) : selectedFactorId ? (
            /* Qual Factor deep-dive (Layer 3) */
            <motion.div
              key={`factor-${selectedFactorId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {(() => {
                const pillar = verdictV2.pillars.find(p => p.pillar === selectedPillar)
                const factor = pillar?.segments.find(s => s.id === selectedFactorId)
                if (!factor) return null
                return (
                  <QualFactorTab
                    factor={factor}
                    onBack={() => setSelectedFactorId(null)}
                  />
                )
              })()}
            </motion.div>
          ) : (
            /* Pillar drill-down (Layer 2) */
            <motion.div
              key={`pillar-${selectedPillar}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {(() => {
                const pillar = verdictV2.pillars.find(p => p.pillar === selectedPillar)
                if (!pillar) return null

                // Risk pillar: embed Red Flag Scanner instead of empty segments list
                // Build set of revealed segment IDs for learning mode
                const revealedSet = new Set(
                  Object.entries(learningRatings)
                    .filter(([, r]) => r.revealed)
                    .map(([id]) => id)
                )

                if (selectedPillar === 'risk') {
                  return (
                    <div className="space-y-4">
                      <PillarDrillDown
                        pillar={pillar}
                        onBack={() => setSelectedPillar(null)}
                        learningMode={learningMode}
                        revealedSegments={revealedSet}
                        learningRatings={learningRatings}
                        resolvedMetrics={verdictV2.resolvedMetrics || undefined}
                        onLearningRate={(segId, segName, band, systemScore) => {
                          const acc = getAccuracy(band, systemScore)
                          setLearningRatings(prev => ({
                            ...prev,
                            [segId]: { segmentId: segId, segmentName: segName, userBand: band, systemScore, revealed: true, accuracy: acc.result },
                          }))
                        }}
                      />
                      {!learningMode && <RedFlagScanner verdict={null} verdictV2={verdictV2} news={news} />}
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    <PillarDrillDown
                      pillar={pillar}
                      onBack={() => setSelectedPillar(null)}
                      learningMode={learningMode}
                      revealedSegments={revealedSet}
                      learningRatings={learningRatings}
                      resolvedMetrics={verdictV2.resolvedMetrics || undefined}
                      onLearningRate={(segId, segName, band, systemScore) => {
                        const acc = getAccuracy(band, systemScore)
                        setLearningRatings(prev => ({
                          ...prev,
                          [segId]: {
                            segmentId: segId,
                            segmentName: segName,
                            userBand: band,
                            systemScore,
                            revealed: true,
                            accuracy: acc.result,
                          },
                        }))
                      }}
                      onSegmentClick={(segmentId) => {
                        if (learningMode) return
                        const seg = pillar.segments.find(s => s.id === segmentId)
                        if (seg?.signalGroups && seg.signalGroups.length > 0) {
                          setSelectedFactorId(segmentId)
                        } else {
                          window.location.href = `/segment/${ticker}/${segmentId}`
                        }
                      }}
                    />

                    {/* Learning completion check */}
                    {learningMode && (() => {
                      const scoredSegments = pillar.segments.filter(s => s.scoringType === 'scored' && s.score !== undefined)
                      const allRated = scoredSegments.every(s => learningRatings[s.id]?.revealed)
                      if (allRated && scoredSegments.length > 0) {
                        return (
                          <LearningCompletion
                            ratings={learningRatings}
                            stockName={stock?.name || ticker || ''}
                            onClose={() => setLearningMode(false)}
                          />
                        )
                      }
                      return null
                    })()}
                  </div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ============== PROS/CONS (Quick View) - hidden during pillar drill-down ============== */}
      {!selectedPillar && verdictV2 && verdictV2.topSignals.length > 0 && (
        <div data-spotlight="pros-cons">
          <ProsCons
            signals={verdictV2?.topSignals || []}
            concerns={verdictV2?.topConcerns || []}
          />
        </div>
      )}
      {/* Loading indicator for Strengths/Weaknesses during background refresh */}
      {!selectedPillar && verdictV2 && verdictV2.topSignals.length === 0 && isRefreshing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/5 bg-dark-800 p-4">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            <span>Analyzing strengths & weaknesses...</span>
          </div>
        </motion.div>
      )}

      {/* Red Flag Scanner moved into Risk pillar drill-down */}

      {/* ============== NEWS & EVENTS SECTION (V2) ============== */}
      {verdictV2 && verdictV2.newsEvents.length > 0 && !selectedPillar && (
        <div data-spotlight="news-section">
          <NewsEventSection events={verdictV2.newsEvents} />
        </div>
      )}
      {/* Loading indicator for News during background refresh */}
      {verdictV2 && verdictV2.newsEvents.length === 0 && !selectedPillar && isRefreshing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/5 bg-dark-800 p-4">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            <span>Fetching news & events...</span>
          </div>
        </motion.div>
      )}

      {/* ============== UPCOMING EVENTS (if any) ============== */}
      {upcomingEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-dark-800 border border-white/5 p-4"
          data-spotlight="upcoming-events"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary-400" />
            <span className="font-semibold text-white text-sm">Upcoming Events</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
                  event.importance === 'high' ? 'bg-primary-500/10 text-primary-300' : 'bg-dark-700 text-neutral-400'
                )}
              >
                <span>{getEventIcon(event.type)}</span>
                <span className="font-medium">{event.title}</span>
                <span className="text-neutral-500">•</span>
                <span>{formatEventDate(event.date)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ============== ENTRY ASSESSMENT — COMING SOON ============== */}
      {!selectedPillar && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl bg-dark-800 border border-white/5 p-5 relative overflow-hidden"
          data-spotlight="entry-assessment"
        >
          {/* Blurred overlay */}
          <div className="absolute inset-0 bg-dark-800/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <span className="px-3 py-1 rounded-lg bg-primary-500/15 text-primary-400 text-xs font-semibold uppercase tracking-wider">
              Coming Soon
            </span>
            <p className="text-xs text-neutral-500 mt-2 text-center max-w-[200px]">
              Position sizing, fair value range & exit triggers
            </p>
          </div>

          {/* Placeholder content (blurred behind overlay) */}
          <div className="opacity-40 pointer-events-none select-none">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <h3 className="font-semibold text-white">Entry Assessment</h3>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-500/20 text-neutral-400">
                —
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-dark-700/50 rounded-xl">
                <span className="text-xs text-neutral-500 block mb-1">Suggested Allocation</span>
                <span className="text-white font-medium text-sm">—</span>
              </div>
              <div className="p-3 bg-dark-700/50 rounded-xl">
                <span className="text-xs text-neutral-500 block mb-1">Fair Value Range</span>
                <span className="text-white font-medium text-sm">—</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5">
              <span className="text-xs font-medium text-neutral-400">Exit Triggers</span>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 rounded text-xs bg-dark-700 text-neutral-500">ROE &lt; 12%</span>
                <span className="px-2 py-1 rounded text-xs bg-dark-700 text-neutral-500">D/E &gt; 1.5</span>
                <span className="px-2 py-1 rounded text-xs bg-dark-700 text-neutral-500">Margin decline 3Q</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============== MORE ACTIONS - Bottom Section ============== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-dark-800 border border-white/5 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-medium text-white">More Actions</span>
        </div>

        {/* Primary Actions - 2 Column Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Compare with Peers */}
          <Link
            to={`/compare?add=${stock.symbol}`}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 border border-primary-500/20 hover:border-primary-500/40 hover:bg-dark-700 transition-all group"
            data-spotlight="compare-peers"
          >
            <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
              <GitCompare className="w-5 h-5 text-primary-400" />
            </div>
            <span className="text-sm font-medium text-white">Compare Peers</span>
            <span className="text-[10px] text-neutral-500 text-center">vs competitors</span>
          </Link>

          {/* Back-Test */}
          <Link
            to={`/backtest/${stock.symbol}`}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 border border-white/5 hover:border-teal-500/30 hover:bg-dark-700 transition-all group"
            data-spotlight="back-test"
          >
            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <History className="w-5 h-5 text-teal-400" />
            </div>
            <span className="text-sm font-medium text-white">Back-Test</span>
            <span className="text-[10px] text-neutral-500 text-center">Historical returns</span>
          </Link>
        </div>

        {/* Secondary Actions - Compact Row */}
        <div className="flex gap-2 pt-3 border-t border-white/5">
          <Link
            to="/journal"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dark-700/30 border border-white/5 hover:bg-dark-700/50 transition-colors"
          >
            <PenLine className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-300">Journal</span>
          </Link>
          <button
            onClick={() => {
              const shareText = verdictV2
                ? `StockFox: ${stock.symbol} Score ${verdictV2.overallScore}/100 — ${verdictV2.overallLabel}`
                : `StockFox: ${stock.symbol} Analysis`
              if (navigator.share) {
                navigator.share({ title: `${stock.name} Analysis`, text: shareText, url: window.location.href })
              } else {
                navigator.clipboard.writeText(window.location.href)
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dark-700/30 border border-white/5 hover:bg-dark-700/50 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-300">Share</span>
          </button>
          <button
            onClick={() => {
              const exportText = verdictV2
                ? `STOCKFOX ANALYSIS REPORT\n========================\nStock: ${stock.name} (${stock.symbol})\nSector: ${stock.sector}\nDate: ${new Date().toLocaleDateString()}\n\nOVERALL: ${verdictV2.overallScore}/100 — ${verdictV2.overallLabel}${verdictV2.peerRank ? `\nRANK: #${verdictV2.peerRank} of ${verdictV2.peerTotal} ${verdictV2.peerCategory} stocks` : ''}\n\nPILLARS:\n${verdictV2.pillars.map(p => `${p.name}: ${p.score}/100 (${p.label})`).join('\n')}\n\n---\nGenerated by StockFox`
                : `StockFox: ${stock.symbol} — No analysis data available yet`
              navigator.clipboard.writeText(exportText).then(() => {
                alert('Analysis report copied to clipboard!')
              })
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dark-700/30 border border-white/5 hover:bg-dark-700/50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-300">Export</span>
          </button>
        </div>
      </motion.div>

      {/* ============== FEATURE TOUR (demo mode) ============== */}
      <SpotlightTour
        spotlights={spotlights}
        isActive={showSpotlights}
        onEnd={toggleDemoMode}
      />
      </>
      )}
    </div>
  )
}
