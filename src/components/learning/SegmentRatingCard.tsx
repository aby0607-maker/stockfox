/**
 * SegmentRatingCard — Shows preview metrics + rating buttons for learning mode.
 *
 * The user sees raw metric values (the same evidence the scoring engine used)
 * and must INTERPRET whether the segment is Strong, Good, Mixed, Weak, or Very Weak.
 * This is where learning happens — "Is 4.2x interest coverage good?"
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SEGMENT_PREVIEW_METRICS, RATING_BANDS, formatMetricValue, type RatingBand, type PreviewMetric } from '@/data/learningMetrics'

interface SegmentRatingCardProps {
  segmentId: string
  segmentName: string
  metrics: Record<string, number | null>  // resolvedMetrics data
  onRate: (band: RatingBand) => void
}

export function SegmentRatingCard({ segmentId, segmentName, metrics, onRate }: SegmentRatingCardProps) {
  const previewMetrics = SEGMENT_PREVIEW_METRICS[segmentId] || []
  const availableMetrics = previewMetrics.filter(m => metrics[m.key] != null)

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

      {/* Preview metrics — the evidence */}
      {availableMetrics.length > 0 ? (
        <div className="mb-4">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-2">Key metrics for this segment:</p>
          <div className="space-y-1.5">
            {availableMetrics.map(m => (
              <MetricRow key={m.key} metric={m} value={metrics[m.key]} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 py-3 text-center">
          <p className="text-xs text-neutral-500">Limited data available — rate based on your knowledge of this company</p>
        </div>
      )}

      {/* Rating buttons */}
      <div>
        <p className="text-[10px] text-neutral-500 mb-2">What do you think? Rate this segment:</p>
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
