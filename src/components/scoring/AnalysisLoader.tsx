/**
 * AnalysisLoader — Step-by-step loading narration for stock analysis.
 *
 * Shows real progress of the scoring pipeline:
 * 1. Connecting to BSE & NSE
 * 2. Fetching financial statements
 * 3. Analyzing 200+ metrics
 * 4. Evaluating governance & quality
 * 5. Running risk scanner
 * 6. Personalizing verdict
 * 7. Building news & events
 *
 * Each step is tied to actual API call completions — not fake progress.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Check, Loader2, Circle } from 'lucide-react'

export type LoadingStep = {
  id: string
  label: string
  detail?: string
  status: 'pending' | 'loading' | 'done' | 'error'
}

const DEFAULT_STEPS: LoadingStep[] = [
  { id: 'resolve', label: 'Connecting to BSE & NSE', detail: 'Resolving stock data from exchange', status: 'loading' },
  { id: 'fundamentals', label: 'Fetching financial statements', detail: 'P&L, Balance Sheet, Cash Flow from CMOTS', status: 'pending' },
  { id: 'quant', label: 'Analyzing 200+ metrics', detail: 'Scoring across 7 quantitative segments', status: 'pending' },
  { id: 'qual', label: 'Evaluating governance & quality', detail: 'Management, business quality, earnings from 6 sources', status: 'pending' },
  { id: 'risk', label: 'Running 35-point risk scanner', detail: 'NSE surveillance + BSE filings + red flag framework', status: 'pending' },
  { id: 'personalize', label: 'Personalizing for your profile', detail: 'Applying investment thesis weights', status: 'pending' },
  { id: 'news', label: 'Building news & events', detail: 'BSE corporate actions + Google News', status: 'pending' },
]

interface AnalysisLoaderProps {
  steps?: LoadingStep[]
  stockName?: string
}

export function AnalysisLoader({ steps, stockName }: AnalysisLoaderProps) {
  const displaySteps = steps || DEFAULT_STEPS
  const completedCount = displaySteps.filter(s => s.status === 'done').length
  const progress = (completedCount / displaySteps.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-dark-800 border border-white/10 p-6 space-y-5"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-1">
          Analyzing {stockName || 'Stock'}
        </h3>
        <p className="text-xs text-neutral-500">
          StockFox is crunching the numbers across multiple data sources
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-primary-500 rounded-full"
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {displaySteps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'flex items-start gap-3 py-2 px-3 rounded-lg transition-colors',
              step.status === 'loading' && 'bg-primary-500/5',
              step.status === 'done' && 'bg-success-500/5',
              step.status === 'error' && 'bg-destructive-500/5',
            )}
          >
            {/* Status icon */}
            <div className="mt-0.5 flex-shrink-0">
              {step.status === 'done' ? (
                <Check className="w-4 h-4 text-success-400" />
              ) : step.status === 'loading' ? (
                <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
              ) : step.status === 'error' ? (
                <Circle className="w-4 h-4 text-destructive-400" />
              ) : (
                <Circle className="w-4 h-4 text-neutral-600" />
              )}
            </div>

            {/* Label + detail */}
            <div className="flex-1 min-w-0">
              <span className={cn(
                'text-sm font-medium block',
                step.status === 'done' ? 'text-success-400' :
                step.status === 'loading' ? 'text-white' :
                step.status === 'error' ? 'text-destructive-400' :
                'text-neutral-500',
              )}>
                {step.label}
              </span>
              {step.status === 'loading' && step.detail && (
                <AnimatePresence>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-neutral-500 block"
                  >
                    {step.detail}
                  </motion.span>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Trust badge */}
      <div className="text-center pt-2 border-t border-white/5">
        <p className="text-[10px] text-neutral-600">
          Data sourced from CMOTS · BSE · NSE · Screener · Finnhub · Trendlyne
        </p>
      </div>
    </motion.div>
  )
}

/**
 * Create a mutable steps array for tracking real progress.
 * Returns [steps, updateStep] — updateStep modifies in place for React state.
 */
export function createLoadingSteps(): LoadingStep[] {
  return DEFAULT_STEPS.map(s => ({ ...s }))
}

export function updateStep(
  steps: LoadingStep[],
  stepId: string,
  status: LoadingStep['status'],
  detail?: string,
): LoadingStep[] {
  return steps.map(s =>
    s.id === stepId ? { ...s, status, detail: detail ?? s.detail } : s
  )
}
