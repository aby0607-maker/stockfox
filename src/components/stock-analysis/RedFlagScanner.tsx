import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, AlertCircle, Check, X, TrendingDown, Newspaper, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateRedFlagFramework } from '@/services/redFlagScannerService'
import { getDemoScannerValues } from '@/data/verdicts'
import type { StockVerdict, StockVerdictV2 } from '@/types'

interface NewsItem {
  id: string
  headline: string
  sentiment: 'positive' | 'negative' | 'neutral'
  source: string
}

interface RedFlagScannerProps {
  verdict?: StockVerdict | null
  verdictV2?: StockVerdictV2 | null
  news: NewsItem[]
}

export function RedFlagScanner({ verdict, verdictV2, news }: RedFlagScannerProps) {
  const stockId = verdict?.stockId || verdictV2?.stockId
  // Demo stocks use hardcoded scanner values; non-demo stocks use CMOTS-derived values from verdict
  const scannerValues = (stockId ? getDemoScannerValues(stockId) : undefined) ?? verdictV2?.scannerValues
  const framework = generateRedFlagFramework(verdict, verdictV2, undefined, scannerValues)
  const { triggeredBySeverity, bySeverity, scoreImpact } = framework

  // Track which severity categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    critical: false,
    high: false,
    medium: false,
    monitor: false
  })

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Get negative news as potential red flag signals
  const negativeNews = news.filter(n => n.sentiment === 'negative')
  const hasCritical = triggeredBySeverity.critical.length > 0
  const hasHigh = triggeredBySeverity.high.length > 0
  const hasAnyIssue = framework.triggeredCount > 0

  // Severity category config
  const categories = [
    { key: 'critical', label: 'Critical', emoji: '🔴', colorClass: 'destructive', count: 8, description: 'Blocking issues - immediate action required' },
    { key: 'high', label: 'High', emoji: '🟠', colorClass: 'warning', count: 12, description: 'Significant concerns - caution advised' },
    { key: 'medium', label: 'Medium', emoji: '🟡', colorClass: 'yellow', count: 10, description: 'Monitor closely - potential risks' },
    { key: 'monitor', label: 'Monitor', emoji: '⚪', colorClass: 'neutral', count: 5, description: 'Informational - awareness items' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border overflow-hidden',
        hasCritical ? 'bg-destructive-500/5 border-destructive-500/20' :
        hasHigh ? 'bg-warning-500/5 border-warning-500/20' :
        'bg-success-500/5 border-success-500/20'
      )}
    >
      {/* Header - Summary */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {hasCritical ? (
              <AlertTriangle className="w-5 h-5 text-destructive-400" />
            ) : hasHigh ? (
              <AlertCircle className="w-5 h-5 text-warning-400" />
            ) : (
              <Check className="w-5 h-5 text-success-400" />
            )}
            <h3 className="font-semibold text-white">Red Flag Scanner</h3>
          </div>
          <div className="flex items-center gap-2">
            {scoreImpact !== 0 && (
              <span className="text-xs text-destructive-400 font-medium">
                {scoreImpact.toFixed(1)} pts
              </span>
            )}
            <div className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium',
              framework.triggeredCount === 0 ? 'bg-success-500/20 text-success-400' :
              hasCritical ? 'bg-destructive-500/20 text-destructive-400' :
              'bg-warning-500/20 text-warning-400'
            )}>
              {framework.triggeredCount} issues / {framework.totalParameters} checked
            </div>
          </div>
        </div>

        {/* Status message */}
        {!hasAnyIssue && (
          <div className="mb-3 p-2.5 bg-success-500/10 rounded-lg border border-success-500/20">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success-400" />
              <span className="text-sm text-success-400 font-medium">All Clear</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 ml-6">
              No red flags detected across 35 risk parameters
            </p>
          </div>
        )}

        {/* Severity Categories */}
        <div className="space-y-2">
          {categories.map((cat) => {
            const triggered = triggeredBySeverity[cat.key as keyof typeof triggeredBySeverity]
            const all = bySeverity[cat.key as keyof typeof bySeverity]
            const isExpanded = expandedCategories[cat.key]
            const hasTriggered = triggered.length > 0

            return (
              <div key={cat.key}>
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl transition-all',
                    hasTriggered
                      ? cat.colorClass === 'destructive' ? 'bg-destructive-500/10 hover:bg-destructive-500/15' :
                        cat.colorClass === 'warning' ? 'bg-warning-500/10 hover:bg-warning-500/15' :
                        'bg-dark-700/50 hover:bg-dark-700'
                      : 'bg-dark-700/30 hover:bg-dark-700/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{cat.emoji}</span>
                    <div className="text-left">
                      <span className="text-sm font-medium text-white">{cat.label}</span>
                      <span className="text-xs text-neutral-500 ml-2">({cat.count} checks)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs font-medium',
                      hasTriggered
                        ? cat.colorClass === 'destructive' ? 'text-destructive-400' :
                          cat.colorClass === 'warning' ? 'text-warning-400' : 'text-neutral-400'
                        : 'text-success-400'
                    )}>
                      {hasTriggered ? `${triggered.length} triggered` : 'Clear'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1.5 pl-9">
                        {all.map((flag: any) => (
                          <div
                            key={flag.id}
                            className={cn(
                              'flex items-start gap-2 p-2 rounded-lg text-xs',
                              flag.isTriggered ? 'bg-dark-600/50' : 'bg-dark-700/30'
                            )}
                          >
                            {flag.isTriggered ? (
                              <X className="w-3.5 h-3.5 text-destructive-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-success-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={cn(
                                  'font-medium',
                                  flag.isTriggered ? 'text-white' : 'text-neutral-400'
                                )}>
                                  {flag.title}
                                </span>
                                <span className="text-[10px] text-neutral-500 flex-shrink-0">
                                  {flag.source}
                                </span>
                              </div>
                              <p className="text-neutral-500 mt-0.5">{flag.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {/* News Signals */}
        {negativeNews.length > 0 && (
          <div className="mt-3 p-3 bg-dark-700/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="w-4 h-4 text-warning-400" />
              <span className="text-xs font-medium text-warning-400">Recent News Signals</span>
            </div>
            <div className="space-y-1.5">
              {negativeNews.slice(0, 2).map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <TrendingDown className="w-3 h-3 text-destructive-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-neutral-300">{item.headline}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
