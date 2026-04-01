import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

interface BlindSpotData {
  segmentId: string
  name: string
  checkRate: number  // 0-100
}

// Default coverage for demo — V2 Quant segments + Qual factors
const defaultSegmentCoverage: BlindSpotData[] = [
  // Quant segments
  { segmentId: 'profitability', name: 'Profitability', checkRate: 100 },
  { segmentId: 'growth', name: 'Growth', checkRate: 95 },
  { segmentId: 'valuation', name: 'Valuation', checkRate: 70 },
  { segmentId: 'financial_health', name: 'Financial Health', checkRate: 85 },
  { segmentId: 'technical', name: 'Technical', checkRate: 30 },
  { segmentId: 'performance', name: 'Performance', checkRate: 45 },
  { segmentId: 'institutional_signals', name: 'Institutional Signals', checkRate: 40 },
  // Qual factors
  { segmentId: 'management_governance', name: 'Governance', checkRate: 25 },
  { segmentId: 'business_quality', name: 'Business Quality', checkRate: 60 },
  { segmentId: 'capital_discipline', name: 'Capital Discipline', checkRate: 20 },
  { segmentId: 'earnings_quality', name: 'Earnings Quality', checkRate: 55 },
  { segmentId: 'execution_quality', name: 'Execution Quality', checkRate: 15 },
]

interface BlindSpotChartProps {
  data?: BlindSpotData[]
  className?: string
}

function getBarColor(rate: number): string {
  if (rate >= 80) return 'bg-success-500'
  if (rate >= 50) return 'bg-teal-500'
  if (rate >= 30) return 'bg-warning-500'
  return 'bg-destructive-500'
}

function getTextColor(rate: number): string {
  if (rate >= 80) return 'text-success-400'
  if (rate >= 50) return 'text-teal-400'
  if (rate >= 30) return 'text-warning-400'
  return 'text-destructive-400'
}

/**
 * Blind Spot Chart
 * Visual bar chart showing segment coverage in analyses
 * Highlights segments that are being overlooked
 */
export function BlindSpotChart({ data = defaultSegmentCoverage, className }: BlindSpotChartProps) {
  // Sort by checkRate to show blind spots first
  const sortedData = [...data].sort((a, b) => a.checkRate - b.checkRate)
  const blindSpots = sortedData.filter(d => d.checkRate < 40)
  const hasBlindSpots = blindSpots.length > 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Alert if blind spots exist */}
      {hasBlindSpots && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-warning-500/10 rounded-xl border border-warning-500/20"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-400 flex-shrink-0" />
            <p className="text-sm text-warning-400">
              You're skipping <span className="font-semibold">{blindSpots.length} segment{blindSpots.length > 1 ? 's' : ''}</span> in most analyses
            </p>
          </div>
        </motion.div>
      )}

      {/* Segment bars */}
      <div className="space-y-2">
        {sortedData.map((segment, index) => {
          const isBlindSpot = segment.checkRate < 40

          return (
            <motion.div
              key={segment.segmentId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                'flex items-center gap-3',
                isBlindSpot && 'bg-warning-500/5 -mx-2 px-2 py-1 rounded-lg'
              )}
            >
              {/* Segment name */}
              <span className={cn(
                'text-xs w-28 flex-shrink-0 truncate',
                isBlindSpot ? 'text-warning-400 font-medium' : 'text-neutral-400'
              )}>
                {segment.name}
                {isBlindSpot && ' ⚠️'}
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-2 bg-dark-600 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${segment.checkRate}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className={cn('h-full rounded-full', getBarColor(segment.checkRate))}
                />
              </div>

              {/* Percentage */}
              <span className={cn(
                'text-xs w-10 text-right font-medium tabular-nums',
                getTextColor(segment.checkRate)
              )}>
                {segment.checkRate}%
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-neutral-500 pt-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success-500" /> 80%+
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-teal-500" /> 50-79%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning-500" /> 30-49%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive-500" /> &lt;30%
        </span>
      </div>
    </div>
  )
}
