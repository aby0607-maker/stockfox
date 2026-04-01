import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, ChevronDown, TrendingUp, AlertTriangle, Clock, Ban, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NewsEvent, NewsBucket } from '@/types'

interface NewsEventSectionProps {
  events: NewsEvent[]
}

const BUCKET_LABELS: Record<NewsBucket, string> = {
  financial_performance: 'Financial Performance',
  corporate_actions: 'Corporate Actions',
  governance_ownership: 'Governance & Ownership',
  strategic_business: 'Strategic & Business',
  external_macro: 'External & Macro',
  market_signals: 'Market Signals',
  sentiment_third_party: 'Sentiment & Third Party',
  documents_reference: 'Documents & Reference',
}

const SEVERITY_CONFIG = {
  positive: {
    icon: TrendingUp,
    colorClass: 'text-success-400',
    bgClass: 'bg-success-500/10',
    borderClass: 'border-l-success-500',
    label: 'Positive',
  },
  neutral: {
    icon: Info,
    colorClass: 'text-neutral-400',
    bgClass: 'bg-neutral-500/10',
    borderClass: 'border-l-neutral-500',
    label: 'Neutral',
  },
  watch: {
    icon: Clock,
    colorClass: 'text-warning-400',
    bgClass: 'bg-warning-500/10',
    borderClass: 'border-l-warning-500',
    label: 'Watch',
  },
  flag: {
    icon: AlertTriangle,
    colorClass: 'text-destructive-400',
    bgClass: 'bg-destructive-500/10',
    borderClass: 'border-l-destructive-500',
    label: 'Flag',
  },
  hard_stop: {
    icon: Ban,
    colorClass: 'text-destructive-400',
    bgClass: 'bg-destructive-500/20',
    borderClass: 'border-l-destructive-500',
    label: 'Hard Stop',
  },
} as const

const PILLAR_BADGE = {
  quant: { label: 'Quant', class: 'bg-primary-500/20 text-primary-400' },
  qual: { label: 'Qual', class: 'bg-teal-500/20 text-teal-400' },
  risk: { label: 'Risk', class: 'bg-warning-500/20 text-warning-400' },
} as const

export function NewsEventSection({ events }: NewsEventSectionProps) {
  const [expanded, setExpanded] = useState(false)

  if (events.length === 0) return null

  const visibleEvents = events.slice(0, 3)
  const hiddenEvents = events.slice(3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl bg-dark-800 border border-white/5 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary-400" />
          <h3 className="font-semibold text-white">News & Events</h3>
        </div>
        <span className="text-xs text-neutral-500">{events.length} events</span>
      </div>

      {/* Event cards */}
      <div className="space-y-2">
        {visibleEvents.map((event) => (
          <NewsEventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Expandable extra events */}
      {hiddenEvents.length > 0 && (
        <>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mt-2">
                  {hiddenEvents.map((event) => (
                    <NewsEventCard key={event.id} event={event} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 py-2 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 border border-white/5 text-xs text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <span>{expanded ? 'Show Less' : `View ${hiddenEvents.length} More`}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>
        </>
      )}
    </motion.div>
  )
}

function NewsEventCard({ event }: { event: NewsEvent }) {
  const config = SEVERITY_CONFIG[event.severity]
  const Icon = config.icon

  return (
    <div className={cn(
      'p-3 rounded-xl border-l-2 bg-dark-700/30',
      config.borderClass
    )}>
      <div className="flex items-start gap-2.5">
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
          config.bgClass
        )}>
          <Icon className={cn('w-3.5 h-3.5', config.colorClass)} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Type + severity badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-neutral-500 font-medium">
              {BUCKET_LABELS[event.bucket] || event.bucket}
            </span>
            <span className={cn(
              'text-[9px] font-semibold uppercase px-1 py-0.5 rounded',
              config.bgClass, config.colorClass
            )}>
              {config.label}
            </span>
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-white leading-snug">
            {event.title}
          </h4>

          {/* Investor meaning */}
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            {event.investorMeaning}
          </p>

          {/* Bottom row: source, date, impact pillars */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[10px] text-neutral-600">{event.source}</span>
            <span className="text-[10px] text-neutral-600">{event.date}</span>

            {event.impactPillars.length > 0 && (
              <div className="flex items-center gap-1">
                {event.impactPillars.map((p) => {
                  const badge = PILLAR_BADGE[p]
                  return badge ? (
                    <span key={p} className={cn(
                      'text-[9px] font-medium px-1 py-0.5 rounded',
                      badge.class
                    )}>
                      {badge.label}
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
