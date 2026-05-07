import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, ArrowDown, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import { getProfileWeightsV2 } from '@/data/profiles'
import { MOCK_DELTAS } from './mockDeltas'
import { SignalGroupCard } from '@/components/scoring'
import { RedFlagScanner } from '@/components/stock-analysis/RedFlagScanner'
import { CumulativeRiskView, RiskTabSummary } from './CumulativeRiskView'
import { PillarTabBar, TabContentWrapper, useTabDirection } from './PillarTabBar'
import type { StockVerdictV2, SegmentVerdictV2, VerdictPillar } from '@/types'

type SortMode = 'importance' | 'recent'

interface Props {
  verdict: StockVerdictV2
  stockId: string
  profileId: string
}

export function VariantB_DeltaSort({ verdict, stockId, profileId }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('importance')
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<VerdictPillar>('quant')
  const { getDirection, updatePrev } = useTabDirection()

  const direction = getDirection(activeTab)
  const weights = getProfileWeightsV2(profileId)
  const deltas = MOCK_DELTAS[stockId] || {}

  function handleTabClick(pillar: VerdictPillar) {
    updatePrev(activeTab)
    setActiveTab(pillar)
    setExpandedSegment(null)
  }

  const activePillar = verdict.pillars.find(p => p.pillar === activeTab)
  const activeSegments = activePillar?.segments || []

  // Build sortable segment list within current tab
  const segmentsWithMeta = activeSegments.map(seg => {
    const segWeightMap = activeTab === 'quant' ? weights.quantWeights : weights.qualWeights
    const segWeight = (segWeightMap as Record<string, number>)[seg.id] || 0
    const delta = deltas[seg.id] || 0
    return { segment: seg, weight: segWeight, delta }
  })

  const sorted = [...segmentsWithMeta].sort((a, b) => {
    if (sortMode === 'importance') return b.weight - a.weight
    return Math.abs(b.delta) - Math.abs(a.delta)
  })

  // Top 3 movers within this tab
  const top3Ids = [...segmentsWithMeta]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)
    .map(s => s.segment.id)

  return (
    <div className="space-y-0">
      <PillarTabBar
        verdict={verdict}
        activeTab={activeTab}
        onTabChange={handleTabClick}
        layoutId="tab-b"
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
            {/* Sort toggle */}
            <div className="flex gap-1 p-1 rounded-xl bg-dark-800 border border-white/5 mb-3">
              <SortButton
                active={sortMode === 'importance'}
                onClick={() => setSortMode('importance')}
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                label="Importance"
                layoutId={`sort-${activeTab}`}
              />
              <SortButton
                active={sortMode === 'recent'}
                onClick={() => setSortMode('recent')}
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Recent Changes"
                layoutId={`sort-${activeTab}`}
              />
            </div>

            {/* Sorted segment list */}
            {sorted.map(({ segment, weight, delta }) => {
              const isTopMover = sortMode === 'recent' && top3Ids.includes(segment.id)
              return (
                <DeltaSegmentRow
                  key={segment.id}
                  segment={segment}
                  weight={weight}
                  delta={delta}
                  isTopMover={isTopMover}
                  sortMode={sortMode}
                  isExpanded={expandedSegment === segment.id}
                  onToggle={() => setExpandedSegment(prev => prev === segment.id ? null : segment.id)}
                />
              )
            })}
          </>
        )}
      </TabContentWrapper>
    </div>
  )
}

function SortButton({
  active,
  onClick,
  icon,
  label,
  layoutId,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  layoutId: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors relative',
        active ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
      )}
    >
      {active && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 bg-dark-700 rounded-lg border border-white/10"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  )
}

function DeltaSegmentRow({
  segment,
  weight,
  delta,
  isTopMover,
  sortMode,
  isExpanded,
  onToggle,
}: {
  segment: SegmentVerdictV2
  weight: number
  delta: number
  isTopMover: boolean
  sortMode: SortMode
  isExpanded: boolean
  onToggle: () => void
}) {
  const score = segment.score ?? 0
  const band = getScoreBandV2(score, segment.isSuppressed)
  const hasDetail = segment.signalGroups && segment.signalGroups.length > 0

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      isTopMover ? 'border-primary-500/30 bg-dark-800 shadow-[0_0_12px_rgba(99,102,241,0.08)]' : '',
      isExpanded ? 'border-white/10 bg-dark-800' : !isTopMover ? 'border-white/5 bg-dark-800/50' : '',
    )}>
      <button onClick={onToggle} className="w-full flex items-center gap-2.5 p-3 text-left">
        <div className={cn('text-base font-bold w-7 text-right flex-shrink-0', band.colorClass)}>
          {Math.round(score)}
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

        <DeltaBadge delta={delta} />

        {sortMode === 'importance' && (
          <span className="text-[9px] text-neutral-600 w-7 text-right flex-shrink-0">
            {weight}%
          </span>
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

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="text-[10px] font-medium text-neutral-600 px-1.5 py-0.5 rounded bg-dark-700 flex-shrink-0">
        —
      </span>
    )
  }
  const isPositive = delta > 0
  const Icon = isPositive ? ArrowUp : ArrowDown
  return (
    <span className={cn(
      'flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0',
      isPositive ? 'bg-success-500/15 text-success-400' : 'bg-destructive-500/15 text-destructive-400'
    )}>
      <Icon className="w-2.5 h-2.5" />
      {isPositive ? '+' : ''}{delta}
    </span>
  )
}
