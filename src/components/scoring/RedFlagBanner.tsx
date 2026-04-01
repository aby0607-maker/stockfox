import { AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RedFlagV2 } from '@/types'

interface RedFlagBannerProps {
  redFlags: RedFlagV2[]
}

export function RedFlagBanner({ redFlags }: RedFlagBannerProps) {
  if (redFlags.length === 0) return null

  const hardFlags = redFlags.filter(f => f.severity === 'hard')
  const softFlags = redFlags.filter(f => f.severity === 'soft')
  const hasHard = hardFlags.length > 0

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      hasHard
        ? 'bg-destructive-500/10 border-destructive-500/30'
        : 'bg-warning-500/10 border-warning-500/30'
    )}>
      {/* Header */}
      <div className="p-3 flex items-center gap-2">
        {hasHard ? (
          <AlertTriangle className="w-4 h-4 text-destructive-400 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-warning-400 flex-shrink-0" />
        )}
        <span className={cn(
          'text-sm font-semibold',
          hasHard ? 'text-destructive-400' : 'text-warning-400'
        )}>
          {hardFlags.length > 0 && `${hardFlags.length} Hard`}
          {hardFlags.length > 0 && softFlags.length > 0 && ' + '}
          {softFlags.length > 0 && `${softFlags.length} Soft`}
          {' '}Red Flag{redFlags.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Flag list */}
      <div className="px-3 pb-3 space-y-2">
        {redFlags.map((flag, i) => (
          <div
            key={`${flag.signalId}-${i}`}
            className={cn(
              'p-2.5 rounded-lg border',
              flag.severity === 'hard'
                ? 'bg-destructive-500/5 border-destructive-500/20'
                : 'bg-warning-500/5 border-warning-500/20'
            )}
          >
            <div className="flex items-start gap-2">
              <span className={cn(
                'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0',
                flag.severity === 'hard'
                  ? 'bg-destructive-500/20 text-destructive-400'
                  : 'bg-warning-500/20 text-warning-400'
              )}>
                {flag.severity}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white block">{flag.title}</span>
                <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                  {flag.description}
                </p>
                <span className="text-[10px] text-neutral-600 mt-1 block">
                  Source: {flag.source}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
