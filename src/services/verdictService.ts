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
import { computeRiskFromScanner, buildScannerValuesFromMetrics } from './redFlagScannerService'
import { resolveMetricValues } from './metricResolver'
import { buildNewsEvents } from './newsBuilder'

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

const PROFILE_LENS: Record<string, string> = {
  ankit: 'For comprehensive analysis',
  sneha: 'For value-focused investing',
  meera: 'For momentum trading',
  kavya: 'As a learning opportunity',
  fatima: 'For long-term compounding',
  nikhil: 'For remote investing with governance trust',
  priya: 'For a balanced investment view',
}

function generateVerdictExplainer(
  stock: Stock,
  profileId: string,
  pillars: PillarVerdict[],
  topSignals: Signal[],
  topConcerns: Signal[],
  overallScore: number,
  profileWeightsObj: ReturnType<typeof getProfileWeightsV2>,
): { summary: string; rationale: string; context: VerdictContext } {
  const quant = pillars.find(p => p.pillar === 'quant')!
  const qual = pillars.find(p => p.pillar === 'qual')!
  const risk = pillars.find(p => p.pillar === 'risk')!

  // Find strongest and weakest pillars
  const pillarScores = [
    { name: 'Quant', score: quant.score },
    { name: 'Qual', score: qual.score },
    { name: 'Risk', score: risk.score },
  ].sort((a, b) => b.score - a.score)
  const strongest = pillarScores[0]
  const weakest = pillarScores[pillarScores.length - 1]

  // Find the profile's highest-weighted quant segment and its score
  const qw = profileWeightsObj.quantWeights
  const topSegKey = Object.entries(qw).sort(([, a], [, b]) => b - a)[0]?.[0]
  const topSegment = quant.segments.find(s => s.id === topSegKey)
  const profileTopSegment = topSegment ? { name: topSegment.name, score: topSegment.score ?? 0 } : null

  const profile = profiles.find(p => p.id === profileId)
  const lens = PROFILE_LENS[profileId] || 'For your analysis'
  const displayName = profile?.displayName || profileId

  const ctx: VerdictContext = {
    stock: { name: stock.name, sector: stock.sector },
    profile: { id: profileId, thesis: profile?.investmentThesis || 'balanced', displayName },
    scores: { overall: overallScore, quant: quant.score, qual: qual.score, risk: risk.score },
    topStrength: topSignals[0] || null,
    topConcern: topConcerns[0] || null,
    strongestPillar: strongest,
    weakestPillar: weakest,
    profileTopSegment,
  }

  // ── Build summary (1-line contextual copy) ──
  let summary: string
  const strengthText = topSignals[0]?.title || strongest.name
  const concernText = topConcerns[0]?.title || null

  if (overallScore >= 70) {
    // Strong stock
    summary = `${strengthText} leads the analysis` +
      (concernText ? ` — minor watch area: ${concernText.toLowerCase()}.` : ' across all pillars.')
  } else if (overallScore >= 60) {
    // Good stock
    summary = `${strengthText} is a key positive` +
      (concernText ? `, but ${concernText.toLowerCase()} needs attention.` : ', with solid fundamentals overall.')
  } else if (overallScore >= 40) {
    // Mixed stock
    summary = concernText
      ? `${concernText} weighs on the score — ${strengthText.toLowerCase()} provides some support.`
      : `Mixed signals across pillars — ${weakest.name} at ${weakest.score}/100 is the main drag.`
  } else {
    // Weak stock
    summary = concernText
      ? `${concernText} — significant concerns identified across ${weakest.name.toLowerCase()}.`
      : `Multiple concerns across ${weakest.name} (${weakest.score}/100) and ${pillarScores[1].name} (${pillarScores[1].score}/100).`
  }

  // ── Build rationale (2-3 line expanded) ──
  const rationale = `${lens}: ${strongest.name} leads at ${strongest.score}/100` +
    (profileTopSegment ? `, with your top-priority segment ${profileTopSegment.name} at ${profileTopSegment.score}/100` : '') +
    `. ${weakest.name} at ${weakest.score}/100 is the weakest pillar.` +
    (topConcerns.length > 0 ? ` Key concern: ${topConcerns[0].title}.` : '')

  return { summary, rationale, context: ctx }
}

/**
 * Build a full V2 verdict for any stock from live CMOTS data.
 * Quant pillar uses live scoring; Qual uses placeholders; Risk computed from red flags.
 */
export async function buildVerdictForStock(
  stock: Stock,
  profileId: string,
): Promise<StockVerdictV2> {
  // Fetch quant + qual + raw metrics + news in parallel (all hit CMOTS cache)
  const [quantSegments, qualFactors, resolved, newsEvents] = await Promise.all([
    computeQuantSegments(stock.symbol),
    computeQualFactors(stock.symbol),
    resolveMetricValues(stock.symbol),
    buildNewsEvents(stock.symbol, stock.name),
  ])
  // Apply profile-specific segment weights (Layer 2 personalization)
  const profileWeights = getProfileWeightsV2(profileId)
  const quantPillar = buildPillarVerdictV2('quant', 'Quant Score', quantSegments, profileWeights.quantWeights)
  const qualPillar = buildPillarVerdictV2('qual', 'Qual Score', qualFactors, profileWeights.qualWeights)

  // Build dynamic scanner display values from raw CMOTS metrics
  const scannerValues = resolved ? buildScannerValuesFromMetrics(resolved.data) : undefined

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
  const explainer = generateVerdictExplainer(stock, profileId, allPillars, topSignals, topConcerns, overallScore, profileWeights)

  return {
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
}
