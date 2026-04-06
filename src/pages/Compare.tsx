import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftRight, Plus, X, ChevronDown, ChevronRight, Trophy, Star, BarChart3, Brain, Shield, Loader2, AlertTriangle, CheckCircle, MinusCircle, Info, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getVerdictV2 } from '@/data/verdictsV2'
import { getScoreBandV2 } from '@/lib/scoring'
import { useAppStore } from '@/store/useAppStore'
import { resolveStock, isDemoStock, generatePeerGroupDetailed } from '@/services/stockService'
import { getCompanyBySymbol } from '@/services/cmots'
import { buildVerdictForStock } from '@/services/verdictService'
import { StaggerContainer, StaggerItem } from '@/components/motion'
import type { Stock, StockVerdictV2, VerdictPillar, SegmentVerdictV2 } from '@/types'

// ── Pillar config ──────────────────────────────────────────────

const PILLAR_CONFIG: Record<VerdictPillar, { label: string; icon: typeof BarChart3 }> = {
  quant: { label: 'Quantitative', icon: BarChart3 },
  qual: { label: 'Qualitative', icon: Brain },
  risk: { label: 'Risk', icon: Shield },
}

// ── Types ─────────────────────────────────────────────────────

interface ResolvedEntry {
  stock: Stock
  verdict?: StockVerdictV2
  loading: boolean
}

// ── Score Cell (reusable) ─────────────────────────────────────

function ScoreCell({ score, isWinner }: { score?: number; isWinner: boolean }) {
  if (score === undefined) return <span className="text-neutral-600">—</span>
  return (
    <span className={cn(
      'text-xs font-medium tabular-nums',
      isWinner ? 'text-success-400' : 'text-neutral-400',
    )}>
      {Math.round(score)}
      {isWinner && <Star className="inline w-2.5 h-2.5 ml-0.5 text-success-400 fill-success-400" />}
    </span>
  )
}

// ── Stock Selector ─────────────────────────────────────────────

function StockSelector({
  entry,
  onSelect,
  excludeIds,
  onRemove,
  canRemove,
  isWinner,
  availableOptions,
  defaultOpen = false,
}: {
  entry: ResolvedEntry | null
  onSelect: (symbol: string) => void
  excludeIds: string[]
  onRemove?: () => void
  canRemove?: boolean
  isWinner?: boolean
  availableOptions: { symbol: string; name: string; id: string }[]
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const filtered = availableOptions.filter(o => !excludeIds.includes(o.id) || o.id === entry?.stock.id)

  // The entire card is clickable to toggle dropdown
  const handleCardClick = () => setIsOpen(!isOpen)

  return (
    <div className="relative">
      <motion.div
        onClick={handleCardClick}
        className={cn(
          'p-4 rounded-xl bg-dark-800/80 backdrop-blur-xl border transition-all duration-200 cursor-pointer',
          isWinner ? 'border-success-500/50 shadow-glow-green' : 'border-white/10',
          'hover:border-primary-500/30',
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

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-500 uppercase tracking-wide">
            {entry?.stock.sector || 'Select Stock'}
          </span>
          <ChevronDown className={cn(
            'w-4 h-4 text-neutral-500 transition-transform',
            isOpen && 'rotate-180',
          )} />
        </div>

        {/* Stock info */}
        {entry ? (
          <div className="mt-3 text-center">
            <h3 className="text-lg font-semibold text-white">{entry.stock.symbol}</h3>
            <p className="text-xs text-neutral-400 truncate">{entry.stock.name}</p>
            {entry.loading ? (
              <div className="mt-4 flex justify-center">
                <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
              </div>
            ) : entry.verdict ? (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                {(() => {
                  const band = getScoreBandV2(entry.verdict.overallScore)
                  return (
                    <>
                      <span className={cn('text-2xl font-bold', band.colorClass)}>
                        {entry.verdict.overallScore}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold uppercase', band.bgClass, band.colorClass)}>
                        {entry.verdict.overallLabel}
                      </span>
                    </>
                  )
                })()}
              </div>
            ) : (
              <p className="mt-3 text-xs text-neutral-500">No verdict data</p>
            )}
          </div>
        ) : (
          <div className="mt-3 py-6 text-center">
            <Plus className="w-6 h-6 text-neutral-500 mx-auto mb-1" />
            <p className="text-sm text-neutral-500">Tap to select</p>
          </div>
        )}

        {/* Remove button */}
        {canRemove && onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
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
            className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto rounded-lg bg-dark-700 border border-white/10 shadow-xl"
          >
            {filtered.map(opt => (
              <button
                key={opt.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(opt.symbol)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-dark-600 transition-colors',
                  entry?.stock.id === opt.id && 'bg-primary-500/10',
                )}
              >
                <div className="font-medium text-white">{opt.symbol}</div>
                <div className="text-xs text-neutral-500 truncate">{opt.name}</div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-neutral-500">No peers available</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Signal state icon ────────────────────────────────────────

function SignalIcon({ state }: { state: string }) {
  if (state === 'strong') return <CheckCircle className="w-3 h-3 text-success-400 flex-shrink-0" />
  if (state === 'flag' || state === 'suppressed') return <AlertTriangle className="w-3 h-3 text-destructive-400 flex-shrink-0" />
  if (state === 'monitor') return <Info className="w-3 h-3 text-warning-400 flex-shrink-0" />
  return <MinusCircle className="w-3 h-3 text-neutral-600 flex-shrink-0" />
}

// ── Segment Detail Row (deep drill-down) ─────────────────────

function SegmentDetailRow({
  seg,
  pillarKey,
  verdicts,
  stockIds,
  isExpanded,
  onToggle,
}: {
  seg: SegmentVerdictV2
  pillarKey: VerdictPillar
  verdicts: (StockVerdictV2 | undefined)[]
  stockIds: string[]
  isExpanded: boolean
  onToggle: () => void
}) {
  const segScores = verdicts.map(v => {
    const pillar = v?.pillars.find(p => p.pillar === pillarKey)
    return pillar?.segments.find(s => s.id === seg.id)?.score
  })
  const segMax = Math.max(...segScores.filter((s): s is number => s !== undefined))
  const segWinner = segScores.findIndex(s => s === segMax)

  // Check if this segment has drill-down content
  const hasSignals = verdicts.some(v => {
    const pillar = v?.pillars.find(p => p.pillar === pillarKey)
    const s = pillar?.segments.find(s2 => s2.id === seg.id)
    return (s?.signalGroups && s.signalGroups.length > 0) || (s?.redFlags && s.redFlags.length > 0)
  })

  return (
    <div>
      {/* Segment score row */}
      <button
        onClick={hasSignals ? onToggle : undefined}
        className={cn(
          'w-full flex items-center gap-4 py-2 px-1',
          hasSignals && 'hover:bg-dark-700/30 cursor-pointer',
        )}
      >
        <div className="flex-1 flex items-center gap-2">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            seg.isSuppressed ? 'bg-destructive-500' :
            seg.status === 'positive' ? 'bg-success-500' :
            seg.status === 'negative' ? 'bg-destructive-500' :
            'bg-neutral-500',
          )} />
          <span className="text-xs text-neutral-400">{seg.name}</span>
          {seg.scoringType === 'context' && (
            <span className="text-[9px] text-neutral-600 uppercase" title="Informational — not weighted into pillar score">info</span>
          )}
          {hasSignals && (
            <ChevronRight className={cn(
              'w-3 h-3 text-neutral-600 transition-transform',
              isExpanded && 'rotate-90',
            )} />
          )}
        </div>
        {segScores.map((score, i) => (
          <div key={stockIds[i] || i} className="w-16 text-center">
            <ScoreCell score={score} isWinner={i === segWinner && score !== undefined} />
          </div>
        ))}
        <div className="w-4" />
      </button>

      {/* Signal drill-down */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pl-5 pr-1 pb-2 space-y-2">
              {/* Interpretations side-by-side */}
              <div className="flex gap-2">
                {verdicts.map((v, i) => {
                  const pillar = v?.pillars.find(p => p.pillar === pillarKey)
                  const s = pillar?.segments.find(s2 => s2.id === seg.id)
                  return (
                    <div key={stockIds[i] || i} className="flex-1 text-[10px] text-neutral-500 bg-dark-900/50 rounded p-2">
                      <span className="text-neutral-400 font-medium">{v?.ticker || stockIds[i]}:</span>{' '}
                      {s?.interpretation || '—'}
                    </div>
                  )
                })}
              </div>

              {/* Signal groups — show signals from each stock side by side */}
              {(() => {
                // Collect all signal group IDs across all verdicts
                const allGroups = new Map<string, string>()
                for (const v of verdicts) {
                  const pillar = v?.pillars.find(p => p.pillar === pillarKey)
                  const s = pillar?.segments.find(s2 => s2.id === seg.id)
                  for (const g of s?.signalGroups || []) {
                    if (!allGroups.has(g.id)) allGroups.set(g.id, g.name)
                  }
                }

                return [...allGroups.entries()].map(([groupId, groupName]) => (
                  <div key={groupId}>
                    <div className="text-[9px] text-neutral-600 uppercase font-semibold mb-1">{groupName}</div>
                    {/* Collect all signal IDs across all stocks for this group */}
                    {(() => {
                      const allSignalIds = new Map<string, string>()
                      for (const v of verdicts) {
                        const pillar = v?.pillars.find(p => p.pillar === pillarKey)
                        const s = pillar?.segments.find(s2 => s2.id === seg.id)
                        const g = s?.signalGroups?.find(g2 => g2.id === groupId)
                        for (const sig of g?.signals || []) {
                          if (!allSignalIds.has(sig.id)) allSignalIds.set(sig.id, sig.name)
                        }
                      }

                      return [...allSignalIds.entries()].map(([sigId, sigName]) => {
                        const sigScores = verdicts.map(v => {
                          const pillar = v?.pillars.find(p => p.pillar === pillarKey)
                          const s = pillar?.segments.find(s2 => s2.id === seg.id)
                          const g = s?.signalGroups?.find(g2 => g2.id === groupId)
                          return g?.signals.find(sig => sig.id === sigId)
                        })
                        const numericScores = sigScores.map(s => s?.score).filter((s): s is number => s !== undefined)
                        const sigMax = numericScores.length > 0 ? Math.max(...numericScores) : -1
                        const sigWinner = sigScores.findIndex(s => s?.score === sigMax)

                        return (
                          <div key={sigId} className="flex items-center gap-4 py-0.5">
                            <div className="flex-1 flex items-center gap-1.5 min-w-0">
                              <SignalIcon state={sigScores.find(s => s)?.state || 'not_applicable'} />
                              <span className="text-[10px] text-neutral-500 truncate">{sigName}</span>
                            </div>
                            {sigScores.map((sig, i) => (
                              <div key={stockIds[i] || i} className="w-16 text-center">
                                {sig ? (
                                  sig.score !== undefined ? (
                                    <ScoreCell score={sig.score} isWinner={i === sigWinner} />
                                  ) : (
                                    <span className={cn(
                                      'text-[10px]',
                                      sig.state === 'strong' ? 'text-success-400' :
                                      sig.state === 'flag' ? 'text-destructive-400' :
                                      sig.state === 'not_applicable' ? 'text-neutral-600' :
                                      'text-neutral-500',
                                    )}>
                                      {sig.gatePassed !== undefined
                                        ? (sig.gatePassed ? 'PASS' : 'FAIL')
                                        : sig.state === 'not_applicable' ? 'N/A' : sig.state?.toUpperCase()}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-neutral-600">—</span>
                                )}
                              </div>
                            ))}
                            <div className="w-4" />
                          </div>
                        )
                      })
                    })()}
                  </div>
                ))
              })()}

              {/* Red flags summary */}
              {verdicts.some(v => {
                const pillar = v?.pillars.find(p => p.pillar === pillarKey)
                const s = pillar?.segments.find(s2 => s2.id === seg.id)
                return s?.redFlags && s.redFlags.length > 0
              }) && (
                <div>
                  <div className="text-[9px] text-destructive-400 uppercase font-semibold mb-1">Red Flags</div>
                  <div className="flex gap-2">
                    {verdicts.map((v, i) => {
                      const pillar = v?.pillars.find(p => p.pillar === pillarKey)
                      const s = pillar?.segments.find(s2 => s2.id === seg.id)
                      const flags = s?.redFlags || []
                      return (
                        <div key={stockIds[i] || i} className="flex-1 space-y-0.5">
                          {flags.length > 0 ? flags.map((rf, fi) => (
                            <div key={fi} className="flex items-start gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-destructive-400 mt-0.5 flex-shrink-0" />
                              <span className="text-[10px] text-destructive-300">{rf.title}</span>
                            </div>
                          )) : (
                            <span className="text-[10px] text-neutral-600">None</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
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
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null)

  const pillarData = verdicts.map(v => v?.pillars.find(p => p.pillar === pillarKey))
  const scores = pillarData.map(p => p?.score)
  const maxScore = Math.max(...scores.filter((s): s is number => s !== undefined))
  const winnerIndex = scores.findIndex(s => s === maxScore)

  // Union of all segments across all verdicts for this pillar
  const allSegments = (() => {
    const seen = new Set<string>()
    const result: SegmentVerdictV2[] = []
    for (const p of pillarData) {
      for (const s of p?.segments || []) {
        if (!seen.has(s.id)) {
          seen.add(s.id)
          result.push(s)
        }
      }
    }
    return result
  })()

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
        {scores.map((score, i) => (
          <div key={stockIds[i] || i} className="w-16 text-center">
            {score !== undefined ? (
              <span className={cn(
                'text-sm font-bold tabular-nums',
                i === winnerIndex ? 'text-success-400' : 'text-neutral-300',
              )}>
                {Math.round(score)}
                {i === winnerIndex && <Star className="inline w-3 h-3 ml-0.5 text-success-400 fill-success-400" />}
              </span>
            ) : (
              <span className="text-neutral-600">—</span>
            )}
          </div>
        ))}
        <ChevronDown className={cn('w-4 h-4 text-neutral-500 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {/* Expanded: segment rows with deep drill-down */}
      <AnimatePresence>
        {isExpanded && allSegments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-dark-800/50"
          >
            <div className="px-4 py-2 space-y-0.5">
              {allSegments.map(seg => (
                <SegmentDetailRow
                  key={seg.id}
                  seg={seg}
                  pillarKey={pillarKey}
                  verdicts={verdicts}
                  stockIds={stockIds}
                  isExpanded={expandedSegment === seg.id}
                  onToggle={() => setExpandedSegment(expandedSegment === seg.id ? null : seg.id)}
                />
              ))}
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
  const [searchParams] = useSearchParams()
  const addSymbol = searchParams.get('add')

  const [entries, setEntries] = useState<Record<string, ResolvedEntry>>({})
  const [selectedSymbols, setSelectedSymbols] = useState<(string | null)[]>([null, null])
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null)
  const [peerOptions, setPeerOptions] = useState<{ symbol: string; name: string; id: string }[]>([])
  const [autoOpenIndex, setAutoOpenIndex] = useState<number | null>(null)
  const initDone = useRef(false)

  const resolveAndBuild = useCallback(async (symbol: string) => {
    if (entries[symbol.toUpperCase()]?.verdict) return

    setEntries(prev => ({
      ...prev,
      [symbol.toUpperCase()]: prev[symbol.toUpperCase()] || {
        stock: { id: symbol.toLowerCase(), symbol: symbol.toUpperCase(), name: symbol, sector: '', subSector: '', currentPrice: 0, previousClose: 0, change: 0, changePercent: 0, marketCap: 0, high52w: 0, low52w: 0, beta: 0, peerGroup: [] },
        loading: true,
      },
    }))

    try {
      const stock = await resolveStock(symbol)
      if (!stock) return

      setEntries(prev => ({ ...prev, [symbol.toUpperCase()]: { stock, loading: true } }))

      // Build peer options
      let foundPeers = false
      try {
        const company = await getCompanyBySymbol(symbol)
        if (company) {
          const detailedPeers = await generatePeerGroupDetailed(company)
          if (detailedPeers.length > 0) {
            foundPeers = true
            setPeerOptions(prev => {
              const existing = new Set(prev.map(p => p.symbol))
              return [...prev, ...detailedPeers.filter(p => !existing.has(p.symbol)).map(p => ({ symbol: p.symbol, name: p.name, id: p.symbol.toLowerCase() }))]
            })
          }
        }
      } catch { /* CMOTS peer lookup failed */ }

      if (!foundPeers && stock.peerGroup.length > 0) {
        setPeerOptions(prev => {
          const existing = new Set(prev.map(p => p.symbol))
          return [...prev, ...stock.peerGroup.filter(n => !existing.has(n.toUpperCase())).map(name => ({ symbol: name.toUpperCase(), name, id: name.toLowerCase() }))]
        })
      }

      let verdict: StockVerdictV2 | undefined
      if (isDemoStock(symbol)) verdict = getVerdictV2(symbol, currentProfileId) ?? undefined
      if (!verdict) {
        try { verdict = await buildVerdictForStock(stock, currentProfileId) }
        catch (err) { console.warn('[Compare] Failed to build verdict for', symbol, err) }
      }

      setEntries(prev => ({ ...prev, [symbol.toUpperCase()]: { stock, verdict, loading: false } }))
    } catch (err) {
      console.warn('[Compare] Failed to resolve', symbol, err)
      setEntries(prev => {
        const existing = prev[symbol.toUpperCase()]
        return existing ? { ...prev, [symbol.toUpperCase()]: { ...existing, loading: false } } : prev
      })
    }
  }, [entries, currentProfileId])

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    if (addSymbol) {
      setSelectedSymbols([addSymbol.toUpperCase(), null])
      resolveAndBuild(addSymbol)
    } else {
      setSelectedSymbols(['ZOMATO', 'AXISBANK'])
      resolveAndBuild('ZOMATO')
      resolveAndBuild('AXISBANK')
    }
  }, [addSymbol, resolveAndBuild])

  const handleSelectStock = (index: number, symbol: string) => {
    const newSymbols = [...selectedSymbols]
    newSymbols[index] = symbol.toUpperCase()
    setSelectedSymbols(newSymbols)
    setAutoOpenIndex(null)
    resolveAndBuild(symbol)
  }

  const handleAddStock = () => {
    if (selectedSymbols.length < 3) {
      setAutoOpenIndex(selectedSymbols.length)
      setSelectedSymbols([...selectedSymbols, null])
    }
  }

  const handleRemoveStock = (index: number) => {
    if (selectedSymbols.length > 2) {
      setSelectedSymbols(selectedSymbols.filter((_, i) => i !== index))
      setAutoOpenIndex(null)
    }
  }

  // Dropdown options: only peer stocks (no unrelated demo stocks)
  const selectedSet = new Set(selectedSymbols.filter(Boolean).map(s => s!.toUpperCase()))

  const availableOptions = peerOptions.filter(p => !selectedSet.has(p.symbol.toUpperCase()))

  const selectedEntries = selectedSymbols.map(sym => sym ? entries[sym] || null : null)
  const verdictsV2 = selectedEntries.map(e => e?.verdict)

  const winnerIndex = (() => {
    const scores = verdictsV2.map(v => v?.overallScore ?? 0)
    const maxScore = Math.max(...scores)
    return maxScore > 0 ? scores.indexOf(maxScore) : -1
  })()

  const stockSymbols = selectedSymbols.map(sym => sym || '')
  const hasPillars = verdictsV2.some(v => v?.pillars?.length)

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
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
        {selectedSymbols.map((_sym, index) => (
          <StaggerItem key={index}>
            <StockSelector
              entry={selectedEntries[index]}
              onSelect={(symbol) => handleSelectStock(index, symbol)}
              excludeIds={selectedSymbols.filter((s, i): s is string => s !== null && i !== index).map(s => s.toLowerCase())}
              onRemove={() => handleRemoveStock(index)}
              canRemove={selectedSymbols.length > 2}
              isWinner={index === winnerIndex && verdictsV2[index] !== undefined}
              availableOptions={availableOptions}
              defaultOpen={index === autoOpenIndex}
            />
          </StaggerItem>
        ))}

        {selectedSymbols.length < 3 && (
          <motion.button
            onClick={handleAddStock}
            className={cn(
              'p-4 rounded-xl border-2 border-dashed border-white/10',
              'flex flex-col items-center justify-center gap-2',
              'hover:border-primary-500/30 hover:bg-dark-800/50 transition-all',
              'min-h-[180px]',
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
              <p className="text-xs text-neutral-500">Expand pillars, then tap segments for signal details</p>
            </div>
            {stockSymbols.map((symbol, i) => (
              <div key={i} className={cn('w-16 text-center text-xs font-semibold', i === winnerIndex ? 'text-success-400' : 'text-neutral-300')}>
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
              <div key={selectedSymbols[i] || i} className="w-16 text-center">
                {v ? (
                  <span className={cn('text-sm font-bold tabular-nums', i === winnerIndex ? 'text-success-400' : 'text-neutral-300')}>
                    {v.overallScore}
                    {i === winnerIndex && <Star className="inline w-3 h-3 ml-0.5 text-success-400 fill-success-400" />}
                  </span>
                ) : <span className="text-neutral-600">—</span>}
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
                  stockIds={selectedSymbols.filter((s): s is string => s !== null)}
                  isExpanded={expandedPillar === pillarKey}
                  onToggle={() => setExpandedPillar(expandedPillar === pillarKey ? null : pillarKey)}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </motion.div>
      )}

      {/* ── Verdict Summary (score-led, sorted, prominent winner) ── */}
      {verdictsV2.filter(v => v).length >= 2 && (() => {
        // Sort stocks by score descending — winner naturally on top
        const ranked = verdictsV2
          .map((v, i) => ({ verdict: v, entry: selectedEntries[i], originalIndex: i }))
          .filter((r): r is typeof r & { verdict: StockVerdictV2 } => r.verdict !== undefined)
          .sort((a, b) => (b.verdict.overallScore) - (a.verdict.overallScore))

        const profile = useAppStore.getState().currentProfile

        const thesisLabels: Record<string, string> = {
          growth: 'Growth', value: 'Value', comprehensive: 'Comprehensive',
          balanced: 'Balanced', learning: 'Learning', compounding: 'Compounding',
          remote: 'Remote Investing', income: 'Income', preservation: 'Capital Preservation',
          momentum: 'Momentum',
        }
        const riskLabels: Record<string, string> = {
          'very-conservative': 'Very Conservative', conservative: 'Conservative',
          moderate: 'Moderate', aggressive: 'Aggressive',
        }
        const horizonLabels: Record<string, string> = {
          short: '1-2Y', medium: '2-3Y', long: '3-5Y', 'very-long': '5+ years',
        }

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-white">Verdict Summary</h3>

            {ranked.map((r, rank) => {
              const { verdict: v, entry } = r
              const band = getScoreBandV2(v.overallScore)
              const isWinner = rank === 0
              const strengths = v.topSignals?.slice(0, 3) || []
              const concerns = v.topConcerns?.slice(0, 2) || []
              const pillarLine = v.pillars.map(p =>
                `${p.pillar === 'quant' ? 'Quant' : p.pillar === 'qual' ? 'Qual' : 'Risk'} ${p.score}`
              ).join(' · ')

              return (
                <div
                  key={r.originalIndex}
                  className={cn(
                    'rounded-xl bg-dark-800/80 backdrop-blur-xl border overflow-hidden',
                    isWinner ? 'border-success-500/40' : 'border-white/5',
                  )}
                >
                  {/* Winner banner */}
                  {isWinner && (
                    <div className="bg-gradient-to-r from-success-500/20 via-success-500/10 to-transparent px-4 py-2 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-success-400" />
                      <span className="text-xs font-bold text-success-400 uppercase tracking-wide">Top Pick</span>
                      <span className="text-[10px] text-success-400/60 ml-1">Highest Overall Score</span>
                    </div>
                  )}

                  <div className="p-4">
                    {/* Score header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xl font-bold tabular-nums', band.colorClass)}>
                          {v.overallScore}
                        </span>
                        <span className="text-[10px] text-neutral-500">/100</span>
                        <span className="text-sm font-semibold text-white ml-1">{entry?.stock.symbol}</span>
                      </div>
                      <span className="text-xs text-neutral-500">{entry?.stock.sector}</span>
                    </div>

                    {/* Score bar */}
                    <div className="h-1.5 bg-dark-600 rounded-full mb-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${v.overallScore}%` }}
                        transition={{ duration: 0.6, delay: 0.1 * rank }}
                        className={cn('h-full rounded-full', band.bgClass)}
                      />
                    </div>

                    {/* Pillar breakdown */}
                    <div className="text-[10px] text-neutral-500 mb-3">{pillarLine}</div>

                    {/* Key strengths */}
                    {strengths.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[10px] text-neutral-600 uppercase font-semibold mb-1">Key Strengths</div>
                        <div className="space-y-1">
                          {strengths.map((s, si) => (
                            <div key={si} className="flex items-start gap-1.5">
                              <CheckCircle className="w-3 h-3 text-success-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-neutral-300">
                                <span className="font-medium text-white">{s.title}</span>
                                {s.description && (
                                  <span className="text-neutral-500"> — {s.description.length > 60 ? s.description.slice(0, 60) + '…' : s.description}</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Watch areas */}
                    {concerns.length > 0 && (
                      <div>
                        <div className="text-[10px] text-neutral-600 uppercase font-semibold mb-1">Watch Areas</div>
                        <div className="space-y-1">
                          {concerns.map((c, ci) => (
                            <div key={ci} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-warning-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-neutral-400">{c.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Personalization teaser */}
            {profile && (
              <div className="rounded-xl bg-primary-500/5 border border-primary-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-3.5 h-3.5 text-primary-400" />
                  <span className="text-xs font-semibold text-primary-400">Personalized Pick — Coming Soon</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Based on your{' '}
                  <span className="text-white font-medium">{thesisLabels[profile.investmentThesis] || profile.investmentThesis}</span> thesis
                  {' + '}<span className="text-white font-medium">{riskLabels[profile.riskTolerance] || profile.riskTolerance}</span> risk
                  {' + '}<span className="text-white font-medium">{horizonLabels[profile.timeHorizon] || profile.timeHorizon}</span> horizon,
                  StockFox will recommend which stock fits YOUR portfolio best.
                </p>
              </div>
            )}
          </motion.div>
        )
      })()}
    </div>
  )
}
