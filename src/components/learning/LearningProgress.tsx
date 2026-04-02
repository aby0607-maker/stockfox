/**
 * LearningProgress — Progress bar + running accuracy + gamification badge.
 * Shown below pillar cards when learning mode is active.
 */

import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLearningBadge, type RatingBand } from '@/data/learningMetrics'

interface LearningRating {
  segmentId: string
  userBand: RatingBand
  systemScore: number
  revealed: boolean
  accuracy: 'match' | 'close' | 'miss'
}

interface LearningProgressProps {
  ratings: Record<string, LearningRating>
  totalSegments: number
}

export function LearningProgress({ ratings, totalSegments }: LearningProgressProps) {
  const revealed = Object.values(ratings).filter(r => r.revealed)
  const matches = revealed.filter(r => r.accuracy === 'match').length
  const close = revealed.filter(r => r.accuracy === 'close').length
  const rated = revealed.length
  const progress = (rated / totalSegments) * 100
  const badge = getLearningBadge(matches, rated)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-primary-500/5 border border-primary-500/20 p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <GraduationCap className="w-4 h-4 text-primary-400" />
        <span className="text-xs font-semibold text-primary-400">Learning Mode Active</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-dark-600 rounded-full mb-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
          className="h-full bg-primary-500 rounded-full"
        />
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="text-neutral-400">
          {rated} of {totalSegments} segments rated
        </span>
        {rated > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-success-400">{matches} exact</span>
            {close > 0 && <span className="text-teal-400">{close} close</span>}
            <span className="text-neutral-600">|</span>
            <span className={cn('font-medium', badge.emoji === '🧠' ? 'text-success-400' : 'text-neutral-300')}>
              {badge.emoji} {badge.title}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
