import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, Bell, Plus, Search, Flame, Sparkles, ChevronRight, Trophy, BarChart2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { stocks, getAlertsForProfile, getVerdictForStock } from '@/data'
import { VerdictBadge, FreeTierBanner } from '@/components/ui'
import { StaggerContainer, StaggerItem } from '@/components/motion'
import { DemoModeToggle, SpotlightTour } from '@/components/demo'
import { getSpotlightsForLocation } from '@/data/featureSpotlights'
import type { Stock, Alert, StockVerdict, WatchlistItem, DashboardDiscoveryStock } from '@/types'

// Get score color based on score (local version with 6.5 threshold)
function getScoreColor(score: number): string {
  if (score >= 8) return 'text-success-400'
  if (score >= 6.5) return 'text-teal-400'
  if (score >= 5) return 'text-warning-400'
  return 'text-destructive-400'
}

// Get score label for context
function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 8) return { label: 'Strong', color: 'text-success-400' }
  if (score >= 6.5) return { label: 'Good', color: 'text-teal-400' }
  if (score >= 5) return { label: 'Fair', color: 'text-warning-400' }
  return { label: 'Weak', color: 'text-destructive-400' }
}

// Get rank badge color
function getRankColor(rank: number, total: number): string {
  const percentile = ((total - rank + 1) / total) * 100
  if (percentile >= 80) return 'text-success-400'
  if (percentile >= 50) return 'text-teal-400'
  if (percentile >= 30) return 'text-warning-400'
  return 'text-neutral-400'
}

// Skeleton component for loading state
function SkeletonStockCard() {
  return (
    <div className="p-4 bg-dark-700/30 rounded-xl border border-white/5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 w-28 bg-dark-600 rounded" />
        <div className="h-6 w-16 bg-dark-600 rounded" />
      </div>
      <div className="h-4 w-20 bg-dark-600 rounded mb-2" />
      <div className="h-3 w-full bg-dark-600 rounded" />
    </div>
  )
}

export function Dashboard() {
  const { currentProfile, demoMode, toggleDemoMode } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [trendingStocks, setTrendingStocks] = useState<DashboardDiscoveryStock[]>([])
  const [similarStocks, setSimilarStocks] = useState<DashboardDiscoveryStock[]>([])

  // Demo mode spotlight state
  const spotlights = getSpotlightsForLocation('dashboard')
  const showDemoSpotlights = demoMode

  useEffect(() => {
    if (!currentProfile) return

    const timer = setTimeout(() => {
      // Get stocks with their verdicts for this profile
      const watchlistData = stocks.map(stock => {
        const verdict = getVerdictForStock(stock.symbol, currentProfile.id)
        return {
          ...stock,
          score: verdict?.overallScore || 7.0,
          verdict: verdict?.verdict || 'HOLD',
          sectorRank: verdict?.sectorRank || 3,
          sectorTotal: verdict?.sectorTotal || 8,
          sectorAvgScore: verdict?.sectorAvgScore || 6.5,
          verdictPeerGroup: verdict?.peerGroup || stock.sector,
          quickInsight: getDefaultInsight(stock, verdict || null),
          topSignal: verdict?.topSignals?.[0]?.title,
        }
      })
      setWatchlist(watchlistData)

      // Get alerts for this profile
      const profileAlerts = getAlertsForProfile(currentProfile.id)
      setAlerts(profileAlerts.slice(0, 3))

      // Mock trending stocks with sector ranks
      setTrendingStocks([
        { symbol: 'SWIGGY', name: 'Swiggy', shortName: 'Swiggy', score: 7.8, verdict: 'BUY', change: 4.2, reason: 'IPO momentum', sectorRank: 2, sectorTotal: 6 },
        { symbol: 'PAYTM', name: 'One97', shortName: 'Paytm', score: 6.2, verdict: 'HOLD', change: -1.8, reason: 'Profitability turn', sectorRank: 4, sectorTotal: 6 },
        { symbol: 'NYKAA', name: 'FSN E-Commerce', shortName: 'Nykaa', score: 5.8, verdict: 'HOLD', change: 2.1, reason: 'Beauty strong', sectorRank: 5, sectorTotal: 6 },
      ])

      // Mock similar stocks
      setSimilarStocks([
        { symbol: 'DMART', name: 'Avenue Supermarts', shortName: 'DMart', score: 8.1, verdict: 'BUY', change: 1.5, reason: 'Growth pick', sectorRank: 1, sectorTotal: 5 },
        { symbol: 'INFY', name: 'Infosys', shortName: 'Infosys', score: 7.2, verdict: 'BUY', change: 0.8, reason: 'IT like TCS', sectorRank: 2, sectorTotal: 8 },
      ])

      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [currentProfile])

  if (!currentProfile) return null

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const firstName = currentProfile.displayName.split(' ')[1] || currentProfile.name
  const unreadAlerts = alerts.filter(a => !a.isRead).length

  return (
    <div className="space-y-5">
      {/* Greeting + Demo Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between"
      >
        <div data-spotlight="personalized-greeting">
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()}, {firstName}! 👋
          </h1>
          {currentProfile.patterns[0] && (
            <p className="text-sm text-neutral-400 mt-1">
              {currentProfile.patterns[0].description}
            </p>
          )}
        </div>

        {/* Demo Mode Toggle */}
        <DemoModeToggle
          isEnabled={demoMode}
          onToggle={toggleDemoMode}
        />
      </motion.div>

      {/* ============== WATCHLIST ============== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-dark-800 border border-white/5 p-4"
        data-spotlight="watchlist"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            Your Watchlist
          </h2>
          <button className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Stock
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonStockCard />
            <SkeletonStockCard />
            <SkeletonStockCard />
          </div>
        ) : (
          <StaggerContainer className="space-y-3" staggerDelay={0.05} initialDelay={0.1}>
            {watchlist.map(stock => {
              const scoreInfo = getScoreLabel(stock.score)
              const sectorAvg = stock.sectorAvgScore ?? stock.score
              const vsSector = stock.score - sectorAvg
              const sectorRank = stock.sectorRank ?? 1
              const sectorTotal = stock.sectorTotal ?? 1

              return (
                <StaggerItem key={stock.symbol}>
                  <Link
                    to={`/stock/${stock.symbol.toLowerCase()}`}
                    className="block p-4 bg-dark-700/30 rounded-xl border border-white/5 hover:border-white/10 hover:bg-dark-700/50 transition-all group"
                  >
                    {/* Top row: Name, Verdict Badge */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium text-white truncate">{stock.name}</span>
                        <VerdictBadge verdict={stock.verdict} size="sm" animated={false} />
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                    </div>

                    {/* Score Section - Enhanced */}
                    <div className="flex items-center gap-4 mb-3">
                      {/* Score with /10 */}
                      <div className="flex items-baseline gap-1">
                        <span className={cn('text-2xl font-bold', getScoreColor(stock.score))}>
                          {stock.score.toFixed(1)}
                        </span>
                        <span className="text-sm text-neutral-500">/10</span>
                      </div>

                      {/* Vertical divider */}
                      <div className="w-px h-8 bg-white/10" />

                      {/* Sector Rank */}
                      <div className="flex items-center gap-1.5">
                        <Trophy className={cn('w-3.5 h-3.5', getRankColor(sectorRank, sectorTotal))} />
                        <span className={cn('text-sm font-medium', getRankColor(sectorRank, sectorTotal))}>
                          #{sectorRank}
                        </span>
                        <span className="text-xs text-neutral-500">
                          of {sectorTotal}
                        </span>
                      </div>

                      {/* Vertical divider */}
                      <div className="w-px h-8 bg-white/10" />

                      {/* vs Sector */}
                      <div className="flex items-center gap-1">
                        <BarChart2 className="w-3.5 h-3.5 text-neutral-500" />
                        <span className={cn(
                          'text-xs font-medium',
                          vsSector > 0 ? 'text-success-400' : vsSector < 0 ? 'text-destructive-400' : 'text-neutral-400'
                        )}>
                          {vsSector >= 0 ? '+' : ''}{vsSector.toFixed(1)}
                        </span>
                        <span className="text-xs text-neutral-500">vs sector</span>
                      </div>
                    </div>

                    {/* Price and insight row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-neutral-400">{formatCurrency(stock.currentPrice)}</span>
                        <span className={cn(
                          'text-sm font-medium',
                          stock.changePercent >= 0 ? 'text-success-400' : 'text-destructive-400'
                        )}>
                          {stock.changePercent >= 0 ? '+' : ''}{formatPercent(stock.changePercent)}
                        </span>
                      </div>

                      {/* Score label */}
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded', scoreInfo.color, 'bg-white/5')}>
                        {scoreInfo.label} {stock.verdictPeerGroup}
                      </span>
                    </div>

                    {/* Top signal insight */}
                    {stock.topSignal && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-primary-400 flex-shrink-0" />
                          <span className="text-xs text-neutral-400">{stock.topSignal}</span>
                        </div>
                      </div>
                    )}
                  </Link>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        )}
      </motion.section>

      {/* ============== DISCOVER MORE ============== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-dark-800 border border-white/5 p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Search className="w-4 h-4 text-primary-400" />
            Discover More
          </h2>
          <Link
            to="/discover"
            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
          >
            Explore All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Trending This Week */}
        <div className="mb-5" data-spotlight="trending-stocks">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-warning-500/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-warning-400" />
            </div>
            <span className="text-sm font-medium text-white">Trending This Week</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <div className="h-16 bg-dark-700 rounded-xl animate-pulse" />
              <div className="h-16 bg-dark-700 rounded-xl animate-pulse" />
            </div>
          ) : (
            <div className="space-y-2">
              {trendingStocks.map(stock => (
                <Link
                  key={stock.symbol}
                  to={`/stock/${stock.symbol.toLowerCase()}`}
                  className="flex items-center justify-between p-3 bg-dark-700/40 rounded-xl border border-white/5 hover:border-warning-500/30 hover:bg-dark-700/60 transition-all group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Score Circle */}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0',
                      stock.score >= 8 ? 'bg-success-500/20 text-success-400' :
                      stock.score >= 6.5 ? 'bg-teal-500/20 text-teal-400' :
                      stock.score >= 5 ? 'bg-warning-500/20 text-warning-400' :
                      'bg-destructive-500/20 text-destructive-400'
                    )}>
                      {stock.score.toFixed(1)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-white truncate">{stock.name}</span>
                        <VerdictBadge verdict={stock.verdict} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-neutral-500">{stock.reason}</span>
                        <span className="text-neutral-600">•</span>
                        <div className="flex items-center gap-1">
                          <Trophy className={cn('w-3 h-3', getRankColor(stock.sectorRank || 1, stock.sectorTotal || 6))} />
                          <span className="text-neutral-400">#{stock.sectorRank}/{stock.sectorTotal}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-medium',
                      stock.change >= 0 ? 'text-success-400' : 'text-destructive-400'
                    )}>
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(1)}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Similar to Your Picks */}
        <div data-spotlight="similar-picks">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-400" />
            </div>
            <span className="text-sm font-medium text-white">Similar to Your Picks</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <div className="h-16 bg-dark-700 rounded-xl animate-pulse" />
              <div className="h-16 bg-dark-700 rounded-xl animate-pulse" />
            </div>
          ) : (
            <div className="space-y-2">
              {similarStocks.map(stock => (
                <Link
                  key={stock.symbol}
                  to={`/stock/${stock.symbol.toLowerCase()}`}
                  className="flex items-center justify-between p-3 bg-dark-700/40 rounded-xl border border-white/5 hover:border-primary-500/30 hover:bg-dark-700/60 transition-all group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Score Circle */}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0',
                      stock.score >= 8 ? 'bg-success-500/20 text-success-400' :
                      stock.score >= 6.5 ? 'bg-teal-500/20 text-teal-400' :
                      stock.score >= 5 ? 'bg-warning-500/20 text-warning-400' :
                      'bg-destructive-500/20 text-destructive-400'
                    )}>
                      {stock.score.toFixed(1)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-white truncate">{stock.name}</span>
                        <VerdictBadge verdict={stock.verdict} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-primary-400">{stock.reason}</span>
                        <span className="text-neutral-600">•</span>
                        <div className="flex items-center gap-1">
                          <Trophy className={cn('w-3 h-3', getRankColor(stock.sectorRank || 1, stock.sectorTotal || 6))} />
                          <span className="text-neutral-400">#{stock.sectorRank}/{stock.sectorTotal}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-medium',
                      stock.change >= 0 ? 'text-success-400' : 'text-destructive-400'
                    )}>
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(1)}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* ============== FREE TIER BANNER ============== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        data-spotlight="free-tier-banner"
      >
        <FreeTierBanner
          analysesUsed={3}
          analysesLimit={5}
          variant="banner"
          onUpgradeClick={() => {
            // Demo: would navigate to pricing/upgrade page
            alert('This would open the upgrade flow')
          }}
        />
      </motion.div>

      {/* ============== ALERTS (Compact) ============== */}
      {alerts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-dark-800 border border-white/5 p-4"
          data-spotlight="alerts-section"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Bell className="w-4 h-4 text-primary-400" />
              Alerts
              {unreadAlerts > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-500 text-white rounded">
                  {unreadAlerts} new
                </span>
              )}
            </h2>
            <Link
              to="/alerts"
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {alerts.slice(0, 2).map(alert => (
              <div
                key={alert.id}
                className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0"
              >
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                  alert.severity === 'critical' && 'bg-destructive-500',
                  alert.severity === 'high' && 'bg-warning-500',
                  alert.severity === 'medium' && 'bg-warning-400',
                  alert.severity === 'low' && 'bg-neutral-500'
                )} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-white">{alert.title}</span>
                  <p className="text-[11px] text-neutral-500 truncate">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ============== DEMO MODE SPOTLIGHT TOUR ============== */}
      <SpotlightTour
        spotlights={spotlights}
        isActive={showDemoSpotlights}
        onEnd={toggleDemoMode}
      />
    </div>
  )
}

// Helper to get default insight based on stock data
function getDefaultInsight(stock: Stock, verdict: StockVerdict | null): string {
  if (verdict?.topSignals?.[0]?.title) {
    return verdict.topSignals[0].title
  }
  if (stock.changePercent > 2) {
    return 'Strong momentum today'
  }
  if (stock.changePercent < -2) {
    return 'Under pressure today'
  }
  return 'Stable performance'
}
