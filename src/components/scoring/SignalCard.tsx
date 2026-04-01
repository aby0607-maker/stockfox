import { cn } from '@/lib/utils'
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
        <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', config.dot)} />

        <div className="flex-1 min-w-0">
          {/* Signal name + ID */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{signal.name}</span>
            <span className="text-[10px] text-neutral-600 font-mono">{signal.id}</span>
            {signal.escalationTier !== 'score_only' && (
              <span className={cn(
                'text-[9px] font-semibold uppercase px-1 py-0.5 rounded',
                signal.escalationTier === 'hard'
                  ? 'bg-destructive-500/20 text-destructive-400'
                  : 'bg-warning-500/20 text-warning-400'
              )}>
                {signal.escalationTier}
              </span>
            )}
          </div>

          {/* User-facing text */}
          <p className={cn('text-xs leading-relaxed', config.text)}>
            {signal.userText}
          </p>

          {/* Score (if available) */}
          {signal.score != null && signal.state !== 'suppressed' && (
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
