// User Profile Types
export type InvestmentThesis =
  | 'growth' | 'value' | 'dividend' | 'quality' | 'agnostic'
  | 'balanced' | 'comprehensive' | 'learning' | 'compounding' | 'remote'
  | 'momentum' | 'income' | 'preservation'
export type RiskTolerance = 'very-conservative' | 'conservative' | 'moderate' | 'aggressive'
export type TimeHorizon = 'short' | 'medium' | 'long' | 'very-long'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export interface UserProfile {
  id: string
  name: string
  displayName: string
  avatar: string
  investmentThesis: InvestmentThesis
  riskTolerance: RiskTolerance
  timeHorizon: TimeHorizon
  experienceLevel: ExperienceLevel
  sectorPreferences: string[]
  segmentWeights: Record<string, number>
  portfolio: Holding[]
  patterns: Pattern[]
  blindSpots: BlindSpot[]
  skillLevel: number
  skillBadge: string
}

// Stock Types
export type VerdictType = 'STRONG BUY' | 'BUY' | 'HOLD' | 'AVOID' | 'STRONG HOLD'

export interface Stock {
  id: string
  symbol: string
  name: string
  sector: string
  subSector: string
  currentPrice: number
  previousClose: number
  change: number
  changePercent: number
  marketCap: number
  high52w: number
  low52w: number
  beta: number
  peerGroup: string[]
}

// Structured Position Sizing (per tech spec)
export interface PositionSizingDetails {
  recommendedAllocation: string
  reasoning?: string
  maxAllocation?: string
  warning?: string
  learningNote?: string
  entryStrategy?: string
}

// Structured Entry Timing (per tech spec)
export interface EntryTimingDetails {
  currentPrice: string
  fairValueRange?: string
  suggestion: string
  positionInRange?: string
  assessment?: string
}

// Exit Trigger (per Scorecard Architecture)
export interface ExitTrigger {
  id: string
  metric: string
  condition: string
  threshold: string
  currentValue: string
  status: 'safe' | 'warning' | 'danger'
  rationale: string
}

// Portfolio Fit Analysis (per tech spec)
export interface PortfolioFit {
  thesisFit: boolean
  riskFit: boolean
  diversificationFit: boolean
  suggestionText: string
}

// Full Peer Ranking Object (per tech spec)
export interface PeerRanking {
  rank: number
  category: string
  total: number
  above?: string[]
  below?: string[]
  commentary?: string
  learningNote?: string
}

// Learning Highlight for beginner profiles
export interface LearningHighlight {
  metric: string
  explanation: string
  comparison?: string
}

export interface StockVerdict {
  stockId: string
  profileId: string
  overallScore: number
  sectorAvgScore?: number
  sectorRank?: number
  sectorTotal?: number
  verdict: VerdictType
  verdictLabel?: string
  verdictColor?: 'green' | 'yellow' | 'red'
  summary?: string
  peerRank: number
  peerTotal: number
  peerCategory?: string
  peerGroup?: string
  peerRanking?: PeerRanking
  topSignals: Signal[]
  topConcerns: Signal[]
  verdictRationale: string
  // Score/Rank/Verdict Justifications (2-3 line explainers)
  scoreJustification?: string  // Why is the score X/10
  rankJustification?: string   // Why ranked #X of Y peers
  verdictJustification?: string // Why this verdict (Strong Buy, Buy, etc.)
  positionSizing: string | PositionSizingDetails
  entryGuidance: string
  entryTiming?: EntryTimingDetails
  exitTriggers?: ExitTrigger[]
  portfolioFit?: PortfolioFit
  segments: SegmentScore[]
  redFlags?: RedFlag[]
  redFlagFramework?: RedFlagFramework
  riskWarning?: string
  learningPrompt?: string
  blindSpotAlert?: string
  learningHighlights?: LearningHighlight[]
}

export interface Signal {
  title: string
  description: string
  metric?: string
  value?: string
  benchmark?: string
  isPositive?: boolean
  whyMatters?: string
  scoreContribution?: string
}

// Score band for visual display
export type ScoreBand = 'green' | 'yellow' | 'red'

// Segment Types - Enhanced with sector comparisons
export interface SegmentScore {
  id: string
  name: string
  score: number
  scoreBand?: ScoreBand
  sectorAvg?: number
  sectorRank?: number
  sectorTotal?: number
  weight: number
  status: 'positive' | 'neutral' | 'negative'
  interpretation: string
  quickInsight?: string
  metrics?: Metric[]
  summaryByProfile?: Record<string, string>
  // Score/Rank Justifications (2-3 line explainers)
  scoreJustification?: string  // Why segment scored X/10
  rankJustification?: string   // Why ranked #X in sector
}

export interface Metric {
  id: string
  name: string
  value: number | string
  displayValue: string
  unit?: string
  sectorAvg?: number | string
  sectorAvgDisplay?: string
  comparison?: 'above' | 'below' | 'inline'
  percentile?: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'positive' | 'neutral' | 'negative'
  trend?: 'improving' | 'declining' | 'stable'
  trendDirection?: 'up' | 'down' | 'flat'
  trend5Y?: number[]
  tooltipSimple?: string
  tooltipAdvanced?: string
  tooltip?: string
  citation?: Citation
}

export interface Citation {
  source: string
  document: string
  page?: string
  section?: string
  date: string
  exactQuote?: string
  url?: string
}

// Enhanced Trend Intelligence types (for A7 - Historical Trajectory)
export type TrendDirection = 'up' | 'down' | 'neutral'
export type VerificationStatus = 'active' | 'pending' | 'stale'

export interface TrendIntelligence {
  currentValue: number | string
  displayValue: string
  status: 'excellent' | 'good' | 'fair' | 'poor'
  peerBenchmark: number | string
  peerBenchmarkDisplay: string
  sectorPercentile: number
  trajectory: TrendDirection
  trajectoryPeriods: number // e.g., 5 for "5-period direction"
  verificationStatus: VerificationStatus
  historicalData: TrendDataPoint[]
}

export interface TrendDataPoint {
  period: string // e.g., "Q3 23", "Q4 23", "Q1 24"
  value: number
  displayValue?: string
}

// Evidence Drill-Down types (for A9 - 3-Level Citations)
export interface EvidenceChain {
  level1: {
    source: string
    documentType: string
    filingDate: string
  }
  level2: {
    calculation: string
    rawDataPoints: string[]
    methodology: string
  }
  level3: {
    segmentContribution: string
    weightInScore: number
    impactDescription: string
  }
}

// Enhanced Metric with full transparency fields
export interface EnhancedMetric extends Metric {
  trendIntelligence?: TrendIntelligence
  evidenceChain?: EvidenceChain
  groundingSources?: GroundingSource[]
  contextualExplanation?: string // AI-generated contextual meaning
  liveAdjustEnabled?: boolean
}

export interface GroundingSource {
  name: string
  url: string
  type: 'primary' | 'secondary'
}

// Red Flag Types (per tech spec: Critical, High, Medium, Low/Monitor)
export type RedFlagSeverity = 'critical' | 'high' | 'medium' | 'low' | 'monitor'
export type RedFlagCategory = 'financial' | 'governance' | 'quality' | 'structural' | 'historical'

export interface RedFlag {
  id: string
  type: string
  category: RedFlagCategory
  title: string
  description: string
  severity: RedFlagSeverity
  action: string
  currentValue?: string
  threshold?: string
  isTriggered: boolean
}

// Full 16-parameter Red Flag Framework
export interface RedFlagFramework {
  triggeredCount: number
  totalParameters: number
  flags: RedFlag[]
  byCategory: {
    financial: RedFlag[]
    governance: RedFlag[]
    quality: RedFlag[]
    structural: RedFlag[]
    historical: RedFlag[]
  }
}

// Portfolio Types
export interface Holding {
  symbol: string
  name: string
  quantity: number
  avgPrice: number
  currentPrice: number
  currentValue: number
  pnl: number
  pnlPercent: number
  allocation: number
}

// Journal Types
export type UserVerdict = 'BUY' | 'WATCHLIST' | 'SKIP' | 'AVOID'
export type OutcomeStatus = 'pending' | 'win' | 'loss' | 'neutral'

export interface JournalEntry {
  id: string
  date: string
  stock: {
    symbol: string
    name: string
    sector: string
  }
  scoreAtAnalysis: number
  verdictAtAnalysis: VerdictType
  userVerdict: UserVerdict
  userNotes: string
  priceAtAnalysis: number
  currentPrice: number
  pnlPercent: number
  outcomeStatus: OutcomeStatus
  segmentsChecked: string[]
  timeSpent: number
}

export interface Pattern {
  id: string
  title: string
  description: string
  type: 'strength' | 'preference' | 'behavior'
}

export interface BlindSpot {
  id: string
  segment: string
  checkRate: number
  suggestion: string
}

// Alert Types
export type AlertType = 'score_change' | 'peer_rank' | 'thesis_breaking' | 'news' | 'earnings' | 'concentration'
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  stock?: string
  title: string
  message: string
  timestamp: string
  isRead: boolean
  action?: string
}

// Advisor Types
export type AdvisorTier = 'elite' | 'expert' | 'emerging'

export interface Advisor {
  id: string
  name: string
  avatar: string
  tier: AdvisorTier
  specializations: string[]
  yearsExperience: number
  aum: string
  sebiRegistration: string
  rating: number
  reviewCount: number
  successRate: number
  consultationFee: number
  bio: string
}

// Discovery Types
export interface DiscoveryStock {
  symbol: string
  name: string
  sector: string
  score: number
  verdict: VerdictType
  analysisCount?: number
  scoreChange?: number
  matchReason?: string
}

// News Types
export type NewsSentiment = 'positive' | 'negative' | 'neutral'

export interface NewsItem {
  id: string
  title: string
  source: string
  timestamp: string
  sentiment: NewsSentiment
  relevance: string
  url?: string
}

// Chat Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  citations?: Citation[]
}

// Watchlist Types
export interface WatchlistItem extends Stock {
  score: number
  verdict: string
  verdictLabel?: string
  peerRank?: number
  peerTotal?: number
  sectorRank?: number
  sectorTotal?: number
  sectorAvgScore?: number
  verdictPeerGroup?: string
  quickInsight?: string
  topSignal?: string
  lastAnalyzed?: string
}

// Local Discovery Stock for Dashboard (extends base DiscoveryStock)
export interface DashboardDiscoveryStock {
  symbol: string
  name: string
  shortName: string
  score: number
  verdict: string
  change: number
  reason: string
  sectorRank?: number
  sectorTotal?: number
}

// User Rating Types (for guided analysis)
export type UserRating = 'weak' | 'fair' | 'good' | 'great' | null

// ============================================================
// V2 ARCHITECTURE — Quant + Qual + Risk Hierarchy (0-100 scale)
// ============================================================

// Layer structure: Overall → Pillars → Segments/Factors → Signals/Metrics

export type VerdictPillar = 'quant' | 'qual' | 'risk'
export type SegmentScoringType = 'scored' | 'context'
export type ScoreBandV2 = 'strong' | 'good' | 'mixed' | 'weak' | 'suppressed'
export type EscalationTier = 'hard' | 'soft' | 'score_only'
export type OverallVerdictLabel = 'strong_buy' | 'buy' | 'hold' | 'sell'

// Layer 2: Three independent pillar verdicts
export interface PillarVerdict {
  pillar: VerdictPillar
  name: string
  score: number                    // 0-100
  scoreBand: ScoreBandV2
  label: string                    // "STRONG" / "GOOD" / "MIXED" / "WEAK"
  summary: string
  summaryByProfile?: Record<string, string>
  segments: SegmentVerdictV2[]     // Layer 3 children
}

// Layer 3: Individual segment/factor verdicts
export interface SegmentVerdictV2 {
  id: string
  name: string
  pillar: VerdictPillar
  scoringType: SegmentScoringType
  score?: number                   // 0-100, undefined for context segments
  scoreBand?: ScoreBandV2
  label?: string                   // Per-factor label (MG uses TRUSTED/ADEQUATE)
  weight?: number                  // only for scored segments
  status: 'positive' | 'neutral' | 'negative'
  interpretation: string
  quickInsight?: string
  summaryByProfile?: Record<string, string>
  scoreJustification?: string
  confidenceIndicator?: ConfidenceIndicator
  // Layer 4 drill-down
  signalGroups?: SignalGroup[]     // Qual: Group A, B, C, D
  subClassifications?: SubClassification[]  // Quant: Income Statement, Balance Sheet, etc.
  metrics?: Metric[]
  // Escalation
  redFlags?: RedFlagV2[]
  convictionSignals?: string[]
  isSuppressed?: boolean           // Hard override fired
  suppressionReason?: string
}

// Quant sub-classification (e.g., Financial Health → Income Statement, Balance Sheet)
export interface SubClassification {
  id: string
  name: string
  metrics: Metric[]
}

// Qual Factor Signal Architecture
export interface SignalGroup {
  id: string                       // 'group_a', 'group_b', etc.
  name: string                     // "Promoter Alignment", "Governance Structure"
  role: 'anchor' | 'scored' | 'red_flag_only' | 'narrative_only' | 'contextualiser'
  weight?: number                  // Within non-anchor composite
  score?: number                   // 0-100
  signals: QualSignal[]
}

export interface QualSignal {
  id: string                       // 'A1', 'A2', etc.
  name: string                     // "Promoter Skin in the Game"
  group: string
  escalationTier: EscalationTier
  score?: number                   // 0-100, undefined for hard triggers/contextualisers
  state: 'strong' | 'monitor' | 'flag' | 'suppressed' | 'not_applicable'
  userText: string                 // Plain English 3-state text for current state
  isTriggered?: boolean            // For soft/hard escalations
  version: 'v1' | 'v2'            // Signal availability
}

export interface RedFlagV2 {
  signalId: string
  severity: 'hard' | 'soft'
  title: string
  description: string              // Plain English
  source: string                   // "MG-A1", "EQ-C3", etc.
}

export interface ConfidenceIndicator {
  signalsComputed: number
  signalsTotal: number
  dataRange?: string               // "FY20–FY24"
  state: 'full' | 'partial' | 'limited_history' | 'suppressed' | 'cmots_gap'
  tooltip: string
}

// News & Events (separate unscored section, replaces old "Recent News")
export type NewsBucket =
  | 'financial_performance'
  | 'corporate_actions'
  | 'governance_ownership'
  | 'strategic_business'
  | 'external_macro'
  | 'market_signals'
  | 'sentiment_third_party'
  | 'documents_reference'

export interface NewsEvent {
  id: string
  type: string                     // 48-type taxonomy
  bucket: NewsBucket
  title: string
  source: string
  date: string
  severity: 'positive' | 'neutral' | 'watch' | 'flag' | 'hard_stop'
  investorMeaning: string
  impactPillars: VerdictPillar[]   // Which pillars this event affects
}

// V2 Overall Verdict — independent of pillar scores
export interface StockVerdictV2 {
  // Layer 1: Overall (independent computation)
  overallVerdict: OverallVerdictLabel
  overallScore: number             // 0-100, independent weighted computation
  overallLabel: string             // "Strong Buy" / "Buy" / "Hold" / "Sell"
  overallSummary: string           // 1-line verdict summary
  // Layer 2: Pillar breakdowns (informational, not inputs to overall)
  pillars: PillarVerdict[]         // [quant, qual, risk]
  newsEvents: NewsEvent[]          // Separate section, replaces old "Recent News"
  ticker: string
  stockName: string
  sector: string
  lastUpdated: string
  // Preserved from V1 for compatibility
  stockId: string
  profileId: string
  peerRank?: number
  peerTotal?: number
  peerCategory?: string
  topSignals: Signal[]
  topConcerns: Signal[]
  verdictRationale: string
  positionSizing: string | PositionSizingDetails
  entryGuidance: string
  entryTiming?: EntryTimingDetails
  exitTriggers?: ExitTrigger[]
  portfolioFit?: PortfolioFit
  redFlagFramework?: RedFlagFramework
  riskWarning?: string
  learningPrompt?: string
  learningHighlights?: LearningHighlight[]
}

// V2 Profile weight structure
export interface ProfileWeightsV2 {
  pillarWeights: { quant: number; qual: number; risk: number }
  quantWeights: {
    profitability: number
    growth: number
    valuation: number
    financial_health: number
    technical: number
  }
  qualWeights: {
    management_governance: number
    business_quality: number
    capital_discipline: number
    earnings_quality: number
    execution_quality: number
  }
}
