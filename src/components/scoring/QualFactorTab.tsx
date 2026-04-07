import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import { AutoTooltipText } from '@/components/ui'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SEGMENT_TOOLTIPS } from '@/data/signalTooltips'
import { SignalGroupCard } from './SignalGroupCard'
import { RedFlagBanner } from './RedFlagBanner'
import { ConfidenceIndicator } from './ConfidenceIndicator'
import type { SegmentVerdictV2 } from '@/types'

interface QualFactorTabProps {
  factor: SegmentVerdictV2
  onBack: () => void
}

export function QualFactorTab({ factor, onBack }: QualFactorTabProps) {
  const band = factor.score != null
    ? getScoreBandV2(factor.score, factor.isSuppressed)
    : null

  const redFlags = factor.redFlags || []
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-white">{factor.name}</h3>
            <InfoTooltip
              content={SEGMENT_TOOLTIPS[factor.id] || `${factor.name} — qualitative assessment based on ${factor.signalGroups?.length || 0} signal groups.`}
              position="bottom"
            />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {factor.isSuppressed ? (
              <span className="flex items-center gap-1 text-sm font-bold text-destructive-400">
                RED FLAG
                <InfoTooltip content="A critical issue was detected that suppresses this factor's score entirely. Check the red flag details below." size="sm" />
              </span>
            ) : band && factor.score != null ? (
              <>
                <span className={cn('text-lg font-bold', band.colorClass)}>
                  {Math.round(factor.score)}/100
                </span>
                <span className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                  band.bgClass, band.colorClass
                )}>
                  {factor.label || band.shortLabel}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Layer 1: Red Flag Banner (if any hard overrides) */}
      {redFlags.length > 0 && (
        <RedFlagBanner redFlags={redFlags} />
      )}

      {/* 1-line verdict */}
      {factor.interpretation && (
        <AutoTooltipText
          text={factor.interpretation}
          className="text-sm text-neutral-400 leading-relaxed block"
        />
      )}

      {/* Score justification */}
      {factor.scoreJustification && (
        <div className="p-3 rounded-xl bg-dark-700/50 border border-white/5">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">
            Score Justification
          </span>
          <AutoTooltipText
            text={factor.scoreJustification}
            className="text-xs text-neutral-300 leading-relaxed block"
          />
        </div>
      )}

      {/* Confidence Indicator */}
      {factor.confidenceIndicator && (
        <ConfidenceIndicator indicator={factor.confidenceIndicator} />
      )}

      {/* Layer 2: Signal Groups */}
      {factor.signalGroups && factor.signalGroups.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Signal Groups
          </span>
          {factor.signalGroups.map((group) => (
            <SignalGroupCard
              key={group.id}
              group={group}
              defaultExpanded={false}
            />
          ))}
        </div>
      )}

      {/* Conviction signals */}
      {factor.convictionSignals && factor.convictionSignals.length > 0 && (
        <div className="p-3 rounded-xl bg-success-500/5 border border-success-500/20">
          <span className="text-[10px] text-success-400 font-semibold uppercase tracking-wider block mb-2">
            Conviction Signals
          </span>
          <div className="space-y-1.5">
            {factor.convictionSignals.map((signal, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-success-400 text-xs mt-0.5">✓</span>
                <span className="text-xs text-neutral-300">{signal}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
