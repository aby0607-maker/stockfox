/**
 * RatingReveal — Animated score reveal + accuracy badge + "Show Your Work" explainer.
 *
 * After the user guesses, this component:
 * 1. Animates the system score counter
 * 2. Shows accuracy badge (Match / Close / Off Target)
 * 3. Explains WHY the system scored differently (the learning payoff)
 * 4. Shows the segment's signal groups for deeper drill-down
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import { getAccuracy, RATING_BANDS, type RatingBand, type PreviewMetric } from '@/data/learningMetrics'
import type { SegmentVerdictV2 } from '@/types'

interface RatingRevealProps {
  segment: SegmentVerdictV2
  userBand: RatingBand
  previewMetrics: PreviewMetric[]
  metrics: Record<string, number | null>
}

export function RatingReveal({ segment, userBand, previewMetrics, metrics }: RatingRevealProps) {
  const [showWork, setShowWork] = useState(false)
  const score = segment.score ?? 0
  const band = getScoreBandV2(score)
  const accuracy = getAccuracy(userBand, score)
  const userBandDef = RATING_BANDS.find(b => b.band === userBand)!

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-dark-800/80 backdrop-blur-xl border border-white/10 overflow-hidden"
    >
      {/* Accuracy banner */}
      <div className={cn(
        'px-4 py-2 flex items-center gap-2',
        accuracy.result === 'match' ? 'bg-success-500/15' :
        accuracy.result === 'close' ? 'bg-teal-500/15' :
        'bg-warning-500/15',
      )}>
        <span className="text-lg">{accuracy.emoji}</span>
        <span className={cn('text-xs font-bold uppercase tracking-wide', accuracy.color)}>{accuracy.label}</span>
      </div>

      <div className="p-4">
        {/* Score comparison */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <p className="text-[10px] text-neutral-500 uppercase mb-1">You Guessed</p>
            <span className={cn('text-sm font-semibold', userBandDef.color)}>
              {userBandDef.emoji} {userBandDef.label}
            </span>
            <p className="text-[10px] text-neutral-600">{userBandDef.range[0]}–{userBandDef.range[1]}</p>
          </div>

          <div className="w-px h-10 bg-white/10" />

          <div className="text-center flex-1">
            <p className="text-[10px] text-neutral-500 uppercase mb-1">System Score</p>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={cn('text-xl font-bold', band.colorClass)}
            >
              {score}
            </motion.span>
            <span className="text-[10px] text-neutral-500">/100</span>
            <p className={cn('text-[10px] font-medium', band.colorClass)}>{band.label}</p>
          </div>
        </div>

        {/* Interpretation — the explanation */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-3 p-3 rounded-lg bg-dark-700/50 border border-white/5"
        >
          <p className="text-[10px] text-primary-400 uppercase font-semibold mb-1">Why this score?</p>
          <p className="text-xs text-neutral-300">{segment.interpretation}</p>
        </motion.div>

        {/* Metric hints — revealed after guess */}
        {previewMetrics.filter(m => m.hint && metrics[m.key] != null).length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-3"
          >
            <p className="text-[10px] text-neutral-600 uppercase font-semibold mb-1">What the numbers mean</p>
            <div className="space-y-1">
              {previewMetrics.filter(m => m.hint && metrics[m.key] != null).map(m => (
                <div key={m.key} className="text-[10px] text-neutral-500">
                  <span className="text-neutral-400 font-medium">{m.label}:</span> {m.hint}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Show Your Work toggle */}
        {segment.signalGroups && segment.signalGroups.length > 0 && (
          <button
            onClick={() => setShowWork(!showWork)}
            className="w-full flex items-center gap-2 py-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            {showWork ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span className="font-medium">Show how the score was built</span>
            <span className="text-[10px] text-neutral-600">({segment.signalGroups.length} signal groups)</span>
          </button>
        )}

        {showWork && segment.signalGroups && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden mt-2 space-y-2"
          >
            {/* Score composition table */}
            <div className="rounded-lg bg-dark-900/50 p-3 text-[10px] space-y-1">
              {segment.signalGroups
                .filter(g => g.role !== 'context' && g.score !== undefined)
                .map(g => (
                  <div key={g.id} className="flex items-center justify-between">
                    <span className="text-neutral-400">{g.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-300 tabular-nums font-medium">{Math.round(g.score!)}</span>
                      {g.weight != null && (
                        <span className="text-neutral-600">× {Math.round(g.weight * 100)}%</span>
                      )}
                    </div>
                  </div>
                ))}
              {/* Gates summary */}
              {segment.signalGroups.filter(g => g.role === 'gate').map(g => {
                const passed = g.signals.filter(s => s.gatePassed).length
                const total = g.signals.length
                return (
                  <div key={g.id} className="flex items-center justify-between text-neutral-400">
                    <span>{g.name}</span>
                    <span className={passed === total ? 'text-success-400' : 'text-warning-400'}>
                      {passed}/{total} passed
                    </span>
                  </div>
                )
              })}
              {/* Modifiers */}
              {segment.signalGroups.filter(g => g.role === 'modifier').map(g => {
                const active = g.signals.filter(s => s.modifierActive)
                return active.length > 0 ? (
                  <div key={g.id} className="text-warning-400">
                    Modifiers: {active.map(s => `${s.name} (${s.modifierPoints! > 0 ? '+' : ''}${s.modifierPoints})`).join(', ')}
                  </div>
                ) : (
                  <div key={g.id} className="text-neutral-600">No modifiers active</div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
