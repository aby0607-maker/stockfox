import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import { Tooltip, AutoTooltipText } from '@/components/ui'
import { SEGMENT_TOOLTIPS } from '@/data/signalTooltips'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SEGMENT_PREVIEW_METRICS, type RatingBand } from '@/data/learningMetrics'
import { SegmentRatingCard } from '@/components/learning/SegmentRatingCard'
import { RatingReveal } from '@/components/learning/RatingReveal'
import type { PillarVerdict } from '@/types'

interface LearningRating {
  segmentId: string
  segmentName?: string
  userBand: RatingBand
  systemScore: number
  revealed: boolean
  accuracy: 'match' | 'close' | 'miss'
}

interface PillarDrillDownProps {
  pillar: PillarVerdict
  onBack: () => void
  onSegmentClick?: (segmentId: string) => void
  learningMode?: boolean
  revealedSegments?: Set<string>
  // Learning mode callbacks
  learningRatings?: Record<string, LearningRating>
  onLearningRate?: (segmentId: string, segmentName: string, band: RatingBand, systemScore: number) => void
  resolvedMetrics?: Record<string, number | null>
}

export function PillarDrillDown({
  pillar, onBack, onSegmentClick,
  learningMode, revealedSegments,
  learningRatings, onLearningRate, resolvedMetrics,
}: PillarDrillDownProps) {
  const band = getScoreBandV2(pillar.score)
  const scoredSegs = pillar.segments.filter(s => s.scoringType === 'scored' && s.score !== undefined)
  const allRevealed = learningMode && scoredSegs.length > 0 && scoredSegs.every(s => revealedSegments?.has(s.id))
  const hidePillarScore = learningMode && !allRevealed

  // Track which segment is expanded for learning
  const [expandedLearningSegment, setExpandedLearningSegment] = useState<string | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{pillar.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {hidePillarScore ? (
              <>
                <span className="text-lg font-bold text-primary-400">?/100</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-primary-500/20 text-primary-400">
                  RATE TO REVEAL
                </span>
              </>
            ) : (
              <>
                <span className={cn('text-lg font-bold', band.colorClass)}>
                  {Math.round(pillar.score)}/100
                </span>
                <span className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                  band.bgClass, band.colorClass
                )}>
                  {band.shortLabel}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {hidePillarScore ? (
        <p className="text-sm text-primary-400/80 leading-relaxed">
          Tap each segment to see the raw metrics, then guess the score
        </p>
      ) : (
        <p className="text-sm text-neutral-400 leading-relaxed">
          {pillar.summary}
        </p>
      )}

      {/* Segments / Factors */}
      {pillar.segments.length > 0 && (
        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              {pillar.pillar === 'qual' ? 'Factors' : 'Segments'}
            </span>
            {!learningMode && (
              <p className="text-[10px] text-neutral-600 mt-0.5">
                {pillar.pillar === 'qual'
                  ? 'Each factor scores management, business quality, and governance signals'
                  : pillar.pillar === 'quant'
                    ? 'Each segment scores a quantitative dimension — tap to see signals'
                    : 'Risk dimensions aggregated from red flags across Quant and Qual'}
              </p>
            )}
          </div>
          {pillar.segments.map((segment) => {
            const isHidden = learningMode && !revealedSegments?.has(segment.id)
            const isRevealed = learningMode && revealedSegments?.has(segment.id)
            const isExpanded = expandedLearningSegment === segment.id
            const rating = learningRatings?.[segment.id]
            const isScored = segment.scoringType === 'scored' && segment.score !== undefined

            return (
              <div key={segment.id} className="rounded-xl border border-white/5 bg-dark-800 overflow-hidden">
                {/* Segment header row */}
                <button
                  onClick={() => {
                    if (learningMode && isScored && !isRevealed) {
                      // Toggle inline expansion for learning
                      setExpandedLearningSegment(isExpanded ? null : segment.id)
                    } else {
                      onSegmentClick?.(segment.id)
                    }
                  }}
                  className="w-full p-3 text-left hover:bg-dark-700/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        isHidden ? 'bg-primary-500' :
                        segment.isSuppressed ? 'bg-destructive-500' :
                        segment.status === 'positive' ? 'bg-success-500' :
                        segment.status === 'negative' ? 'bg-destructive-500' :
                        'bg-neutral-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        {SEGMENT_TOOLTIPS[segment.id] ? (
                          <Tooltip content={SEGMENT_TOOLTIPS[segment.id]} position="bottom" maxWidth={280}>
                            <span className="text-sm font-medium text-white block truncate cursor-help border-b border-dotted border-neutral-700">
                              {segment.name}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="text-sm font-medium text-white block truncate">
                            {segment.name}
                          </span>
                        )}
                        {!isHidden && segment.quickInsight && (
                          <AutoTooltipText
                            text={segment.quickInsight}
                            className="text-[10px] text-neutral-500 block truncate mt-0.5"
                          />
                        )}
                        {isHidden && !isExpanded && (
                          <span className="text-[10px] text-primary-400 mt-0.5 block">
                            Tap to see metrics & rate
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isHidden ? (
                        <>
                          <span className="text-sm font-bold text-primary-400">?</span>
                          {isExpanded
                            ? <ChevronDown className="w-4 h-4 text-primary-400" />
                            : <ChevronRight className="w-4 h-4 text-primary-400" />}
                        </>
                      ) : segment.isSuppressed ? (
                        <Tooltip content="Score suppressed — a hard gate failure has triggered." position="top">
                          <span className="px-2 py-0.5 rounded text-[10px] text-destructive-400 bg-destructive-500/20 font-semibold cursor-help">
                            RED FLAG
                          </span>
                        </Tooltip>
                      ) : segment.score != null ? (() => {
                        const segBand = getScoreBandV2(segment.score)
                        return (
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm font-bold', segBand.colorClass)}>
                              {Math.round(segment.score)}
                            </span>
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                              segBand.bgClass, segBand.colorClass
                            )}>
                              {segment.label || segBand.shortLabel}
                            </span>
                            <InfoTooltip
                              content={
                                segment.scoringType === 'context'
                                  ? `${segment.name} scores ${Math.round(segment.score)}/100. Informational — measured for comparison but not weighted into the pillar total.`
                                  : SEGMENT_TOOLTIPS[segment.id]
                                    ? `${segment.name}: ${Math.round(segment.score)}/100. ${SEGMENT_TOOLTIPS[segment.id]}`
                                    : `${segment.name} scores ${Math.round(segment.score)}/100. Tap to see the signals that drive this score.`
                              }
                              size="sm"
                              position="left"
                            />
                          </div>
                        )
                      })() : null}
                      {!isHidden && (
                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                      )}
                    </div>
                  </div>

                  {/* Score bar — only when score is visible */}
                  {!isHidden && segment.score != null && !segment.isSuppressed && (() => {
                    const segBand = getScoreBandV2(segment.score)
                    return (
                      <div className="mt-2 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(segment.score, 100)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: segBand.hexColor }}
                        />
                      </div>
                    )
                  })()}
                </button>

                {/* Suppression reason — hidden in learning mode */}
                {!isHidden && segment.isSuppressed && segment.suppressionReason && (
                  <div className="px-3 pb-3">
                    <div className="p-2 rounded-lg bg-destructive-500/10 border border-destructive-500/20">
                      <p className="text-xs text-destructive-400">{segment.suppressionReason}</p>
                    </div>
                  </div>
                )}

                {/* ══ LEARNING MODE: Inline expansion ══ */}
                <AnimatePresence>
                  {learningMode && isExpanded && isScored && !isRevealed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="p-3">
                        <SegmentRatingCard
                          segmentId={segment.id}
                          segmentName={segment.name}
                          metrics={resolvedMetrics || {}}
                          segment={segment}
                          onRate={(ratingBand: RatingBand) => {
                            onLearningRate?.(segment.id, segment.name, ratingBand, segment.score!)
                            setExpandedLearningSegment(null) // Collapse after rating
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ══ LEARNING MODE: Revealed result ══ */}
                <AnimatePresence>
                  {learningMode && isRevealed && rating && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="p-3">
                        <RatingReveal
                          segment={segment}
                          userBand={rating.userBand}
                          previewMetrics={SEGMENT_PREVIEW_METRICS[segment.id] || []}
                          metrics={resolvedMetrics || {}}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
