import type { UserProfile } from '@/types'

// Extended profile type with JTBD and analysis preferences
export interface ExtendedProfile extends UserProfile {
  jtbd: string // Job to be done - the core user need
  priorities: string[] // What they prioritize in analysis
  typicalPicks: string[] // Example stock types they'd pick
  category: 'balanced' | 'focused' // Balanced = agnostic, Focused = specific segment preference
  focusType?: 'growth' | 'safety' | 'income' | 'momentum' // Only for focused category
  riskLevel: number // 1-10 for visual indicator
  analysisDepth: 'simplified' | 'detailed' // Simplified = just verdicts, Detailed = full 6D/11-segment breakdown
  tagline: string // Short description for card display
  active?: boolean // Whether this profile is available for selection (default true for backwards compat)
}

// The 4 active profiles — maximally differentiated scoring perspectives
export const ACTIVE_PROFILE_IDS = ['priya', 'kavya', 'meera', 'sneha'] as const
export type ActiveProfileId = typeof ACTIVE_PROFILE_IDS[number]

export const profiles: ExtendedProfile[] = [
  // ===== BALANCED / AGNOSTIC (Most investors fall here) =====
  // These investors don't have strong segment preferences - they want comprehensive analysis

  {
    id: 'priya',
    name: 'priya',
    displayName: 'Practical Priya',
    avatar: '👩‍💻',
    investmentThesis: 'balanced',
    riskTolerance: 'moderate',
    timeHorizon: 'long',
    experienceLevel: 'intermediate',
    category: 'balanced',
    riskLevel: 5,
    analysisDepth: 'simplified',
    tagline: 'Just tell me if I should buy or not',
    jtbd: 'Get a clear buy/sell verdict without drowning in financial jargon',
    priorities: ['Clear verdict', 'Key risks highlighted', 'Simple explanation'],
    typicalPicks: ['TCS', 'HDFC Bank', 'Asian Paints'],
    sectorPreferences: [],
    segmentWeights: {
      profitability: 10,
      financialRatios: 10,
      growth: 10,
      valuation: 10,
      priceVolume: 8,
      technical: 8,
      brokerRatings: 10,
      ownership: 8,
      fno: 4,
      incomeStatement: 10,
      balanceSheet: 12,
    },
    portfolio: [
      {
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        quantity: 20,
        avgPrice: 3400,
        currentPrice: 4150,
        currentValue: 83000,
        pnl: 15000,
        pnlPercent: 22.1,
        allocation: 45,
      },
      {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank',
        quantity: 50,
        avgPrice: 1500,
        currentPrice: 1680,
        currentValue: 84000,
        pnl: 9000,
        pnlPercent: 12.0,
        allocation: 45,
      },
    ],
    patterns: [
      {
        id: 'p1',
        title: 'Balanced Approach',
        description: 'You consider all factors equally when making investment decisions.',
        type: 'preference',
      },
    ],
    blindSpots: [],
    skillLevel: 3,
    skillBadge: 'Practitioner',
  },
  {
    id: 'ankit',
    name: 'ankit',
    displayName: 'Analytical Ankit',
    avatar: '👨‍💻',
    investmentThesis: 'comprehensive',
    riskTolerance: 'moderate',
    timeHorizon: 'long',
    experienceLevel: 'intermediate',
    category: 'balanced',
    riskLevel: 6,
    analysisDepth: 'detailed',
    tagline: 'Show me the full 11-segment breakdown',
    jtbd: 'Understand every angle before I commit my money',
    priorities: ['Complete analysis', 'Sector comparisons', 'All 11 segments'],
    typicalPicks: ['Zomato', 'Delhivery', 'Trent'],
    sectorPreferences: ['IT', 'Consumer', 'New Economy'],
    segmentWeights: {
      profitability: 10,
      financialRatios: 9,
      growth: 10,
      valuation: 10,
      priceVolume: 8,
      technical: 8,
      brokerRatings: 9,
      ownership: 9,
      fno: 6,
      incomeStatement: 10,
      balanceSheet: 11,
    },
    portfolio: [
      {
        symbol: 'ZOMATO',
        name: 'Zomato (Eternal)',
        quantity: 500,
        avgPrice: 85,
        currentPrice: 268,
        currentValue: 134000,
        pnl: 91500,
        pnlPercent: 215.3,
        allocation: 35,
      },
      {
        symbol: 'DELHIVERY',
        name: 'Delhivery',
        quantity: 200,
        avgPrice: 350,
        currentPrice: 420,
        currentValue: 84000,
        pnl: 14000,
        pnlPercent: 20.0,
        allocation: 25,
      },
      {
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        quantity: 15,
        avgPrice: 3200,
        currentPrice: 4150,
        currentValue: 62250,
        pnl: 14250,
        pnlPercent: 29.7,
        allocation: 20,
      },
    ],
    patterns: [
      {
        id: 'p1',
        title: 'Deep Researcher',
        description: 'You dig into every segment before making decisions.',
        type: 'preference',
      },
    ],
    blindSpots: [],
    skillLevel: 4,
    skillBadge: 'Practitioner',
  },
  {
    id: 'kavya',
    name: 'kavya',
    displayName: 'Curious Kavya',
    avatar: '👩‍🎓',
    investmentThesis: 'learning',
    riskTolerance: 'moderate',
    timeHorizon: 'long',
    experienceLevel: 'beginner',
    category: 'balanced',
    riskLevel: 5,
    analysisDepth: 'simplified',
    tagline: 'Help me learn to invest properly',
    jtbd: 'Learn how to analyze stocks step by step before investing real money',
    priorities: ['Educational explanations', 'Building good habits', 'Understanding basics'],
    typicalPicks: ['TCS', 'HDFC Bank', 'Infosys'],
    sectorPreferences: [],
    segmentWeights: {
      profitability: 10,
      financialRatios: 10,
      growth: 10,
      valuation: 10,
      priceVolume: 8,
      technical: 5,
      brokerRatings: 10,
      ownership: 10,
      fno: 2,
      incomeStatement: 12,
      balanceSheet: 13,
    },
    portfolio: [
      {
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        quantity: 5,
        avgPrice: 3500,
        currentPrice: 4150,
        currentValue: 20750,
        pnl: 3250,
        pnlPercent: 18.6,
        allocation: 100,
      },
    ],
    patterns: [
      {
        id: 'p1',
        title: 'Methodical Learner',
        description: "You're building good research habits! You complete full analyses before deciding.",
        type: 'strength',
      },
    ],
    blindSpots: [
      {
        id: 'bs1',
        segment: 'All Segments',
        checkRate: 100,
        suggestion: 'Great! You explore every segment thoroughly.',
      },
    ],
    skillLevel: 2,
    skillBadge: 'Explorer',
  },
  {
    id: 'fatima',
    name: 'fatima',
    displayName: 'FIRE Fatima',
    avatar: '🔥',
    investmentThesis: 'compounding',
    riskTolerance: 'moderate',
    timeHorizon: 'very-long',
    experienceLevel: 'intermediate',
    category: 'balanced',
    riskLevel: 5,
    analysisDepth: 'detailed',
    tagline: 'Build wealth for early retirement',
    jtbd: 'Build a portfolio that compounds and lets me retire in 10-15 years',
    priorities: ['Consistent compounders', 'Long-term track record', 'SIP-friendly'],
    typicalPicks: ['HDFC Bank', 'Asian Paints', 'Pidilite'],
    sectorPreferences: ['Banking', 'Consumer', 'IT'],
    segmentWeights: {
      profitability: 12,
      financialRatios: 12,
      growth: 12,
      valuation: 10,
      priceVolume: 5,
      technical: 5,
      brokerRatings: 10,
      ownership: 10,
      fno: 2,
      incomeStatement: 12,
      balanceSheet: 10,
    },
    portfolio: [
      {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank',
        quantity: 100,
        avgPrice: 1450,
        currentPrice: 1680,
        currentValue: 168000,
        pnl: 23000,
        pnlPercent: 15.9,
        allocation: 30,
      },
      {
        symbol: 'ASIANPAINT',
        name: 'Asian Paints',
        quantity: 50,
        avgPrice: 2800,
        currentPrice: 3200,
        currentValue: 160000,
        pnl: 20000,
        pnlPercent: 14.3,
        allocation: 28,
      },
    ],
    patterns: [
      {
        id: 'p1',
        title: 'Long-term Compounder',
        description: 'You focus on quality businesses that can compound at 15%+ for decades.',
        type: 'preference',
      },
    ],
    blindSpots: [],
    skillLevel: 4,
    skillBadge: 'Practitioner',
  },
  {
    id: 'nikhil',
    name: 'nikhil',
    displayName: 'NRI Nikhil',
    avatar: '🌍',
    investmentThesis: 'remote',
    riskTolerance: 'moderate',
    timeHorizon: 'long',
    experienceLevel: 'intermediate',
    category: 'balanced',
    riskLevel: 5,
    analysisDepth: 'detailed',
    tagline: 'Invest in India from abroad',
    jtbd: 'Invest in India remotely while managing tax and repatriation efficiently',
    priorities: ['Large cap liquidity', 'Easy repatriation', 'Tax efficient'],
    typicalPicks: ['Nifty 50 stocks', 'Index ETFs', 'Blue chips'],
    sectorPreferences: ['IT', 'Banking', 'Pharma'],
    segmentWeights: {
      profitability: 10,
      financialRatios: 10,
      growth: 10,
      valuation: 10,
      priceVolume: 8,
      technical: 5,
      brokerRatings: 12,
      ownership: 12,
      fno: 3,
      incomeStatement: 10,
      balanceSheet: 10,
    },
    portfolio: [
      {
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        quantity: 50,
        avgPrice: 3200,
        currentPrice: 4150,
        currentValue: 207500,
        pnl: 47500,
        pnlPercent: 29.7,
        allocation: 40,
      },
      {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank',
        quantity: 100,
        avgPrice: 1500,
        currentPrice: 1680,
        currentValue: 168000,
        pnl: 18000,
        pnlPercent: 12.0,
        allocation: 35,
      },
    ],
    patterns: [
      {
        id: 'p1',
        title: 'Remote Investor',
        description: 'You prefer large, liquid stocks that are easy to buy/sell from abroad.',
        type: 'preference',
      },
    ],
    blindSpots: [],
    skillLevel: 4,
    skillBadge: 'Practitioner',
  },

  // ===== FOCUSED (Specific segment preferences) =====
  // These investors have clear preferences for certain segments/metrics

  {
    id: 'meera',
    name: 'meera',
    displayName: 'Momentum Meera',
    avatar: '📈',
    investmentThesis: 'momentum',
    riskTolerance: 'aggressive',
    timeHorizon: 'short',
    experienceLevel: 'advanced',
    category: 'focused',
    focusType: 'momentum',
    riskLevel: 9,
    analysisDepth: 'detailed',
    tagline: 'Catch breakouts before the crowd',
    jtbd: 'Identify stocks with strong price momentum and technical breakouts',
    priorities: ['Price breakouts', 'Volume surge', 'Relative strength'],
    typicalPicks: ['Trending mid-caps', 'Sector leaders', 'Turnarounds'],
    sectorPreferences: ['All sectors - momentum driven'],
    segmentWeights: {
      profitability: 5,
      financialRatios: 5,
      growth: 10,
      valuation: 5,
      priceVolume: 25,
      technical: 25,
      brokerRatings: 5,
      ownership: 5,
      fno: 10,
      incomeStatement: 3,
      balanceSheet: 2,
    },
    portfolio: [
      {
        symbol: 'ZOMATO',
        name: 'Eternal (Zomato)',
        quantity: 400,
        avgPrice: 245,
        currentPrice: 268,
        currentValue: 107200,
        pnl: 9200,
        pnlPercent: 9.4,
        allocation: 40,
      },
      {
        symbol: 'TRENT',
        name: 'Trent Ltd',
        quantity: 25,
        avgPrice: 4350,
        currentPrice: 4850,
        currentValue: 121250,
        pnl: 12500,
        pnlPercent: 11.5,
        allocation: 45,
      },
      {
        symbol: 'AXISBANK',
        name: 'Axis Bank',
        quantity: 35,
        avgPrice: 1120,
        currentPrice: 1142,
        currentValue: 39970,
        pnl: 770,
        pnlPercent: 2.0,
        allocation: 15,
      },
    ],
    patterns: [
      {
        id: 'p1',
        title: 'Breakout Hunter',
        description: 'You look for stocks breaking 52-week highs with volume confirmation.',
        type: 'preference',
      },
    ],
    blindSpots: [
      {
        id: 'bs1',
        segment: 'Fundamentals',
        checkRate: 25,
        suggestion: 'Hot momentum stocks can crash hard - always have stop losses.',
      },
    ],
    skillLevel: 5,
    skillBadge: 'Analyst',
  },
  {
    id: 'sneha',
    name: 'sneha',
    displayName: 'Skeptical Sneha',
    avatar: '👩‍💼',
    investmentThesis: 'value',
    riskTolerance: 'conservative',
    timeHorizon: 'very-long',
    experienceLevel: 'advanced',
    category: 'focused',
    focusType: 'safety',
    riskLevel: 4,
    analysisDepth: 'detailed',
    tagline: 'Buy quality at fair prices',
    jtbd: 'Find undervalued quality businesses with margin of safety',
    priorities: ['Low P/E relative to growth', 'Strong balance sheet', 'High ROCE'],
    typicalPicks: ['Axis Bank', 'HUL', 'Infosys'],
    sectorPreferences: ['Banking', 'FMCG', 'IT'],
    segmentWeights: {
      profitability: 15,
      financialRatios: 15,
      growth: 8,
      valuation: 20,
      priceVolume: 5,
      technical: 5,
      brokerRatings: 5,
      ownership: 12,
      fno: 0,
      incomeStatement: 8,
      balanceSheet: 12,
    },
    portfolio: [
      {
        symbol: 'AXISBANK',
        name: 'Axis Bank',
        quantity: 200,
        avgPrice: 850,
        currentPrice: 1078,
        currentValue: 215600,
        pnl: 45600,
        pnlPercent: 26.8,
        allocation: 35,
      },
      {
        symbol: 'HINDUNILVR',
        name: 'Hindustan Unilever',
        quantity: 80,
        avgPrice: 2200,
        currentPrice: 2580,
        currentValue: 206400,
        pnl: 30400,
        pnlPercent: 17.3,
        allocation: 30,
      },
    ],
    patterns: [
      {
        id: 'p1',
        title: 'Margin of Safety',
        description: 'You consistently seek margin of safety - buying Rs.1 of value for Rs.0.70 or less.',
        type: 'preference',
      },
    ],
    blindSpots: [
      {
        id: 'bs1',
        segment: 'Growth',
        checkRate: 40,
        suggestion: 'Are you missing turnaround or structural growth stories?',
      },
    ],
    skillLevel: 5,
    skillBadge: 'Analyst',
  },
  {
    id: 'dinesh',
    name: 'dinesh',
    displayName: 'Dividend Dinesh',
    avatar: '💰',
    investmentThesis: 'income',
    riskTolerance: 'conservative',
    timeHorizon: 'very-long',
    experienceLevel: 'intermediate',
    category: 'focused',
    focusType: 'income',
    riskLevel: 3,
    analysisDepth: 'simplified',
    tagline: 'Steady income every quarter',
    jtbd: 'Generate consistent passive income from dividends',
    priorities: ['Dividend yield >3%', 'Consistent payout history', 'Low debt'],
    typicalPicks: ['ITC', 'Coal India', 'Power Grid'],
    sectorPreferences: ['FMCG', 'PSU', 'Utilities'],
    segmentWeights: {
      profitability: 20,
      financialRatios: 10,
      growth: 5,
      valuation: 12,
      priceVolume: 5,
      technical: 3,
      brokerRatings: 8,
      ownership: 10,
      fno: 0,
      incomeStatement: 15,
      balanceSheet: 12,
    },
    portfolio: [
      {
        symbol: 'ITC',
        name: 'ITC Limited',
        quantity: 500,
        avgPrice: 380,
        currentPrice: 465,
        currentValue: 232500,
        pnl: 42500,
        pnlPercent: 22.4,
        allocation: 40,
      },
      {
        symbol: 'COALINDIA',
        name: 'Coal India',
        quantity: 300,
        avgPrice: 350,
        currentPrice: 420,
        currentValue: 126000,
        pnl: 21000,
        pnlPercent: 20.0,
        allocation: 25,
      },
    ],
    patterns: [
      {
        id: 'p1',
        title: 'Income Seeker',
        description: 'You prioritize dividend yield and payout consistency over capital gains.',
        type: 'preference',
      },
    ],
    blindSpots: [
      {
        id: 'bs1',
        segment: 'Growth',
        checkRate: 35,
        suggestion: 'High dividend stocks may have limited growth - balance your portfolio.',
      },
    ],
    skillLevel: 4,
    skillBadge: 'Practitioner',
  },
  {
    id: 'rajan',
    name: 'rajan',
    displayName: 'Retirement Rajan',
    avatar: '🛡️',
    investmentThesis: 'preservation',
    riskTolerance: 'very-conservative',
    timeHorizon: 'very-long',
    experienceLevel: 'beginner',
    category: 'focused',
    focusType: 'safety',
    riskLevel: 2,
    analysisDepth: 'simplified',
    tagline: 'Protect my retirement corpus',
    jtbd: 'Protect my retirement savings while beating inflation',
    priorities: ['Blue chip only', 'Low volatility', 'Steady dividends'],
    typicalPicks: ['HDFC Bank', 'TCS', 'Reliance'],
    sectorPreferences: ['Banking', 'IT', 'Energy'],
    segmentWeights: {
      profitability: 15,
      financialRatios: 18,
      growth: 5,
      valuation: 15,
      priceVolume: 3,
      technical: 2,
      brokerRatings: 10,
      ownership: 15,
      fno: 0,
      incomeStatement: 10,
      balanceSheet: 12,
    },
    portfolio: [
      {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank',
        quantity: 150,
        avgPrice: 1500,
        currentPrice: 1680,
        currentValue: 252000,
        pnl: 27000,
        pnlPercent: 12.0,
        allocation: 35,
      },
      {
        symbol: 'RELIANCE',
        name: 'Reliance Industries',
        quantity: 100,
        avgPrice: 2400,
        currentPrice: 2850,
        currentValue: 285000,
        pnl: 45000,
        pnlPercent: 18.8,
        allocation: 40,
      },
    ],
    patterns: [
      {
        id: 'p1',
        title: 'Capital Protector',
        description: 'Your #1 priority is not losing money. Growth is secondary.',
        type: 'preference',
      },
    ],
    blindSpots: [
      {
        id: 'bs1',
        segment: 'Growth',
        checkRate: 20,
        suggestion: 'Some growth exposure can help beat inflation long-term.',
      },
    ],
    skillLevel: 2,
    skillBadge: 'Explorer',
  },
]

// Helper to get profile by ID
export function getProfileById(id: string): ExtendedProfile | undefined {
  return profiles.find(p => p.id === id)
}

// Group profiles by category (balanced vs focused)
export function getProfilesByCategory() {
  return {
    balanced: activeProfiles.filter(p => p.category === 'balanced'),
    focused: activeProfiles.filter(p => p.category === 'focused'),
  }
}

// Get category display info
export function getCategoryInfo(category: 'balanced' | 'focused') {
  if (category === 'balanced') {
    return {
      title: 'Balanced Approach',
      subtitle: 'Most investors are here',
      description: 'No strong segment preference - considers all factors equally',
      icon: '⚖️',
    }
  }
  return {
    title: 'Focused Style',
    subtitle: 'Specific preferences',
    description: 'Weights certain segments more heavily based on investment style',
    icon: '🎯',
  }
}

// Get focus type display info
export function getFocusTypeInfo(focusType: string | undefined) {
  switch (focusType) {
    case 'growth':
      return { label: 'Growth Focus', color: 'text-success-400', bgColor: 'bg-success-500/10' }
    case 'momentum':
      return { label: 'Momentum Focus', color: 'text-warning-400', bgColor: 'bg-warning-500/10' }
    case 'safety':
      return { label: 'Safety Focus', color: 'text-primary-400', bgColor: 'bg-primary-500/10' }
    case 'income':
      return { label: 'Income Focus', color: 'text-teal-400', bgColor: 'bg-teal-500/10' }
    default:
      return null
  }
}

// ============================================================
// V2 Profile Weights — Quant + Qual + Risk Hierarchy
// ============================================================

import type { ProfileWeightsV2 } from '@/types'

/**
 * V2 weight structures for each profile.
 *
 * pillarWeights: How much each pillar contributes (sum = 100)
 * quantWeights: Within Quant, how much each scored segment contributes (sum = 100)
 * qualWeights: Within Qual, how much each factor contributes (sum = 100)
 *
 * Note: Context-only segments (Performance, Institutional Signals) are unweighted.
 * Note: News & Events is unscored (separate section).
 */
export const PROFILE_WEIGHTS_V2: Record<string, ProfileWeightsV2> = {
  // Practical Priya — balanced investor, wants a clear verdict with safety net
  // Risk elevated to 25% as non-expert safety guardrail
  priya: {
    pillarWeights: { quant: 45, qual: 30, risk: 25 },
    quantWeights: {
      profitability: 20, growth: 20, valuation: 25,
      financial_health: 25, technical: 10,
    },
    qualWeights: {
      management_governance: 25, business_quality: 25,
      capital_discipline: 20, earnings_quality: 20,
      execution_quality: 10,
    },
  },

  // Analytical Ankit — comprehensive analyst, thorough across all dimensions
  // Risk at 25% because thorough analysis should still penalize red flags heavily
  ankit: {
    pillarWeights: { quant: 40, qual: 35, risk: 25 },
    quantWeights: {
      profitability: 20, growth: 25, valuation: 20,
      financial_health: 20, technical: 15,
    },
    qualWeights: {
      management_governance: 20, business_quality: 25,
      capital_discipline: 20, earnings_quality: 25,
      execution_quality: 10,
    },
  },

  // Curious Kavya — beginner, capital protection first
  // Risk at 35% (highest) — beginners should have strongest safety guardrail
  // FH at 35% within Quant — balance sheet strength is rule #1
  // Growth at 15% — beginners shouldn't chase growth stories
  kavya: {
    pillarWeights: { quant: 35, qual: 30, risk: 35 },
    quantWeights: {
      profitability: 20, growth: 15, valuation: 15,
      financial_health: 35, technical: 15,
    },
    qualWeights: {
      management_governance: 30, business_quality: 20,
      capital_discipline: 20, earnings_quality: 15,
      execution_quality: 15,
    },
  },

  // FIRE Fatima — 20+ year compounder, governance + profitability obsessed
  // Risk at 20% — red flags destroy decades of compounding returns
  // Profitability at 30% — proven profit generation is THE compounding signal
  fatima: {
    pillarWeights: { quant: 40, qual: 40, risk: 20 },
    quantWeights: {
      profitability: 30, growth: 25, valuation: 15,
      financial_health: 25, technical: 5,
    },
    qualWeights: {
      management_governance: 20, business_quality: 30,
      capital_discipline: 25, earnings_quality: 15,
      execution_quality: 10,
    },
  },

  // NRI Nikhil — remote investor, governance trust is everything
  // MG at 35% in Qual — can't visit AGMs or meet management, must trust governance signals
  // Risk at 25% — remote investors need stronger risk protection
  nikhil: {
    pillarWeights: { quant: 35, qual: 40, risk: 25 },
    quantWeights: {
      profitability: 20, growth: 15, valuation: 30,
      financial_health: 25, technical: 10,
    },
    qualWeights: {
      management_governance: 35, business_quality: 20,
      capital_discipline: 20, earnings_quality: 15,
      execution_quality: 10,
    },
  },

  // Momentum Meera — price-action trader, technical dominates
  // Risk at 30% — momentum traders face highest short-term risk (volatility, stop losses)
  // Technical at 45% — nearly half her Quant signal is price trends/momentum
  // Valuation at 5% — PE is irrelevant for momentum; she buys expensive breakouts
  // ExQ at 40% — did company beat estimates? That drives momentum
  meera: {
    pillarWeights: { quant: 60, qual: 10, risk: 30 },
    quantWeights: {
      profitability: 10, growth: 20, valuation: 5,
      financial_health: 20, technical: 45,
    },
    qualWeights: {
      management_governance: 15, business_quality: 15,
      capital_discipline: 15, earnings_quality: 15,
      execution_quality: 40,
    },
  },

  // Sneha — value investor, wants cheap + quality + clean earnings
  // Valuation at 35% — she IS a value investor, PE/PB is her primary signal
  // Growth at 10% — she avoids growth traps (expensive + high growth)
  // EQ at 30% — detecting earnings manipulation IS value investing
  // Risk at 20% — cheap stocks often look risky; she needs filtering for value traps
  sneha: {
    pillarWeights: { quant: 40, qual: 40, risk: 20 },
    quantWeights: {
      profitability: 20, growth: 10, valuation: 35,
      financial_health: 25, technical: 10,
    },
    qualWeights: {
      management_governance: 20, business_quality: 20,
      capital_discipline: 20, earnings_quality: 30,
      execution_quality: 10,
    },
  },
}

/**
 * Get V2 weights for a profile, with sensible defaults
 */
export function getProfileWeightsV2(profileId: string): ProfileWeightsV2 {
  return PROFILE_WEIGHTS_V2[profileId] ?? PROFILE_WEIGHTS_V2['priya']
}

/**
 * Active profiles only — the 4 maximally differentiated perspectives.
 * Used by ProfileSelection, ProfileSwitcher, Dashboard, and pre-computation.
 *
 * Priya  = Balanced (baseline, equal weights)
 * Kavya  = Safety-First (Risk 35%, Financial Health 35%)
 * Meera  = Momentum (Quant 60%, Technical 45%)
 * Sneha  = Value (Valuation 35%, Earnings Quality 30%)
 */
export const activeProfiles = profiles.filter(p => ACTIVE_PROFILE_IDS.includes(p.id as ActiveProfileId))

/** Check if a profile ID is one of the 4 active profiles */
export function isActiveProfile(profileId: string): boolean {
  return ACTIVE_PROFILE_IDS.includes(profileId as ActiveProfileId)
}
