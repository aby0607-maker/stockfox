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

// Profile thesis descriptors for natural copy
const THESIS_COPY: Record<string, { lens: string; seeks: string; avoids: string }> = {
  ankit: { lens: 'comprehensive analysis', seeks: 'balanced strength across all dimensions', avoids: 'blind spots in any pillar' },
  sneha: { lens: 'value investing', seeks: 'undervaluation with margin of safety', avoids: 'expensive stocks without earnings backing' },
  meera: { lens: 'momentum trading', seeks: 'price momentum backed by execution delivery', avoids: 'stocks with fading technical trends' },
  kavya: { lens: 'learning to invest', seeks: 'safe, well-understood businesses', avoids: 'complex or volatile stocks' },
  fatima: { lens: 'long-term compounding', seeks: 'consistent profitability and durable moats', avoids: 'businesses without proven profit models' },
  nikhil: { lens: 'remote investing', seeks: 'trustworthy governance and institutional backing', avoids: 'companies with governance red flags' },
  priya: { lens: 'a balanced view', seeks: 'clear buy/hold/sell signals', avoids: 'ambiguous mixed signals' },
}

/**
 * Extract the most meaningful metric insight from a segment's interpretation.
 * Returns a short phrase like "ROE 18%", "Revenue CAGR 70%+", "PE 90x".
 */
function extractMetricInsight(seg: SegmentVerdictV2): string | null {
  // The interpretation field often contains key metrics — extract them
  const interp = seg.interpretation
  if (!interp) return null

  // Look for patterns like "ROE 18%", "PE 90x", "Revenue CAGR 70%"
  const metricMatch = interp.match(/(?:ROE|ROCE|OPM|NPM|PE|PB|EV|Revenue|Growth|CAGR|D\/E|OCF|FCF|Beta|RSI)\s*[-–]?\s*[\d.]+[%x]?/i)
  if (metricMatch) return metricMatch[0].trim()

  // Fallback: use quickInsight if available (often has specific numbers)
  if (seg.quickInsight) {
    const qiMatch = seg.quickInsight.match(/[\d.]+[%x]/)
    if (qiMatch) return seg.quickInsight.slice(0, 40)
  }
  return null
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

  const pillarScores = [
    { name: 'Quant', pillar: 'quant', score: quant.score },
    { name: 'Qual', pillar: 'qual', score: qual.score },
    { name: 'Risk', pillar: 'risk', score: risk.score },
  ].sort((a, b) => b.score - a.score)
  const strongest = pillarScores[0]
  const weakest = pillarScores[pillarScores.length - 1]

  // Find the profile's top-priority quant segment
  const qw = profileWeightsObj.quantWeights
  const topSegKey = Object.entries(qw).sort(([, a], [, b]) => b - a)[0]?.[0]
  const topSegment = quant.segments.find(s => s.id === topSegKey)
  const profileTopSegment = topSegment ? { name: topSegment.name, score: topSegment.score ?? 0 } : null

  // Find highest and lowest scoring SEGMENTS (not pillars) for specific insights
  const allScoredSegs = [...quant.segments, ...qual.segments]
    .filter(s => s.scoringType === 'scored' && s.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const bestSeg = allScoredSegs[0]
  const worstSeg = allScoredSegs[allScoredSegs.length - 1]

  // Extract metric insights from best/worst segments
  const bestMetric = bestSeg ? extractMetricInsight(bestSeg) : null
  const worstMetric = worstSeg ? extractMetricInsight(worstSeg) : null

  const profile = profiles.find(p => p.id === profileId)
  const thesis = THESIS_COPY[profileId] || THESIS_COPY['priya']

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

  // ── Build summary (1-line — the "doctor's diagnosis") ──
  let summary: string
  const riskClean = risk.score >= 75
  const riskFlags = risk.segments[0]?.interpretation || ''

  if (overallScore >= 75) {
    // Strong conviction
    summary = bestSeg
      ? `${bestSeg.name} stands out at ${bestSeg.score}/100${bestMetric ? ` (${bestMetric})` : ''} with a clean risk profile.`
      : `Strong across all dimensions — ${strongest.name} leads at ${strongest.score}/100.`
  } else if (overallScore >= 60) {
    // Good with nuance
    if (worstSeg && worstSeg.score != null && worstSeg.score < 45) {
      summary = `${bestSeg?.name || strongest.name} scores well${bestMetric ? ` (${bestMetric})` : ''}, but ${worstSeg.name} at ${worstSeg.score}/100 needs attention` +
        (worstMetric ? ` — ${worstMetric}.` : '.')
    } else {
      summary = `Solid fundamentals led by ${bestSeg?.name || strongest.name}${bestMetric ? ` (${bestMetric})` : ''}` +
        (riskClean ? ', with a clean risk profile.' : `, though ${riskFlags.split('—')[0]?.trim() || 'some risk flags exist'}.`)
    }
  } else if (overallScore >= 45) {
    // Mixed — lead with the concern
    const concern = topConcerns[0]
    if (concern && bestSeg) {
      summary = `${concern.title} drags the score — ${bestSeg.name} at ${bestSeg.score}/100 is the bright spot` +
        (bestMetric ? ` (${bestMetric}).` : '.')
    } else {
      summary = `Mixed picture — ${weakest.name} at ${weakest.score}/100 underperforms while ${strongest.name} holds at ${strongest.score}/100.`
    }
  } else {
    // Weak — be direct
    summary = worstSeg
      ? `${worstSeg.name} scores just ${worstSeg.score}/100${worstMetric ? ` (${worstMetric})` : ''} — multiple pillars show weakness.`
      : `Significant concerns across ${weakest.name} (${weakest.score}) and ${pillarScores[1].name} (${pillarScores[1].score}).`
  }

  // ── Build rationale (2-3 lines — the "doctor's explanation") ──
  // Format: [Profile context] → [What your priority segment shows] → [Key risk/strength]
  const profileSegNote = profileTopSegment
    ? `Your top priority (${profileTopSegment.name}) scores ${profileTopSegment.score}/100 — ${profileTopSegment.score >= 60 ? 'aligned with' : 'below'} what ${thesis.lens} requires.`
    : ''

  const riskNote = riskClean
    ? `Risk profile is clean (${riskFlags.split('—')[0]?.trim() || '0 flags'}).`
    : `Risk flags detected: ${riskFlags.split('—')[0]?.trim() || 'review recommended'}.`

  const rationale = `For ${thesis.lens}: Quant ${quant.score} · Qual ${qual.score} · Risk ${risk.score}. ` +
    profileSegNote +
    (profileSegNote ? ' ' : '') +
    riskNote

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
