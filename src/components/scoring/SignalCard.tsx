import { cn } from '@/lib/utils'
import { Tooltip, AutoTooltipText } from '@/components/ui'
import { getSignalTooltip } from '@/data/signalTooltips'
import type { QualSignal } from '@/types'

interface SignalCardProps {
  signal: QualSignal
}

const STATE_CONFIG = {
  strong: {
    dot: 'bg-success-500',
    text: 'text-success-400',
    bg: 'bg-success-500/5',
    label: 'Strong',
  },
  monitor: {
    dot: 'bg-warning-500',
    text: 'text-warning-400',
    bg: 'bg-warning-500/5',
    label: 'Monitor',
  },
  flag: {
    dot: 'bg-destructive-500',
    text: 'text-destructive-400',
    bg: 'bg-destructive-500/5',
    label: 'Flag',
  },
  suppressed: {
    dot: 'bg-destructive-500',
    text: 'text-destructive-400',
    bg: 'bg-destructive-500/10',
    label: 'Suppressed',
  },
  not_applicable: {
    dot: 'bg-neutral-600',
    text: 'text-neutral-500',
    bg: 'bg-dark-700/30',
    label: 'N/A',
  },
} as const

export function SignalCard({ signal }: SignalCardProps) {
  const config = STATE_CONFIG[signal.state]

  return (
    <div className={cn(
      'p-3 rounded-lg border border-white/5',
      config.bg
    )}>
      <div className="flex items-start gap-2">
        {/* State dot */}
        <Tooltip content={`Signal state: ${config.label}`} position="bottom">
          <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0 cursor-help', config.dot)} />
        </Tooltip>

        <div className="flex-1 min-w-0">
          {/* Signal name + ID + badges */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {(() => {
              const tip = getSignalTooltip(signal.id, signal.name)
              return tip ? (
                <Tooltip content={tip} position="bottom" maxWidth={300}>
                  <span className="text-sm font-medium text-white cursor-help border-b border-dotted border-neutral-600">{signal.name}</span>
                </Tooltip>
              ) : (
                <span className="text-sm font-medium text-white">{signal.name}</span>
              )
            })()}
            <span className="text-[10px] text-neutral-600 font-mono">{signal.id}</span>
            {signal.escalationTier !== 'score_only' && (
              <Tooltip
                content={signal.escalationTier === 'hard'
                  ? 'Hard escalation — if triggered, suppresses the entire segment score'
                  : 'Soft escalation — if triggered, caps the segment score band'}
                position="bottom"
              >
                <span className={cn(
                  'text-[9px] font-semibold uppercase px-1 py-0.5 rounded cursor-help',
                  signal.escalationTier === 'hard'
                    ? 'bg-destructive-500/20 text-destructive-400'
                    : 'bg-warning-500/20 text-warning-400'
                )}>
                  {signal.escalationTier}
                </span>
              </Tooltip>
            )}
            {/* Gate pass/fail badge */}
            {signal.gatePassed !== undefined && (
              <Tooltip
                content={signal.gatePassed
                  ? 'Gate passed — this check is clear, no impact on score'
                  : 'Gate failed — this triggers score suppression for the entire segment'}
                position="bottom"
              >
                <span className={cn(
                  'text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded cursor-help',
                  signal.gatePassed
                    ? 'bg-success-500/20 text-success-400'
                    : 'bg-destructive-500/20 text-destructive-400'
                )}>
                  {signal.gatePassed ? 'PASS' : 'FAIL'}
                </span>
              </Tooltip>
            )}
            {/* Modifier points badge */}
            {signal.modifierPoints !== undefined && (
              <Tooltip
                content={signal.modifierActive
                  ? `This India-specific modifier is active and ${signal.modifierPoints > 0 ? 'adds' : 'deducts'} ${Math.abs(signal.modifierPoints)} points to the segment score`
                  : 'This modifier is inactive — the condition is not met, so no points are added or deducted'}
                position="bottom"
              >
                <span className={cn(
                  'text-[9px] font-semibold px-1.5 py-0.5 rounded cursor-help',
                  signal.modifierActive
                    ? signal.modifierPoints > 0
                      ? 'bg-success-500/20 text-success-400'
                      : 'bg-amber-500/20 text-amber-400'
                    : 'bg-neutral-700/50 text-neutral-500'
                )}>
                  {signal.modifierPoints > 0 ? '+' : ''}{signal.modifierPoints} pts
                  {!signal.modifierActive && ' (inactive)'}
                </span>
              </Tooltip>
            )}
            {/* BFSI substitute badge */}
            {signal.isBfsiSubstitute && (
              <Tooltip content="Banking/Financial sector metric — this replaces the standard metric with a BFSI-specific equivalent" position="bottom">
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-400 cursor-help">
                  BFSI
                </span>
              </Tooltip>
            )}
          </div>

          {/* User-facing text */}
          <AutoTooltipText
            text={signal.userText}
            className={cn('text-xs leading-relaxed block', config.text)}
          />

          {/* Gate value + threshold (for hard gates) */}
          {signal.gateValue && (
            <div className="mt-1.5 flex items-center gap-3 text-[10px]">
              <span className="text-neutral-500">
                Value: <span className="text-neutral-300 font-mono">{signal.gateValue}</span>
              </span>
              {signal.gateThreshold && (
                <span className="text-neutral-500">
                  Threshold: <span className="text-neutral-300 font-mono">{signal.gateThreshold}</span>
                </span>
              )}
            </div>
          )}

          {/* Score (if available) */}
          {signal.score != null && signal.state !== 'suppressed' && signal.gatePassed === undefined && signal.modifierPoints === undefined && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 bg-dark-600 rounded-full overflow-hidden max-w-[100px]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(signal.score, 100)}%`,
                    backgroundColor: signal.state === 'strong' ? '#00C489' :
                                     signal.state === 'monitor' ? '#FC6200' : '#f87171'
                  }}
                />
              </div>
              <span className={cn('text-[10px] font-medium', config.text)}>
                {signal.score}/100
              </span>
            </div>
          )}

          {/* Triggered warning */}
          {signal.isTriggered && (
            <div className="mt-1.5 px-2 py-1 rounded bg-destructive-500/10 border border-destructive-500/20">
              <span className="text-[10px] text-destructive-400 font-medium">
                {signal.escalationTier === 'hard' ? '⛔ Hard override — score suppressed' : '⚠ Soft escalation triggered'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
