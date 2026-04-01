import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConfidenceIndicator as ConfidenceIndicatorType } from '@/types'

interface ConfidenceIndicatorProps {
  indicator: ConfidenceIndicatorType
}

const STATE_CONFIG = {
  full: {
    label: 'Full Coverage',
    colorClass: 'text-success-400',
    bgClass: 'bg-success-500/10',
    borderClass: 'border-success-500/20',
  },
  partial: {
    label: 'Partial Coverage',
    colorClass: 'text-teal-400',
    bgClass: 'bg-teal-500/10',
    borderClass: 'border-teal-500/20',
  },
  limited_history: {
    label: 'Limited History',
    colorClass: 'text-warning-400',
    bgClass: 'bg-warning-500/10',
    borderClass: 'border-warning-500/20',
  },
  suppressed: {
    label: 'Suppressed',
    colorClass: 'text-destructive-400',
    bgClass: 'bg-destructive-500/10',
    borderClass: 'border-destructive-500/20',
  },
  cmots_gap: {
    label: 'Data Gap',
    colorClass: 'text-neutral-400',
    bgClass: 'bg-neutral-500/10',
    borderClass: 'border-neutral-500/20',
  },
} as const

export function ConfidenceIndicator({ indicator }: ConfidenceIndicatorProps) {
  const config = STATE_CONFIG[indicator.state]
  const pct = indicator.signalsTotal > 0
    ? Math.round((indicator.signalsComputed / indicator.signalsTotal) * 100)
    : 0

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg border',
      config.bgClass, config.borderClass
    )}>
      <Info className={cn('w-3.5 h-3.5 flex-shrink-0', config.colorClass)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-medium', config.colorClass)}>
            {config.label}
          </span>
          <span className="text-[10px] text-neutral-500">
            Based on {indicator.signalsComputed} of {indicator.signalsTotal} signals
          </span>
        </div>

        {/* Mini bar */}
        <div className="mt-1 h-1 bg-dark-600 rounded-full overflow-hidden max-w-[120px]">
          <div
            className={cn('h-full rounded-full')}
            style={{
              width: `${pct}%`,
              backgroundColor: config.colorClass.includes('success') ? '#00C489' :
                               config.colorClass.includes('teal') ? '#69E2B0' :
                               config.colorClass.includes('warning') ? '#FC6200' :
                               config.colorClass.includes('destructive') ? '#f87171' : '#737373'
            }}
          />
        </div>
      </div>

      {indicator.dataRange && (
        <span className="text-[10px] text-neutral-600 flex-shrink-0">
          {indicator.dataRange}
        </span>
      )}
    </div>
  )
}
