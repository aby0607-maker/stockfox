/**
 * ScoringMethodologyModal — Spinny-style "How we score" explainer
 *
 * One-time educational modal combining Option B (verdicts + bands + personalization)
 * with Option C (gates + signals + modifiers) in a progressive disclosure format.
 *
 * Triggered via "See how scores are calculated?" button on the analysis page.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, BarChart3, Brain, Shield, Target, Sparkles, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/types'
import { getProfileWeightsV2 } from '@/data/profiles'

interface ScoringMethodologyModalProps {
  isOpen: boolean
  onClose: () => void
  profile?: UserProfile | null
}

export function ScoringMethodologyModal({ isOpen, onClose, profile }: ScoringMethodologyModalProps) {
  const [showDeepDive, setShowDeepDive] = useState(false)

  const weights = profile ? getProfileWeightsV2(profile.id) : null
  const pw = weights?.pillarWeights

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-dark-800 border border-white/10 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-dark-700 hover:bg-dark-600 text-neutral-400 hover:text-white transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header illustration area */}
          <div className="bg-gradient-to-br from-primary-500/20 via-primary-500/10 to-transparent px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">How StockFox Scores</h2>
                <p className="text-xs text-neutral-400">Our scoring methodology explained</p>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* ── Section 1: Score → Verdict ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-semibold text-white">Score → Verdict</h3>
              </div>
              <div className="space-y-1.5">
                {[
                  { range: '80–100', verdict: 'Strong Buy', color: 'text-success-400', bg: 'bg-success-500/10', desc: 'High conviction — strong across all pillars' },
                  { range: '60–79', verdict: 'Buy', color: 'text-teal-400', bg: 'bg-teal-500/10', desc: 'Solid fundamentals with minor gaps' },
                  { range: '40–59', verdict: 'Hold', color: 'text-warning-400', bg: 'bg-warning-500/10', desc: 'Mixed signals — proceed with caution' },
                  { range: '0–39', verdict: 'Sell', color: 'text-destructive-400', bg: 'bg-destructive-500/10', desc: 'Significant concerns identified' },
                ].map(v => (
                  <div key={v.range} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg', v.bg)}>
                    <span className={cn('text-xs font-bold w-12 tabular-nums', v.color)}>{v.range}</span>
                    <span className={cn('text-xs font-semibold w-20', v.color)}>{v.verdict}</span>
                    <span className="text-[10px] text-neutral-400 flex-1">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 2: Three Pillars ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-semibold text-white">Three Pillars Build the Score</h3>
              </div>
              <div className="space-y-2">
                {[
                  { icon: BarChart3, name: 'Quantitative', desc: 'Financial health, profitability, growth, valuation, technicals', color: 'text-blue-400', segments: '7 segments' },
                  { icon: Brain, name: 'Qualitative', desc: 'Management quality, business moat, capital discipline, earnings quality', color: 'text-purple-400', segments: '5 factors' },
                  { icon: Shield, name: 'Risk', desc: '35-parameter red flag scanner across governance, compliance, and market signals', color: 'text-amber-400', segments: '35 checks' },
                ].map(p => (
                  <div key={p.name} className="flex items-start gap-3 p-3 rounded-lg bg-dark-700/50 border border-white/5">
                    <p.icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', p.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{p.name}</span>
                        <span className="text-[9px] text-neutral-600">{p.segments}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">{p.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 3: Personalized Weights ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-semibold text-white">Personalized for You</h3>
              </div>
              <p className="text-xs text-neutral-400 mb-2">
                Your investment profile determines how much each pillar matters. Same stock, different verdict based on YOUR style.
              </p>
              {pw && profile && (
                <div className="p-3 rounded-lg bg-primary-500/5 border border-primary-500/20">
                  <p className="text-[10px] text-primary-400 font-semibold mb-2">
                    {profile.displayName}'s Weights
                  </p>
                  <div className="flex gap-2">
                    {[
                      { name: 'Quant', weight: pw.quant, color: 'bg-blue-500' },
                      { name: 'Qual', weight: pw.qual, color: 'bg-purple-500' },
                      { name: 'Risk', weight: pw.risk, color: 'bg-amber-500' },
                    ].map(p => (
                      <div key={p.name} className="flex-1 text-center">
                        <div className="h-1.5 bg-dark-600 rounded-full mb-1 overflow-hidden">
                          <div className={cn('h-full rounded-full', p.color)} style={{ width: `${p.weight}%` }} />
                        </div>
                        <span className="text-[10px] text-neutral-400">{p.name} {p.weight}%</span>
                      </div>
                    ))}
                  </div>
                  {weights && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <p className="text-[9px] text-neutral-500 mb-1">Within Quant, your top priorities:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(weights.quantWeights)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 3)
                          .map(([seg, w]) => (
                            <span key={seg} className="text-[9px] px-1.5 py-0.5 rounded bg-dark-600 text-neutral-400">
                              {seg.replace(/_/g, ' ')} {w}%
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Section 4: Deep Dive Toggle (Option C) ── */}
            <div>
              <button
                onClick={() => setShowDeepDive(!showDeepDive)}
                className="w-full flex items-center gap-2 py-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                <ChevronDown className={cn('w-4 h-4 transition-transform', showDeepDive && 'rotate-180')} />
                <span className="font-medium">How segments are scored (advanced)</span>
              </button>

              <AnimatePresence>
                {showDeepDive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-2">
                      {/* Gates */}
                      <div className="p-3 rounded-lg bg-dark-700/50 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-destructive-500" />
                          <span className="text-xs font-semibold text-white">Hard Gates</span>
                          <span className="text-[9px] text-neutral-600">Pass/fail filters</span>
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          Binary checks like solvency (can the company pay its debts?) and regulatory compliance (ASM/GSM listing?). If a gate fails, the segment score is capped at 35.
                        </p>
                      </div>

                      {/* Signal Clusters */}
                      <div className="p-3 rounded-lg bg-dark-700/50 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-primary-500" />
                          <span className="text-xs font-semibold text-white">Signal Clusters</span>
                          <span className="text-[9px] text-neutral-600">Weighted metric groups</span>
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          Related metrics grouped together — e.g., Cash Flow Quality (OCF/EBITDA, debt serviceability) weighted at 25%. Each signal scores 0-100 based on thresholds.
                        </p>
                      </div>

                      {/* Modifiers */}
                      <div className="p-3 rounded-lg bg-dark-700/50 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-warning-500" />
                          <span className="text-xs font-semibold text-white">India Modifiers</span>
                          <span className="text-[9px] text-neutral-600">±5 point adjustments</span>
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          India-specific risk adjustments — promoter pledging (20-50%), high leverage warnings, interest burden checks. Active modifiers deduct points from the segment score.
                        </p>
                      </div>

                      {/* Formula */}
                      <div className="p-3 rounded-lg bg-primary-500/5 border border-primary-500/20">
                        <p className="text-[10px] text-primary-400 font-semibold mb-1">Segment Score Formula</p>
                        <p className="text-[10px] text-neutral-300 font-mono">
                          Final = Gates pass? → Cluster weighted avg + Modifier penalties
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-1">
                          If any gate fails → score capped at 35 (Weak)
                        </p>
                      </div>

                      {/* Data sources */}
                      <div className="p-3 rounded-lg bg-dark-700/50 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-success-500" />
                          <span className="text-xs font-semibold text-white">200+ Metrics, No Opinions</span>
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          Every score traces to data from CMOTS (fundamentals), BSE filings (governance), Screener.in (balance sheet), and Finnhub (analyst consensus). No tips, no black box.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
            >
              Okay, got it!
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
