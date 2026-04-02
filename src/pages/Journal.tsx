import { useMemo } from 'react'
import { BookOpen, TrendingUp, TrendingDown, Eye, Clock, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatDate, formatPercent } from '@/lib/utils'
import { VerdictBadge } from '@/components/ui'
import { SkillLevelBadge, BlindSpotChart, ResearchDNACard } from '@/components/learning'
import { DemoModeToggle, SpotlightTour } from '@/components/demo'
import { getSpotlightsForLocation } from '@/data/featureSpotlights'
import type { ExtendedProfile } from '@/data/profiles'

// Placeholder data - will be replaced with full mock data
const journalEntries = [
  {
    id: '1',
    date: '2025-01-10',
    stock: { symbol: 'ZOMATO', name: 'Eternal (Zomato)', sector: 'Food Tech' },
    scoreAtAnalysis: 82,
    verdictAtAnalysis: 'STRONG BUY' as const,
    userVerdict: 'BUY',
    priceAtAnalysis: 252,
    currentPrice: 268,
    pnlPercent: 6.35,
    outcomeStatus: 'win' as const,
    timeSpent: 12,
  },
  {
    id: '2',
    date: '2025-01-05',
    stock: { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking' },
    scoreAtAnalysis: 78,
    verdictAtAnalysis: 'BUY' as const,
    userVerdict: 'WATCHLIST',
    priceAtAnalysis: 1120,
    currentPrice: 1145,
    pnlPercent: 2.23,
    outcomeStatus: 'pending' as const,
    timeSpent: 8,
  },
  {
    id: '3',
    date: '2024-12-20',
    stock: { symbol: 'PAYTM', name: 'One 97 Communications', sector: 'Fintech' },
    scoreAtAnalysis: 45,
    verdictAtAnalysis: 'AVOID' as const,
    userVerdict: 'SKIP',
    priceAtAnalysis: 850,
    currentPrice: 780,
    pnlPercent: -8.24,
    outcomeStatus: 'neutral' as const,
    timeSpent: 15,
  },
  {
    id: '4',
    date: '2024-12-15',
    stock: { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT Services' },
    scoreAtAnalysis: 75,
    verdictAtAnalysis: 'BUY' as const,
    userVerdict: 'BUY',
    priceAtAnalysis: 3800,
    currentPrice: 4150,
    pnlPercent: 9.21,
    outcomeStatus: 'win' as const,
    timeSpent: 18,
  },
  {
    id: '5',
    date: '2024-12-08',
    stock: { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Conglomerate' },
    scoreAtAnalysis: 68,
    verdictAtAnalysis: 'HOLD' as const,
    userVerdict: 'SKIP',
    priceAtAnalysis: 2450,
    currentPrice: 2380,
    pnlPercent: -2.86,
    outcomeStatus: 'neutral' as const,
    timeSpent: 14,
  },
  {
    id: '6',
    date: '2024-11-28',
    stock: { symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Infrastructure' },
    scoreAtAnalysis: 58,
    verdictAtAnalysis: 'HOLD' as const,
    userVerdict: 'BUY',
    priceAtAnalysis: 2850,
    currentPrice: 2420,
    pnlPercent: -15.09,
    outcomeStatus: 'loss' as const,
    timeSpent: 22,
  },
]

// Calculate stats
const totalAnalyses = journalEntries.length
const wins = journalEntries.filter(e => e.outcomeStatus === 'win').length
const losses = journalEntries.filter(e => e.outcomeStatus === 'loss').length
const winRate = Math.round((wins / totalAnalyses) * 100)
const avgTime = Math.round(journalEntries.reduce((sum, e) => sum + e.timeSpent, 0) / totalAnalyses)

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success-400'
  if (score >= 65) return 'text-teal-400'
  if (score >= 50) return 'text-warning-400'
  return 'text-destructive-400'
}

function getOutcomeIcon(status: 'win' | 'loss' | 'pending' | 'neutral') {
  switch (status) {
    case 'win':
      return <CheckCircle2 className="w-4 h-4 text-success-400" />
    case 'loss':
      return <XCircle className="w-4 h-4 text-destructive-400" />
    case 'pending':
      return <Clock className="w-4 h-4 text-warning-400" />
    default:
      return <MinusCircle className="w-4 h-4 text-neutral-500" />
  }
}

function getOutcomeLabel(status: 'win' | 'loss' | 'pending' | 'neutral') {
  switch (status) {
    case 'win': return 'Win'
    case 'loss': return 'Loss'
    case 'pending': return 'Pending'
    default: return 'Neutral'
  }
}

export function Journal() {
  const { currentProfile, demoMode, toggleDemoMode } = useAppStore()

  // Demo Mode - Available for all profiles
  const spotlights = useMemo(() => getSpotlightsForLocation('journal'), [])

  if (!currentProfile) return null

  // Cast to ExtendedProfile for additional fields
  const profile = currentProfile as ExtendedProfile

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header with Skill Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-400" />
            </div>
            Analysis Journal
          </h1>
          <p className="text-sm text-neutral-400 mt-1 ml-[52px]">
            Track your research journey and learn from outcomes
          </p>
        </div>

        {/* Demo Mode Toggle */}
        <DemoModeToggle isEnabled={demoMode} onToggle={toggleDemoMode} />
      </motion.div>

      {/* Skill Level Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl bg-dark-800 border border-white/5 p-5"
        data-spotlight="skill-level-badge"
      >
        <SkillLevelBadge
          level={currentProfile.skillLevel}
          analysisCount={totalAnalyses}
        />
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-3"
        data-spotlight="journal-stats"
      >
        <div className="rounded-xl bg-dark-800 border border-white/5 p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalAnalyses}</div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wide mt-1">Analyses</div>
        </div>
        <div className="rounded-xl bg-dark-800 border border-white/5 p-4 text-center">
          <div className="text-2xl font-bold text-success-400">{wins}</div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wide mt-1">Wins</div>
        </div>
        <div className="rounded-xl bg-dark-800 border border-white/5 p-4 text-center">
          <div className="text-2xl font-bold text-destructive-400">{losses}</div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wide mt-1">Losses</div>
        </div>
        <div className="rounded-xl bg-dark-800 border border-white/5 p-4 text-center">
          <div className="text-2xl font-bold text-white">{avgTime}m</div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wide mt-1">Avg Time</div>
        </div>
      </motion.div>

      {/* Research DNA & Blind Spots */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Research DNA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-spotlight="research-dna"
        >
          <ResearchDNACard
            patterns={currentProfile.patterns}
            investmentThesis={profile.investmentThesis}
            winRate={winRate}
          />
        </motion.div>

        {/* Blind Spots Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-dark-800 border border-white/5 p-5"
          data-spotlight="blind-spots"
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            Segment Coverage
          </h2>
          <BlindSpotChart />
        </motion.div>
      </div>

      {/* Journal Entries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl bg-dark-800 border border-white/5 p-5"
        data-spotlight="journal-entries"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Entries</h2>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-success-400" /> Win
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-destructive-400" /> Loss
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-warning-400" /> Pending
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {journalEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className={cn(
                'p-4 rounded-xl border transition-all cursor-pointer hover:border-white/20',
                entry.outcomeStatus === 'win' && 'bg-success-500/5 border-success-500/20',
                entry.outcomeStatus === 'loss' && 'bg-destructive-500/5 border-destructive-500/20',
                entry.outcomeStatus === 'pending' && 'bg-warning-500/5 border-warning-500/20',
                entry.outcomeStatus === 'neutral' && 'bg-dark-700/50 border-white/5'
              )}
              {...(index === 0 && { 'data-spotlight': 'entry-card' })}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  {/* Outcome icon */}
                  <div className="mt-0.5">
                    {getOutcomeIcon(entry.outcomeStatus)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{entry.stock.name}</span>
                      <VerdictBadge verdict={entry.verdictAtAnalysis} size="sm" />
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {entry.stock.sector} • {formatDate(entry.date)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn('text-lg font-bold', getScoreColor(entry.scoreAtAnalysis))}>
                    {entry.scoreAtAnalysis}/100
                  </span>
                  <div className="text-[10px] text-neutral-500 uppercase">
                    {getOutcomeLabel(entry.outcomeStatus)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm ml-7">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Eye className="w-4 h-4 text-neutral-500" />
                  <span>Your call: <span className="text-white">{entry.userVerdict}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  {entry.pnlPercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-success-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive-400" />
                  )}
                  <span className={entry.pnlPercent >= 0 ? 'text-success-400' : 'text-destructive-400'}>
                    {formatPercent(entry.pnlPercent)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-neutral-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{entry.timeSpent}m</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Spotlight Tour for Demo Mode */}
      <SpotlightTour
        spotlights={spotlights}
        isActive={demoMode}
        onEnd={toggleDemoMode}
      />
    </div>
  )
}
