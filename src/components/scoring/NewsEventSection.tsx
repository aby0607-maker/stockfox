import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, ChevronDown, TrendingUp, AlertTriangle, Clock, Ban, Info,
  DollarSign, Building2, Shield, Briefcase, Globe, BarChart3, MessageSquare, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NewsEvent, NewsBucket } from '@/types'

interface NewsEventSectionProps {
  events: NewsEvent[]
}

// ── Bucket config: label, icon, color ──────────────────────────

interface BucketConfig {
  label: string
  shortLabel: string
  icon: typeof Newspaper
  colorClass: string
  bgClass: string
}

const BUCKET_CONFIG: Record<NewsBucket, BucketConfig> = {
  financial_performance: {
    label: 'Financial Performance',
    shortLabel: 'Financial',
    icon: DollarSign,
    colorClass: 'text-primary-400',
    bgClass: 'bg-primary-500/15',
  },
  corporate_actions: {
    label: 'Corporate Actions',
    shortLabel: 'Corporate',
    icon: Building2,
    colorClass: 'text-teal-400',
    bgClass: 'bg-teal-500/15',
  },
  governance_ownership: {
    label: 'Governance & Ownership',
    shortLabel: 'Governance',
    icon: Shield,
    colorClass: 'text-violet-400',
    bgClass: 'bg-violet-500/15',
  },
  strategic_business: {
    label: 'Strategic & Business',
    shortLabel: 'Strategic',
    icon: Briefcase,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/15',
  },
  external_macro: {
    label: 'External & Macro',
    shortLabel: 'Macro',
    icon: Globe,
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-500/15',
  },
  market_signals: {
    label: 'Market Signals',
    shortLabel: 'Signals',
    icon: BarChart3,
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/15',
  },
  sentiment_third_party: {
    label: 'Sentiment & Third Party',
    shortLabel: 'Sentiment',
    icon: MessageSquare,
    colorClass: 'text-rose-400',
    bgClass: 'bg-rose-500/15',
  },
  documents_reference: {
    label: 'Documents & Reference',
    shortLabel: 'Documents',
    icon: FileText,
    colorClass: 'text-neutral-400',
    bgClass: 'bg-neutral-500/15',
  },
}

// ── Severity config ────────────────────────────────────────────

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

// Severity priority for sorting (higher = more important = shown first)
const SEVERITY_PRIORITY: Record<string, number> = {
  hard_stop: 5,
  flag: 4,
  watch: 3,
  neutral: 2,
  positive: 1,
}

// ── Segment badges (Layer 3) ───────────────────────────────────

const SEGMENT_BADGE: Record<string, { label: string; class: string }> = {
  // Quant segments
  profitability: { label: 'Profitability', class: 'bg-primary-500/20 text-primary-400' },
  growth: { label: 'Growth', class: 'bg-primary-500/20 text-primary-400' },
  valuation: { label: 'Valuation', class: 'bg-primary-500/20 text-primary-400' },
  financial_health: { label: 'Financial Health', class: 'bg-primary-500/20 text-primary-400' },
  technical: { label: 'Technical', class: 'bg-primary-500/20 text-primary-400' },
  performance: { label: 'Performance', class: 'bg-primary-500/15 text-primary-300' },
  institutional_signals: { label: 'Institutional', class: 'bg-primary-500/15 text-primary-300' },
  // Qual factors
  management_governance: { label: 'Governance', class: 'bg-teal-500/20 text-teal-400' },
  business_quality: { label: 'Business Quality', class: 'bg-teal-500/20 text-teal-400' },
  capital_discipline: { label: 'Capital Discipline', class: 'bg-teal-500/20 text-teal-400' },
  earnings_quality: { label: 'Earnings Quality', class: 'bg-teal-500/20 text-teal-400' },
  execution_quality: { label: 'Execution', class: 'bg-teal-500/20 text-teal-400' },
}

// Number of preview events to show in collapsed state
const PREVIEW_COUNT = 3

// ── Main component ─────────────────────────────────────────────

export function NewsEventSection({ events }: NewsEventSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeBucket, setActiveBucket] = useState<NewsBucket | 'all'>('all')

  // Compute which buckets have events
  const populatedBuckets = useMemo(() => {
    const bucketSet = new Set<NewsBucket>()
    events.forEach(e => bucketSet.add(e.bucket))
    return (Object.keys(BUCKET_CONFIG) as NewsBucket[]).filter(b => bucketSet.has(b))
  }, [events])

  // Sort events by severity priority (flags/watches first)
  const sortedEvents = useMemo(() =>
    [...events].sort((a, b) => (SEVERITY_PRIORITY[b.severity] || 0) - (SEVERITY_PRIORITY[a.severity] || 0)),
    [events]
  )

  // Preview: top N most important events
  const previewEvents = sortedEvents.slice(0, PREVIEW_COUNT)

  // Severity summary for the header
  const severityCounts = useMemo(() => {
    const counts = { flag: 0, watch: 0, positive: 0, neutral: 0, hard_stop: 0 }
    events.forEach(e => { if (counts[e.severity] !== undefined) counts[e.severity]++ })
    return counts
  }, [events])

  // Group events by bucket for expanded view
  const groupedEvents = useMemo(() => {
    if (activeBucket !== 'all') {
      return [{ bucket: activeBucket, events: events.filter(e => e.bucket === activeBucket) }]
    }
    const groups: { bucket: NewsBucket; events: NewsEvent[] }[] = []
    for (const bucket of populatedBuckets) {
      const bucketEvents = events.filter(e => e.bucket === bucket)
      if (bucketEvents.length > 0) groups.push({ bucket, events: bucketEvents })
    }
    return groups
  }, [events, activeBucket, populatedBuckets])

  if (events.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl bg-dark-800 border border-white/5 p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary-400" />
          <h3 className="font-semibold text-white">News & Events</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Severity summary pills */}
          {severityCounts.hard_stop + severityCounts.flag > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-destructive-500/15 text-destructive-400">
              {severityCounts.hard_stop + severityCounts.flag} flag{severityCounts.hard_stop + severityCounts.flag > 1 ? 's' : ''}
            </span>
          )}
          {severityCounts.watch > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-warning-500/15 text-warning-400">
              {severityCounts.watch} watch
            </span>
          )}
          <span className="text-[10px] text-neutral-500">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Collapsed: Preview cards ── */}
      {!expanded && (
        <div className="space-y-2">
          {previewEvents.map((event) => (
            <NewsEventCard key={event.id} event={event} compact />
          ))}

          {events.length > PREVIEW_COUNT && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full mt-1 py-2.5 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 border border-white/5 text-xs text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <span>View All {events.length} Events</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ── Expanded: Full bucketed view ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Bucket filter tabs */}
            {populatedBuckets.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 scrollbar-hide -mx-1 px-1">
                <button
                  onClick={() => setActiveBucket('all')}
                  className={cn(
                    'flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
                    activeBucket === 'all'
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'bg-dark-700/50 text-neutral-500 border border-transparent hover:text-neutral-300 hover:bg-dark-700'
                  )}
                >
                  All ({events.length})
                </button>

                {populatedBuckets.map(bucket => {
                  const config = BUCKET_CONFIG[bucket]
                  const count = events.filter(e => e.bucket === bucket).length
                  const BucketIcon = config.icon
                  return (
                    <button
                      key={bucket}
                      onClick={() => setActiveBucket(bucket)}
                      className={cn(
                        'flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
                        activeBucket === bucket
                          ? cn(config.bgClass, config.colorClass, 'border border-current/20')
                          : 'bg-dark-700/50 text-neutral-500 border border-transparent hover:text-neutral-300 hover:bg-dark-700'
                      )}
                    >
                      <BucketIcon className="w-3 h-3" />
                      <span>{config.shortLabel}</span>
                      <span className="opacity-60">({count})</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Event groups */}
            <div className="space-y-3">
              {groupedEvents.map(({ bucket, events: bucketEvents }) => {
                const bucketConfig = BUCKET_CONFIG[bucket]
                const BucketIcon = bucketConfig.icon

                return (
                  <div key={bucket}>
                    {/* Bucket header (only in "all" view with multiple buckets) */}
                    {activeBucket === 'all' && populatedBuckets.length > 1 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <BucketIcon className={cn('w-3 h-3', bucketConfig.colorClass)} />
                        <span className={cn('text-[10px] font-semibold uppercase tracking-wider', bucketConfig.colorClass)}>
                          {bucketConfig.label}
                        </span>
                        <span className="text-[10px] text-neutral-600">
                          ({bucketEvents.length})
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {bucketEvents.map((event) => (
                        <NewsEventCard key={event.id} event={event} showBucketLabel={activeBucket !== 'all'} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Collapse button */}
            <button
              onClick={() => { setExpanded(false); setActiveBucket('all') }}
              className="w-full mt-3 py-2 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 border border-white/5 text-xs text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <span>Show Less</span>
              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Event card ─────────────────────────────────────────────────

function NewsEventCard({
  event,
  showBucketLabel = false,
  compact = false,
}: {
  event: NewsEvent
  showBucketLabel?: boolean
  compact?: boolean
}) {
  const config = SEVERITY_CONFIG[event.severity]
  const Icon = config.icon
  const bucketConfig = BUCKET_CONFIG[event.bucket]

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
          {/* Top row: severity + bucket tag (compact shows bucket to give context) */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'text-[9px] font-semibold uppercase px-1 py-0.5 rounded',
              config.bgClass, config.colorClass
            )}>
              {config.label}
            </span>
            {(showBucketLabel || compact) && (
              <span className={cn('text-[9px] font-medium px-1 py-0.5 rounded', bucketConfig.bgClass, bucketConfig.colorClass)}>
                {bucketConfig.shortLabel}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className={cn(
            'text-sm font-medium text-white leading-snug',
            compact && 'line-clamp-1'
          )}>
            {event.title}
          </h4>

          {/* Investor meaning — hidden in compact mode */}
          {!compact && (
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              {event.investorMeaning}
            </p>
          )}

          {/* Bottom row: source, date, impact segments */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[10px] text-neutral-600">{event.source}</span>
            <span className="text-[10px] text-neutral-600">{event.date}</span>

            {!compact && event.impactSegments.length > 0 && (
              <div className="flex items-center gap-1">
                {event.impactSegments.map((segId) => {
                  const badge = SEGMENT_BADGE[segId]
                  return badge ? (
                    <span key={segId} className={cn(
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
