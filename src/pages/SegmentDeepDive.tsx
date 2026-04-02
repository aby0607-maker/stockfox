import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { getVerdictV2 } from '@/data/verdictsV2'
import { buildVerdictForStock } from '@/services/verdictService'
import { resolveStock } from '@/services/stockService'
import { SignalGroupCard } from '@/components/scoring/SignalGroupCard'
import { Skeleton, Tooltip, AutoTooltipText } from '@/components/ui'
import { SEGMENT_TOOLTIPS } from '@/data/signalTooltips'
import { DemoModeToggle } from '@/components/demo'
import type { SegmentVerdictV2, ConfidenceIndicator } from '@/types'

// ============== CONFIDENCE INDICATOR ==============
function ConfidenceDisplay({ indicator }: { indicator: ConfidenceIndicator }) {
  const stateColors: Record<string, string> = {
    full: 'text-neutral-500',
    partial: 'text-amber-400',
    limited_history: 'text-amber-400',
    suppressed: 'text-destructive-400',
    cmots_gap: 'text-amber-400',
  }
  const color = stateColors[indicator.state] || 'text-neutral-500'

  return (
    <div className={cn('flex items-center gap-2 mt-2 text-[11px]', color)}>
      <div className="flex items-center gap-1">
        <div className={cn(
          'w-1.5 h-1.5 rounded-full',
          indicator.state === 'full' ? 'bg-neutral-500' :
          indicator.state === 'suppressed' ? 'bg-destructive-500' : 'bg-amber-500'
        )} />
        <span>{indicator.signalsComputed} of {indicator.signalsTotal} signals</span>
      </div>
      {indicator.dataRange && (
        <span className="text-neutral-600">|</span>
      )}
      {indicator.dataRange && (
        <span className="text-neutral-500">{indicator.dataRange}</span>
      )}
      {indicator.state === 'limited_history' && (
        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-medium">
          Limited history
        </span>
      )}
    </div>
  )
}

export function SegmentDeepDive() {
  const { ticker, segmentId } = useParams<{ ticker: string; segmentId: string }>()
  const navigate = useNavigate()
  const { currentProfile, demoMode, toggleDemoMode } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [segmentV2, setSegmentV2] = useState<SegmentVerdictV2 | null>(null)

  useEffect(() => {
    if (!ticker || !segmentId || !currentProfile) return

    let cancelled = false
    setIsLoading(true)
    setSegmentV2(null)

    async function loadSegment() {
      // 1. Try demo stock (sync, instant)
      const demoVerdict = getVerdictV2(ticker!, currentProfile!.id)

      if (demoVerdict) {
        if (cancelled) return
        for (const pillar of demoVerdict.pillars) {
          const found = pillar.segments.find(s => s.id === segmentId)
          if (found) { setSegmentV2(found); break }
        }
        setIsLoading(false)
        return
      }

      // 2. Non-demo stock — resolve via CMOTS and build V2 verdict
      try {
        const resolved = await resolveStock(ticker!)
        if (cancelled || !resolved) {
          if (!cancelled) setIsLoading(false)
          return
        }
        const liveVerdict = await buildVerdictForStock(resolved, currentProfile!.id)
        if (cancelled) return

        for (const pillar of liveVerdict.pillars) {
          const found = pillar.segments.find(s => s.id === segmentId)
          if (found) { setSegmentV2(found); break }
        }
      } catch (err) {
        console.warn('[SegmentDeepDive] Failed to load segment for', ticker, err)
      }

      if (!cancelled) setIsLoading(false)
    }

    loadSegment()
    return () => { cancelled = true }
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
  if (!segmentV2) {
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

  // V2 segment rendering
  const v2Band = segmentV2.score != null
      ? (segmentV2.score >= 80 ? 'text-success-400' : segmentV2.score >= 60 ? 'text-teal-400' : segmentV2.score >= 40 ? 'text-warning-400' : 'text-destructive-400')
      : 'text-neutral-400'

    return (
      <div className="space-y-4 animate-fade-in">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between"
        >
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Analysis
          </button>
          <DemoModeToggle isEnabled={demoMode} onToggle={toggleDemoMode} />
        </motion.div>

        {/* V2 Segment Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-800/60 backdrop-blur-sm rounded-2xl border border-white/5 p-5"
        >
          <div className="flex items-start gap-4">
            {segmentV2.score != null && (
              <div className="flex-shrink-0 text-center">
                <span className={cn('text-3xl font-bold', v2Band)}>
                  {Math.round(segmentV2.score)}
                </span>
                <span className="text-sm text-neutral-500 block">/100</span>
              </div>
            )}
            <div className="flex-1">
              {SEGMENT_TOOLTIPS[segmentV2.id] ? (
                <Tooltip content={SEGMENT_TOOLTIPS[segmentV2.id]} position="bottom" maxWidth={300}>
                  <h1 className="text-xl font-bold text-white cursor-help border-b border-dotted border-neutral-700 inline-block">{segmentV2.name}</h1>
                </Tooltip>
              ) : (
                <h1 className="text-xl font-bold text-white">{segmentV2.name}</h1>
              )}
              {segmentV2.scoringType === 'context' && (
                <Tooltip content="This segment provides market context but is not scored — it does not affect the pillar or overall score" position="bottom">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] text-neutral-500 bg-dark-700 mt-1 cursor-help">
                    CONTEXT — Not Scored
                  </span>
                </Tooltip>
              )}
              <AutoTooltipText
                text={segmentV2.interpretation}
                className="text-sm text-neutral-300 leading-relaxed mt-2 block"
              />
              {segmentV2.quickInsight && (
                <AutoTooltipText
                  text={segmentV2.quickInsight}
                  className="text-xs text-neutral-500 mt-1 block"
                />
              )}

              {/* Confidence Indicator */}
              {segmentV2.confidenceIndicator && (
                <ConfidenceDisplay indicator={segmentV2.confidenceIndicator} />
              )}
            </div>
          </div>

          {/* Suppression warning */}
          {segmentV2.isSuppressed && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-destructive-500/10 border border-destructive-500/20">
              <span className="text-xs text-destructive-400 font-medium">
                Score suppressed — {segmentV2.suppressionReason || 'a hard override has triggered'}. Do not rely on this score without reviewing the flag.
              </span>
            </div>
          )}
        </motion.div>

        {/* Signal Groups (Layer 4) */}
        {segmentV2.signalGroups && segmentV2.signalGroups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div className="px-1">
              <h3 className="text-sm font-semibold text-white">Signal Architecture</h3>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {segmentV2.pillar === 'qual'
                  ? 'Qualitative signals grouped by theme — gates, anchors, and modifiers shape the final score'
                  : 'Quantitative signals — hard gates filter first, then scored clusters and India-specific modifiers'}
              </p>
            </div>
            {segmentV2.signalGroups.map((group) => (
              <SignalGroupCard key={group.id} group={group} defaultExpanded={group.role === 'gate'} />
            ))}
          </motion.div>
        )}

        {/* V2 Metrics (if any alongside signals) */}
        {segmentV2.metrics && segmentV2.metrics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-white px-1">Metrics</h3>
            {segmentV2.metrics.map((metric) => (
              <div
                key={metric.id}
                className="bg-dark-800/60 backdrop-blur-sm rounded-xl border border-white/5 p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{metric.name}</span>
                  <span className={cn('text-sm font-bold', v2Band)}>
                    {metric.displayValue}
                  </span>
                </div>
                {metric.tooltipSimple && (
                  <p className="text-xs text-neutral-400">{metric.tooltipSimple}</p>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    )
}
