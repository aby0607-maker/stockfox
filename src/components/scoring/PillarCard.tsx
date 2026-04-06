import { motion } from 'framer-motion'
import { ChevronRight, BarChart3, Shield, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import { Tooltip } from '@/components/ui'
import type { PillarVerdict } from '@/types'

interface PillarCardProps {
  pillar: PillarVerdict
  onClick?: () => void
  delay?: number
  learningMode?: boolean
  pillarRevealed?: boolean  // true after all segments in this pillar have been rated
}

const PILLAR_ICONS = {
  quant: BarChart3,
  qual: Brain,
  risk: Shield,
} as const

const PILLAR_LABELS = {
  quant: 'Quant Score',
  qual: 'Qual Score',
  risk: 'Risk Score',
} as const

const PILLAR_DESCRIPTIONS = {
  quant: 'Numbers-driven analysis — financials, valuation, growth metrics',
  qual: 'Qualitative analysis — management, business quality, governance',
  risk: 'Aggregated risk flags across all pillars',
} as const

export function PillarCard({ pillar, onClick, delay = 0, learningMode, pillarRevealed }: PillarCardProps) {
  const band = getScoreBandV2(pillar.score)
  const Icon = PILLAR_ICONS[pillar.pillar] || BarChart3
  const label = PILLAR_LABELS[pillar.pillar] || pillar.name
  const hideScore = learningMode && !pillarRevealed

  const totalSegments = pillar.segments.length

  // Mini arc for score visualization
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const progress = hideScore ? 0 : Math.min(pillar.score / 100, 1)
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border p-4 transition-all text-left group',
        'bg-dark-800 hover:bg-dark-700/50',
        band.borderClass,
        'hover:shadow-lg'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            band.bgClass
          )}>
            <Icon className={cn('w-4 h-4', band.colorClass)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Tooltip content={PILLAR_DESCRIPTIONS[pillar.pillar] || ''} position="bottom">
                <span className="text-sm font-semibold text-white">{label}</span>
              </Tooltip>
              <span className="text-[10px] text-neutral-500">
                {totalSegments} {pillar.pillar === 'qual' ? 'factors' : 'segments'}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
      </div>

      {/* Score + Band */}
      <div className="flex items-center gap-4">
        {/* Mini score ring */}
        <div className="relative">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle
              cx="32" cy="32" r={radius}
              fill="none" stroke="#252532" strokeWidth="4"
            />
            <circle
              cx="32" cy="32" r={radius}
              fill="none"
              stroke={band.hexColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-lg font-bold', hideScore ? 'text-primary-400' : band.colorClass)}>
              {hideScore ? '?' : Math.round(pillar.score)}
            </span>
          </div>
        </div>

        {/* Band + Summary */}
        <div className="flex-1 min-w-0">
          {hideScore ? (
            <>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase mb-1 bg-primary-500/20 text-primary-400">
                RATE TO REVEAL
              </span>
              <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                Tap to rate segments and reveal this pillar's score
              </p>
            </>
          ) : (
            <>
              <span className={cn(
                'inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase mb-1',
                band.bgClass, band.colorClass
              )}>
                {band.shortLabel}
              </span>
              <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                {pillar.summary}
              </p>
            </>
          )}
        </div>
      </div>
    </motion.button>
  )
}
