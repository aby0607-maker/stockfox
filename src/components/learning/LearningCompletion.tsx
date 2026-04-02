/**
 * LearningCompletion — Summary after rating enough segments.
 * Shows accuracy breakdown, blind spots, and gamification badge.
 */

import { motion } from 'framer-motion'
import { Trophy, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { getLearningBadge, RATING_BANDS, type RatingBand } from '@/data/learningMetrics'

interface LearningRating {
  segmentId: string
  segmentName?: string
  userBand: RatingBand
  systemScore: number
  revealed: boolean
  accuracy: 'match' | 'close' | 'miss'
}

interface LearningCompletionProps {
  ratings: Record<string, LearningRating>
  stockName: string
  onClose: () => void
}

export function LearningCompletion({ ratings, stockName, onClose }: LearningCompletionProps) {
  const revealed = Object.values(ratings).filter(r => r.revealed)
  const matches = revealed.filter(r => r.accuracy === 'match').length
  const close = revealed.filter(r => r.accuracy === 'close').length
  const misses = revealed.filter(r => r.accuracy === 'miss').length
  const total = revealed.length
  const badge = getLearningBadge(matches, total)

  // Blind spot analysis: where did user over/under-estimate?
  const overEstimated = revealed.filter(r => {
    const bandDef = RATING_BANDS.find(b => b.band === r.userBand)!
    const midpoint = (bandDef.range[0] + bandDef.range[1]) / 2
    return midpoint > r.systemScore + 15
  })
  const underEstimated = revealed.filter(r => {
    const bandDef = RATING_BANDS.find(b => b.band === r.userBand)!
    const midpoint = (bandDef.range[0] + bandDef.range[1]) / 2
    return midpoint < r.systemScore - 15
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-dark-800/80 backdrop-blur-xl border border-primary-500/30 overflow-hidden"
    >
      {/* Badge banner */}
      <div className="bg-gradient-to-r from-primary-500/20 via-primary-500/10 to-transparent p-4 text-center">
        <span className="text-3xl">{badge.emoji}</span>
        <h3 className="text-lg font-bold text-white mt-1">{badge.title}</h3>
        <p className="text-xs text-neutral-400 mt-1">{badge.description}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Accuracy breakdown */}
        <div>
          <p className="text-[10px] text-neutral-600 uppercase font-semibold mb-2">
            Your Analysis of {stockName}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-success-500/10">
              <Target className="w-4 h-4 text-success-400 mx-auto mb-1" />
              <span className="text-lg font-bold text-success-400">{matches}</span>
              <p className="text-[9px] text-neutral-500">Spot On</p>
            </div>
            <div className="p-2 rounded-lg bg-teal-500/10">
              <Trophy className="w-4 h-4 text-teal-400 mx-auto mb-1" />
              <span className="text-lg font-bold text-teal-400">{close}</span>
              <p className="text-[9px] text-neutral-500">Close</p>
            </div>
            <div className="p-2 rounded-lg bg-warning-500/10">
              <span className="text-lg font-bold text-warning-400">{misses}</span>
              <p className="text-[9px] text-neutral-500">Missed</p>
            </div>
          </div>
          <p className="text-xs text-neutral-500 text-center mt-2">
            {total} segments rated — {Math.round(((matches + close) / total) * 100)}% accuracy (match + close)
          </p>
        </div>

        {/* Blind spots */}
        {(overEstimated.length > 0 || underEstimated.length > 0) && (
          <div>
            <p className="text-[10px] text-neutral-600 uppercase font-semibold mb-2">Your Blind Spots</p>
            {overEstimated.length > 0 && (
              <div className="flex items-start gap-2 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-warning-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-neutral-400">
                  You tend to <span className="text-warning-400 font-medium">overestimate</span>:{' '}
                  {overEstimated.map(r => r.segmentName || r.segmentId).join(', ')}
                </span>
              </div>
            )}
            {underEstimated.length > 0 && (
              <div className="flex items-start gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-neutral-400">
                  You tend to <span className="text-teal-400 font-medium">underestimate</span>:{' '}
                  {underEstimated.map(r => r.segmentName || r.segmentId).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-primary-500/20 text-primary-400 text-sm font-medium hover:bg-primary-500/30 transition-colors"
        >
          Continue to Full Analysis
        </button>
      </div>
    </motion.div>
  )
}
