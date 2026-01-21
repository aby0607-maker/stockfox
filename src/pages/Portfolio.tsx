import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  PieChart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  BarChart3,
  ChevronRight,
  Sparkles,
  Scale,
  Activity,
  Info,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { DemoModeToggle, SpotlightTour } from '@/components/demo'
import { getSpotlightsForLocation } from '@/data/featureSpotlights'

// Stock to sector mapping
const stockSectorMap: Record<string, { sector: string; stockFoxScore: number; verdict: string }> = {
  ZOMATO: { sector: 'Food Tech', stockFoxScore: 8.2, verdict: 'STRONG BUY' },
  DELHIVERY: { sector: 'Logistics', stockFoxScore: 6.8, verdict: 'HOLD' },
  TCS: { sector: 'IT Services', stockFoxScore: 7.5, verdict: 'BUY' },
  HDFCBANK: { sector: 'Banking', stockFoxScore: 7.8, verdict: 'BUY' },
  AXISBANK: { sector: 'Banking', stockFoxScore: 7.2, verdict: 'BUY' },
  TRENT: { sector: 'Retail', stockFoxScore: 7.9, verdict: 'BUY' },
  ITC: { sector: 'FMCG', stockFoxScore: 7.1, verdict: 'BUY' },
  COALINDIA: { sector: 'Mining', stockFoxScore: 6.5, verdict: 'HOLD' },
  HINDUNILVR: { sector: 'FMCG', stockFoxScore: 6.9, verdict: 'HOLD' },
  RELIANCE: { sector: 'Energy', stockFoxScore: 7.4, verdict: 'BUY' },
  ASIANPAINT: { sector: 'Consumer', stockFoxScore: 6.8, verdict: 'HOLD' },
  INFOSYS: { sector: 'IT Services', stockFoxScore: 7.3, verdict: 'BUY' },
}

// Sector colors for charts
const sectorColors: Record<string, string> = {
  'Food Tech': 'bg-pink-500',
  Logistics: 'bg-orange-500',
  'IT Services': 'bg-primary-500',
  Banking: 'bg-teal-500',
  Retail: 'bg-purple-500',
  FMCG: 'bg-success-500',
  Mining: 'bg-warning-500',
  Energy: 'bg-info-500',
  Consumer: 'bg-rose-500',
}

// Health score components
interface HealthMetric {
  name: string
  score: number
  maxScore: number
  status: 'good' | 'warning' | 'danger'
  description: string
}

export function Portfolio() {
  const navigate = useNavigate()
  const { currentProfile, demoMode, toggleDemoMode } = useAppStore()
  const spotlights = useMemo(() => getSpotlightsForLocation('portfolio'), [])

  if (!currentProfile) return null

  // Calculate totals
  const totalValue = currentProfile.portfolio.reduce((sum, h) => sum + h.currentValue, 0)
  const totalInvested = currentProfile.portfolio.reduce((sum, h) => sum + h.avgPrice * h.quantity, 0)
  const totalPnl = currentProfile.portfolio.reduce((sum, h) => sum + h.pnl, 0)
  const totalPnlPercent = (totalPnl / totalInvested) * 100

  // Nifty comparison (mock data - Nifty up 12% YTD)
  const niftyReturn = 12.5
  const alphaVsNifty = totalPnlPercent - niftyReturn

  // Sector allocation
  const sectorAllocation = currentProfile.portfolio.reduce(
    (acc, holding) => {
      const sector = stockSectorMap[holding.symbol]?.sector || 'Other'
      acc[sector] = (acc[sector] || 0) + holding.allocation
      return acc
    },
    {} as Record<string, number>
  )

  // Check for concentration risk
  const maxAllocation = Math.max(...currentProfile.portfolio.map(h => h.allocation))
  const hasConcentrationRisk = maxAllocation > 40
  const maxSectorAllocation = Math.max(...Object.values(sectorAllocation))
  const hasSectorConcentration = maxSectorAllocation > 50

  // Portfolio beta (weighted average)
  const portfolioBeta = 1.15 // Mock - would calculate from holdings

  // Health score breakdown
  const healthMetrics: HealthMetric[] = [
    {
      name: 'Diversification',
      score: hasConcentrationRisk ? 5 : hasSectorConcentration ? 7 : 9,
      maxScore: 10,
      status: hasConcentrationRisk ? 'danger' : hasSectorConcentration ? 'warning' : 'good',
      description: hasConcentrationRisk
        ? 'Single stock concentration too high'
        : hasSectorConcentration
          ? 'Consider spreading across more sectors'
          : 'Well diversified across holdings',
    },
    {
      name: 'Quality Score',
      score: 8,
      maxScore: 10,
      status: 'good',
      description: 'Holdings have strong fundamentals',
    },
    {
      name: 'Risk-Adjusted',
      score: alphaVsNifty > 0 ? 8 : 6,
      maxScore: 10,
      status: alphaVsNifty > 0 ? 'good' : 'warning',
      description:
        alphaVsNifty > 0 ? `Outperforming Nifty by ${alphaVsNifty.toFixed(1)}%` : 'Underperforming benchmark',
    },
    {
      name: 'Thesis Alignment',
      score: 9,
      maxScore: 10,
      status: 'good',
      description: 'Holdings match your investment thesis',
    },
  ]

  const overallHealthScore =
    healthMetrics.reduce((sum, m) => sum + m.score, 0) / healthMetrics.length

  // Rebalancing suggestions
  const suggestions = []
  if (hasConcentrationRisk) {
    const topHolding = currentProfile.portfolio.reduce((max, h) =>
      h.allocation > max.allocation ? h : max
    )
    suggestions.push({
      type: 'reduce',
      stock: topHolding.symbol,
      message: `Consider reducing ${topHolding.symbol} from ${topHolding.allocation}% to below 30%`,
      priority: 'high',
    })
  }
  if (hasSectorConcentration) {
    const topSector = Object.entries(sectorAllocation).reduce((max, [s, a]) =>
      a > max[1] ? [s, a] : max
    )
    suggestions.push({
      type: 'diversify',
      message: `${topSector[0]} sector is ${topSector[1]}% - consider adding other sectors`,
      priority: 'medium',
    })
  }

  // Allocation colors for holdings
  const allocationColors = [
    'bg-primary-500',
    'bg-teal-500',
    'bg-warning-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-purple-500',
    'bg-success-500',
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-400" />
            </div>
            Portfolio
          </h1>
          <p className="text-sm text-neutral-400 mt-1 ml-[52px]">
            Track your holdings with StockFox insights
          </p>
        </div>
        <DemoModeToggle isEnabled={demoMode} onToggle={toggleDemoMode} />
      </motion.div>

      {/* Portfolio Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-dark-800 border border-white/5 p-5"
        data-spotlight="portfolio-summary"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Total Value</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Total P&L</div>
            <div
              className={cn(
                'text-xl font-bold flex items-center gap-1',
                totalPnl >= 0 ? 'text-success-400' : 'text-destructive-400'
              )}
            >
              {totalPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {formatCurrency(totalPnl)}
            </div>
            <div className={cn('text-sm', totalPnl >= 0 ? 'text-success-400/70' : 'text-destructive-400/70')}>
              {formatPercent(totalPnlPercent)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">vs Nifty 50</div>
            <div
              className={cn(
                'text-xl font-bold flex items-center gap-1',
                alphaVsNifty >= 0 ? 'text-success-400' : 'text-destructive-400'
              )}
            >
              {alphaVsNifty >= 0 ? '+' : ''}
              {alphaVsNifty.toFixed(1)}%
            </div>
            <div className="text-xs text-neutral-500">Alpha (YTD)</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Portfolio Beta</div>
            <div className="text-xl font-bold text-white flex items-center gap-1">
              <Activity className="w-4 h-4 text-info-400" />
              {portfolioBeta.toFixed(2)}
            </div>
            <div className="text-xs text-neutral-500">vs Nifty</div>
          </div>
        </div>

        {/* Mini allocation chart */}
        <div className="flex h-3 rounded-full overflow-hidden bg-dark-600">
          {currentProfile.portfolio.map((holding, i) => (
            <div
              key={holding.symbol}
              className={cn('h-full', allocationColors[i % allocationColors.length])}
              style={{ width: `${holding.allocation}%` }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {currentProfile.portfolio.map((holding, i) => (
            <div key={holding.symbol} className="flex items-center gap-1.5">
              <div className={cn('w-2 h-2 rounded-full', allocationColors[i % allocationColors.length])} />
              <span className="text-xs text-neutral-400">
                {holding.symbol} ({holding.allocation}%)
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Portfolio Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl bg-dark-800 border border-white/5 p-5"
        data-spotlight="health-score"
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary-400" />
          Portfolio Health Score
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Overall Score */}
          <div className="flex flex-col items-center justify-center p-6 bg-dark-700/50 rounded-xl">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-dark-600" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(overallHealthScore / 10) * 352} 352`}
                  strokeLinecap="round"
                  className={cn(
                    overallHealthScore >= 7 ? 'text-success-400' : overallHealthScore >= 5 ? 'text-warning-400' : 'text-destructive-400'
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">{overallHealthScore.toFixed(1)}</div>
                <div className="text-sm text-neutral-500">/10</div>
              </div>
            </div>
            <div className="mt-3 text-sm text-neutral-400 text-center">
              {overallHealthScore >= 8
                ? 'Excellent portfolio health'
                : overallHealthScore >= 6
                  ? 'Good health, minor improvements possible'
                  : 'Needs attention'}
            </div>
          </div>

          {/* Health Metrics Breakdown */}
          <div className="space-y-3">
            {healthMetrics.map(metric => (
              <div key={metric.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-300">{metric.name}</span>
                  <span
                    className={cn(
                      'font-medium',
                      metric.status === 'good'
                        ? 'text-success-400'
                        : metric.status === 'warning'
                          ? 'text-warning-400'
                          : 'text-destructive-400'
                    )}
                  >
                    {metric.score}/{metric.maxScore}
                  </span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      metric.status === 'good'
                        ? 'bg-success-500'
                        : metric.status === 'warning'
                          ? 'bg-warning-500'
                          : 'bg-destructive-500'
                    )}
                    style={{ width: `${(metric.score / metric.maxScore) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Sector Exposure */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-dark-800 border border-white/5 p-5"
        data-spotlight="sector-exposure"
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-teal-400" />
          Sector Exposure
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sector bars */}
          <div className="space-y-3">
            {Object.entries(sectorAllocation)
              .sort(([, a], [, b]) => b - a)
              .map(([sector, allocation]) => (
                <div key={sector} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-300">{sector}</span>
                    <span className="text-white font-medium">{allocation}%</span>
                  </div>
                  <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', sectorColors[sector] || 'bg-gray-500')}
                      style={{ width: `${allocation}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>

          {/* Sector insights */}
          <div className="bg-dark-700/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-warning-400" />
              Sector Insights
            </h3>
            <div className="space-y-3 text-sm">
              {hasSectorConcentration && (
                <div className="flex items-start gap-2 text-warning-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    High concentration in{' '}
                    {Object.entries(sectorAllocation).sort(([, a], [, b]) => b - a)[0][0]}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2 text-neutral-400">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-info-400" />
                <span>
                  You are exposed to {Object.keys(sectorAllocation).length} sectors.{' '}
                  {Object.keys(sectorAllocation).length < 4 ? 'Consider adding more for diversification.' : 'Good sector spread.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Concentration Alerts */}
      {(hasConcentrationRisk || suggestions.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl bg-warning-500/10 border border-warning-500/30 p-4"
          data-spotlight="concentration-alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-warning-400 mb-2">Risk Alerts</div>
              <div className="space-y-2">
                {hasConcentrationRisk && (
                  <div className="text-sm text-neutral-400">
                    <span className="text-warning-300 font-medium">{maxAllocation}%</span> of your portfolio is in a single stock. Consider diversifying to reduce risk.
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <div key={i} className="text-sm text-neutral-400">
                    {s.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Holdings with StockFox Scores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-dark-800 border border-white/5 p-5"
        data-spotlight="holdings-list"
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-info-400" />
          Holdings with StockFox Scores
        </h2>
        <div className="space-y-3">
          {currentProfile.portfolio.map((holding, i) => {
            const stockInfo = stockSectorMap[holding.symbol]
            return (
              <motion.div
                key={holding.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                onClick={() => navigate(`/stock/${holding.symbol.toLowerCase()}`)}
                className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl border border-white/5 cursor-pointer hover:bg-dark-700 hover:border-white/10 transition-all group"
                {...(i === 0 && { 'data-spotlight': 'holding-card' })}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn('w-2 h-2 rounded-full', allocationColors[i % allocationColors.length])} />
                    <span className="font-medium text-white">{holding.name}</span>
                    <span className="text-xs text-neutral-500 px-1.5 py-0.5 bg-dark-600 rounded">
                      {holding.allocation}%
                    </span>
                    {stockInfo && (
                      <span className="text-xs text-neutral-500 px-1.5 py-0.5 bg-dark-600/50 rounded">
                        {stockInfo.sector}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 ml-4">
                    {holding.quantity} shares @ {formatCurrency(holding.avgPrice)}
                  </div>
                </div>

                {/* StockFox Score */}
                {stockInfo && (
                  <div className="flex items-center gap-3 mr-4">
                    <div className="text-center">
                      <div
                        className={cn(
                          'text-lg font-bold',
                          stockInfo.stockFoxScore >= 7
                            ? 'text-success-400'
                            : stockInfo.stockFoxScore >= 5
                              ? 'text-warning-400'
                              : 'text-destructive-400'
                        )}
                      >
                        {stockInfo.stockFoxScore}
                      </div>
                      <div className="text-[10px] text-neutral-500">SF Score</div>
                    </div>
                    <div
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded',
                        stockInfo.verdict === 'STRONG BUY'
                          ? 'bg-success-500/20 text-success-400'
                          : stockInfo.verdict === 'BUY'
                            ? 'bg-success-500/10 text-success-300'
                            : stockInfo.verdict === 'HOLD'
                              ? 'bg-warning-500/20 text-warning-400'
                              : 'bg-destructive-500/20 text-destructive-400'
                      )}
                    >
                      {stockInfo.verdict}
                    </div>
                  </div>
                )}

                {/* P&L */}
                <div className="text-right mr-2">
                  <div className="font-medium text-white">{formatCurrency(holding.currentValue)}</div>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-sm justify-end',
                      holding.pnl >= 0 ? 'text-success-400' : 'text-destructive-400'
                    )}
                  >
                    {holding.pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {formatPercent(holding.pnlPercent)}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* AI Rebalancing Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-xl bg-gradient-to-br from-primary-500/10 to-teal-500/10 border border-primary-500/20 p-5"
        data-spotlight="rebalancing-suggestions"
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-primary-400" />
          AI Rebalancing Suggestions
          <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full ml-2">
            Personalized
          </span>
        </h2>

        {suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg',
                  suggestion.priority === 'high' ? 'bg-warning-500/10' : 'bg-dark-700/50'
                )}
              >
                <Target
                  className={cn(
                    'w-5 h-5 flex-shrink-0 mt-0.5',
                    suggestion.priority === 'high' ? 'text-warning-400' : 'text-primary-400'
                  )}
                />
                <div>
                  <p className="text-sm text-neutral-300">{suggestion.message}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Based on your {currentProfile.investmentThesis} thesis and{' '}
                    {currentProfile.riskTolerance} risk tolerance
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-success-500/10 rounded-lg">
            <Shield className="w-6 h-6 text-success-400" />
            <div>
              <p className="text-sm text-success-300 font-medium">Portfolio is well-balanced</p>
              <p className="text-xs text-neutral-400 mt-1">
                No immediate rebalancing needed based on your profile
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-neutral-500">
            Suggestions are based on your 6D profile: {currentProfile.investmentThesis} thesis,{' '}
            {currentProfile.riskTolerance} risk tolerance, {currentProfile.timeHorizon} time horizon
          </p>
        </div>
      </motion.div>

      {/* Spotlight Tour */}
      <SpotlightTour spotlights={spotlights} isActive={demoMode} onEnd={toggleDemoMode} />
    </div>
  )
}
