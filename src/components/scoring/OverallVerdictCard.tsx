import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { getOverallVerdict, getScoreGlowV2 } from '@/lib/scoring'
import type { StockVerdictV2 } from '@/types'

interface OverallVerdictCardProps {
  verdict: StockVerdictV2
  profileName?: string
}

export function OverallVerdictCard({ verdict, profileName }: OverallVerdictCardProps) {
  const overall = getOverallVerdict(verdict.overallScore)
  const glowClass = getScoreGlowV2(verdict.overallScore)

  // Animated score counter
  const motionScore = useMotionValue(0)
  const displayScore = useTransform(motionScore, (v) => Math.round(v))

  useEffect(() => {
    animate(motionScore, verdict.overallScore, { duration: 1.2, ease: 'easeOut' })
  }, [verdict.overallScore, motionScore])

  // Score ring
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(verdict.overallScore / 100, 1)
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border overflow-hidden',
        overall.borderClass,
        overall.bgClass
      )}
    >
      <div className="p-5">
        <div className="flex items-center gap-5">
          {/* Score Gauge */}
          <div className="relative flex-shrink-0">
            <motion.svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className={glowClass}
            >
              <circle
                cx="60" cy="60" r={radius}
                fill="none" stroke="#252532" strokeWidth="6"
              />
              <motion.circle
                cx="60" cy="60" r={radius}
                fill="none"
                stroke={overall.colorClass.includes('success') ? '#00C489' :
                        overall.colorClass.includes('teal') ? '#69E2B0' :
                        overall.colorClass.includes('warning') ? '#FC6200' : '#f87171'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            </motion.svg>
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.span
                className={cn('text-3xl font-bold', overall.colorClass)}
              >
                {displayScore}
              </motion.span>
              <span className="text-xs text-neutral-500">/100</span>
            </motion.div>
          </div>

          {/* Verdict Info */}
          <div className="flex-1">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={cn(
                'inline-block px-3 py-1 rounded-full text-sm font-semibold',
                overall.verdict === 'strong_buy' && 'bg-gradient-to-r from-success-500 to-success-600 text-white shadow-glow-green',
                overall.verdict === 'buy' && 'bg-success-500/20 border border-success-500/40 text-success-400',
                overall.verdict === 'hold' && 'bg-warning-500/20 border border-warning-500/40 text-warning-400',
                overall.verdict === 'sell' && 'bg-destructive-500/20 border border-destructive-500/40 text-destructive-400',
              )}
            >
              {overall.label}
            </motion.span>

            <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
              {verdict.overallSummary}
            </p>

            {profileName && (
              <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                <span className="px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 font-medium">
                  {profileName.toUpperCase()} Profile
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
