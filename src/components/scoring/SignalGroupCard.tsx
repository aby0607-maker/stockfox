import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import { SignalCard } from './SignalCard'
import { Tooltip } from '@/components/ui'
import { GROUP_TOOLTIPS } from '@/data/signalTooltips'
import type { SignalGroup } from '@/types'

interface SignalGroupCardProps {
  group: SignalGroup
  defaultExpanded?: boolean
}

const ROLE_BADGES: Record<string, { label: string; class: string; tooltip: string }> = {
  anchor: { label: 'ANCHOR', class: 'bg-primary-500/20 text-primary-400', tooltip: 'Anchor group — sets the ceiling and floor for this segment\'s score' },
  scored: { label: 'SCORED', class: 'bg-teal-500/20 text-teal-400', tooltip: 'Scored group — contributes to the weighted segment score' },
  red_flag_only: { label: 'RED FLAG', class: 'bg-destructive-500/20 text-destructive-400', tooltip: 'Red flag group — can only penalise, not boost the score' },
  narrative_only: { label: 'NARRATIVE', class: 'bg-neutral-500/20 text-neutral-400', tooltip: 'Narrative only — provides context but does not affect the score' },
  contextualiser: { label: 'CONTEXT', class: 'bg-neutral-500/20 text-neutral-400', tooltip: 'Context signal — informational, not scored' },
  gate: { label: 'HARD GATE', class: 'bg-destructive-500/20 text-destructive-400', tooltip: 'Hard gate — binary pass/fail check. A single failure suppresses the entire segment score' },
  modifier: { label: 'MODIFIER', class: 'bg-amber-500/20 text-amber-400', tooltip: 'India-specific modifier — adds or deducts up to ±10 points based on local market factors' },
  context: { label: 'CONTEXT', class: 'bg-neutral-500/20 text-neutral-400', tooltip: 'Context signal — informational, not scored' },
}

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
            {GROUP_TOOLTIPS[group.name] ? (
              <Tooltip content={GROUP_TOOLTIPS[group.name]} position="bottom" maxWidth={280}>
                <span className="text-sm font-medium text-white truncate cursor-help border-b border-dotted border-neutral-700">{group.name}</span>
              </Tooltip>
            ) : (
              <span className="text-sm font-medium text-white truncate">{group.name}</span>
            )}
            <Tooltip content={roleBadge.tooltip} position="bottom">
              <span className={cn('text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded cursor-help', roleBadge.class)}>
                {roleBadge.label}
              </span>
            </Tooltip>
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
