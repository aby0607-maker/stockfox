import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Flame, Star, Sparkles, BarChart2, ChevronRight, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { VerdictBadge } from '@/components/ui'

const tabs = [
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'top-rated', label: 'Top Rated', icon: Star },
  { id: 'for-you', label: 'For You', icon: Sparkles },
  { id: 'sectors', label: 'Sectors', icon: BarChart2 },
]

// Placeholder data
const trendingStocks = [
  { symbol: 'ZOMATO', name: 'Eternal (Zomato)', sector: 'Food Tech', score: 75, verdict: 'BUY', analyses: 1247, sectorRank: 1, sectorTotal: 6 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', score: 81, verdict: 'STRONG BUY', analyses: 892, sectorRank: 2, sectorTotal: 8 },
  { symbol: 'IRFC', name: 'IRFC', sector: 'NBFC', score: 68, verdict: 'HOLD', analyses: 756, sectorRank: 4, sectorTotal: 10 },
]

const topRatedStocks = [
  { symbol: 'TCS', name: 'TCS', sector: 'IT', score: 88, verdict: 'STRONG BUY', sectorRank: 1, sectorTotal: 5 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', score: 85, verdict: 'STRONG BUY', sectorRank: 1, sectorTotal: 8 },
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Conglomerate', score: 82, verdict: 'BUY', sectorRank: 1, sectorTotal: 4 },
]

const forYouStocks = [
  { symbol: 'DMART', name: 'Avenue Supermarts', sector: 'Retail', score: 78, verdict: 'BUY', reason: 'Matches your growth preference', sectorRank: 1, sectorTotal: 5 },
  { symbol: 'PIDILITE', name: 'Pidilite Industries', sector: 'Chemicals', score: 80, verdict: 'BUY', reason: 'High ROE like stocks you favor', sectorRank: 1, sectorTotal: 6 },
]

const sectors = [
  { name: 'Banking', topStock: 'HDFCBANK', avgScore: 78, stockCount: 8 },
  { name: 'IT Services', topStock: 'TCS', avgScore: 82, stockCount: 5 },
  { name: 'Pharma', topStock: 'SUNPHARMA', avgScore: 71, stockCount: 6 },
  { name: 'FMCG', topStock: 'HINDUNILVR', avgScore: 75, stockCount: 7 },
]

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success-400'
  if (score >= 65) return 'text-teal-400'
  if (score >= 50) return 'text-warning-400'
  return 'text-destructive-400'
}

function getRankColor(rank: number, total: number): string {
  const percentile = ((total - rank + 1) / total) * 100
  if (percentile >= 80) return 'text-success-400'
  if (percentile >= 50) return 'text-teal-400'
  if (percentile >= 30) return 'text-warning-400'
  return 'text-neutral-400'
}

export function Discover() {
  const [activeTab, setActiveTab] = useState('trending')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Search className="w-5 h-5 text-primary-400" />
          </div>
          Discover
        </h1>
        <p className="text-sm text-neutral-400 mt-1 ml-[52px]">
          Find your next investment opportunity
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stocks by name or symbol..."
          className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-primary-500/50 transition-colors"
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-dark-700 text-neutral-400 hover:bg-dark-600 hover:text-white'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-dark-800 border border-white/5 p-4"
      >
        {activeTab === 'trending' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-warning-400" />
              Most Analyzed This Week
            </h2>
            <div className="space-y-2">
              {trendingStocks.map(stock => (
                <Link
                  key={stock.symbol}
                  to={`/stock/${stock.symbol.toLowerCase()}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50 hover:bg-dark-700 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{stock.name}</span>
                      <VerdictBadge verdict={stock.verdict} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span>{stock.sector}</span>
                      <span>{stock.analyses.toLocaleString()} analyses</span>
                      <div className="flex items-center gap-1">
                        <Trophy className={cn('w-3 h-3', getRankColor(stock.sectorRank, stock.sectorTotal))} />
                        <span>#{stock.sectorRank}/{stock.sectorTotal}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-lg font-bold', getScoreColor(stock.score))}>
                      {stock.score}/100
                    </span>
                    <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {activeTab === 'top-rated' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-warning-400" />
              Highest Scored Stocks
            </h2>
            <div className="space-y-2">
              {topRatedStocks.map((stock, i) => (
                <Link
                  key={stock.symbol}
                  to={`/stock/${stock.symbol.toLowerCase()}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50 hover:bg-dark-700 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                      i === 0 ? 'bg-warning-500/20 text-warning-400' :
                      i === 1 ? 'bg-neutral-400/20 text-neutral-300' :
                      i === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-dark-600 text-neutral-400'
                    )}>
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{stock.name}</span>
                        <VerdictBadge verdict={stock.verdict} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>{stock.sector}</span>
                        <div className="flex items-center gap-1">
                          <Trophy className={cn('w-3 h-3', getRankColor(stock.sectorRank, stock.sectorTotal))} />
                          <span>#{stock.sectorRank}/{stock.sectorTotal}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-lg font-bold', getScoreColor(stock.score))}>
                      {stock.score}/100
                    </span>
                    <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {activeTab === 'for-you' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-400" />
              Personalized for You
            </h2>
            <div className="space-y-2">
              {forYouStocks.map(stock => (
                <Link
                  key={stock.symbol}
                  to={`/stock/${stock.symbol.toLowerCase()}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50 hover:bg-dark-700 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{stock.name}</span>
                      <VerdictBadge verdict={stock.verdict} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-primary-400">
                        {stock.reason}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-lg font-bold', getScoreColor(stock.score))}>
                      {stock.score}/100
                    </span>
                    <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {activeTab === 'sectors' && (
          <>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-teal-400" />
              Browse by Sector
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {sectors.map(sector => (
                <button
                  key={sector.name}
                  className="p-4 bg-dark-700/50 rounded-xl border border-white/5 hover:border-white/10 hover:bg-dark-700 transition-all text-left"
                >
                  <div className="font-medium text-white mb-1">{sector.name}</div>
                  <div className="text-xs text-neutral-500 mb-2">
                    {sector.stockCount} stocks
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">
                      Top: {sector.topStock}
                    </span>
                    <span className={cn('text-sm font-bold', getScoreColor(sector.avgScore))}>
                      {sector.avgScore}/100
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
