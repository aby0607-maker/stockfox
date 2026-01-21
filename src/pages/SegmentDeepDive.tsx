import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, TrendingUp, TrendingDown, Minus, Trophy, Target, BarChart3, Eye, FileText, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { getStockBySymbol, getVerdictForStock } from '@/data'
import { ScoreRing } from '@/components/charts'
import { EnhancedMetricCard } from '@/components/analysis'
import { Skeleton } from '@/components/ui'
import { DemoModeToggle, SpotlightTour } from '@/components/demo'
import { getSpotlightsForLocation } from '@/data/featureSpotlights'
import type { SegmentScore, Metric } from '@/types'

// Get score color for dark mode
function getScoreColorClass(score: number): string {
  if (score >= 8) return 'text-success-400'
  if (score >= 6) return 'text-teal-400'
  if (score >= 4) return 'text-warning-400'
  return 'text-destructive-400'
}

// ============== SEGMENT EVIDENCE PANEL ==============
function SegmentEvidencePanel({
  segment,
  profileName,
}: {
  segment: SegmentScore
  profileName: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const metricsWithCitations = segment.metrics?.filter(m => m.citation) || []
  const latestFiling = metricsWithCitations[0]?.citation

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.12 }}
      className="bg-dark-800/60 backdrop-blur-sm rounded-2xl border border-white/5 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-primary-400" />
        <span className="text-sm font-medium text-white">How We Scored {segment.name}</span>
      </div>

      {/* Score & Rank Justification */}
      {(segment.scoreJustification || segment.rankJustification) && (
        <div className="mb-3 space-y-2">
          {segment.scoreJustification && (
            <div className="p-2.5 rounded-lg bg-gradient-to-r from-primary-500/10 to-transparent border border-primary-500/15">
              <p className="text-[11px] text-neutral-300 leading-relaxed">{segment.scoreJustification}</p>
            </div>
          )}
          {segment.rankJustification && (
            <div className="p-2.5 rounded-lg bg-gradient-to-r from-info-500/10 to-transparent border border-info-500/15">
              <p className="text-[11px] text-neutral-300 leading-relaxed">{segment.rankJustification}</p>
            </div>
          )}
        </div>
      )}

      {/* 3-Layer Summary Grid */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {/* Level 1: Data Sources */}
        <div className="p-2.5 rounded-lg bg-dark-700/50 border border-white/5">
          <span className="text-neutral-500 block mb-1">L1: Data Sources</span>
          <span className="text-white font-medium block">
            {segment.metrics?.length || 0} metrics
          </span>
          <span className="text-neutral-400">
            {latestFiling?.source || 'Company Filings'}
          </span>
        </div>

        {/* Level 2: Methodology */}
        <div className="p-2.5 rounded-lg bg-dark-700/50 border border-white/5">
          <span className="text-neutral-500 block mb-1">L2: Methodology</span>
          <span className="text-white font-medium block">Weighted Avg</span>
          <span className="text-neutral-400">
            {segment.metrics?.slice(0, 2).map(m => m.name.split(' ')[0]).join(', ')}...
          </span>
        </div>

        {/* Level 3: Score Contribution */}
        <div className="p-2.5 rounded-lg bg-dark-700/50 border border-white/5">
          <span className="text-neutral-500 block mb-1">L3: Contribution</span>
          <span className="text-white font-medium block">
            {((segment.weight || 0.1) * 100).toFixed(0)}% weight
          </span>
          <span className="text-neutral-400">{profileName} profile</span>
        </div>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-3 w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
      >
        <span>{isExpanded ? 'Hide Details' : 'View Evidence Chain'}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pt-3 border-t border-white/5 space-y-3"
        >
          {/* Level 1 Detail */}
          <div className="p-3 rounded-lg bg-primary-500/5 border border-primary-500/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-primary-500/20 flex items-center justify-center">
                <span className="text-[10px] text-primary-400 font-bold">1</span>
              </div>
              <span className="text-xs font-medium text-white">Raw Data Source</span>
            </div>
            <div className="text-[11px] text-neutral-300 space-y-1">
              <p><span className="text-neutral-500">Source:</span> {latestFiling?.source || 'BSE/NSE Filings'}</p>
              <p><span className="text-neutral-500">Document:</span> {latestFiling?.document || 'Quarterly Results'}</p>
              <p><span className="text-neutral-500">Date:</span> {latestFiling?.date || 'Q3 FY25'}</p>
            </div>
          </div>

          {/* Level 2 Detail */}
          <div className="p-3 rounded-lg bg-info-500/5 border border-info-500/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-info-500/20 flex items-center justify-center">
                <span className="text-[10px] text-info-400 font-bold">2</span>
              </div>
              <span className="text-xs font-medium text-white">Calculation Method</span>
            </div>
            <div className="text-[11px] text-neutral-300 space-y-1">
              <p><span className="text-neutral-500">Metrics:</span> {segment.metrics?.map(m => m.name).join(', ')}</p>
              <p><span className="text-neutral-500">Benchmark:</span> Compared against sector averages</p>
              <p><span className="text-neutral-500">Status Logic:</span> Score ≥8 = Positive, ≥5 = Neutral, &lt;5 = Negative</p>
            </div>
          </div>

          {/* Level 3 Detail */}
          <div className="p-3 rounded-lg bg-success-500/5 border border-success-500/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-success-500/20 flex items-center justify-center">
                <span className="text-[10px] text-success-400 font-bold">3</span>
              </div>
              <span className="text-xs font-medium text-white">Score Contribution</span>
            </div>
            <div className="text-[11px] text-neutral-300 space-y-1">
              <p><span className="text-neutral-500">Weight:</span> {((segment.weight || 0.1) * 100).toFixed(0)}% of overall score</p>
              <p><span className="text-neutral-500">Sector Rank:</span> #{segment.sectorRank} of {segment.sectorTotal} peers</p>
              <p><span className="text-neutral-500">Impact:</span> Contributes {((segment.score * (segment.weight || 0.1)) / 10 * 100).toFixed(1)}% to your {profileName} score</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Get status colors for dark mode badges
function getStatusBadgeColors(status: string) {
  switch (status) {
    case 'positive':
      return 'bg-success-500/15 text-success-400 border-success-500/20'
    case 'negative':
      return 'bg-destructive-500/15 text-destructive-400 border-destructive-500/20'
    default:
      return 'bg-neutral-500/15 text-neutral-300 border-neutral-500/20'
  }
}

export function SegmentDeepDive() {
  const { ticker, segmentId } = useParams<{ ticker: string; segmentId: string }>()
  const navigate = useNavigate()
  const { currentProfile, analysisMode, demoMode, toggleDemoMode } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [segment, setSegment] = useState<SegmentScore | null>(null)
  const [stockName, setStockName] = useState('')

  const isDIY = analysisMode === 'diy'

  // Demo Mode spotlights
  const spotlights = useMemo(() => getSpotlightsForLocation('segment-deep-dive'), [])

  useEffect(() => {
    if (!ticker || !segmentId || !currentProfile) return

    setIsLoading(true)

    const timer = setTimeout(() => {
      const stock = getStockBySymbol(ticker)
      const verdict = getVerdictForStock(ticker, currentProfile.id)

      if (stock && verdict) {
        setStockName(stock.name)
        const foundSegment = verdict.segments.find(s => s.id === segmentId)
        setSegment(foundSegment || null)
      }

      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [ticker, segmentId, currentProfile])

  // Handle back navigation - go to stock page with segments section visible
  const handleBack = () => {
    navigate(`/stock/${ticker}?view=full#segments`)
  }

  if (!ticker || !segmentId || !currentProfile) return null

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Segments
        </button>

        <div className="bg-dark-800/60 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
          <Skeleton className="w-full h-24 bg-dark-600" />
        </div>
      </div>
    )
  }

  // Segment not found
  if (!segment) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Segments
        </button>
        <div className="bg-dark-800/60 backdrop-blur-sm rounded-2xl border border-white/5 p-6 text-center py-12">
          <h2 className="text-xl font-semibold text-white mb-2">Segment Not Found</h2>
          <p className="text-neutral-400">
            We couldn't find the "{segmentId}" segment for this stock.
          </p>
        </div>
      </div>
    )
  }

  const scoreDiff = segment.sectorAvg ? segment.score - segment.sectorAvg : 0
  const percentile = segment.sectorRank && segment.sectorTotal
    ? Math.round(((segment.sectorTotal - segment.sectorRank + 1) / segment.sectorTotal) * 100)
    : null

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back button + Demo Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Segments
        </button>

        {/* Demo Mode Toggle - Ankit only */}
        <DemoModeToggle isEnabled={demoMode} onToggle={toggleDemoMode} />
      </motion.div>

      {/* ============== SECTOR ANCHORING - DFY ONLY ============== */}
      {!isDIY && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-3 gap-3"
          data-spotlight="metric-benchmark"
        >
          {/* Sector Rank */}
          <div className="bg-dark-800/60 backdrop-blur-sm rounded-xl border border-white/5 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Trophy className={cn(
                'w-4 h-4',
                segment.sectorRank === 1 ? 'text-warning-400' : 'text-neutral-500'
              )} />
              <span className="text-xs text-neutral-500 uppercase tracking-wider">Sector Rank</span>
            </div>
            <div className="text-2xl font-bold text-white">
              #{segment.sectorRank || '-'}
              <span className="text-sm text-neutral-500 font-normal">/{segment.sectorTotal || '-'}</span>
            </div>
            {percentile && (
              <div className={cn(
                'text-xs mt-1',
                percentile >= 70 ? 'text-success-400' : percentile >= 40 ? 'text-neutral-400' : 'text-destructive-400'
              )}>
                Top {100 - percentile + 1}%
              </div>
            )}
          </div>

          {/* Sector Average */}
          <div className="bg-dark-800/60 backdrop-blur-sm rounded-xl border border-white/5 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Target className="w-4 h-4 text-neutral-500" />
              <span className="text-xs text-neutral-500 uppercase tracking-wider">Sector Avg</span>
            </div>
            <div className={cn('text-2xl font-bold', getScoreColorClass(segment.sectorAvg || 0))}>
              {segment.sectorAvg?.toFixed(1) || '-'}
              <span className="text-sm text-neutral-500 font-normal">/10</span>
            </div>
          </div>

          {/* vs Sector */}
          <div className="bg-dark-800/60 backdrop-blur-sm rounded-xl border border-white/5 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <BarChart3 className="w-4 h-4 text-neutral-500" />
              <span className="text-xs text-neutral-500 uppercase tracking-wider">vs Sector</span>
            </div>
            <div className={cn(
              'text-2xl font-bold flex items-center justify-center gap-1',
              scoreDiff > 0 ? 'text-success-400' : scoreDiff < 0 ? 'text-destructive-400' : 'text-neutral-400'
            )}>
              {scoreDiff > 0 ? (
                <>
                  <TrendingUp className="w-5 h-5" />
                  +{scoreDiff.toFixed(1)}
                </>
              ) : scoreDiff < 0 ? (
                <>
                  <TrendingDown className="w-5 h-5" />
                  {scoreDiff.toFixed(1)}
                </>
              ) : (
                <>
                  <Minus className="w-5 h-5" />
                  0
                </>
              )}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {scoreDiff > 0.5 ? 'Outperforming' : scoreDiff < -0.5 ? 'Underperforming' : 'At par'}
            </div>
          </div>
        </motion.div>
      )}

      {/* ============== DIY MODE HEADER ============== */}
      {isDIY && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-dark-800/60 backdrop-blur-sm rounded-xl border border-white/5 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <span className="text-xs text-teal-400 uppercase tracking-wider">DIY Analysis Mode</span>
              <p className="text-sm text-neutral-400 mt-0.5">
                Review raw metrics below and form your own assessment
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============== SEGMENT HEADER ============== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-dark-800/60 backdrop-blur-sm rounded-2xl border border-white/5 p-5"
        data-spotlight="segment-header"
      >
        <div className="flex items-start gap-5">
          {/* Score Ring - DFY Only */}
          {!isDIY && (
            <div className="flex-shrink-0">
              <ScoreRing
                score={segment.score}
                size={100}
                showLabel
                label={segment.name}
              />
            </div>
          )}

          {/* Segment Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-white">{segment.name}</h1>
              {/* Status Badge - DFY Only */}
              {!isDIY && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium border',
                  getStatusBadgeColors(segment.status)
                )}>
                  {segment.status.charAt(0).toUpperCase() + segment.status.slice(1)}
                </span>
              )}
            </div>

            {/* Interpretation - DFY Only */}
            {!isDIY && (
              <p className="text-sm text-neutral-300 leading-relaxed">{segment.interpretation}</p>
            )}

            {/* DIY Mode Description */}
            {isDIY && (
              <p className="text-sm text-neutral-400">
                Review the raw metrics and sector benchmarks below to form your own assessment of this segment.
              </p>
            )}

            {/* Quick Insight - DFY Only */}
            {!isDIY && segment.quickInsight && (
              <div className="mt-3 p-2.5 bg-primary-500/10 rounded-lg border border-primary-500/20">
                <span className="text-xs text-primary-300">{segment.quickInsight}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ============== EVIDENCE PANEL - How We Scored This Segment ============== */}
      {!isDIY && (
        <div data-spotlight="score-justification">
          <SegmentEvidencePanel
            segment={segment}
            profileName={currentProfile.investmentThesis}
          />
        </div>
      )}

      {/* ============== KEY METRICS ============== */}
      {segment.metrics && segment.metrics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-dark-800/60 backdrop-blur-sm rounded-2xl border border-white/5 p-5"
          data-spotlight="key-metrics"
        >
          <h2 className="text-base font-semibold text-white mb-4">Key Metrics</h2>
          <div className="space-y-3">
            {segment.metrics.map((metric: Metric, index: number) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.03 }}
              >
                <EnhancedMetricCard
                  metric={metric}
                  stockName={stockName}
                  hideStatus={isDIY}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ============== WHAT THIS MEANS - DFY ONLY ============== */}
      {!isDIY && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gradient-to-br from-primary-500/10 to-dark-800/60 backdrop-blur-sm rounded-2xl border border-primary-500/20 p-5"
          data-spotlight="metric-explainer"
        >
          <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
            <div className="p-1 rounded-lg bg-primary-500/20">
              <Info className="w-3.5 h-3.5 text-primary-400" />
            </div>
            What This Means for You
          </h3>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {getExplanationForSegment(segment, currentProfile.experienceLevel, stockName)}
          </p>
        </motion.div>
      )}

      {/* ============== NAVIGATION ============== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="flex gap-3"
      >
        <button
          onClick={handleBack}
          className="flex-1 text-center px-4 py-2.5 bg-dark-700/50 hover:bg-dark-600/50 text-white text-sm font-medium rounded-xl border border-white/10 hover:border-white/20 transition-all"
        >
          Back to Segments
        </button>
        <button
          onClick={() => navigate('/chat')}
          className="flex-1 text-center px-4 py-2.5 bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Ask AI About {segment.name}
        </button>
      </motion.div>

      {/* Spotlight Tour for Demo Mode */}
      <SpotlightTour
        spotlights={spotlights}
        isActive={demoMode}
        onEnd={toggleDemoMode}
      />
    </div>
  )
}

// Helper function to generate contextual explanations
function getExplanationForSegment(segment: SegmentScore, experienceLevel: string, stockName: string): string {
  const isBeginner = experienceLevel === 'beginner'
  const isPositive = segment.status === 'positive'
  const sectorComparison = segment.sectorAvg
    ? segment.score > segment.sectorAvg
      ? 'better than average for its sector'
      : segment.score < segment.sectorAvg
        ? 'below average for its sector'
        : 'in line with sector averages'
    : ''

  const baseExplanation = {
    profitability: isBeginner
      ? `${stockName}'s profitability tells us how well the company turns revenue into actual profit. ${isPositive ? 'This company is good at making money from its operations' : 'The company is struggling to convert sales into profit'}. ${sectorComparison ? `It's ${sectorComparison}.` : ''}`
      : `${stockName} shows ${isPositive ? 'strong' : 'weak'} operational efficiency. ${sectorComparison ? `Performance is ${sectorComparison}, indicating ${isPositive ? 'competitive advantage' : 'potential concerns'} in cost management and pricing power.` : ''}`,

    growth: isBeginner
      ? `Growth shows how fast the company is expanding. ${isPositive ? 'This company is growing faster than most' : 'Growth has been slower than expected'}. ${sectorComparison ? `Compared to similar companies, it's ${sectorComparison}.` : ''}`
      : `Revenue and earnings trajectory ${isPositive ? 'indicates strong expansion' : 'shows deceleration'}. ${sectorComparison ? `${sectorComparison.charAt(0).toUpperCase() + sectorComparison.slice(1)}, suggesting ${isPositive ? 'market share gains' : 'competitive pressure'}.` : ''}`,

    valuation: isBeginner
      ? `Valuation tells us if the stock price is expensive or cheap compared to what the company earns. ${isPositive ? 'The current price looks reasonable for what you get' : 'The stock might be overpriced right now'}. ${sectorComparison ? `It's ${sectorComparison}.` : ''}`
      : `Current multiples ${isPositive ? 'present an attractive entry point' : 'suggest premium pricing'}. ${sectorComparison ? `Trading ${sectorComparison}, ${isPositive ? 'offering margin of safety' : 'limiting upside potential'}.` : ''}`,

    default: isBeginner
      ? `This segment looks at ${segment.name.toLowerCase()} for ${stockName}. ${isPositive ? 'Things look good here' : 'There are some concerns'}. ${sectorComparison ? `Compared to other companies in the same industry, it's ${sectorComparison}.` : ''}`
      : `${segment.name} analysis for ${stockName} indicates ${isPositive ? 'favorable' : 'challenging'} conditions. ${sectorComparison ? `Positioning is ${sectorComparison}.` : ''}`,
  }

  return baseExplanation[segment.id as keyof typeof baseExplanation] || baseExplanation.default
}
