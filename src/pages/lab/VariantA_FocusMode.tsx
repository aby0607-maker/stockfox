import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import { FOCUS_MODE_DEFAULTS } from './focusModeConfig'
import { RedFlagScanner } from '@/components/stock-analysis/RedFlagScanner'
import { SignalGroupCard } from '@/components/scoring'
import { CumulativeRiskView, RiskTabSummary } from './CumulativeRiskView'
import { PillarTabBar, TabContentWrapper, useTabDirection } from './PillarTabBar'
import type { StockVerdictV2, SegmentVerdictV2, VerdictPillar } from '@/types'

interface Props {
  verdict: StockVerdictV2
  profileId: string
}

export function VariantA_FocusMode({ verdict, profileId }: Props) {
  const defaults = FOCUS_MODE_DEFAULTS[profileId] || FOCUS_MODE_DEFAULTS['priya'] || []
  const [selected, setSelected] = useState<Set<string>>(new Set(defaults))
  const [saved, setSaved] = useState(false)
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<VerdictPillar>('quant')
  const { getDirection, updatePrev } = useTabDirection()

  const direction = getDirection(activeTab)

  useEffect(() => {
    const stored = localStorage.getItem(`lab-focus-${profileId}`)
    if (stored) {
      setSelected(new Set(JSON.parse(stored)))
    } else {
      setSelected(new Set(defaults))
    }
  }, [profileId])

  function handleTabClick(pillar: VerdictPillar) {
    updatePrev(activeTab)
    setActiveTab(pillar)
    setExpandedSegment(null)
  }

  const activePillar = verdict.pillars.find(p => p.pillar === activeTab)
  const activeSegments = activePillar?.segments || []

  // How many are selected within this tab
  const selectedInTab = activeSegments.filter(s => selected.has(s.id))
  const allInTabSelected = activeSegments.length > 0 && selectedInTab.length === activeSegments.length

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }

  function toggleAllInTab() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allInTabSelected) {
        activeSegments.forEach(s => next.delete(s.id))
      } else {
        activeSegments.forEach(s => next.add(s.id))
      }
      return next
    })
    setSaved(false)
  }

  function saveDefaults() {
    localStorage.setItem(`lab-focus-${profileId}`, JSON.stringify([...selected]))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const filteredSegments = activeSegments.filter(s => selected.has(s.id))

  return (
    <div className="space-y-0">
      <PillarTabBar
        verdict={verdict}
        activeTab={activeTab}
        onTabChange={handleTabClick}
        layoutId="tab-a"
      />

      <TabContentWrapper activeTab={activeTab} direction={direction}>
        {activeTab === 'risk' ? (
          <>
            <RiskTabSummary verdict={verdict} />
            <RedFlagScanner verdict={null} verdictV2={verdict} news={[]} />
            <CumulativeRiskView verdict={verdict} />
          </>
        ) : (
          <>
            {/* Chip selector for this tab's segments */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <Filter className="w-3.5 h-3.5" />
                  <span>{selectedInTab.length} of {activeSegments.length} shown</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAllInTab}
                    className={cn(
                      'text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-colors',
                      allInTabSelected
                        ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                        : 'border-white/10 text-neutral-400 hover:text-white'
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={saveDefaults}
                    className={cn(
                      'text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-colors',
                      saved
                        ? 'bg-success-500/20 border-success-500/40 text-success-400'
                        : 'border-white/10 text-neutral-400 hover:text-white'
                    )}
                  >
                    {saved ? '✓ Saved' : 'Save Default'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {activeSegments.map(seg => {
                  const isOn = selected.has(seg.id)
                  const score = seg.score ?? 0
                  const band = getScoreBandV2(score, seg.isSuppressed)
                  return (
                    <button
                      key={seg.id}
                      onClick={() => toggle(seg.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all',
                        isOn
                          ? 'bg-dark-700 border-white/15 text-white'
                          : 'bg-dark-800/50 border-white/5 text-neutral-500'
                      )}
                    >
                      <span className="truncate max-w-[120px]">{seg.name}</span>
                      <span className={cn('text-[9px] font-bold', isOn ? band.colorClass : 'text-neutral-600')}>
                        {Math.round(score)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filtered segments */}
            {filteredSegments.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-dark-800/50 p-6 text-center">
                <p className="text-sm text-neutral-400">Select segments above to focus your analysis</p>
              </div>
            ) : (
              filteredSegments.map(seg => (
                <FocusSegmentRow
                  key={seg.id}
                  segment={seg}
                  isExpanded={expandedSegment === seg.id}
                  onToggle={() => setExpandedSegment(prev => prev === seg.id ? null : seg.id)}
                />
              ))
            )}
          </>
        )}
      </TabContentWrapper>
    </div>
  )
}

function FocusSegmentRow({
  segment,
  isExpanded,
  onToggle,
}: {
  segment: SegmentVerdictV2
  isExpanded: boolean
  onToggle: () => void
}) {
  const score = segment.score ?? 0
  const band = getScoreBandV2(score, segment.isSuppressed)
  const hasDetail = segment.signalGroups && segment.signalGroups.length > 0

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      isExpanded ? 'border-white/10 bg-dark-800' : 'border-white/5 bg-dark-800/50',
    )}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        <div className={cn('text-lg font-bold w-8 text-center', band.colorClass)}>
          {Math.round(score)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{segment.name}</span>
            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded', band.bgClass, band.colorClass)}>
              {band.shortLabel}
            </span>
          </div>
          {segment.quickInsight && (
            <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{segment.quickInsight}</p>
          )}
        </div>
        <div className="w-16 h-1.5 rounded-full bg-dark-700 overflow-hidden flex-shrink-0">
          <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: band.hexColor }} />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && hasDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
              {segment.interpretation && (
                <p className="text-xs text-neutral-400 leading-relaxed py-1">{segment.interpretation}</p>
              )}
              {segment.signalGroups!.map(group => (
                <SignalGroupCard key={group.id} group={group} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
