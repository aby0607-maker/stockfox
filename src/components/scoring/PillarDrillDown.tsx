import { motion } from 'framer-motion'
import { ArrowLeft, ChevronRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import type { PillarVerdict, SegmentVerdictV2 } from '@/types'

interface PillarDrillDownProps {
  pillar: PillarVerdict
  onBack: () => void
  onSegmentClick?: (segmentId: string) => void
}

export function PillarDrillDown({ pillar, onBack, onSegmentClick }: PillarDrillDownProps) {
  const band = getScoreBandV2(pillar.score)
  const scoredSegments = pillar.segments.filter(s => s.scoringType === 'scored')
  const contextSegments = pillar.segments.filter(s => s.scoringType === 'context')

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
            <span className={cn('text-lg font-bold', band.colorClass)}>
              {Math.round(pillar.score)}/100
            </span>
            <span className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
              band.bgClass, band.colorClass
            )}>
              {band.shortLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-neutral-400 leading-relaxed">
        {pillar.summary}
      </p>

      {/* Scored Segments */}
      {scoredSegments.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Scored {pillar.pillar === 'qual' ? 'Factors' : 'Segments'}
          </span>
          {scoredSegments.map((segment) => (
            <SegmentRow
              key={segment.id}
              segment={segment}
              onClick={() => onSegmentClick?.(segment.id)}
            />
          ))}
        </div>
      )}

      {/* Context Segments */}
      {contextSegments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Context (Unscored)
            </span>
            <Info className="w-3 h-3 text-neutral-600" />
          </div>
          {contextSegments.map((segment) => (
            <SegmentRow
              key={segment.id}
              segment={segment}
              isContext
              onClick={() => onSegmentClick?.(segment.id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function SegmentRow({
  segment,
  isContext = false,
  onClick,
}: {
  segment: SegmentVerdictV2
  isContext?: boolean
  onClick?: () => void
}) {
  const band = segment.score != null ? getScoreBandV2(segment.score, segment.isSuppressed) : null
  return (
    <div className="rounded-xl border border-white/5 bg-dark-800 overflow-hidden">
      <button
        onClick={onClick}
        className="w-full p-3 text-left hover:bg-dark-700/50 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Status indicator */}
            <div className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              segment.isSuppressed ? 'bg-destructive-500' :
              segment.status === 'positive' ? 'bg-success-500' :
              segment.status === 'negative' ? 'bg-destructive-500' :
              'bg-neutral-500'
            )} />

            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-white block truncate">
                {segment.name}
              </span>
              {segment.quickInsight && (
                <span className="text-[10px] text-neutral-500 block truncate mt-0.5">
                  {segment.quickInsight}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Score or Context badge */}
            {isContext ? (
              <span className="px-2 py-0.5 rounded text-[10px] text-neutral-500 bg-dark-700">
                CONTEXT
              </span>
            ) : segment.isSuppressed ? (
              <span className="px-2 py-0.5 rounded text-[10px] text-destructive-400 bg-destructive-500/20 font-semibold">
                RED FLAG
              </span>
            ) : band ? (
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold', band.colorClass)}>
                  {Math.round(segment.score!)}
                </span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                  band.bgClass, band.colorClass
                )}>
                  {segment.label || band.shortLabel}
                </span>
              </div>
            ) : null}

            <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
          </div>
        </div>

        {/* Score bar for scored segments */}
        {!isContext && segment.score != null && !segment.isSuppressed && (
          <div className="mt-2 h-1.5 bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(segment.score, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: band?.hexColor }}
            />
          </div>
        )}
      </button>

      {/* Red flag reason (if suppressed) */}
      {segment.isSuppressed && segment.suppressionReason && (
        <div className="px-3 pb-3">
          <div className="p-2 rounded-lg bg-destructive-500/10 border border-destructive-500/20">
            <p className="text-xs text-destructive-400">{segment.suppressionReason}</p>
          </div>
        </div>
      )}
    </div>
  )
}
