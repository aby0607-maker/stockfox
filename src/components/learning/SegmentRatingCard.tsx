/**
 * SegmentRatingCard — Shows preview metrics + rating buttons for learning mode.
 *
 * Two data sources for cues (in priority order):
 * 1. resolvedMetrics — raw CMOTS values (ROE: 18%, D/E: 0.8x)
 * 2. segment.signalGroups — signal names, gate values, states extracted from the verdict
 *
 * The user sees the SAME evidence the scoring engine used, but must INTERPRET
 * whether it's good or bad. This is where learning happens.
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SEGMENT_PREVIEW_METRICS, RATING_BANDS, formatMetricValue, type RatingBand, type PreviewMetric } from '@/data/learningMetrics'
import type { SegmentVerdictV2 } from '@/types'

interface SegmentRatingCardProps {
  segmentId: string
  segmentName: string
  metrics: Record<string, number | null>
  segment?: SegmentVerdictV2  // Pass the full segment for signal-level cue extraction
  onRate: (band: RatingBand) => void
}

export function SegmentRatingCard({ segmentId, segmentName, metrics, segment, onRate }: SegmentRatingCardProps) {
  const previewMetrics = SEGMENT_PREVIEW_METRICS[segmentId] || []
  const availableMetrics = previewMetrics.filter(m => metrics[m.key] != null)

  // Fallback: extract cues from signal groups if no resolved metrics
  const signalCues: { label: string; value: string }[] = []
  if (availableMetrics.length === 0 && segment?.signalGroups) {
    for (const group of segment.signalGroups) {
      for (const sig of group.signals) {
        if (sig.state === 'not_applicable') continue
        // Gate signals: show the gate value
        if (sig.gateValue && sig.gateThreshold) {
          signalCues.push({ label: sig.name, value: `${sig.gateValue} (threshold: ${sig.gateThreshold})` })
        }
        // Scored signals with a numeric value: show score as a hint
        else if (sig.score != null) {
          signalCues.push({ label: sig.name, value: `${sig.score}/100` })
        }
        // Modifier signals: show points
        else if (sig.modifierPoints != null) {
          signalCues.push({
            label: sig.name,
            value: sig.modifierActive ? `${sig.modifierPoints > 0 ? '+' : ''}${sig.modifierPoints} pts (active)` : 'Not triggered',
          })
        }
        if (signalCues.length >= 5) break
      }
      if (signalCues.length >= 5) break
    }
  }

  const hasCues = availableMetrics.length > 0 || signalCues.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-dark-800/80 backdrop-blur-xl border border-primary-500/20 p-4"
    >
      {/* Segment header with hidden score */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">{segmentName}</h4>
        <span className="text-lg font-bold text-primary-400">?<span className="text-xs text-neutral-500">/100</span></span>
      </div>

      {/* Cues — the evidence for the user to interpret */}
      {hasCues ? (
        <div className="mb-4">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2">
            {availableMetrics.length > 0 ? 'Key metrics for this segment:' : 'Signals in this segment:'}
          </p>
          <div className="space-y-1.5">
            {availableMetrics.length > 0
              ? availableMetrics.map(m => (
                  <MetricRow key={m.key} metric={m} value={metrics[m.key]} />
                ))
              : signalCues.map((cue, i) => (
                  <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-dark-700/50">
                    <span className="text-xs text-neutral-400">{cue.label}</span>
                    <span className="text-xs font-medium text-white tabular-nums">{cue.value}</span>
                  </div>
                ))
            }
          </div>
        </div>
      ) : (
        <div className="mb-4 py-2">
          <p className="text-xs text-neutral-500">No metric data available for this segment yet.</p>
        </div>
      )}

      {/* Rating buttons */}
      <div>
        <p className="text-[10px] text-neutral-500 mb-2">Based on these numbers, how would you rate this segment?</p>
        <div className="flex gap-1.5">
          {RATING_BANDS.map(({ band, label, emoji, color }) => (
            <button
              key={band}
              onClick={() => onRate(band)}
              className={cn(
                'flex-1 py-2 px-1 rounded-lg border border-white/10 text-center transition-all',
                'hover:border-primary-500/40 hover:bg-primary-500/10 active:scale-95',
              )}
            >
              <span className="text-sm">{emoji}</span>
              <span className={cn('block text-[9px] font-medium mt-0.5', color)}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function MetricRow({ metric, value }: { metric: PreviewMetric; value: number | null }) {
  return (
    <div className="flex items-center justify-between py-1 px-2 rounded bg-dark-700/50">
      <span className="text-xs text-neutral-400">{metric.label}</span>
      <span className="text-xs font-medium text-white tabular-nums">
        {formatMetricValue(value, metric)}
      </span>
    </div>
  )
}
