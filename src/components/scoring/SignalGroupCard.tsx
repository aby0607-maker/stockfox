import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import { SignalCard } from './SignalCard'
import type { SignalGroup } from '@/types'

interface SignalGroupCardProps {
  group: SignalGroup
  defaultExpanded?: boolean
}

const ROLE_BADGES = {
  anchor: { label: 'ANCHOR', class: 'bg-primary-500/20 text-primary-400' },
  scored: { label: 'SCORED', class: 'bg-teal-500/20 text-teal-400' },
  red_flag_only: { label: 'RED FLAG', class: 'bg-destructive-500/20 text-destructive-400' },
  narrative_only: { label: 'NARRATIVE', class: 'bg-neutral-500/20 text-neutral-400' },
  contextualiser: { label: 'CONTEXT', class: 'bg-neutral-500/20 text-neutral-400' },
} as const

export function SignalGroupCard({ group, defaultExpanded = false }: SignalGroupCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const band = group.score != null ? getScoreBandV2(group.score) : null
  const roleBadge = ROLE_BADGES[group.role]

  const applicableSignals = group.signals.filter(s => s.state !== 'not_applicable')
  const flaggedSignals = group.signals.filter(s => s.state === 'flag' || s.state === 'suppressed')

  return (
    <div className="rounded-xl border border-white/5 bg-dark-800 overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-dark-700/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium text-white truncate">{group.name}</span>
            <span className={cn('text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded', roleBadge.class)}>
              {roleBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Group score */}
            {band && group.score != null && (
              <div className="flex items-center gap-1.5">
                <span className={cn('text-sm font-bold', band.colorClass)}>
                  {Math.round(group.score)}
                </span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                  band.bgClass, band.colorClass
                )}>
                  {band.shortLabel}
                </span>
              </div>
            )}

            {/* Flag count */}
            {flaggedSignals.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive-500/20 text-destructive-400">
                {flaggedSignals.length} flag{flaggedSignals.length > 1 ? 's' : ''}
              </span>
            )}

            {/* Signal count */}
            <span className="text-[10px] text-neutral-600">
              {applicableSignals.length}/{group.signals.length}
            </span>

            <ChevronDown className={cn(
              'w-4 h-4 text-neutral-500 transition-transform',
              expanded && 'rotate-180'
            )} />
          </div>
        </div>

        {/* Mini progress bar for group score */}
        {group.score != null && (
          <div className="mt-2 h-1 bg-dark-600 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(group.score, 100)}%`,
                backgroundColor: band?.hexColor
              }}
            />
          </div>
        )}
      </button>

      {/* Expanded signal list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {group.signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
