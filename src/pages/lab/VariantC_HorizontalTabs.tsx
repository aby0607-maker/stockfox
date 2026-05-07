import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import { SignalGroupCard } from '@/components/scoring'
import { RedFlagScanner } from '@/components/stock-analysis/RedFlagScanner'
import { CumulativeRiskView, RiskTabSummary } from './CumulativeRiskView'
import { PillarTabBar, TabContentWrapper, useTabDirection } from './PillarTabBar'
import type { StockVerdictV2, SegmentVerdictV2, VerdictPillar } from '@/types'

interface Props {
  verdict: StockVerdictV2
}

export function VariantC_HorizontalTabs({ verdict }: Props) {
  const [activeTab, setActiveTab] = useState<VerdictPillar>('quant')
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null)
  const { getDirection, updatePrev } = useTabDirection()

  const activePillar = verdict.pillars.find(p => p.pillar === activeTab)
  const direction = getDirection(activeTab)

  function handleTabClick(pillar: VerdictPillar) {
    updatePrev(activeTab)
    setActiveTab(pillar)
    setExpandedSegment(null)
  }

  return (
    <div className="space-y-0">
      <PillarTabBar
        verdict={verdict}
        activeTab={activeTab}
        onTabChange={handleTabClick}
        layoutId="tab-c"
      />

      <TabContentWrapper activeTab={activeTab} direction={direction}>
        {activePillar && (
          <>
            <p className="text-xs text-neutral-400 px-1 mb-3">{activePillar.summary}</p>

            {activeTab === 'risk' ? (
              <>
                <RiskTabSummary verdict={verdict} />
                <RedFlagScanner verdict={null} verdictV2={verdict} news={[]} />
                <CumulativeRiskView verdict={verdict} />
              </>
            ) : (
              activePillar.segments.map(segment => (
                <SegmentRow
                  key={segment.id}
                  segment={segment}
                  isExpanded={expandedSegment === segment.id}
                  onToggle={() => setExpandedSegment(prev => prev === segment.id ? null : segment.id)}
                />
              ))
            )}
          </>
        )}
      </TabContentWrapper>
    </div>
  )
}

function SegmentRow({
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
  const hasSignalGroups = segment.signalGroups && segment.signalGroups.length > 0

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      isExpanded ? 'border-white/10 bg-dark-800' : 'border-white/5 bg-dark-800/50',
    )}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left group">
        <div className="relative flex-shrink-0">
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#252532" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="14"
              fill="none"
              stroke={band.hexColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 14}
              strokeDashoffset={2 * Math.PI * 14 * (1 - score / 100)}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          </svg>
          <span className={cn('absolute inset-0 flex items-center justify-center text-[10px] font-bold', band.colorClass)}>
            {Math.round(score)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{segment.name}</span>
            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0', band.bgClass, band.colorClass)}>
              {band.shortLabel}
            </span>
          </div>
          {segment.quickInsight && (
            <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{segment.quickInsight}</p>
          )}
        </div>

        {hasSignalGroups && (
          <ChevronDown className={cn('w-4 h-4 text-neutral-500 transition-transform flex-shrink-0', isExpanded && 'rotate-180')} />
        )}
      </button>

      <div className="px-3 pb-2">
        <div className="h-1 rounded-full bg-dark-700 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: band.hexColor }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasSignalGroups && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
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
