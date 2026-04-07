/**
 * ScoreBreakdown — "Show Your Work" expandable panel for score transparency.
 *
 * Renders the scoreJustification string as a formatted step-by-step breakdown.
 * The justification uses " → " as separator between steps.
 *
 * Example input: "Gates: 4/4 passed → Clusters: B1(45)×25% + B2(60)×25% + ... = 55 → Modifiers: -3 pts → Final: 67/100"
 */

import { useState } from 'react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScoreBreakdownProps {
  justification: string
  score: number
  label?: string  // Optional label like "How was this scored?"
}

export function ScoreBreakdown({ justification, label }: ScoreBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const steps = justification.split(' → ').filter(Boolean)

  if (steps.length === 0) return null

  return (
    <div className="rounded-lg border border-white/5 bg-dark-900/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-dark-700/30 transition-colors"
      >
        <Calculator className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
        <span className="text-[11px] text-primary-400 font-medium flex-1 flex items-center gap-1">
          {label || 'How was this scored?'}
          <InfoTooltip
            content="Score formula: Hard Gates check for deal-breakers → Anchor clusters score core metrics → Modifiers adjust for context → Weight & average → Final score."
            position="bottom"
            size="sm"
          />
        </span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-neutral-500 transition-transform',
          isOpen && 'rotate-180',
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-1.5">
              {steps.map((step, i) => {
                const isFinal = step.startsWith('Final:')
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2 text-[11px]',
                      isFinal ? 'pt-1.5 border-t border-white/5' : '',
                    )}
                  >
                    <span className={cn(
                      'w-4 text-center flex-shrink-0 font-mono',
                      isFinal ? 'text-primary-400' : 'text-neutral-600',
                    )}>
                      {isFinal ? '=' : i === steps.length - 2 ? '→' : '·'}
                    </span>
                    <span className={cn(
                      'font-mono',
                      isFinal ? 'text-white font-semibold' : 'text-neutral-400',
                    )}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * OverallScoreBreakdown — Shows pillar weight × score = contribution for overall verdict.
 */
interface OverallScoreBreakdownProps {
  scoreBreakdown: {
    pillarWeights: { quant: number; qual: number; risk: number }
    pillarContributions: { quant: number; qual: number; risk: number }
    profileName: string
  }
  pillarScores: { quant: number; qual: number; risk: number }
  overallScore: number
}

export function OverallScoreBreakdown({ scoreBreakdown, pillarScores, overallScore }: OverallScoreBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { pillarWeights: pw, pillarContributions: pc, profileName } = scoreBreakdown

  return (
    <div className="rounded-lg border border-white/5 bg-dark-900/50 overflow-hidden mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-dark-700/30 transition-colors"
      >
        <Calculator className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
        <span className="text-[11px] text-primary-400 font-medium flex-1 flex items-center gap-1">
          How was the overall score calculated?
          <InfoTooltip
            content="Overall = (Quant × weight) + (Qual × weight) + (Risk × weight). Weights vary by your profile — growth-focused profiles weight Quant higher, safety-focused profiles weight Risk higher."
            position="bottom"
            size="sm"
          />
        </span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-neutral-500 transition-transform',
          isOpen && 'rotate-180',
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="text-neutral-600">
                    <th className="text-left font-normal pb-1">Pillar</th>
                    <th className="text-right font-normal pb-1">Score</th>
                    <th className="text-right font-normal pb-1">Weight</th>
                    <th className="text-right font-normal pb-1">Contribution</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-400">
                  <tr>
                    <td>Quant</td>
                    <td className="text-right">{pillarScores.quant}</td>
                    <td className="text-right">× {pw.quant}%</td>
                    <td className="text-right">{pc.quant.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td>Qual</td>
                    <td className="text-right">{pillarScores.qual}</td>
                    <td className="text-right">× {pw.qual}%</td>
                    <td className="text-right">{pc.qual.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td>Risk</td>
                    <td className="text-right">{pillarScores.risk}</td>
                    <td className="text-right">× {pw.risk}%</td>
                    <td className="text-right">{pc.risk.toFixed(1)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/5 text-white font-semibold">
                    <td className="pt-1.5">Overall</td>
                    <td className="text-right pt-1.5" colSpan={2}></td>
                    <td className="text-right pt-1.5 text-primary-400">{overallScore}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="text-[9px] text-neutral-600 mt-2">
                Profile: {profileName.charAt(0).toUpperCase() + profileName.slice(1)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
