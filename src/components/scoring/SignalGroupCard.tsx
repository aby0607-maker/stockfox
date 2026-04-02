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
  const naSignals = group.signals.filter(s => s.state === 'not_applicable')
  const flaggedSignals = group.signals.filter(s => s.state === 'flag' || s.state === 'suppressed')
  const allNA = applicableSignals.length === 0 && group.signals.length > 0

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      allNA ? 'border-white/3 bg-dark-800/50' : 'border-white/5 bg-dark-800'
    )}>
      {/* Group header */}
      <button
        onClick={() => !allNA && setExpanded(!expanded)}
        className={cn(
          'w-full p-3 text-left transition-colors',
          allNA ? 'cursor-default' : 'hover:bg-dark-700/30'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {GROUP_TOOLTIPS[group.name] ? (
              <Tooltip content={GROUP_TOOLTIPS[group.name]} position="bottom" maxWidth={280}>
                <span className={cn('text-sm font-medium truncate cursor-help border-b border-dotted border-neutral-700', allNA ? 'text-neutral-500' : 'text-white')}>{group.name}</span>
              </Tooltip>
            ) : (
              <span className={cn('text-sm font-medium truncate', allNA ? 'text-neutral-500' : 'text-white')}>{group.name}</span>
            )}
            <Tooltip content={roleBadge.tooltip} position="bottom">
              <span className={cn('text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded cursor-help', allNA ? 'bg-neutral-700/30 text-neutral-600' : roleBadge.class)}>
                {roleBadge.label}
              </span>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* All-NA: Coming Soon badge */}
            {allNA && (
              <Tooltip content={`${group.signals.length} signals will be available when annual report and editorial data sources are added`} position="bottom" maxWidth={280}>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-500/10 text-primary-400/70 cursor-help">
                  COMING SOON
                </span>
              </Tooltip>
            )}

            {/* Group score */}
            {!allNA && band && group.score != null && (
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
            {!allNA && (
              <span className="text-[10px] text-neutral-600">
                {applicableSignals.length}/{group.signals.length}
              </span>
            )}

            {!allNA && (
              <ChevronDown className={cn(
                'w-4 h-4 text-neutral-500 transition-transform',
                expanded && 'rotate-180'
              )} />
            )}
          </div>
        </div>

        {/* Mini progress bar for group score */}
        {!allNA && group.score != null && (
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

        {/* All-NA: compact signal name list */}
        {allNA && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {group.signals.map((s) => (
              <span key={s.id} className="text-[10px] text-neutral-600 px-1.5 py-0.5 rounded bg-dark-700/40">
                {s.name}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Expanded signal list */}
      <AnimatePresence>
        {expanded && !allNA && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Computed signals — full cards */}
              {applicableSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}

              {/* N/A signals in mixed group — collapsed summary */}
              {naSignals.length > 0 && (
                <div className="px-3 py-2.5 rounded-lg bg-dark-700/20 border border-white/3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 flex-shrink-0" />
                    <span className="text-[11px] text-neutral-500 font-medium">
                      {naSignals.length} more signal{naSignals.length > 1 ? 's' : ''} coming soon
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 ml-3.5">
                    {naSignals.map((s) => (
                      <span key={s.id} className="text-[10px] text-neutral-600 px-1.5 py-0.5 rounded bg-dark-700/40">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
