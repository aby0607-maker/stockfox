import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftRight, Plus, X, ChevronDown, Trophy, Star, BarChart3, Brain, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { stocks } from '@/data/stocks'
import { getVerdictV2 } from '@/data/verdictsV2'
import { getScoreBandV2 } from '@/lib/scoring'
import { useAppStore } from '@/store/useAppStore'
import { StaggerContainer, StaggerItem } from '@/components/motion'
import type { StockVerdictV2, VerdictPillar } from '@/types'

// ── Pillar config ──────────────────────────────────────────────

const PILLAR_CONFIG: Record<VerdictPillar, { label: string; icon: typeof BarChart3 }> = {
  quant: { label: 'Quantitative', icon: BarChart3 },
  qual: { label: 'Qualitative', icon: Brain },
  risk: { label: 'Risk', icon: Shield },
}

// ── Stock Selector ─────────────────────────────────────────────

function StockSelector({
  selectedId,
  onSelect,
  excludeIds,
  onRemove,
  canRemove,
  verdictV2,
  isWinner,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  excludeIds: string[]
  onRemove?: () => void
  canRemove?: boolean
  verdictV2?: StockVerdictV2
  isWinner?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const availableStocks = stocks.filter(s => !excludeIds.includes(s.id) || s.id === selectedId)
  const selectedStock = selectedId ? stocks.find(s => s.id === selectedId) : null

  return (
    <div className="relative">
      <motion.div
        className={cn(
          'p-4 rounded-xl bg-dark-800/80 backdrop-blur-xl border transition-all duration-200',
          isWinner ? 'border-success-500/50 shadow-glow-green' : 'border-white/10',
          'hover:border-primary-500/30'
        )}
        whileHover={{ scale: 1.01 }}
      >
        {/* Winner badge */}
        {isWinner && (
          <div className="absolute -top-2 -right-2">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-6 h-6 rounded-full bg-success-500 flex items-center justify-center shadow-glow-green"
            >
              <Trophy className="w-3 h-3 text-white" />
            </motion.div>
          </div>
        )}

        {/* Dropdown trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <span className="text-xs text-neutral-500 uppercase tracking-wide">
            {selectedStock ? selectedStock.sector : 'Select Stock'}
          </span>
          <ChevronDown className={cn(
            'w-4 h-4 text-neutral-500 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {/* Stock info — V2 */}
        {selectedStock && verdictV2 ? (
          <div className="mt-3 text-center">
            <h3 className="text-lg font-semibold text-white">{selectedStock.symbol}</h3>
            <p className="text-xs text-neutral-400 truncate">{selectedStock.name}</p>

            <div className="mt-3 flex flex-col items-center gap-1.5">
              {/* Overall score */}
              {(() => {
                const band = getScoreBandV2(verdictV2.overallScore)
                return (
                  <>
                    <span className={cn('text-2xl font-bold', band.colorClass)}>
                      {verdictV2.overallScore}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                      band.bgClass, band.colorClass
                    )}>
                      {verdictV2.overallLabel}
                    </span>
                  </>
                )
              })()}
            </div>
          </div>
        ) : (
          <div className="mt-3 py-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-dark-700 flex items-center justify-center mb-2">
              <Plus className="w-6 h-6 text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-500">Select a stock</p>
          </div>
        )}

        {/* Remove button */}
        {canRemove && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="absolute top-2 right-2 p-1 rounded-full bg-dark-700 hover:bg-destructive-500/20 text-neutral-500 hover:text-destructive-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </motion.div>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 mt-2 w-full rounded-lg bg-dark-700 border border-white/10 shadow-xl overflow-hidden"
          >
            {availableStocks.map(stock => (
              <button
                key={stock.id}
                onClick={() => {
                  onSelect(stock.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-dark-600 transition-colors',
                  selectedId === stock.id && 'bg-primary-500/10'
                )}
              >
                <div className="font-medium text-white">{stock.symbol}</div>
                <div className="text-xs text-neutral-500">{stock.name}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Pillar comparison row ──────────────────────────────────────

function PillarRow({
  pillarKey,
  verdicts,
  stockIds,
  isExpanded,
  onToggle,
}: {
  pillarKey: VerdictPillar
  verdicts: (StockVerdictV2 | undefined)[]
  stockIds: string[]
  isExpanded: boolean
  onToggle: () => void
}) {
  const config = PILLAR_CONFIG[pillarKey]
  const Icon = config.icon

  const pillarData = verdicts.map(v =>
    v?.pillars.find(p => p.pillar === pillarKey)
  )
  const scores = pillarData.map(p => p?.score)
  const maxScore = Math.max(...scores.filter((s): s is number => s !== undefined))
  const winnerIndex = scores.findIndex(s => s === maxScore)

  // Get segments/factors for expanded view
  const segments = pillarData.find(p => p)?.segments || []

  return (
    <div className="border-b border-white/5 last:border-0">
      {/* Pillar header row */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-dark-700/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 text-left">
          <Icon className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-semibold text-white">{config.label}</span>
        </div>

        {/* Score cells */}
        {scores.map((score, i) => (
          <div key={stockIds[i] || i} className="w-16 text-center">
            {score !== undefined ? (
              <span className={cn(
                'text-sm font-bold tabular-nums',
                i === winnerIndex ? 'text-success-400' : 'text-neutral-300'
              )}>
                {Math.round(score)}
                {i === winnerIndex && (
                  <Star className="inline w-3 h-3 ml-0.5 text-success-400 fill-success-400" />
                )}
              </span>
            ) : (
              <span className="text-neutral-600">—</span>
            )}
          </div>
        ))}

        <ChevronDown className={cn(
          'w-4 h-4 text-neutral-500 transition-transform',
          isExpanded && 'rotate-180'
        )} />
      </button>

      {/* Expanded: segment/factor rows */}
      <AnimatePresence>
        {isExpanded && segments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-dark-800/50"
          >
            <div className="px-4 py-2 space-y-0.5">
              {segments.map(seg => {
                const segScores = verdicts.map(v => {
                  const pillar = v?.pillars.find(p => p.pillar === pillarKey)
                  return pillar?.segments.find(s => s.id === seg.id)?.score
                })
                const segMax = Math.max(...segScores.filter((s): s is number => s !== undefined))
                const segWinner = segScores.findIndex(s => s === segMax)

                return (
                  <div key={seg.id} className="flex items-center gap-4 py-1.5">
                    <div className="flex-1 flex items-center gap-2">
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        seg.isSuppressed ? 'bg-destructive-500' :
                        seg.status === 'positive' ? 'bg-success-500' :
                        seg.status === 'negative' ? 'bg-destructive-500' :
                        'bg-neutral-500'
                      )} />
                      <span className="text-xs text-neutral-400">{seg.name}</span>
                      {seg.scoringType === 'context' && (
                        <span className="text-[9px] text-neutral-600 uppercase">ctx</span>
                      )}
                    </div>
                    {segScores.map((score, i) => (
                      <div key={stockIds[i] || i} className="w-16 text-center">
                        {score !== undefined ? (
                          <span className={cn(
                            'text-xs font-medium tabular-nums',
                            i === segWinner ? 'text-success-400' : 'text-neutral-400'
                          )}>
                            {Math.round(score)}
                          </span>
                        ) : seg.scoringType === 'context' ? (
                          <span className="text-[10px] text-neutral-600">—</span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </div>
                    ))}
                    <div className="w-4" />
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

// ── Main Compare page ──────────────────────────────────────────

export function Compare() {
  const { currentProfileId } = useAppStore()
  const [selectedStockIds, setSelectedStockIds] = useState<(string | null)[]>(['zomato', 'axisbank'])
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null)

  // Get V2 verdicts
  const verdictsV2 = useMemo(() => {
    return selectedStockIds.map(id =>
      id ? getVerdictV2(id, currentProfileId) : undefined
    )
  }, [selectedStockIds, currentProfileId])

  // Find winner (highest overall score)
  const winnerIndex = useMemo(() => {
    const scores = verdictsV2.map(v => v?.overallScore ?? 0)
    const maxScore = Math.max(...scores)
    return scores.indexOf(maxScore)
  }, [verdictsV2])

  // Stock symbols for display
  const stockSymbols = selectedStockIds.map(id =>
    id ? stocks.find(s => s.id === id)?.symbol || '' : ''
  )

  // Handlers
  const handleSelectStock = (index: number, stockId: string) => {
    const newIds = [...selectedStockIds]
    newIds[index] = stockId
    setSelectedStockIds(newIds)
  }

  const handleAddStock = () => {
    if (selectedStockIds.length < 3) {
      setSelectedStockIds([...selectedStockIds, null])
    }
  }

  const handleRemoveStock = (index: number) => {
    if (selectedStockIds.length > 2) {
      const newIds = selectedStockIds.filter((_, i) => i !== index)
      setSelectedStockIds(newIds)
    }
  }

  const hasPillars = verdictsV2.some(v => v?.pillars?.length)

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary-500/20">
            <ArrowLeftRight className="w-5 h-5 text-primary-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Compare Stocks</h1>
        </div>
        <p className="text-sm text-neutral-500">
          Side-by-side analysis across Quant, Qual & Risk pillars
        </p>
      </motion.div>

      {/* Stock Selectors */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {selectedStockIds.map((stockId, index) => (
          <StaggerItem key={index}>
            <StockSelector
              selectedId={stockId}
              onSelect={(id) => handleSelectStock(index, id)}
              excludeIds={selectedStockIds.filter((id): id is string => id !== null && id !== stockId)}
              onRemove={() => handleRemoveStock(index)}
              canRemove={selectedStockIds.length > 2}
              verdictV2={verdictsV2[index]}
              isWinner={index === winnerIndex && verdictsV2[index] !== undefined}
            />
          </StaggerItem>
        ))}

        {/* Add stock button */}
        {selectedStockIds.length < 3 && (
          <motion.button
            onClick={handleAddStock}
            className={cn(
              'p-4 rounded-xl border-2 border-dashed border-white/10',
              'flex flex-col items-center justify-center gap-2',
              'hover:border-primary-500/30 hover:bg-dark-800/50 transition-all',
              'min-h-[180px]'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-8 h-8 text-neutral-600" />
            <span className="text-sm text-neutral-500">Add Stock</span>
          </motion.button>
        )}
      </div>

      {/* ── Pillar Comparison Table ── */}
      {hasPillars && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-dark-800/80 backdrop-blur-xl border border-white/10 overflow-hidden"
        >
          {/* Table header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Pillar Analysis</h3>
              <p className="text-xs text-neutral-500">Expand to see segments & factors</p>
            </div>
            {stockSymbols.map((symbol, i) => (
              <div
                key={i}
                className={cn(
                  'w-16 text-center text-xs font-semibold',
                  i === winnerIndex ? 'text-success-400' : 'text-neutral-300'
                )}
              >
                {symbol || '—'}
              </div>
            ))}
            <div className="w-4" />
          </div>

          {/* Overall score row */}
          <div className="px-4 py-3 flex items-center gap-4 border-b border-white/5 bg-dark-700/20">
            <div className="flex-1 text-left">
              <span className="text-sm font-bold text-white">Overall</span>
            </div>
            {verdictsV2.map((v, i) => (
              <div key={selectedStockIds[i] || i} className="w-16 text-center">
                {v ? (
                  <span className={cn(
                    'text-sm font-bold tabular-nums',
                    i === winnerIndex ? 'text-success-400' : 'text-neutral-300'
                  )}>
                    {v.overallScore}
                    {i === winnerIndex && (
                      <Star className="inline w-3 h-3 ml-0.5 text-success-400 fill-success-400" />
                    )}
                  </span>
                ) : (
                  <span className="text-neutral-600">—</span>
                )}
              </div>
            ))}
            <div className="w-4" />
          </div>

          {/* Pillar rows */}
          <StaggerContainer staggerDelay={0.03} initialDelay={0.1}>
            {(['quant', 'qual', 'risk'] as VerdictPillar[]).map(pillarKey => (
              <StaggerItem key={pillarKey}>
                <PillarRow
                  pillarKey={pillarKey}
                  verdicts={verdictsV2}
                  stockIds={selectedStockIds.filter((id): id is string => id !== null)}
                  isExpanded={expandedPillar === pillarKey}
                  onToggle={() => setExpandedPillar(
                    expandedPillar === pillarKey ? null : pillarKey
                  )}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </motion.div>
      )}

      {/* ── Verdict Summary ── */}
      {verdictsV2.filter(v => v).length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-dark-800/80 backdrop-blur-xl border border-white/10 p-4"
        >
          <h3 className="text-sm font-semibold text-white mb-3">Verdict Summary</h3>
          <div className="space-y-3">
            {verdictsV2.map((v, i) => {
              if (!v) return null
              const stock = stocks.find(s => s.id === selectedStockIds[i])
              const band = getScoreBandV2(v.overallScore)

              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn(
                    'w-2 h-2 mt-1.5 rounded-full flex-shrink-0',
                    i === winnerIndex ? 'bg-success-400' : 'bg-neutral-600'
                  )} />
                  <div>
                    <span className="font-medium text-white">{stock?.symbol}: </span>
                    <span className={cn('text-xs font-semibold mr-1', band.colorClass)}>
                      {v.overallLabel}
                    </span>
                    <span className="text-sm text-neutral-400">
                      {v.overallSummary}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
