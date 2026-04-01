import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Share2, AlertTriangle, TrendingUp, TrendingDown, Sparkles, Newspaper, ChevronRight, ChevronDown, ChevronUp, Check, X, AlertCircle, Calendar, GitCompare, UserCheck, History, ShieldCheck, PenLine, BookmarkPlus, FileText, Target } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { getStockBySymbol, getVerdictForStock } from '@/data'
import { resolveStock, isDemoStock } from '@/services/stockService'
import { buildVerdictForStock } from '@/services/verdictService'
import { getNewsForStock, getUpcomingEvents, formatEventDate, getEventIcon, type NewsItem, type UpcomingEvent } from '@/data/news'
// V1 UI imports kept for evidence modals (ScoreGauge, VerdictBadge removed — replaced by V2 components)
import { SegmentBar, DIYSegmentList } from '@/components/charts'
import { EvidenceChainPanel } from '@/components/analysis'
// GuidedAnalysisModal & ReflectionPromptModal removed in V2
import { DemoModeToggle, SpotlightTour } from '@/components/demo'
import { getSpotlightsForLocation } from '@/data/featureSpotlights'
import { OverallVerdictCard, PillarCard, PillarDrillDown, QualFactorTab, NewsEventSection } from '@/components/scoring'
import { getVerdictV2 } from '@/data/verdictsV2'
import type { Stock, StockVerdict, SegmentScore, RedFlagSeverity, StockVerdictV2, VerdictPillar } from '@/types'

// Skeleton components for loading state
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('bg-dark-600 rounded animate-pulse', className)} />
}

// Generate comprehensive 35-parameter Red Flag Framework
function generateRedFlagFramework(verdict: StockVerdict) {
  // Complete 35-parameter Red Flag Framework for Indian retail investors
  const allFlags = [
    // ===== CRITICAL (8 flags) - Always Block/Alert - Score Impact: -2 to -3 pts =====
    { id: 'rf-asm', severity: 'critical' as RedFlagSeverity, title: 'ASM List', source: 'BSE/NSE', threshold: 'On list', currentValue: 'Clear', isTriggered: false, description: 'Stock on Additional Surveillance Measure', action: 'Exchange flagged for unusual activity', scoreImpact: -3 },
    { id: 'rf-gsm', severity: 'critical' as RedFlagSeverity, title: 'GSM List', source: 'BSE/NSE', threshold: 'On list', currentValue: 'Clear', isTriggered: false, description: 'Stock on Graded Surveillance Measure', action: 'Serious compliance/trading concerns', scoreImpact: -3 },
    { id: 'rf-default', severity: 'critical' as RedFlagSeverity, title: 'Default Probability >15%', source: 'ML Model', threshold: '>15%', currentValue: '2%', isTriggered: false, description: 'High likelihood of debt default', action: 'Company may not survive', scoreImpact: -3 },
    { id: 'rf-pledge', severity: 'critical' as RedFlagSeverity, title: 'Promoter Pledging >20%', source: 'Ownership', threshold: '>20%', currentValue: '0%', isTriggered: false, description: 'No promoter pledging', action: 'Forced selling risk in downturn', scoreImpact: -2 },
    { id: 'rf-sms', severity: 'critical' as RedFlagSeverity, title: 'Pump & Dump Alert', source: 'External', threshold: 'Circulating', currentValue: 'Clear', isTriggered: false, description: 'Stock circulating in SMS/WhatsApp tips', action: 'Manipulation in progress', scoreImpact: -3 },
    { id: 'rf-audit', severity: 'critical' as RedFlagSeverity, title: 'Auditor Qualification', source: 'Annual Report', threshold: 'Qualified/Adverse', currentValue: 'Clean', isTriggered: false, description: 'Clean audit report', action: 'Accounting irregularities', scoreImpact: -3 },
    { id: 'rf-icr', severity: 'critical' as RedFlagSeverity, title: 'Interest Coverage <1.5x', source: 'Ratios', threshold: '<1.5x', currentValue: '∞', isTriggered: false, description: 'No debt, comfortable coverage', action: 'Cannot service debt', scoreImpact: -2 },
    { id: 'rf-shell', severity: 'critical' as RedFlagSeverity, title: 'Shell Company Flag', source: 'MCA/Exchange', threshold: 'Flagged', currentValue: 'Clear', isTriggered: false, description: 'Not flagged as shell company', action: 'No real business operations', scoreImpact: -3 },

    // ===== HIGH (12 flags) - Always Show - Score Impact: -1 to -1.5 pts =====
    { id: 'rf-pledge-rising', severity: 'high' as RedFlagSeverity, title: 'Promoter Pledging Rising', source: 'Ownership', threshold: '>5% QoQ', currentValue: '0%', isTriggered: false, description: 'Pledging stable', action: 'Monitor promoter position', scoreImpact: -1.5 },
    { id: 'rf-promoter-exit', severity: 'high' as RedFlagSeverity, title: 'Promoter Stake Declining', source: 'Ownership', threshold: '>3% in 6M', currentValue: 'Stable', isTriggered: false, description: 'Promoter stake stable', action: 'Insider selling signal', scoreImpact: -1.5 },
    { id: 'rf-smart-money-exit', severity: 'high' as RedFlagSeverity, title: 'FII + DII Both Exiting', source: 'Ownership', threshold: '>2% in 3M', currentValue: 'Stable', isTriggered: false, description: 'Institutional ownership stable', action: 'Smart money leaving', scoreImpact: -1.5 },
    { id: 'rf-neg-ocf', severity: 'high' as RedFlagSeverity, title: 'Negative OCF 3 Quarters', source: 'Cash Flow', threshold: '3 consecutive', currentValue: 'Positive', isTriggered: false, description: 'Operating cash flow positive', action: 'Profits not converting to cash', scoreImpact: -1.5 },
    { id: 'rf-earnings-cash', severity: 'high' as RedFlagSeverity, title: 'Earnings vs Cash Divergence', source: 'Financials', threshold: 'PAT↑ OCF↓', currentValue: 'Aligned', isTriggered: false, description: 'PAT and OCF aligned', action: 'Possible earnings manipulation', scoreImpact: -1.5 },
    { id: 'rf-rpt', severity: 'high' as RedFlagSeverity, title: 'Related Party Transactions', source: 'Income Statement', threshold: '>10% revenue', currentValue: '3%', isTriggered: false, description: 'RPT within acceptable limits', action: 'Self-dealing concerns', scoreImpact: -1 },
    { id: 'rf-receivables', severity: 'high' as RedFlagSeverity, title: 'Revenue Recognition Red Flag', source: 'Balance Sheet', threshold: 'Recv 2x Rev growth', currentValue: 'Normal', isTriggered: false, description: 'Receivables growth normal', action: 'Fake sales booking', scoreImpact: -1.5 },
    { id: 'rf-auditor-change', severity: 'high' as RedFlagSeverity, title: 'Auditor Change', source: 'Annual Report', threshold: 'Unexplained', currentValue: 'No change', isTriggered: false, description: 'Stable auditor relationship', action: 'Covering up issues', scoreImpact: -1 },
    { id: 'rf-mgmt-churn', severity: 'high' as RedFlagSeverity, title: 'Management Churn', source: 'Filings', threshold: 'CFO/CEO exit', currentValue: 'Stable', isTriggered: false, description: 'Stable management team', action: 'Governance instability', scoreImpact: -1 },
    { id: 'rf-credit-downgrade', severity: 'high' as RedFlagSeverity, title: 'Credit Rating Downgrade', source: 'Rating Agency', threshold: 'Downgrade', currentValue: 'Stable', isTriggered: false, description: 'Credit rating stable', action: 'Credit quality deteriorating', scoreImpact: -1.5 },
    { id: 'rf-sebi', severity: 'high' as RedFlagSeverity, title: 'SEBI Order/Investigation', source: 'SEBI', threshold: 'Active', currentValue: 'Clear', isTriggered: false, description: 'No SEBI action', action: 'Regulatory trouble', scoreImpact: -1.5 },
    { id: 'rf-forensic', severity: 'high' as RedFlagSeverity, title: 'Forensic Accounting Concerns', source: 'Research', threshold: 'Flagged', currentValue: 'Clear', isTriggered: false, description: 'No forensic flags', action: 'Accounting red flags', scoreImpact: -1.5 },

    // ===== MEDIUM (10 flags) - Show in Segment - Score Impact: -0.5 pts =====
    { id: 'rf-short-interest', severity: 'medium' as RedFlagSeverity, title: 'High Short Interest', source: 'F&O Data', threshold: '>2x avg OI', currentValue: 'Normal', isTriggered: false, description: 'Normal short interest', action: 'Bears betting against', scoreImpact: -0.5 },
    { id: 'rf-analyst-downgrade', severity: 'medium' as RedFlagSeverity, title: 'Analyst Downgrade Cluster', source: 'Broker Ratings', threshold: '3+ in 30 days', currentValue: '0', isTriggered: false, description: 'No recent downgrades', action: 'Consensus turning negative', scoreImpact: -0.5 },
    { id: 'rf-debt-rising', severity: 'medium' as RedFlagSeverity, title: 'Debt Increasing Rapidly', source: 'Balance Sheet', threshold: 'D/E +0.5x YoY', currentValue: '0', isTriggered: false, description: 'Debt-free company', action: 'Leverage risk building', scoreImpact: -0.5 },
    { id: 'rf-contingent', severity: 'medium' as RedFlagSeverity, title: 'Contingent Liabilities High', source: 'Balance Sheet', threshold: '>20% net worth', currentValue: '5%', isTriggered: false, description: 'Low contingent liabilities', action: 'Hidden obligations', scoreImpact: -0.5 },
    { id: 'rf-inventory', severity: 'medium' as RedFlagSeverity, title: 'Inventory Pileup', source: 'Balance Sheet', threshold: '>30% YoY', currentValue: 'N/A', isTriggered: false, description: 'Service company - N/A', action: 'Demand slowdown signal', scoreImpact: -0.5 },
    { id: 'rf-customer-conc', severity: 'medium' as RedFlagSeverity, title: 'Customer Concentration', source: 'Income Statement', threshold: '>25% revenue', currentValue: '8%', isTriggered: false, description: 'Diversified customer base', action: 'Single point of failure', scoreImpact: -0.5 },
    { id: 'rf-promoter-loans', severity: 'medium' as RedFlagSeverity, title: 'Promoter Entity Loans', source: 'Related Party', threshold: 'Present', currentValue: 'None', isTriggered: false, description: 'No loans to promoter entities', action: 'Cash siphoning risk', scoreImpact: -0.5 },
    { id: 'rf-dilution', severity: 'medium' as RedFlagSeverity, title: 'Frequent Equity Dilution', source: 'Capital Structure', threshold: '>2 raises in 3Y', currentValue: '1', isTriggered: false, description: 'Limited dilution', action: 'Shareholder dilution', scoreImpact: -0.5 },
    { id: 'rf-dividend-cut', severity: 'medium' as RedFlagSeverity, title: 'Dividend Cut/Skip', source: 'Dividend History', threshold: '>50% cut', currentValue: 'N/A', isTriggered: false, description: 'Growth company - no dividend', action: 'Cash flow stress', scoreImpact: -0.5 },
    { id: 'rf-working-capital', severity: 'medium' as RedFlagSeverity, title: 'Working Capital Deterioration', source: 'Balance Sheet', threshold: 'CCC +30 days', currentValue: 'Improving', isTriggered: false, description: 'Working capital healthy', action: 'Operational stress', scoreImpact: -0.5 },

    // ===== MONITOR (5 flags) - Informational - No Score Impact =====
    { id: 'rf-volatility', severity: 'monitor' as RedFlagSeverity, title: 'Volatility Warning', source: 'Price Data', threshold: 'Beta >1.5', currentValue: '1.3', isTriggered: false, description: 'Moderate volatility', action: 'High price swings', scoreImpact: 0 },
    { id: 'rf-liquidity', severity: 'monitor' as RedFlagSeverity, title: 'Liquidity Warning', source: 'Volume', threshold: '<₹1 Cr daily', currentValue: '₹150 Cr', isTriggered: false, description: 'Good liquidity', action: 'Hard to exit', scoreImpact: 0 },
    { id: 'rf-sector-headwind', severity: 'monitor' as RedFlagSeverity, title: 'Sector Headwind', source: 'News', threshold: 'Regulatory/macro', currentValue: 'None', isTriggered: false, description: 'No sector headwinds', action: 'External risk factor', scoreImpact: 0 },
    { id: 'rf-peer-underperform', severity: 'monitor' as RedFlagSeverity, title: 'Peer Underperformance', source: 'Price', threshold: '-20% vs peers', currentValue: '+5%', isTriggered: false, description: 'Outperforming peers', action: 'Relative weakness', scoreImpact: 0 },
    { id: 'rf-insider-selling', severity: 'monitor' as RedFlagSeverity, title: 'Insider Selling Pattern', source: 'SAST', threshold: 'Multiple insiders', currentValue: 'None', isTriggered: false, description: 'No insider selling', action: 'Confidence concern', scoreImpact: 0 },
  ]

  // Override with actual red flags from verdict if present
  const triggeredFlags = verdict.redFlags?.map(f => ({
    ...f,
    severity: (f.severity as RedFlagSeverity) || 'medium' as RedFlagSeverity,
    isTriggered: true,
    source: 'Analysis',
    currentValue: (f as any).currentValue || 'Triggered',
    threshold: (f as any).threshold || 'Exceeded',
    scoreImpact: f.severity === 'critical' ? -2.5 : f.severity === 'high' ? -1.25 : -0.5
  })) || []

  // Merge triggered flags with framework
  const mergedFlags = allFlags.map(flag => {
    const override = triggeredFlags.find(tf => tf.id === flag.id || tf.title === flag.title)
    return override || flag
  })

  const additionalTriggered = triggeredFlags.filter(tf =>
    !allFlags.some(f => f.id === tf.id || f.title === tf.title)
  )

  const finalFlags = [...mergedFlags, ...additionalTriggered]
  const triggered = finalFlags.filter(f => f.isTriggered)

  // Calculate total score impact (capped at -5)
  const rawScoreImpact = triggered.reduce((sum, f) => sum + (f.scoreImpact || 0), 0)
  const scoreImpact = Math.max(-5, rawScoreImpact)

  return {
    triggeredCount: triggered.length,
    totalParameters: 35,
    scoreImpact,
    flags: finalFlags,
    triggeredFlags: triggered,
    bySeverity: {
      critical: finalFlags.filter(f => f.severity === 'critical'),
      high: finalFlags.filter(f => f.severity === 'high'),
      medium: finalFlags.filter(f => f.severity === 'medium'),
      monitor: finalFlags.filter(f => f.severity === 'monitor'),
    },
    triggeredBySeverity: {
      critical: triggered.filter(f => f.severity === 'critical'),
      high: triggered.filter(f => f.severity === 'high'),
      medium: triggered.filter(f => f.severity === 'medium'),
      monitor: triggered.filter(f => f.severity === 'monitor'),
    }
  }
}

// ============== RED FLAG SCANNER COMPONENT ==============
function RedFlagScanner({
  verdict,
  news,
}: {
  verdict: StockVerdict
  news: NewsItem[]
}) {
  const framework = generateRedFlagFramework(verdict)
  const { triggeredBySeverity, bySeverity, scoreImpact } = framework

  // Track which severity categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    critical: false,
    high: false,
    medium: false,
    monitor: false
  })

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Get negative news as potential red flag signals
  const negativeNews = news.filter(n => n.sentiment === 'negative')
  const hasCritical = triggeredBySeverity.critical.length > 0
  const hasHigh = triggeredBySeverity.high.length > 0
  const hasAnyIssue = framework.triggeredCount > 0

  // Severity category config
  const categories = [
    { key: 'critical', label: 'Critical', emoji: '🔴', colorClass: 'destructive', count: 8, description: 'Blocking issues - immediate action required' },
    { key: 'high', label: 'High', emoji: '🟠', colorClass: 'warning', count: 12, description: 'Significant concerns - caution advised' },
    { key: 'medium', label: 'Medium', emoji: '🟡', colorClass: 'yellow', count: 10, description: 'Monitor closely - potential risks' },
    { key: 'monitor', label: 'Monitor', emoji: '⚪', colorClass: 'neutral', count: 5, description: 'Informational - awareness items' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border overflow-hidden',
        hasCritical ? 'bg-destructive-500/5 border-destructive-500/20' :
        hasHigh ? 'bg-warning-500/5 border-warning-500/20' :
        'bg-success-500/5 border-success-500/20'
      )}
    >
      {/* Header - Summary */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {hasCritical ? (
              <AlertTriangle className="w-5 h-5 text-destructive-400" />
            ) : hasHigh ? (
              <AlertCircle className="w-5 h-5 text-warning-400" />
            ) : (
              <Check className="w-5 h-5 text-success-400" />
            )}
            <h3 className="font-semibold text-white">Red Flag Scanner</h3>
          </div>
          <div className="flex items-center gap-2">
            {scoreImpact !== 0 && (
              <span className="text-xs text-destructive-400 font-medium">
                {scoreImpact.toFixed(1)} pts
              </span>
            )}
            <div className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium',
              framework.triggeredCount === 0 ? 'bg-success-500/20 text-success-400' :
              hasCritical ? 'bg-destructive-500/20 text-destructive-400' :
              'bg-warning-500/20 text-warning-400'
            )}>
              {framework.triggeredCount} issues / {framework.totalParameters} checked
            </div>
          </div>
        </div>

        {/* Status message */}
        {!hasAnyIssue && (
          <div className="mb-3 p-2.5 bg-success-500/10 rounded-lg border border-success-500/20">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success-400" />
              <span className="text-sm text-success-400 font-medium">All Clear</span>
              <span className="text-xs text-neutral-400">- No red flags detected</span>
            </div>
          </div>
        )}

        {/* ===== 4 SEVERITY CATEGORIES - Progressive Disclosure ===== */}
        <div className="space-y-2">
          {categories.map(({ key, label, emoji, colorClass, description }) => {
            const allFlags = bySeverity[key as keyof typeof bySeverity]
            const triggeredFlags = triggeredBySeverity[key as keyof typeof triggeredBySeverity]
            const isExpanded = expandedCategories[key]
            const hasTriggered = triggeredFlags.length > 0

            const colorMap: Record<string, { bg: string, border: string, text: string, activeBg: string }> = {
              destructive: { bg: 'bg-destructive-500/10', border: 'border-destructive-500/20', text: 'text-destructive-400', activeBg: 'bg-destructive-500/20' },
              warning: { bg: 'bg-warning-500/10', border: 'border-warning-500/20', text: 'text-warning-400', activeBg: 'bg-warning-500/20' },
              yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', activeBg: 'bg-yellow-500/20' },
              neutral: { bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', text: 'text-neutral-400', activeBg: 'bg-neutral-500/20' },
            }
            const colors = colorMap[colorClass]

            return (
              <div key={key} className={cn('rounded-xl border overflow-hidden', hasTriggered ? colors.border : 'border-white/5')}>
                {/* Category Header - Clickable */}
                <button
                  onClick={() => toggleCategory(key)}
                  className={cn(
                    'w-full p-3 flex items-center justify-between transition-colors',
                    hasTriggered ? colors.bg : 'bg-dark-700/30 hover:bg-dark-700/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{emoji}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-medium text-sm', hasTriggered ? colors.text : 'text-white')}>
                          {label}
                        </span>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold',
                          triggeredFlags.length === 0 ? 'bg-success-500/20 text-success-400' : colors.activeBg + ' ' + colors.text
                        )}>
                          {triggeredFlags.length}/{allFlags.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500">{description}</span>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-neutral-500 transition-transform',
                    isExpanded && 'rotate-180'
                  )} />
                </button>

                {/* Expanded Parameter List */}
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
                        {allFlags.map(flag => (
                          <div
                            key={flag.id}
                            className={cn(
                              'flex items-center justify-between py-2 px-3 rounded-lg text-sm',
                              flag.isTriggered ? colors.bg : 'bg-dark-700/20'
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {flag.isTriggered ? (
                                <X className={cn('w-3.5 h-3.5 flex-shrink-0', colors.text)} />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-success-400 flex-shrink-0" />
                              )}
                              <span className={cn(
                                'truncate',
                                flag.isTriggered ? 'text-white font-medium' : 'text-neutral-400'
                              )}>
                                {flag.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className={cn(
                                'text-xs',
                                flag.isTriggered ? colors.text : 'text-success-400'
                              )}>
                                {flag.isTriggered ? flag.currentValue : 'Clear'}
                              </span>
                              <span className="text-[10px] text-neutral-600">{flag.source}</span>
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

        {/* ===== NEWS SIGNALS ===== */}
        {negativeNews.length > 0 && (
          <div className="mt-3 p-3 bg-dark-700/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="w-4 h-4 text-warning-400" />
              <span className="text-xs font-medium text-warning-400">Recent News Signals</span>
            </div>
            <div className="space-y-1.5">
              {negativeNews.slice(0, 2).map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <TrendingDown className="w-3 h-3 text-destructive-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-neutral-300">{item.headline}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============== PROS/CONS COMPONENT ==============
function ProsCons({ verdict }: { verdict: StockVerdict }) {
  const pros = verdict.topSignals.filter(s => s.isPositive !== false)
  const cons = verdict.topConcerns?.filter(c => c.isPositive === false) || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 gap-3"
    >
      {/* Pros */}
      <div className="rounded-2xl border border-success-500/20 bg-success-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-success-500/20 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-success-400" />
          </div>
          <span className="font-semibold text-white text-sm">Strengths</span>
        </div>
        <div className="space-y-2">
          {pros.slice(0, 4).map((signal, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{signal.title}</p>
                {signal.description && (
                  <p className="text-xs text-neutral-400 mt-0.5">{signal.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cons */}
      <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-warning-500/20 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-400" />
          </div>
          <span className="font-semibold text-white text-sm">Weaknesses</span>
        </div>
        <div className="space-y-2">
          {cons.length > 0 ? cons.slice(0, 4).map((concern, i) => (
            <div key={i} className="flex items-start gap-2">
              <X className="w-4 h-4 text-warning-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{concern.title}</p>
                {concern.description && (
                  <p className="text-xs text-neutral-400 mt-0.5">{concern.description}</p>
                )}
              </div>
            </div>
          )) : (
            <p className="text-sm text-neutral-500">No significant concerns</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============== NEWS SECTION COMPONENT ==============
function NewsSection({ news }: { news: NewsItem[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Show first 2 items in grid, rest in dropdown
  const visibleNews = news.slice(0, 2)
  const hiddenNews = news.slice(2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl bg-dark-800 border border-white/5 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary-400" />
          <h3 className="font-semibold text-white">Recent News</h3>
        </div>
        <span className="text-xs text-neutral-500">{news.length} articles</span>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        {visibleNews.map((item) => (
          <div
            key={item.id}
            className={cn(
              'p-3 rounded-xl bg-dark-700/50 border-l-2',
              item.sentiment === 'positive' && 'border-l-success-500',
              item.sentiment === 'negative' && 'border-l-destructive-500',
              item.sentiment === 'neutral' && 'border-l-neutral-500'
            )}
          >
            <div className="flex items-start gap-2">
              {item.sentiment === 'positive' && <TrendingUp className="w-3.5 h-3.5 text-success-400 mt-0.5 flex-shrink-0" />}
              {item.sentiment === 'negative' && <TrendingDown className="w-3.5 h-3.5 text-destructive-400 mt-0.5 flex-shrink-0" />}
              {item.sentiment === 'neutral' && <Newspaper className="w-3.5 h-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white line-clamp-2">{item.headline}</p>
                <p className="text-[10px] text-neutral-500 mt-1.5">{item.source}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dropdown for More News */}
      {hiddenNews.length > 0 && (
        <>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {hiddenNews.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3 rounded-xl bg-dark-700/50 border-l-2',
                        item.sentiment === 'positive' && 'border-l-success-500',
                        item.sentiment === 'negative' && 'border-l-destructive-500',
                        item.sentiment === 'neutral' && 'border-l-neutral-500'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {item.sentiment === 'positive' && <TrendingUp className="w-3.5 h-3.5 text-success-400 mt-0.5 flex-shrink-0" />}
                        {item.sentiment === 'negative' && <TrendingDown className="w-3.5 h-3.5 text-destructive-400 mt-0.5 flex-shrink-0" />}
                        {item.sentiment === 'neutral' && <Newspaper className="w-3.5 h-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white line-clamp-2">{item.headline}</p>
                          <p className="text-[10px] text-neutral-500 mt-1.5">{item.source}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 py-2 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 border border-white/5 text-xs text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <span>{isExpanded ? 'Show Less' : `View ${hiddenNews.length} More`}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')} />
          </button>
        </>
      )}
    </motion.div>
  )
}

// ============== MAIN COMPONENT ==============
export function StockAnalysis() {
  const { ticker } = useParams<{ ticker: string }>()
  const { currentProfile, analysisMode, demoMode, toggleDemoMode } = useAppStore()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const segmentsRef = useRef<HTMLDivElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [stock, setStock] = useState<Stock | null>(null)
  const [verdict, setVerdict] = useState<StockVerdict | null>(null)
  const [verdictV2, setVerdictV2] = useState<StockVerdictV2 | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])

  // V2 pillar navigation state
  const [selectedPillar, setSelectedPillar] = useState<VerdictPillar | null>(null)
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null)

  // Progressive disclosure state - check URL for initial state
  const [isFullView, setIsFullView] = useState(() => searchParams.get('view') === 'full')

  // Evidence modal state
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false)
  const [selectedSegmentForEvidence, setSelectedSegmentForEvidence] = useState<SegmentScore | null>(null)
  const [overallEvidenceModalOpen, setOverallEvidenceModalOpen] = useState(false)

  // Demo mode spotlight state
  const spotlights = getSpotlightsForLocation('stock-analysis')
  const showDemoSpotlights = demoMode

  useEffect(() => {
    if (!ticker || !currentProfile) return
    let cancelled = false

    setIsLoading(true)

    const symbol = ticker
    const profileId = currentProfile.id

    async function loadStock() {
      // Demo stocks: use sync path for instant load
      if (isDemoStock(symbol)) {
        const stockData = getStockBySymbol(symbol)
        const verdictData = getVerdictForStock(symbol, profileId)
        const newsData = getNewsForStock(symbol)
        const verdictV2Data = getVerdictV2(symbol, profileId)

        if (cancelled) return
        setStock(stockData || null)
        setVerdict(verdictData || null)
        setVerdictV2(verdictV2Data || null)
        setNews(newsData.slice(0, 5))
        setUpcomingEvents(getUpcomingEvents(symbol))
      } else {
        // Non-demo: resolve via CMOTS API + live scoring
        const resolved = await resolveStock(symbol)
        if (cancelled || !resolved) {
          if (!cancelled) {
            setStock(null)
            setVerdict(null)
            setVerdictV2(null)
          }
          setIsLoading(false)
          return
        }

        // Build V2 verdict from live CMOTS data
        let liveVerdict: StockVerdictV2 | null = null
        try {
          liveVerdict = await buildVerdictForStock(resolved, profileId)
        } catch (err) {
          console.warn('Failed to build verdict for', symbol, err)
        }

        if (cancelled) return

        // Batch all state updates together to avoid partial-render crashes
        setStock(resolved)
        setVerdict(null)
        setVerdictV2(liveVerdict)
        setNews([])
        setUpcomingEvents([])
      }
      setSelectedPillar(null)
      setSelectedFactorId(null)
      setIsLoading(false)
    }

    loadStock()
    return () => { cancelled = true }
  }, [ticker, currentProfile])

  // Handle URL params for navigation from segment deep-dive
  useEffect(() => {
    if (searchParams.get('view') === 'full') {
      setIsFullView(true)
    }
    // Scroll to segments section if hash is present
    if (location.hash === '#segments' && segmentsRef.current) {
      setTimeout(() => {
        segmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [searchParams, location.hash, isLoading])

  if (!ticker || !currentProfile) return null

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <ArrowLeft className="w-4 h-4" />
          Back
        </div>
        <div className="rounded-2xl bg-dark-800 border border-white/5 p-6">
          <SkeletonBlock className="w-48 h-8 mb-2" />
          <SkeletonBlock className="w-32 h-4 mb-6" />
          <div className="flex justify-center">
            <SkeletonBlock className="w-32 h-32 rounded-full" />
          </div>
        </div>
        <SkeletonBlock className="w-full h-32 rounded-2xl" />
      </div>
    )
  }

  // Stock not found at all
  if (!stock) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-2xl bg-dark-800 border border-white/5 text-center py-12 px-6">
          <h2 className="text-xl font-semibold text-white mb-2">Stock Not Found</h2>
          <p className="text-neutral-400">
            We couldn't find analysis for "{ticker.toUpperCase()}"
          </p>
        </div>
      </div>
    )
  }

  // Stock found via CMOTS but no scoring data yet (no V1 or V2 verdict)
  if (!verdict && !verdictV2) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-2xl bg-dark-800 border border-white/5 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{stock.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-neutral-400">{stock.symbol}</span>
                {stock.sector && (
                  <span className="text-xs text-neutral-500 bg-dark-700 px-2 py-0.5 rounded">{stock.sector}</span>
                )}
              </div>
            </div>
            {stock.currentPrice > 0 && (
              <div className="text-right">
                <div className="text-xl font-semibold text-white">{formatCurrency(stock.currentPrice)}</div>
              </div>
            )}
          </div>
          <div className="border-t border-white/5 pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Analysis Coming Soon</h2>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              We found {stock.name} in our database. Full scoring analysis across Quant, Qual, and Risk pillars will be available shortly.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Back button + Mode Toggle + Demo Toggle */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between"
      >
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          {/* Demo Mode Toggle */}
          <DemoModeToggle
            isEnabled={demoMode}
            onToggle={toggleDemoMode}
          />
          {/* DIY/DFY toggle removed — V2 is DFY-only */}
        </div>
      </motion.div>

      {/* ============== HERO CARD ============== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-dark-800 border border-white/5 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{stock.name}</h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                {stock.sector} • {stock.symbol}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${stock.name} Analysis`,
                      text: verdictV2
                        ? `StockFox: ${stock.symbol} Score ${verdictV2.overallScore}/100 — ${verdictV2.overallLabel}`
                        : verdict
                        ? `StockFox: ${stock.symbol} Score ${verdict.overallScore}/10 - ${verdict.verdict}`
                        : `StockFox: ${stock.symbol} Analysis`,
                      url: window.location.href,
                    })
                  } else {
                    navigator.clipboard.writeText(window.location.href)
                  }
                }}
                className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors" aria-label="Save">
                <BookmarkPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Price row */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-white">{formatCurrency(stock.currentPrice)}</span>
            <span className={cn(
              'text-sm font-medium flex items-center gap-1',
              stock.changePercent >= 0 ? 'text-success-400' : 'text-destructive-400'
            )}>
              {stock.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {formatPercent(stock.changePercent)}
            </span>
          </div>

          {/* 52W Range - minimal */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
            <span>52W: {formatCurrency(stock.low52w)}</span>
            <div className="flex-1 max-w-24 h-1 bg-dark-600 rounded-full relative">
              <motion.div
                initial={{ left: '0%' }}
                animate={{
                  left: `${Math.min(100, Math.max(0, ((stock.currentPrice - stock.low52w) / (stock.high52w - stock.low52w)) * 100))}%`
                }}
                transition={{ duration: 0.5 }}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary-400 rounded-full -ml-1"
              />
            </div>
            <span>{formatCurrency(stock.high52w)}</span>
          </div>
        </div>

        {/* HERO: V2 Overall Verdict */}
        {verdictV2 && (
          <div className="p-5 pt-0" data-spotlight="hero-card">
            <OverallVerdictCard
              verdict={verdictV2}
              profileName={currentProfile.investmentThesis}
            />
          </div>
        )}
      </motion.div>

      {/* ============== QUICK VALIDATION CTA - Below Score Card ============== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3"
      >
        {/* Ask AI - Primary CTA */}
        <Link
          to="/chat"
          className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-primary-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
          data-spotlight="ask-ai-cta"
        >
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-white block">Ask AI</span>
            <span className="text-[10px] text-neutral-400">Get instant answers about {stock.symbol}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-purple-400 transition-colors" />
        </Link>

        {/* Consult Advisor */}
        <Link
          to="/advisors"
          className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-dark-800 border border-white/5 hover:border-warning-500/30 transition-all group"
          data-spotlight="consult-expert"
        >
          <div className="w-10 h-10 rounded-full bg-warning-500/10 flex items-center justify-center group-hover:bg-warning-500/20 transition-colors">
            <UserCheck className="w-5 h-5 text-warning-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-white block">Consult Expert</span>
            <span className="text-[10px] text-neutral-400">SEBI Registered Advisors</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-warning-400 transition-colors" />
        </Link>
      </motion.div>

      {/* ============== V2: 3-PILLAR CARDS + DRILL-DOWN ============== */}
      {verdictV2 && (
        <AnimatePresence mode="wait">
          {!selectedPillar ? (
            /* Pillar overview: 3 cards */
            <motion.div
              key="pillar-overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Analysis Pillars
                </span>
                <span className="text-[10px] text-neutral-600">
                  {verdictV2.pillars.reduce((n, p) => n + p.segments.length, 0)} dimensions analysed
                </span>
              </div>
              {verdictV2.pillars.map((pillar, i) => (
                <PillarCard
                  key={pillar.pillar}
                  pillar={pillar}
                  delay={i * 0.08}
                  onClick={() => setSelectedPillar(pillar.pillar)}
                />
              ))}
            </motion.div>
          ) : selectedFactorId ? (
            /* Qual Factor deep-dive (Layer 3) */
            <motion.div
              key={`factor-${selectedFactorId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {(() => {
                const pillar = verdictV2.pillars.find(p => p.pillar === selectedPillar)
                const factor = pillar?.segments.find(s => s.id === selectedFactorId)
                if (!factor) return null
                return (
                  <QualFactorTab
                    factor={factor}
                    onBack={() => setSelectedFactorId(null)}
                  />
                )
              })()}
            </motion.div>
          ) : (
            /* Pillar drill-down (Layer 2) */
            <motion.div
              key={`pillar-${selectedPillar}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {(() => {
                const pillar = verdictV2.pillars.find(p => p.pillar === selectedPillar)
                if (!pillar) return null

                // Risk pillar: embed Red Flag Scanner instead of empty segments list
                if (selectedPillar === 'risk') {
                  return (
                    <div className="space-y-4">
                      <PillarDrillDown
                        pillar={pillar}
                        onBack={() => setSelectedPillar(null)}
                      />
                      {verdict && <RedFlagScanner verdict={verdict} news={news} />}
                    </div>
                  )
                }

                return (
                  <PillarDrillDown
                    pillar={pillar}
                    onBack={() => setSelectedPillar(null)}
                    onSegmentClick={(segmentId) => {
                      // If it's a qual factor with signal groups, show factor tab
                      const seg = pillar.segments.find(s => s.id === segmentId)
                      if (seg?.signalGroups && seg.signalGroups.length > 0) {
                        setSelectedFactorId(segmentId)
                      } else {
                        // Navigate to segment deep-dive page
                        window.location.href = `/segment/${ticker}/${segmentId}`
                      }
                    }}
                  />
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ============== PROS/CONS (Quick View) - hidden during pillar drill-down ============== */}
      {!selectedPillar && verdict && (
        <div data-spotlight="pros-cons">
          <ProsCons verdict={verdict} />
        </div>
      )}

      {/* Red Flag Scanner moved into Risk pillar drill-down */}

      {/* ============== FULL ANALYSIS TOGGLE (below Pros/Cons) — V1 only ============== */}
      {!verdictV2 && <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => setIsFullView(!isFullView)}
        className={cn(
          'w-full py-3 rounded-2xl border text-sm font-medium flex items-center justify-center gap-2 transition-all',
          isFullView
            ? analysisMode === 'dfy'
              ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
              : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
            : 'bg-dark-800 border-white/10 text-white hover:border-white/20'
        )}
      >
        {isFullView ? (
          <>
            <ChevronUp className="w-4 h-4" />
            {analysisMode === 'dfy' ? 'Hide Full Analysis' : 'Hide Segments'}
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            {analysisMode === 'dfy' ? 'View Full Analysis (11 Segments)' : 'Explore 11 Segments'}
          </>
        )}
      </motion.button>}

      {/* ============== FULL VIEW: 11 SEGMENTS — V1 only ============== */}
      {!verdictV2 && <AnimatePresence>
        {isFullView && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 overflow-hidden"
          >
            {/* 11-Segment Analysis */}
            <div ref={segmentsRef} id="segments" className="rounded-2xl bg-dark-800 border border-white/5 p-5" data-spotlight="segments-section">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">
                  {analysisMode === 'dfy' ? '11-Segment Analysis' : '11 Analysis Segments'}
                </h3>
                {/* Legend - compact - DFY only */}
                {analysisMode === 'dfy' && (
                  <div className="flex gap-3 text-[10px] text-neutral-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success-500" /> 8+
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> 6-8
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning-400" /> 4-6
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive-500" /> &lt;4
                    </span>
                  </div>
                )}
              </div>

              {/* DFY: SegmentBar with scores and ranks */}
              {analysisMode === 'dfy' && (
                <SegmentBar
                  segments={verdict!.segments}
                  onSegmentClick={(segmentId) => {
                    window.location.href = `/segment/${ticker}/${segmentId}`
                  }}
                  onEvidenceClick={(segment) => {
                    setSelectedSegmentForEvidence(segment as SegmentScore)
                    setEvidenceModalOpen(true)
                  }}
                />
              )}

              {/* DIY: Simple segment list - no scores */}
              {analysisMode === 'diy' && (
                <DIYSegmentList
                  segments={verdict!.segments}
                  onSegmentClick={(segmentId) => {
                    window.location.href = `/segment/${ticker}/${segmentId}`
                  }}
                />
              )}

              <div className="mt-3 pt-2 border-t border-white/5 text-xs text-neutral-500">
                {analysisMode === 'dfy' ? (
                  <>
                    <span className="text-primary-400">{currentProfile.displayName}</span> weights • Tap for details
                  </>
                ) : (
                  <>Tap any segment to view raw metrics and sector benchmarks</>
                )}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>}

      {/* Metric-by-Metric and Learning Actions removed in V2 */}

      {/* ============== NEWS & EVENTS SECTION (V2) ============== */}
      {verdictV2 && verdictV2.newsEvents.length > 0 && !selectedPillar && (
        <div data-spotlight="news-section">
          <NewsEventSection events={verdictV2.newsEvents} />
        </div>
      )}

      {/* Fallback: V1 news if no V2 data */}
      {!verdictV2 && news.length > 0 && (
        <div data-spotlight="news-section">
          <NewsSection news={news} />
        </div>
      )}

      {/* ============== UPCOMING EVENTS (if any) ============== */}
      {upcomingEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-dark-800 border border-white/5 p-4"
          data-spotlight="upcoming-events"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary-400" />
            <span className="font-semibold text-white text-sm">Upcoming Events</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
                  event.importance === 'high' ? 'bg-primary-500/10 text-primary-300' : 'bg-dark-700 text-neutral-400'
                )}
              >
                <span>{getEventIcon(event.type)}</span>
                <span className="font-medium">{event.title}</span>
                <span className="text-neutral-500">•</span>
                <span>{formatEventDate(event.date)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ============== ENTRY ASSESSMENT — COMING SOON ============== */}
      {!selectedPillar && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl bg-dark-800 border border-white/5 p-5 relative overflow-hidden"
          data-spotlight="entry-assessment"
        >
          {/* Blurred overlay */}
          <div className="absolute inset-0 bg-dark-800/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <span className="px-3 py-1 rounded-lg bg-primary-500/15 text-primary-400 text-xs font-semibold uppercase tracking-wider">
              Coming Soon
            </span>
            <p className="text-xs text-neutral-500 mt-2 text-center max-w-[200px]">
              Position sizing, fair value range & exit triggers
            </p>
          </div>

          {/* Placeholder content (blurred behind overlay) */}
          <div className="opacity-40 pointer-events-none select-none">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <h3 className="font-semibold text-white">Entry Assessment</h3>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-500/20 text-neutral-400">
                —
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-dark-700/50 rounded-xl">
                <span className="text-xs text-neutral-500 block mb-1">Suggested Allocation</span>
                <span className="text-white font-medium text-sm">—</span>
              </div>
              <div className="p-3 bg-dark-700/50 rounded-xl">
                <span className="text-xs text-neutral-500 block mb-1">Fair Value Range</span>
                <span className="text-white font-medium text-sm">—</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5">
              <span className="text-xs font-medium text-neutral-400">Exit Triggers</span>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 rounded text-xs bg-dark-700 text-neutral-500">ROE &lt; 12%</span>
                <span className="px-2 py-1 rounded text-xs bg-dark-700 text-neutral-500">D/E &gt; 1.5</span>
                <span className="px-2 py-1 rounded text-xs bg-dark-700 text-neutral-500">Margin decline 3Q</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============== MORE ACTIONS - Bottom Section ============== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-dark-800 border border-white/5 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-medium text-white">More Actions</span>
        </div>

        {/* Primary Actions - 2 Column Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Compare with Peers */}
          <Link
            to={`/compare?add=${stock.symbol}`}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 border border-primary-500/20 hover:border-primary-500/40 hover:bg-dark-700 transition-all group"
            data-spotlight="compare-peers"
          >
            <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
              <GitCompare className="w-5 h-5 text-primary-400" />
            </div>
            <span className="text-sm font-medium text-white">Compare Peers</span>
            <span className="text-[10px] text-neutral-500 text-center">vs competitors</span>
          </Link>

          {/* Back-Test */}
          <Link
            to={`/backtest/${stock.symbol}`}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 border border-white/5 hover:border-teal-500/30 hover:bg-dark-700 transition-all group"
            data-spotlight="back-test"
          >
            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <History className="w-5 h-5 text-teal-400" />
            </div>
            <span className="text-sm font-medium text-white">Back-Test</span>
            <span className="text-[10px] text-neutral-500 text-center">Historical returns</span>
          </Link>
        </div>

        {/* Secondary Actions - Compact Row */}
        <div className="flex gap-2 pt-3 border-t border-white/5">
          <Link
            to="/journal"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dark-700/30 border border-white/5 hover:bg-dark-700/50 transition-colors"
          >
            <PenLine className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-300">Journal</span>
          </Link>
          <button
            onClick={() => {
              const shareText = verdictV2
                ? `StockFox: ${stock.symbol} Score ${verdictV2.overallScore}/100 — ${verdictV2.overallLabel}`
                : verdict
                ? `StockFox: ${stock.symbol} Score ${verdict.overallScore}/10 - ${verdict.verdict}`
                : `StockFox: ${stock.symbol} Analysis`
              if (navigator.share) {
                navigator.share({ title: `${stock.name} Analysis`, text: shareText, url: window.location.href })
              } else {
                navigator.clipboard.writeText(window.location.href)
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dark-700/30 border border-white/5 hover:bg-dark-700/50 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-300">Share</span>
          </button>
          <button
            onClick={() => {
              const exportText = verdictV2
                ? `STOCKFOX ANALYSIS REPORT\n========================\nStock: ${stock.name} (${stock.symbol})\nSector: ${stock.sector}\nDate: ${new Date().toLocaleDateString()}\n\nOVERALL: ${verdictV2.overallScore}/100 — ${verdictV2.overallLabel}\n\nPILLARS:\n${verdictV2.pillars.map(p => `${p.name}: ${p.score}/100 (${p.label})`).join('\n')}\n\n---\nGenerated by StockFox`
                : verdict
                ? `STOCKFOX ANALYSIS REPORT\n========================\nStock: ${stock.name} (${stock.symbol})\nSector: ${stock.sector}\nDate: ${new Date().toLocaleDateString()}\n\nSCORE: ${verdict.overallScore.toFixed(1)}/10\nVERDICT: ${verdict.verdict}\n\nKEY SIGNALS:\n${verdict.topSignals.map(s => `✓ ${s.title}: ${s.description}`).join('\n')}\n\nCONCERNS:\n${verdict.topConcerns.map(c => `⚠ ${c.title}: ${c.description}`).join('\n')}\n\nSEGMENT SCORES:\n${verdict.segments.map(s => `${s.name}: ${s.score.toFixed(1)}/10`).join('\n')}\n\n---\nGenerated by StockFox`
                : `StockFox: ${stock.symbol} — No analysis data available yet`
              navigator.clipboard.writeText(exportText).then(() => {
                alert('Analysis report copied to clipboard!')
              })
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dark-700/30 border border-white/5 hover:bg-dark-700/50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-300">Export</span>
          </button>
        </div>
      </motion.div>

      {/* ============== EVIDENCE MODAL ============== */}
      <AnimatePresence>
        {evidenceModalOpen && selectedSegmentForEvidence && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEvidenceModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-[10%] bottom-[10%] z-50 mx-auto max-w-lg bg-dark-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{selectedSegmentForEvidence.name}</h3>
                    <p className="text-xs text-neutral-500">Score: {selectedSegmentForEvidence.score.toFixed(1)}/10</p>
                  </div>
                </div>
                <button
                  onClick={() => setEvidenceModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <EvidenceChainPanel
                  metricName={selectedSegmentForEvidence.name}
                  citation={selectedSegmentForEvidence.metrics?.[0]?.citation}
                />

                {/* Source Summary */}
                <div className="mt-4 p-3 rounded-xl bg-dark-700/50 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-400">Sources Used</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSegmentForEvidence.metrics?.slice(0, 4).map((m, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs bg-dark-600 text-neutral-300 rounded"
                      >
                        {m.citation?.source || 'Company Data'}
                      </span>
                    ))}
                    {(selectedSegmentForEvidence.metrics?.length || 0) > 4 && (
                      <span className="px-2 py-1 text-xs bg-dark-600 text-neutral-500 rounded">
                        +{(selectedSegmentForEvidence.metrics?.length || 0) - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setEvidenceModalOpen(false)
                    window.location.href = `/segment/${ticker}/${selectedSegmentForEvidence.id}`
                  }}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-400 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  View Full Segment Analysis
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============== OVERALL EVIDENCE MODAL (V1 only) ============== */}
      <AnimatePresence>
        {overallEvidenceModalOpen && verdict && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOverallEvidenceModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-[10%] bottom-[10%] z-50 mx-auto max-w-lg bg-dark-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Overall Score Evidence</h3>
                    <p className="text-xs text-neutral-500">How we arrived at {verdict.overallScore.toFixed(1)}/10</p>
                  </div>
                </div>
                <button
                  onClick={() => setOverallEvidenceModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Justification Summary - Score, Rank, Verdict */}
                <div className="space-y-3">
                  {verdict.scoreJustification && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-primary-500/10 to-transparent border border-primary-500/20">
                      <p className="text-xs text-neutral-300 leading-relaxed">{verdict.scoreJustification}</p>
                    </div>
                  )}
                  {verdict.rankJustification && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-info-500/10 to-transparent border border-info-500/20">
                      <p className="text-xs text-neutral-300 leading-relaxed">{verdict.rankJustification}</p>
                    </div>
                  )}
                  {verdict.verdictJustification && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-success-500/10 to-transparent border border-success-500/20">
                      <p className="text-xs text-neutral-300 leading-relaxed">{verdict.verdictJustification}</p>
                    </div>
                  )}
                </div>

                {/* Level 1: Data Sources */}
                <div className="p-4 rounded-xl bg-dark-700/50 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-primary-500/20 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-primary-400" />
                    </div>
                    <span className="text-sm font-medium text-white">Level 1: Data Sources</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Total Metrics Analyzed</span>
                      <span className="text-white font-medium">
                        {verdict.segments.reduce((count, s) => count + (s.metrics?.length || 0), 0)} metrics
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Primary Source</span>
                      <span className="text-white">Q3 FY25 Company Filings</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Verification</span>
                      <span className="text-success-400">Audited & Cross-Referenced</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <span className="text-neutral-500 block mb-2">Source Documents</span>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 bg-dark-600 text-neutral-300 rounded text-[10px]">Annual Report</span>
                        <span className="px-2 py-0.5 bg-dark-600 text-neutral-300 rounded text-[10px]">Quarterly Results</span>
                        <span className="px-2 py-0.5 bg-dark-600 text-neutral-300 rounded text-[10px]">Investor Presentation</span>
                        <span className="px-2 py-0.5 bg-dark-600 text-neutral-300 rounded text-[10px]">BSE/NSE Filings</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Level 2: Methodology */}
                <div className="p-4 rounded-xl bg-dark-700/50 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-info-500/20 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-info-400" />
                    </div>
                    <span className="text-sm font-medium text-white">Level 2: Scoring Methodology</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Framework</span>
                      <span className="text-white">11-Segment Analysis Model</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Profile Weighting</span>
                      <span className="text-primary-400 font-medium">{currentProfile.investmentThesis} Investor</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Red Flag Adjustment</span>
                      <span className="text-white">{verdict.redFlags?.length || 0} flags processed</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <span className="text-neutral-500 block mb-2">Segment Weights Applied</span>
                      <p className="text-neutral-400 text-[10px] leading-relaxed">
                        Each segment is weighted based on your {currentProfile.investmentThesis} investment profile.
                        {currentProfile.investmentThesis === 'growth' && ' Growth metrics like Revenue Growth and Market Position carry higher weights.'}
                        {currentProfile.investmentThesis === 'value' && ' Value metrics like Valuation and Financial Health carry higher weights.'}
                        {(currentProfile.investmentThesis === 'income' || currentProfile.investmentThesis === 'dividend') && ' Income metrics like Dividend Yield and Cash Flow carry higher weights.'}
                        {!['growth', 'value', 'income', 'dividend'].includes(currentProfile.investmentThesis) && ' Segments are balanced across profitability, stability, and growth.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Level 3: Score Contribution */}
                <div className="p-4 rounded-xl bg-dark-700/50 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-success-500/20 flex items-center justify-center">
                      <Target className="w-3.5 h-3.5 text-success-400" />
                    </div>
                    <span className="text-sm font-medium text-white">Level 3: Score Breakdown</span>
                  </div>
                  <div className="space-y-2">
                    {verdict.segments.slice(0, 6).map((segment, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400 w-24 truncate">{segment.name}</span>
                        <div className="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                            style={{ width: `${segment.score * 10}%` }}
                          />
                        </div>
                        <span className="text-xs text-white font-medium w-8">{segment.score.toFixed(1)}</span>
                      </div>
                    ))}
                    {verdict.segments.length > 6 && (
                      <p className="text-[10px] text-neutral-500 text-center pt-1">
                        +{verdict.segments.length - 6} more segments
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                    <span className="text-xs text-neutral-500">Peer Comparison</span>
                    <span className="text-xs text-white">
                      Ranked <span className="text-primary-400 font-semibold">#{verdict.peerRank}</span> of {verdict.peerTotal} in {verdict.peerGroup}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setOverallEvidenceModalOpen(false)
                    setIsFullView(true)
                    setTimeout(() => {
                      segmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 100)
                  }}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-400 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  Explore All 11 Segments
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Guided Analysis & Reflection modals removed in V2 */}

      {/* ============== DEMO MODE SPOTLIGHT TOUR ============== */}
      <SpotlightTour
        spotlights={spotlights}
        isActive={showDemoSpotlights}
        onEnd={toggleDemoMode}
      />
    </div>
  )
}
