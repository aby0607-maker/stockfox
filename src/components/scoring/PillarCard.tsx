import { motion } from 'framer-motion'
import { ChevronRight, BarChart3, Shield, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import type { PillarVerdict } from '@/types'

interface PillarCardProps {
  pillar: PillarVerdict
  onClick?: () => void
  delay?: number
}

const PILLAR_ICONS = {
  quant: BarChart3,
  qual: Brain,
  risk: Shield,
} as const

const PILLAR_LABELS = {
  quant: 'Quantitative',
  qual: 'Qualitative',
  risk: 'Risk',
} as const

export function PillarCard({ pillar, onClick, delay = 0 }: PillarCardProps) {
  const band = getScoreBandV2(pillar.score)
  const Icon = PILLAR_ICONS[pillar.pillar] || BarChart3
  const label = PILLAR_LABELS[pillar.pillar] || pillar.name

  const scoredSegments = pillar.segments.filter(s => s.scoringType === 'scored')
  const contextSegments = pillar.segments.filter(s => s.scoringType === 'context')

  // Mini arc for score visualization
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(pillar.score / 100, 1)
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
            <span className="text-sm font-semibold text-white block">{label}</span>
            <span className="text-[10px] text-neutral-500">
              {scoredSegments.length} scored{contextSegments.length > 0 ? ` + ${contextSegments.length} context` : ''}
            </span>
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
            <span className={cn('text-lg font-bold', band.colorClass)}>
              {Math.round(pillar.score)}
            </span>
          </div>
        </div>

        {/* Band + Summary */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            'inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase mb-1',
            band.bgClass, band.colorClass
          )}>
            {band.shortLabel}
          </span>
          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {pillar.summary}
          </p>
        </div>
      </div>
    </motion.button>
  )
}
