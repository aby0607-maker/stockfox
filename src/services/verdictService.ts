/**
 * Verdict Service — V2 async verdict assembly
 *
 * buildVerdictForStock() assembles StockVerdictV2 from live CMOTS data:
 *   - Quant pillar: live data via quantScoringService
 *   - Qual pillar: live data via qualScoringService
 *   - Risk pillar: computed from red flags
 */

import type { Stock, StockVerdictV2, PillarVerdict, SegmentVerdictV2, Signal } from '@/types'
import { getScoreBandEnum, getOverallVerdict } from '@/lib/scoring'
import { getProfileWeightsV2, profiles } from '@/data/profiles'
import { computeQuantSegments } from './quantScoringService'
import { computeQualFactors } from './qualScoringService'
import { computeRiskFromScanner, buildScannerValuesFromMetrics, buildScannerValuesFromSegments } from './redFlagScannerService'
import { resolveMetricValues } from './metricResolver'
import { buildNewsEvents } from './newsBuilder'
import { getSurveillanceStatus, surveillanceToScannerValues, getSurveillanceRedFlags } from './nse'
import { getBSEScannerSignals, bseScannerToValues, bseScannerRedFlags } from './bse'
import { getTTMData } from './cmots'
import { generatePeerGroupDetailed } from './stockService'
import { getCompanyBySymbol } from './cmots'

// ============================================================
// V2 VERDICT ASSEMBLY — Live data for any stock
// ============================================================

function buildPillarVerdictV2(
  pillar: 'quant' | 'qual' | 'risk',
  name: string,
  segments: SegmentVerdictV2[],
  profileSegmentWeights?: Record<string, number>,
): PillarVerdict {
  const scoredSegments = segments.filter(s => s.scoringType === 'scored' && s.score !== undefined)

  // Apply profile-specific segment weights if provided (Layer 2 personalization)
  const getWeight = (seg: SegmentVerdictV2) =>
    profileSegmentWeights?.[seg.id] ?? seg.weight ?? 0

  const totalWeight = scoredSegments.reduce((sum, s) => sum + getWeight(s), 0)
  const weightedScore = totalWeight > 0
    ? Math.round(scoredSegments.reduce((sum, s) => sum + (s.score! * getWeight(s)), 0) / totalWeight)
    : 0

  const scoreBand = getScoreBandEnum(weightedScore)
  const labels: Record<string, string> = {
    strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK', suppressed: 'RED FLAG',
  }

  return {
    pillar,
    name,
    score: weightedScore,
    scoreBand,
    label: labels[scoreBand],
    summary: `${name} analysis based on ${segments.length} ${pillar === 'qual' ? 'factors' : 'segments'}`,
    segments,
  }
}

// ─── Signal Synthesis (Pros/Cons from pillar data) ──────────

function synthesizeSignals(pillars: PillarVerdict[]): { topSignals: Signal[]; topConcerns: Signal[] } {
  const strengths: (Signal & { _score: number })[] = []
  const concerns: (Signal & { _priority: number })[] = []

  for (const pillar of pillars) {
    for (const seg of pillar.segments) {
      // Strengths: segments scoring ≥70
      if (seg.scoringType === 'scored' && seg.score != null && seg.score >= 60 && seg.interpretation) {
        strengths.push({
          title: seg.name,
          description: seg.interpretation,
          isPositive: true,
          _score: seg.score,
        })
      }

      // Concerns: all red flags from every segment
      if (seg.redFlags) {
        for (const rf of seg.redFlags) {
          concerns.push({
            title: rf.title,
            description: rf.description,
            isPositive: false,
            _priority: rf.severity === 'hard' ? 0 : 1,
          })
        }
      }
    }
  }

  // Sort strengths by score desc, concerns by priority (hard first)
  strengths.sort((a, b) => b._score - a._score)
  concerns.sort((a, b) => a._priority - b._priority)

  // Also add weak segments (score <40) as concerns if we have few red flags
  if (concerns.length < 4) {
    for (const pillar of pillars) {
      for (const seg of pillar.segments) {
        if (seg.scoringType === 'scored' && seg.score != null && seg.score < 45 && seg.interpretation) {
          concerns.push({
            title: `${seg.name} — Weak`,
            description: seg.interpretation,
            isPositive: false,
            _priority: 2,
          })
        }
      }
    }
    concerns.sort((a, b) => a._priority - b._priority)
  }

  return {
    topSignals: strengths.slice(0, 4).map(({ _score, ...s }) => s),
    topConcerns: concerns.slice(0, 4).map(({ _priority, ...s }) => s),
  }
}

// ─── Contextual Verdict Explainer (LLM-ready) ──────────

interface VerdictContext {
  stock: { name: string; sector: string }
  profile: { id: string; thesis: string; displayName: string }
  scores: { overall: number; quant: number; qual: number; risk: number }
  topStrength: Signal | null
  topConcern: Signal | null
  strongestPillar: { name: string; score: number }
  weakestPillar: { name: string; score: number }
  profileTopSegment: { name: string; score: number } | null
}

// ─── Advisor-Style Summary Copy Engine ──────────────────────

/** Natural language metric descriptions — converts raw numbers into advisor phrases */
function describePE(pe: number | null): string {
  if (pe == null) return ''
  if (pe < 0) return 'currently loss-making (negative P/E)'
  if (pe < 12) return `attractively valued at PE ${pe.toFixed(0)}x`
  if (pe < 20) return `reasonably valued at PE ${pe.toFixed(0)}x`
  if (pe < 35) return `trading at PE ${pe.toFixed(0)}x`
  return `trading at a steep premium of PE ${pe.toFixed(0)}x`
}

function describeROE(roe: number | null): string {
  if (roe == null) return ''
  if (roe >= 20) return `strong returns on equity at ${roe.toFixed(0)}% ROE`
  if (roe >= 15) return `healthy profitability with ${roe.toFixed(0)}% ROE`
  if (roe >= 10) return `decent profitability at ${roe.toFixed(0)}% ROE`
  if (roe >= 5) return `modest returns at ${roe.toFixed(0)}% ROE`
  return `weak profitability at just ${roe.toFixed(0)}% ROE`
}

function describeDebt(de: number | null): string {
  if (de == null) return ''
  if (de < 0.3) return 'virtually debt-free'
  if (de < 0.7) return `conservative debt levels (D/E ${de.toFixed(1)}x)`
  if (de < 1.2) return `moderate leverage (D/E ${de.toFixed(1)}x)`
  if (de < 2) return `elevated debt (D/E ${de.toFixed(1)}x)`
  return `heavily leveraged with D/E at ${de.toFixed(1)}x`
}

function describeOPM(opm: number | null): string {
  if (opm == null) return ''
  if (opm >= 25) return `high-margin business at ${opm.toFixed(0)}% OPM`
  if (opm >= 15) return `healthy margins of ${opm.toFixed(0)}% OPM`
  if (opm >= 8) return `thin margins at ${opm.toFixed(0)}% OPM`
  return `razor-thin margins of ${opm.toFixed(0)}% OPM`
}

function describeRisk(riskScore: number | null, flagCount?: number): string {
  if (riskScore == null) return 'Risk data unavailable.'
  if (riskScore >= 80) return 'The risk scanner shows no red flags.'
  if (riskScore >= 60) return `Minor risk flags detected${flagCount ? ` (${flagCount} issue${flagCount > 1 ? 's' : ''})` : ''} — nothing critical.`
  if (riskScore >= 45) return `Multiple risk flags warrant attention${flagCount ? ` (${flagCount} issues)` : ''}.`
  return `Significant risk concerns detected${flagCount ? ` (${flagCount} flags)` : ''} — exercise caution.`
}

function describePromoter(holding: number | null): string {
  if (holding == null) return ''
  if (holding >= 60) return `strong promoter conviction at ${holding.toFixed(0)}% holding`
  if (holding >= 45) return `solid promoter skin-in-game at ${holding.toFixed(0)}%`
  if (holding >= 25) return `moderate promoter holding of ${holding.toFixed(0)}%`
  return `low promoter holding at just ${holding.toFixed(0)}%`
}

/** Segment score to natural phrase */
function describeSegment(name: string, score: number | undefined): string {
  if (score == null) return ''
  if (score >= 75) return `${name} is a clear strength (${score}/100)`
  if (score >= 60) return `${name} scores well at ${score}/100`
  if (score >= 45) return `${name} is average at ${score}/100`
  return `${name} is weak at ${score}/100`
}

// Profile-specific copy configuration
interface ProfileCopyConfig {
  leadsWith: 'balanced' | 'safety' | 'momentum' | 'value'
  focusSegments: string[]  // Which segments to highlight
  strongBuyClose: string
  buyClose: string
  holdClose: string
  sellClose: string
}

const PROFILE_COPY_CONFIG: Record<string, ProfileCopyConfig> = {
  priya: {
    leadsWith: 'balanced',
    focusSegments: ['profitability', 'valuation', 'financial_health'],
    strongBuyClose: 'Strong across the board — a confident buy for most investors.',
    buyClose: 'Worth considering for your portfolio — the fundamentals support it.',
    holdClose: 'A reasonable hold if you own it, but not compelling for fresh entry.',
    sellClose: 'Consider reducing exposure — the risk-reward isn\'t favorable right now.',
  },
  kavya: {
    leadsWith: 'safety',
    focusSegments: ['financial_health', 'management_governance', 'earnings_quality'],
    strongBuyClose: 'A safe, well-run company — good for building a foundation.',
    buyClose: 'A relatively safe pick with stable fundamentals to learn from.',
    holdClose: 'Safe to hold, but don\'t expect rapid growth from here.',
    sellClose: 'Risk flags make this unsuitable for a safety-first approach — consider exiting.',
  },
  meera: {
    leadsWith: 'momentum',
    focusSegments: ['technical', 'performance', 'growth'],
    strongBuyClose: 'Strong momentum — price action supports a position. Ride the trend.',
    buyClose: 'Early signs of momentum building. Watch for confirmation above key moving averages.',
    holdClose: 'No clear momentum signal — stay on the sidelines until a trend emerges.',
    sellClose: 'Momentum is fading. Technical deterioration suggests exiting or shorting.',
  },
  sneha: {
    leadsWith: 'value',
    focusSegments: ['valuation', 'earnings_quality', 'profitability'],
    strongBuyClose: 'Rare combination of quality and value — a compelling buy with margin of safety.',
    buyClose: 'Reasonably valued with quality earnings — worth a position for patient investors.',
    holdClose: 'Fair value at best — no margin of safety at current prices.',
    sellClose: 'Overvalued with deteriorating quality — a value investor would avoid or exit.',
  },
}

/**
 * Build a 4-5 sentence advisor-style summary.
 *
 * Structure:
 *   S1: Hook — what defines this stock (strongest dimension)
 *   S2: Evidence — key metrics with natural language
 *   S3: Counterpoint — what's weak or concerning
 *   S4: Profile lens — what matters to THIS investor
 *   S5: Action — verdict-aligned closing
 */
function buildAdvisorSummary(
  profileId: string,
  stock: { name: string; sector: string },
  snap: MetricSnapshot,
  segments: Record<string, number | undefined>,
  pillars: { quant: number; qual: number; risk: number },
  overallScore: number,
  overallVerdict: string,
  riskFlagCount?: number,
  promoterHolding?: number | null,
): string {
  const config = PROFILE_COPY_CONFIG[profileId] || PROFILE_COPY_CONFIG['priya']
  const pe = snap.pe ? parseFloat(snap.pe) : null
  const roe = snap.roe ? parseFloat(snap.roe) : null
  const de = snap.debtEbitda ? parseFloat(snap.debtEbitda) : null
  const opm = snap.opm ? parseFloat(snap.opm) : null

  // Find best and worst segments
  const segEntries = Object.entries(segments).filter(([, v]) => v != null) as [string, number][]
  segEntries.sort((a, b) => b[1] - a[1])
  const best = segEntries[0]
  const worst = segEntries[segEntries.length - 1]

  const SEGMENT_NAMES: Record<string, string> = {
    financial_health: 'Financial Health', profitability: 'Profitability', growth: 'Growth',
    valuation: 'Valuation', technical: 'Technical', performance: 'Performance',
    institutional_signals: 'Institutional Signals', management_governance: 'Management & Governance',
    business_quality: 'Business Quality', capital_discipline: 'Capital Discipline',
    earnings_quality: 'Earnings Quality', execution_quality: 'Execution Quality',
  }

  const sentences: string[] = []

  // ── S1: Hook — profile-specific lead ──
  if (config.leadsWith === 'momentum') {
    const techScore = segments['technical'] ?? 50
    const ret1y = snap.return1y ? parseFloat(snap.return1y) : null
    if (techScore >= 65) {
      sentences.push(`${stock.name} shows positive momentum — technical signals score ${techScore}/100${ret1y != null ? ` with a ${ret1y > 0 ? '+' : ''}${ret1y.toFixed(0)}% one-year return` : ''}.`)
    } else if (techScore >= 45) {
      sentences.push(`Momentum is neutral for ${stock.name} — technical signals at ${techScore}/100 show no clear direction.`)
    } else {
      sentences.push(`Momentum is weak — ${stock.name}'s technical signals score just ${techScore}/100, suggesting a downtrend or consolidation.`)
    }
  } else if (config.leadsWith === 'value') {
    const valScore = segments['valuation'] ?? 50
    if (valScore >= 65) {
      sentences.push(`${stock.name} looks attractively valued${pe != null ? ` — ${describePE(pe)}` : ''} with ${describeSegment('Valuation', valScore).toLowerCase()}.`)
    } else if (valScore >= 45) {
      sentences.push(`${stock.name} is ${pe != null ? describePE(pe) : 'fairly valued'}${pe && pe > 25 ? ' — not cheap by value investing standards' : ''}.`)
    } else {
      sentences.push(`${stock.name} is expensive${pe != null ? ` at PE ${pe.toFixed(0)}x` : ''} — Valuation scores just ${valScore}/100.`)
    }
  } else if (config.leadsWith === 'safety') {
    const fhScore = segments['financial_health'] ?? 50
    const riskScore = pillars.risk
    if (fhScore >= 65 && riskScore >= 70) {
      sentences.push(`${stock.name} is a financially safe business — ${describeDebt(de)}${promoterHolding != null && promoterHolding >= 45 ? ` with ${describePromoter(promoterHolding)}` : ''}.`)
    } else if (fhScore >= 45) {
      sentences.push(`${stock.name} has adequate financial health (${fhScore}/100)${de != null ? ` with ${describeDebt(de)}` : ''}.`)
    } else {
      sentences.push(`${stock.name} raises safety concerns — Financial Health at ${fhScore}/100${de != null && de > 1.5 ? ` and ${describeDebt(de)}` : ''}.`)
    }
  } else {
    // Balanced — lead with overall character
    if (overallScore >= 70) {
      sentences.push(`${stock.name} scores well across most dimensions — ${best ? `${SEGMENT_NAMES[best[0]] || best[0]} leads at ${best[1]}/100` : 'strong fundamentals overall'}.`)
    } else if (overallScore >= 50) {
      sentences.push(`${stock.name} presents a mixed picture — strengths in ${best ? SEGMENT_NAMES[best[0]] || best[0] : 'some areas'} offset by weakness in ${worst ? SEGMENT_NAMES[worst[0]] || worst[0] : 'others'}.`)
    } else {
      sentences.push(`${stock.name} faces challenges across multiple dimensions — overall score of ${overallScore}/100 reflects broad weakness.`)
    }
  }

  // ── S2: Evidence — key metrics with natural language ──
  const metricParts: string[] = []
  if (roe != null) metricParts.push(describeROE(roe))
  if (opm != null && config.leadsWith !== 'momentum') metricParts.push(describeOPM(opm))
  if (pe != null && config.leadsWith !== 'value') metricParts.push(describePE(pe))
  if (de != null && config.leadsWith !== 'safety') metricParts.push(describeDebt(de))

  if (metricParts.length >= 2) {
    sentences.push(`The company has ${metricParts[0]} and ${metricParts[1]}.`)
  } else if (metricParts.length === 1) {
    sentences.push(`The company has ${metricParts[0]}.`)
  }

  // ── S3: Counterpoint — what's weak ──
  if (worst && worst[1] < 50) {
    const worstName = SEGMENT_NAMES[worst[0]] || worst[0]
    sentences.push(`However, ${worstName} is a concern at ${worst[1]}/100${worst[0] === 'valuation' && pe != null && pe > 30 ? ` — the stock is expensive` : worst[0] === 'profitability' && roe != null && roe < 10 ? ` — returns on capital are below average` : ''}.`)
  } else if (worst && worst[1] < 60) {
    sentences.push(`${SEGMENT_NAMES[worst[0]] || worst[0]} at ${worst[1]}/100 has room for improvement.`)
  }

  // ── S4: Risk context ──
  sentences.push(describeRisk(pillars.risk, riskFlagCount))

  // ── S5: Action — verdict-aligned closing, profile-adjusted ──
  const verdict = overallVerdict.toLowerCase().replace('_', ' ')

  // Profile-specific overrides: if the profile's focus area is weak, downgrade the closing
  const focusScore = config.focusSegments[0] ? (segments[config.focusSegments[0]] ?? 50) : 50
  const adjustedVerdict = focusScore < 40 && (verdict.includes('buy') || verdict.includes('strong buy'))
    ? 'hold' // Profile's key focus is weak — temper enthusiasm
    : verdict

  if (adjustedVerdict.includes('strong buy') || adjustedVerdict.includes('strong_buy')) {
    sentences.push(config.strongBuyClose)
  } else if (adjustedVerdict.includes('buy')) {
    sentences.push(config.buyClose)
  } else if (adjustedVerdict.includes('hold')) {
    sentences.push(config.holdClose)
  } else {
    sentences.push(config.sellClose)
  }

  return sentences.join(' ')
}

/**
 * Build advisor summary from cached data (no live resolvedMetrics needed).
 * Uses the same logic but with cached segment scores + basic metrics.
 */
export function buildCachedAdvisorSummary(
  profileId: string,
  stockName: string,
  sector: string,
  cachedData: {
    score: number; verdict: string; pe?: number | null; roe?: number | null;
    opm?: number | null; de?: number | null; promoterHolding?: number | null;
    riskScore?: number | null; segments?: Record<string, number | undefined>;
  },
): string {
  const snap: MetricSnapshot = {
    pe: cachedData.pe != null ? `${cachedData.pe.toFixed(1)}x` : undefined,
    roe: cachedData.roe != null ? `${cachedData.roe.toFixed(1)}%` : undefined,
    opm: cachedData.opm != null ? `${cachedData.opm.toFixed(1)}%` : undefined,
    debtEbitda: cachedData.de != null ? `${cachedData.de.toFixed(2)}x` : undefined,
  }
  const segments = cachedData.segments || {}
  const quant = ['financial_health', 'profitability', 'growth', 'valuation', 'technical'].map(k => segments[k] ?? 50)
  const qual = ['management_governance', 'business_quality', 'capital_discipline', 'earnings_quality', 'execution_quality'].map(k => segments[k] ?? 50)
  const quantAvg = Math.round(quant.reduce((a, b) => a + b, 0) / quant.length)
  const qualAvg = Math.round(qual.reduce((a, b) => a + b, 0) / qual.length)
  const riskScore = cachedData.riskScore ?? (segments['risk'] as number | undefined) ?? 70

  return buildAdvisorSummary(
    profileId,
    { name: stockName, sector },
    snap, segments,
    { quant: quantAvg, qual: qualAvg, risk: riskScore },
    cachedData.score, cachedData.verdict,
    undefined, cachedData.promoterHolding,
  )
}

// Profile thesis descriptors for natural copy (used in rationale, not summary)
const THESIS_COPY: Record<string, { lens: string; seeks: string; avoids: string }> = {
  ankit: { lens: 'comprehensive analysis', seeks: 'balanced strength across all dimensions', avoids: 'blind spots in any pillar' },
  sneha: { lens: 'value investing', seeks: 'undervaluation with margin of safety', avoids: 'expensive stocks without earnings backing' },
  meera: { lens: 'momentum trading', seeks: 'price momentum backed by execution delivery', avoids: 'stocks with fading technical trends' },
  kavya: { lens: 'learning to invest', seeks: 'safe, well-understood businesses', avoids: 'complex or volatile stocks' },
  fatima: { lens: 'long-term compounding', seeks: 'consistent profitability and durable moats', avoids: 'businesses without proven profit models' },
  nikhil: { lens: 'remote investing', seeks: 'trustworthy governance and institutional backing', avoids: 'companies with governance red flags' },
  priya: { lens: 'a balanced view', seeks: 'clear buy/hold/sell signals', avoids: 'ambiguous mixed signals' },
}

// ─── Metric snapshot builder (from raw resolvedMetrics) ──────

interface MetricSnapshot {
  roe?: string; roce?: string; opm?: string; pe?: string; pb?: string
  debtEbitda?: string; icr?: string; revCagr?: string; return1y?: string
  promoter?: string; rsi?: string; divYield?: string; fcfYield?: string
}

function buildMetricSnapshot(m?: Record<string, number | null>): MetricSnapshot {
  if (!m) return {}
  const f = (v: number | null, u: string, d = 1) => v != null ? `${v.toFixed(d)}${u}` : undefined
  return {
    roe: f(m['raw_roe'], '%'), roce: f(m['v2_roce'] ?? m['raw_roce'], '%'),
    opm: f(m['raw_opm'], '%'), pe: f(m['raw_pe'], 'x'), pb: f(m['raw_pb'], 'x'),
    debtEbitda: f(m['v2_debt_ebitda'], 'x'), icr: f(m['v2_interest_coverage'], 'x'),
    revCagr: f(m['v2_revenue_cagr_3y'], '%'), return1y: f(m['v2_return_1y'], '%'),
    promoter: f(m['promoter_holding'], '%'), rsi: f(m['v2_rsi'], '', 0),
    divYield: f(m['v2_dividend_yield'], '%'), fcfYield: f(m['v2_fcf_yield'], '%'),
  }
}

function generateVerdictExplainer(
  stock: Stock,
  profileId: string,
  pillars: PillarVerdict[],
  topSignals: Signal[],
  topConcerns: Signal[],
  overallScore: number,
  profileWeightsObj: ReturnType<typeof getProfileWeightsV2>,
  resolvedMetrics?: Record<string, number | null>,
): { summary: string; rationale: string; context: VerdictContext } {
  const quant = pillars.find(p => p.pillar === 'quant')!
  const qual = pillars.find(p => p.pillar === 'qual')!
  const risk = pillars.find(p => p.pillar === 'risk')!
  const snap = buildMetricSnapshot(resolvedMetrics)

  const pillarScores = [
    { name: 'Quant', pillar: 'quant', score: quant.score },
    { name: 'Qual', pillar: 'qual', score: qual.score },
    { name: 'Risk', pillar: 'risk', score: risk.score },
  ].sort((a, b) => b.score - a.score)
  const strongest = pillarScores[0]
  const weakest = pillarScores[pillarScores.length - 1]

  // Profile's top-priority quant segment
  const qw = profileWeightsObj.quantWeights
  const topSegKey = Object.entries(qw).sort(([, a], [, b]) => b - a)[0]?.[0]
  const topSegment = quant.segments.find(s => s.id === topSegKey)
  const profileTopSegment = topSegment ? { name: topSegment.name, score: topSegment.score ?? 0 } : null

  const profile = profiles.find(p => p.id === profileId)
  const thesis = THESIS_COPY[profileId] || THESIS_COPY['priya']
  const riskClean = risk.score >= 75
  const riskSummary = risk.segments[0]?.interpretation?.split('—')[0]?.trim() || ''

  const ctx: VerdictContext = {
    stock: { name: stock.name, sector: stock.sector },
    profile: { id: profileId, thesis: profile?.investmentThesis || 'balanced', displayName: profile?.displayName || profileId },
    scores: { overall: overallScore, quant: quant.score, qual: qual.score, risk: risk.score },
    topStrength: topSignals[0] || null,
    topConcern: topConcerns[0] || null,
    strongestPillar: strongest,
    weakestPillar: weakest,
    profileTopSegment,
  }

  // ── Build advisor-style summary (4-5 sentences, profile-aware) ──
  const segScores: Record<string, number | undefined> = {}
  for (const seg of [...quant.segments, ...qual.segments]) {
    if (seg.score != null) segScores[seg.id] = seg.score
  }
  segScores['risk'] = risk.score

  const summary = buildAdvisorSummary(
    profileId, stock, snap, segScores,
    { quant: quant.score, qual: qual.score, risk: risk.score },
    overallScore,
    overallScore >= 80 ? 'strong_buy' : overallScore >= 65 ? 'buy' : overallScore >= 50 ? 'hold' : 'sell',
    risk.segments[0]?.redFlags?.length,
    resolvedMetrics?.['promoter_holding'],
  )

  // ── Build rationale (2-3 lines — metric-rich, profile-aware) ──
  const metricLine = [
    snap.roe ? `ROE ${snap.roe}` : null,
    snap.opm ? `OPM ${snap.opm}` : null,
    snap.pe ? `PE ${snap.pe}` : null,
    snap.debtEbitda ? `D/E ${snap.debtEbitda}` : null,
    snap.promoter ? `Promoter ${snap.promoter}` : null,
  ].filter(Boolean).slice(0, 4).join(' · ')

  const profileSegNote = profileTopSegment
    ? `Your top priority for ${thesis.lens} — ${profileTopSegment.name} — scores ${profileTopSegment.score}/100${profileTopSegment.score >= 60 ? ' (aligned)' : ' (below expectations)'}.`
    : ''

  const riskNote = riskClean
    ? `Risk profile clean (${riskSummary || '0 flags'}).`
    : `Risk flags: ${riskSummary || 'review recommended'}.`

  const rationale = `Quant ${quant.score} · Qual ${qual.score} · Risk ${risk.score}. ` +
    (metricLine ? `Key metrics: ${metricLine}. ` : '') +
    profileSegNote +
    (profileSegNote ? ' ' : '') +
    riskNote

  return { summary, rationale, context: ctx }
}

// ─── Peer Ranking System ──────────────────────────

/**
 * Quick proxy score for peer ranking — uses TTM data only (1 API call per peer).
 * Approximates the full StockFox score with ~80% correlation.
 */
function quickPeerScore(ttm: Record<string, unknown>): number {
  const pe = (ttm.pe_ttm as number) ?? 25
  const roe = (ttm.roe_ttm as number) ?? 10
  const de = (ttm.debttoequity as number) ?? 0.5
  const opm = (ttm.operatingprofitmargin as number) ?? 15

  // Normalize each to 0-100
  const peScore = pe > 0 && pe < 200 ? Math.max(0, Math.min(100, 100 - pe * 1.5)) : 50
  const roeScore = Math.min(100, Math.max(0, roe * 4.5))
  const deScore = de >= 0 ? Math.max(0, Math.min(100, 100 - de * 40)) : 50
  const opmScore = Math.min(100, Math.max(0, opm * 3.5))

  return Math.round(peScore * 0.25 + roeScore * 0.3 + deScore * 0.2 + opmScore * 0.25)
}

/**
 * Compute peer rank for a stock within its sector.
 * Returns rank, total, and peer category (sector name).
 */
async function computePeerRank(
  stock: Stock,
  stockScore: number,
): Promise<{ peerRank: number; peerTotal: number; peerCategory: string }> {
  try {
    const company = await getCompanyBySymbol(stock.symbol)
    if (!company) return { peerRank: 1, peerTotal: 1, peerCategory: stock.sector || 'Unknown' }

    const peerDetails = await generatePeerGroupDetailed(company)
    const peerSlice = peerDetails.slice(0, 8)

    // Fetch TTM for each peer and compute quick scores in parallel
    const peerScores = await Promise.all(
      peerSlice.map(async p => {
        try {
          const ttm = await getTTMData(p.symbol)
          if (!ttm) return { symbol: p.symbol, score: 50 }
          return { symbol: p.symbol, score: quickPeerScore(ttm as unknown as Record<string, unknown>) }
        } catch {
          return { symbol: p.symbol, score: 50 }
        }
      })
    )

    // Combine stock + peers, sort by score descending
    const all = [
      { symbol: stock.symbol, score: stockScore },
      ...peerScores,
    ].sort((a, b) => b.score - a.score)

    const rank = all.findIndex(s => s.symbol === stock.symbol) + 1
    return {
      peerRank: rank,
      peerTotal: all.length,
      peerCategory: company.sectorname || stock.sector || 'Unknown',
    }
  } catch {
    return { peerRank: 1, peerTotal: 1, peerCategory: stock.sector || 'Unknown' }
  }
}

/**
 * Build a full V2 verdict for any stock from live CMOTS data.
 * Quant pillar uses live scoring; Qual uses placeholders; Risk computed from red flags.
 */
export async function buildVerdictForStock(
  stock: Stock,
  profileId: string,
): Promise<StockVerdictV2> {
  // Fetch quant + qual + raw metrics + news + surveillance + BSE scanner in parallel
  const [quantSegments, qualFactors, resolved, newsEvents, surveillance, bseSignals] = await Promise.all([
    computeQuantSegments(stock.symbol),
    computeQualFactors(stock.symbol),
    resolveMetricValues(stock.symbol),
    buildNewsEvents(stock.symbol, stock.name),
    getSurveillanceStatus(stock.symbol),
    getBSEScannerSignals(stock.symbol),
  ])
  // Apply profile-specific segment weights (Layer 2 personalization)
  const profileWeights = getProfileWeightsV2(profileId)
  const quantPillar = buildPillarVerdictV2('quant', 'Quant Score', quantSegments, profileWeights.quantWeights)
  const qualPillar = buildPillarVerdictV2('qual', 'Qual Score', qualFactors, profileWeights.qualWeights)

  // Build dynamic scanner display values from ALL data sources
  const cmotsScannerValues = resolved ? buildScannerValuesFromMetrics(resolved.data) : {}
  const survScannerValues = surveillanceToScannerValues(surveillance)
  const bseScannerValues = bseScannerToValues(bseSignals)
  // Extract scanner values from scored segments (pledge, receivables, inventory, Z-score, M-score, etc.)
  const segmentScannerValues = buildScannerValuesFromSegments(quantSegments, qualFactors)
  // Merge all sources — CMOTS first, then enrichments (later sources override display text)
  const scannerValues = { ...cmotsScannerValues, ...segmentScannerValues, ...survScannerValues, ...bseScannerValues }

  // Inject surveillance + BSE red flags into qual factors so they flow through to the scanner
  const externalFlags = [
    ...getSurveillanceRedFlags(surveillance).map(f => ({ ...f, source: 'NSE Surveillance' })),
    ...bseScannerRedFlags(bseSignals).map(f => ({ ...f, source: 'BSE Filings' })),
  ]
  if (externalFlags.length > 0 && qualFactors[0]) {
    qualFactors[0].redFlags = [...(qualFactors[0].redFlags || []), ...externalFlags.map(f => ({
      signalId: f.id, title: f.title, description: f.description, severity: f.severity, source: f.source,
    }))]
  }

  // ── Risk Pillar: derived from 35-parameter Red Flag Scanner ──
  const riskResult = computeRiskFromScanner(quantSegments, qualFactors, null, scannerValues)
  const riskPillar: PillarVerdict = {
    pillar: 'risk',
    name: 'Risk Score',
    score: riskResult.score,
    scoreBand: getScoreBandEnum(riskResult.score),
    label: riskResult.label,
    summary: riskResult.summary,
    segments: [riskResult.segment],
  }

  const pw = profileWeights.pillarWeights
  const totalWeight = pw.quant + pw.qual + pw.risk
  const overallScore = Math.round(
    (quantPillar.score * pw.quant + qualPillar.score * pw.qual + riskPillar.score * pw.risk) / totalWeight
  )
  const overall = getOverallVerdict(overallScore)
  const allPillars = [quantPillar, qualPillar, riskPillar]
  const { topSignals, topConcerns } = synthesizeSignals(allPillars)

  // Generate contextual explainer copy (personalized, LLM-ready)
  const explainer = generateVerdictExplainer(stock, profileId, allPillars, topSignals, topConcerns, overallScore, profileWeights, resolved?.data)

  // Compute peer rank (non-blocking — doesn't delay verdict)
  const ranking = await computePeerRank(stock, overallScore).catch(() => ({
    peerRank: undefined as number | undefined,
    peerTotal: undefined as number | undefined,
    peerCategory: stock.sector || '',
  }))

  const verdictResult: StockVerdictV2 = {
    overallVerdict: overall.verdict,
    overallScore,
    overallLabel: overall.label,
    overallSummary: explainer.summary,
    pillars: allPillars,
    newsEvents,
    ticker: stock.symbol.toUpperCase(),
    stockName: stock.name,
    sector: stock.sector || '',
    lastUpdated: new Date().toISOString().split('T')[0],
    stockId: stock.id,
    profileId,
    topSignals,
    topConcerns,
    verdictRationale: explainer.rationale,
    positionSizing: 'See detailed analysis',
    entryGuidance: 'See detailed analysis',
    peerRank: ranking.peerRank,
    peerTotal: ranking.peerTotal,
    peerCategory: ranking.peerCategory,
    scannerValues,
    resolvedMetrics: resolved?.data,
    scoreBreakdown: {
      pillarWeights: { quant: pw.quant, qual: pw.qual, risk: pw.risk },
      pillarContributions: {
        quant: Math.round(quantPillar.score * pw.quant / totalWeight * 10) / 10,
        qual: Math.round(qualPillar.score * pw.qual / totalWeight * 10) / 10,
        risk: Math.round(riskPillar.score * pw.risk / totalWeight * 10) / 10,
      },
      profileName: profileId,
    },
  }

  // Write-through: update in-memory cache so next Dashboard visit shows fresh data
  try {
    const { updateCachedStock } = await import('./stockCacheService')
    updateCachedStock(stock.symbol, {
      name: stock.name,
      sector: stock.sector || '',
      score: overallScore,
      verdict: overall.label,
      price: stock.currentPrice ?? null,
      changePercent: stock.changePercent ?? null,
      peerRank: ranking.peerRank,
      peerTotal: ranking.peerTotal,
      peerCategory: ranking.peerCategory,
    })
  } catch { /* cache write failed — non-critical */ }

  return verdictResult
}
