import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Share2, AlertTriangle, TrendingUp, TrendingDown, Sparkles, ChevronRight, Check, X, Calendar, GitCompare, UserCheck, History, ShieldCheck, PenLine, BookmarkPlus, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { getStockBySymbol, getVerdictForStock } from '@/data'
import { resolveStock, isDemoStock } from '@/services/stockService'
import { buildVerdictForStock } from '@/services/verdictService'
import { buildNewsItems, buildUpcomingEvents } from '@/services/newsBuilder'
import { LearningProgress } from '@/components/learning/LearningProgress'
import { ScoringMethodologyModal } from '@/components/scoring/ScoringMethodologyModal'
import { LearningCompletion } from '@/components/learning/LearningCompletion'
import { getAccuracy } from '@/data/learningMetrics'
import { getNewsForStock, getUpcomingEvents, formatEventDate, getEventIcon, type NewsItem, type UpcomingEvent } from '@/data/news'
import { DemoModeToggle, SpotlightTour } from '@/components/demo'
import { getSpotlightsForLocation } from '@/data/featureSpotlights'
import { OverallVerdictCard, PillarCard, PillarDrillDown, QualFactorTab, NewsEventSection } from '@/components/scoring'
import { RedFlagScanner } from '@/components/stock-analysis/RedFlagScanner'
import { getVerdictV2 } from '@/data/verdictsV2'
import type { Stock, StockVerdict, StockVerdictV2, VerdictPillar, Signal } from '@/types'

// Skeleton components for loading state
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('bg-dark-600 rounded animate-pulse', className)} />
}

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
  const { ticker } = useParams<{ ticker: string }>()
  const { currentProfile, demoMode, toggleDemoMode } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [stock, setStock] = useState<Stock | null>(null)
  const [verdict, setVerdict] = useState<StockVerdict | null>(null)
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


  // Spotlight tour — show on first visit OR when demo mode is active
  const spotlights = getSpotlightsForLocation('stock-analysis')
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    try { return localStorage.getItem('sf_tour_stock_analysis') === 'seen' } catch { return false }
  })
  const showSpotlights = demoMode || (!hasSeenTour && verdictV2 != null)

  useEffect(() => {
    if (!ticker || !currentProfile) return
    let cancelled = false

    setIsLoading(true)

    const symbol = ticker
    const profileId = currentProfile.id

    async function loadStock() {
      // Demo stocks: show instantly with mock data, then upgrade to live V2 verdict
      if (isDemoStock(symbol)) {
        const stockData = getStockBySymbol(symbol)
        const verdictData = getVerdictForStock(symbol, profileId)
        const newsData = getNewsForStock(symbol)
        const mockV2 = getVerdictV2(symbol, profileId)

        if (cancelled) return
        // Instant render with mock data
        setStock(stockData || null)
        setVerdict(verdictData || null)
        setVerdictV2(mockV2 || null)
        setNews(newsData.slice(0, 5))
        setUpcomingEvents(getUpcomingEvents(symbol))
        setIsLoading(false)

        // Background: build live V2 verdict with personalization + explainer + audit trail
        if (stockData) {
          buildVerdictForStock(stockData, profileId).then(liveV2 => {
            if (!cancelled && liveV2) {
              setVerdictV2(liveV2)
            }
          }).catch(() => {
            // Live scoring failed — mock V2 stays (no degradation)
          })
        }
        // Early return — loading already set to false above
        setSelectedPillar(null)
        setSelectedFactorId(null)
        return
      } else {
        // Non-demo: resolve via CMOTS API + live scoring
        const resolved = await resolveStock(symbol)
        if (cancelled || !resolved) {
          if (!cancelled) {
            setStock(null)
            setVerdict(null)
            setVerdictV2(null)
          }
          setIsLoading(false)
          return
        }

        // Build V2 verdict from live CMOTS data
        let liveVerdict: StockVerdictV2 | null = null
        try {
          liveVerdict = await buildVerdictForStock(resolved, profileId)
        } catch (err) {
          console.warn('Failed to build verdict for', symbol, err)
        }

        if (cancelled) return

        // Fetch news + events from BSE data (cache hits after qual scoring)
        let newsItems: NewsItem[] = []
        let events: UpcomingEvent[] = []
        try {
          ;[newsItems, events] = await Promise.all([
            buildNewsItems(symbol, resolved.name),
            buildUpcomingEvents(symbol),
          ])
        } catch {
          // News/events unavailable — proceed without
        }

        if (cancelled) return

        // Batch all state updates together to avoid partial-render crashes
        setStock(resolved)
        setVerdict(null)
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
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <ArrowLeft className="w-4 h-4" />
          Back
        </div>
        <div className="rounded-2xl bg-dark-800 border border-white/5 p-6">
          <SkeletonBlock className="w-48 h-8 mb-2" />
          <SkeletonBlock className="w-32 h-4 mb-6" />
          <div className="flex justify-center">
            <SkeletonBlock className="w-32 h-32 rounded-full" />
          </div>
        </div>
        <SkeletonBlock className="w-full h-32 rounded-2xl" />
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
  if (!verdict && !verdictV2) {
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
                        : verdict
                        ? `StockFox: ${stock.symbol} Score ${verdict.overallScore}/10 - ${verdict.verdict}`
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

          {/* 52W Range — hidden until live price API available */}
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
                      {!learningMode && <RedFlagScanner verdict={verdict} verdictV2={verdictV2} news={news} />}
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
      {!selectedPillar && (verdict || (verdictV2 && verdictV2.topSignals.length > 0)) && (
        <div data-spotlight="pros-cons">
          <ProsCons
            signals={verdict?.topSignals || verdictV2?.topSignals || []}
            concerns={verdict?.topConcerns || verdictV2?.topConcerns || []}
          />
        </div>
      )}

      {/* Red Flag Scanner moved into Risk pillar drill-down */}

      {/* ============== NEWS & EVENTS SECTION (V2) ============== */}
      {verdictV2 && verdictV2.newsEvents.length > 0 && !selectedPillar && (
        <div data-spotlight="news-section">
          <NewsEventSection events={verdictV2.newsEvents} />
        </div>
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
                : verdict
                ? `StockFox: ${stock.symbol} Score ${verdict.overallScore}/10 - ${verdict.verdict}`
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
                ? `STOCKFOX ANALYSIS REPORT\n========================\nStock: ${stock.name} (${stock.symbol})\nSector: ${stock.sector}\nDate: ${new Date().toLocaleDateString()}\n\nOVERALL: ${verdictV2.overallScore}/100 — ${verdictV2.overallLabel}\n\nPILLARS:\n${verdictV2.pillars.map(p => `${p.name}: ${p.score}/100 (${p.label})`).join('\n')}\n\n---\nGenerated by StockFox`
                : verdict
                ? `STOCKFOX ANALYSIS REPORT\n========================\nStock: ${stock.name} (${stock.symbol})\nSector: ${stock.sector}\nDate: ${new Date().toLocaleDateString()}\n\nSCORE: ${verdict.overallScore.toFixed(1)}/10\nVERDICT: ${verdict.verdict}\n\nKEY SIGNALS:\n${verdict.topSignals.map(s => `✓ ${s.title}: ${s.description}`).join('\n')}\n\nCONCERNS:\n${verdict.topConcerns.map(c => `⚠ ${c.title}: ${c.description}`).join('\n')}\n\nSEGMENT SCORES:\n${verdict.segments.map(s => `${s.name}: ${s.score.toFixed(1)}/10`).join('\n')}\n\n---\nGenerated by StockFox`
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

      {/* ============== FEATURE TOUR (first visit + demo mode) ============== */}
      <SpotlightTour
        spotlights={spotlights}
        isActive={showSpotlights}
        onEnd={() => {
          if (demoMode) toggleDemoMode()
          setHasSeenTour(true)
          try { localStorage.setItem('sf_tour_stock_analysis', 'seen') } catch {}
        }}
      />
    </div>
  )
}
