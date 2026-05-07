import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Eye, ChevronDown, BarChart3, Brain, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import type { StockVerdictV2, SegmentVerdictV2, QualSignal, VerdictPillar } from '@/types'

interface RiskEntry {
  signal: QualSignal
  segmentName: string
  segmentId: string
  pillar: VerdictPillar
  segmentScore: number
}

interface RiskAnalysis {
  entries: RiskEntry[]
  weakSegments: SegmentVerdictV2[]
  quantFlags: number
  quantMonitors: number
  qualFlags: number
  qualMonitors: number
  bySegment: Map<string, { segmentName: string; pillar: VerdictPillar; score: number; entries: RiskEntry[] }>
}

function analyzeRisk(verdict: StockVerdictV2): RiskAnalysis {
  const entries: RiskEntry[] = []
  for (const pillar of verdict.pillars) {
    if (pillar.pillar === 'risk') continue
    for (const seg of pillar.segments) {
      if (!seg.signalGroups) continue
      for (const group of seg.signalGroups) {
        for (const signal of group.signals) {
          if (signal.state === 'flag' || signal.state === 'monitor') {
            entries.push({
              signal,
              segmentName: seg.name,
              segmentId: seg.id,
              pillar: pillar.pillar,
              segmentScore: seg.score ?? 0,
            })
          }
        }
      }
    }
  }

  const weakSegments = verdict.pillars
    .filter(p => p.pillar !== 'risk')
    .flatMap(p => p.segments)
    .filter(s => s.score != null && s.score < 40)

  const quantFlags = entries.filter(e => e.pillar === 'quant' && e.signal.state === 'flag').length
  const quantMonitors = entries.filter(e => e.pillar === 'quant' && e.signal.state === 'monitor').length
  const qualFlags = entries.filter(e => e.pillar === 'qual' && e.signal.state === 'flag').length
  const qualMonitors = entries.filter(e => e.pillar === 'qual' && e.signal.state === 'monitor').length

  const bySegment = new Map<string, { segmentName: string; pillar: VerdictPillar; score: number; entries: RiskEntry[] }>()
  for (const entry of entries) {
    const existing = bySegment.get(entry.segmentId)
    if (existing) {
      existing.entries.push(entry)
    } else {
      bySegment.set(entry.segmentId, {
        segmentName: entry.segmentName,
        pillar: entry.pillar,
        score: entry.segmentScore,
        entries: [entry],
      })
    }
  }

  return { entries, weakSegments, quantFlags, quantMonitors, qualFlags, qualMonitors, bySegment }
}

// --- Advisor-style Risk Summary ---

function buildRiskNarrative(verdict: StockVerdictV2, analysis: RiskAnalysis): string {
  const riskPillar = verdict.pillars.find(p => p.pillar === 'risk')
  const riskScore = riskPillar?.score ?? 0
  const totalFlags = analysis.quantFlags + analysis.qualFlags
  const totalMonitors = analysis.quantMonitors + analysis.qualMonitors
  const weakNames = analysis.weakSegments.map(s => `${s.name} (${Math.round(s.score!)})`).join(', ')

  const scannerClean = riskScore >= 75
  const dominantPillar = analysis.quantFlags > analysis.qualFlags ? 'Quant' : analysis.qualFlags > analysis.quantFlags ? 'Qual' : null

  const sentences: string[] = []

  if (scannerClean && totalFlags === 0) {
    sentences.push(`Risk profile looks clean — the 35-parameter red-flag scanner found no issues and signal-level analysis shows no flagged concerns.`)
    if (totalMonitors > 0) {
      sentences.push(`${totalMonitors} signals are on watch across the analysis, worth periodic review but not actionable concerns today.`)
    }
    return sentences.join(' ')
  }

  if (scannerClean) {
    sentences.push(`The independent red-flag scanner is clear across all 35 parameters.`)
  } else {
    sentences.push(`The red-flag scanner has identified concerns — risk score stands at ${riskScore}/100 (${riskPillar?.label ?? 'ELEVATED'}).`)
  }

  if (totalFlags > 0) {
    if (dominantPillar) {
      const dominantCount = dominantPillar === 'Quant' ? analysis.quantFlags : analysis.qualFlags
      const otherCount = dominantPillar === 'Quant' ? analysis.qualFlags : analysis.quantFlags
      sentences.push(`Signal-level analysis reveals ${totalFlags} flagged concerns, with ${dominantCount} concentrated in ${dominantPillar} fundamentals${otherCount > 0 ? ` and ${otherCount} in ${dominantPillar === 'Quant' ? 'Qual' : 'Quant'}` : ''}.`)
    } else {
      sentences.push(`Signal-level analysis surfaces ${totalFlags} flagged concerns, evenly split between Quant and Qual fundamentals.`)
    }
  }

  if (analysis.weakSegments.length > 0) {
    sentences.push(`Structurally weak areas — ${weakNames} — deserve close attention as they anchor the risk profile.`)
  }

  if (totalMonitors > 0) {
    sentences.push(`An additional ${totalMonitors} signals are on the watchlist for developing trends.`)
  }

  return sentences.join(' ')
}

interface SummaryProps {
  verdict: StockVerdictV2
}

export function RiskTabSummary({ verdict }: SummaryProps) {
  const analysis = analyzeRisk(verdict)
  const narrative = buildRiskNarrative(verdict, analysis)
  const riskPillar = verdict.pillars.find(p => p.pillar === 'risk')
  const riskScore = riskPillar?.score ?? 0
  const band = getScoreBandV2(riskScore)

  return (
    <div className="rounded-xl border border-white/10 bg-dark-800/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className={cn('w-4 h-4', band.colorClass)} />
        <span className="text-sm font-semibold text-white">Risk Assessment</span>
        <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded', band.bgClass, band.colorClass)}>
          {riskPillar?.label ?? 'N/A'}
        </span>
      </div>
      <p className="text-xs text-neutral-300 leading-relaxed">{narrative}</p>
    </div>
  )
}

// --- Cumulative Risk View with Quant | Qual sub-tabs ---

type SubTab = 'quant' | 'qual'

interface Props {
  verdict: StockVerdictV2
}

export function CumulativeRiskView({ verdict }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('quant')
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null)

  const analysis = analyzeRisk(verdict)
  const { entries, weakSegments, quantFlags, quantMonitors, qualFlags, qualMonitors, bySegment } = analysis

  const filteredGroups = [...bySegment.entries()]
    .filter(([, group]) => group.pillar === activeSubTab)
    .sort((a, b) => {
      const aFlags = a[1].entries.filter(e => e.signal.state === 'flag').length
      const bFlags = b[1].entries.filter(e => e.signal.state === 'flag').length
      return bFlags - aFlags
    })

  const filteredWeak = weakSegments.filter(s => {
    const pillar = verdict.pillars.find(p => p.segments.some(seg => seg.id === s.id))
    return pillar?.pillar === activeSubTab
  })

  const tabFlagCount = activeSubTab === 'quant' ? quantFlags : qualFlags
  const tabMonitorCount = activeSubTab === 'quant' ? quantMonitors : qualMonitors
  const totalFlags = quantFlags + qualFlags
  const totalMonitors = quantMonitors + qualMonitors

  if (entries.length === 0 && weakSegments.length === 0) {
    return (
      <div className="rounded-xl border border-success-500/20 bg-success-500/5 p-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-success-400" />
          <span className="text-sm font-medium text-success-400">No risk signals from analysis</span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">All Quant and Qual signals are in healthy range.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-dark-800/50 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-400" />
            <span className="text-sm font-semibold text-white">Risk Signals from Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            {totalFlags > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-destructive-500/20 text-destructive-400">
                {totalFlags} flagged
              </span>
            )}
            {totalMonitors > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-warning-500/20 text-warning-400">
                {totalMonitors} monitor
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quant | Qual sub-tabs */}
      <div className="flex border-b border-white/5">
        <SubTabButton
          active={activeSubTab === 'quant'}
          onClick={() => { setActiveSubTab('quant'); setExpandedSegment(null) }}
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          label="Quant"
          flagCount={quantFlags}
          monitorCount={quantMonitors}
          color="text-primary-400"
        />
        <SubTabButton
          active={activeSubTab === 'qual'}
          onClick={() => { setActiveSubTab('qual'); setExpandedSegment(null) }}
          icon={<Brain className="w-3.5 h-3.5" />}
          label="Qual"
          flagCount={qualFlags}
          monitorCount={qualMonitors}
          color="text-purple-400"
        />
      </div>

      {/* Weak segments callout for active tab */}
      {filteredWeak.length > 0 && (
        <div className="px-3 py-2 border-b border-white/5 bg-destructive-500/5">
          <div className="flex items-center gap-1.5 text-[11px] text-destructive-400 font-medium flex-wrap">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>Weak:</span>
            {filteredWeak.map(s => (
              <span key={s.id} className="px-1.5 py-0.5 rounded bg-destructive-500/20 text-[10px]">
                {s.name} ({Math.round(s.score!)})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Segment list for active tab */}
      {filteredGroups.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-xs text-neutral-500">No flagged signals in {activeSubTab === 'quant' ? 'Quant' : 'Qual'} segments</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {filteredGroups.map(([segId, group]) => {
            const isExpanded = expandedSegment === segId
            const band = getScoreBandV2(group.score)
            const flags = group.entries.filter(e => e.signal.state === 'flag')
            const monitors = group.entries.filter(e => e.signal.state === 'monitor')

            return (
              <div key={segId}>
                <button
                  onClick={() => setExpandedSegment(prev => prev === segId ? null : segId)}
                  className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-dark-700/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{group.segmentName}</span>
                      <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded', band.bgClass, band.colorClass)}>
                        {Math.round(group.score)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {flags.length > 0 && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-destructive-500/15 text-destructive-400">
                        {flags.length} flag{flags.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {monitors.length > 0 && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-warning-500/15 text-warning-400">
                        {monitors.length} watch
                      </span>
                    )}
                    <ChevronDown className={cn('w-3.5 h-3.5 text-neutral-500 transition-transform', isExpanded && 'rotate-180')} />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-1.5">
                        {group.entries.map((entry, i) => (
                          <div
                            key={`${entry.signal.id}-${i}`}
                            className={cn(
                              'flex items-start gap-2 p-2 rounded-lg text-xs',
                              entry.signal.state === 'flag' ? 'bg-destructive-500/5' : 'bg-warning-500/5'
                            )}
                          >
                            <div className={cn(
                              'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                              entry.signal.state === 'flag' ? 'bg-destructive-400' : 'bg-warning-400'
                            )} />
                            <div>
                              <span className="font-medium text-white">{entry.signal.name}</span>
                              <p className="text-neutral-400 mt-0.5 leading-relaxed">{entry.signal.userText}</p>
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
      )}
    </div>
  )
}

function SubTabButton({
  active,
  onClick,
  icon,
  label,
  flagCount,
  monitorCount,
  color,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  flagCount: number
  monitorCount: number
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors relative',
        active ? 'text-white bg-dark-700/50' : 'text-neutral-500 hover:text-neutral-300'
      )}
    >
      <span className={cn(active ? color : 'text-neutral-500')}>{icon}</span>
      <span>{label}</span>
      {flagCount > 0 && (
        <span className={cn(
          'text-[9px] font-semibold px-1.5 py-0.5 rounded',
          active ? 'bg-destructive-500/20 text-destructive-400' : 'bg-dark-700 text-neutral-500'
        )}>
          {flagCount}
        </span>
      )}
      {monitorCount > 0 && (
        <span className={cn(
          'text-[9px] font-semibold px-1.5 py-0.5 rounded',
          active ? 'bg-warning-500/20 text-warning-400' : 'bg-dark-700 text-neutral-500'
        )}>
          {monitorCount}
        </span>
      )}
      {active && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-400 rounded-full" />
      )}
    </button>
  )
}
