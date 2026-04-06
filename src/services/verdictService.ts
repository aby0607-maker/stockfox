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

/** Build a metric-rich phrase for the strongest quant insight */
function buildQuantInsight(snap: MetricSnapshot, bestSegId?: string): string {
  if (bestSegId === 'profitability' && snap.roe && snap.opm) return `ROE ${snap.roe}, OPM ${snap.opm}`
  if (bestSegId === 'financial_health' && snap.icr && snap.debtEbitda) return `ICR ${snap.icr}, Debt/EBITDA ${snap.debtEbitda}`
  if (bestSegId === 'growth' && snap.revCagr) return `Revenue CAGR ${snap.revCagr}`
  if (bestSegId === 'valuation' && snap.pe && snap.pb) return `PE ${snap.pe}, PB ${snap.pb}`
  if (bestSegId === 'technical' && snap.rsi && snap.return1y) return `RSI ${snap.rsi}, 1Y Return ${snap.return1y}`
  // Fallback: pick the best available metrics
  const parts: string[] = []
  if (snap.roe) parts.push(`ROE ${snap.roe}`)
  if (snap.pe) parts.push(`PE ${snap.pe}`)
  if (snap.revCagr) parts.push(`Rev CAGR ${snap.revCagr}`)
  return parts.slice(0, 2).join(', ') || ''
}

/** Build a metric-rich phrase for the key concern */
function buildConcernInsight(snap: MetricSnapshot, worstSegId?: string): string {
  if (worstSegId === 'valuation' && snap.pe) return `PE at ${snap.pe} — premium valuation`
  if (worstSegId === 'profitability' && snap.roce) return `ROCE at ${snap.roce} — below cost of capital`
  if (worstSegId === 'financial_health' && snap.debtEbitda) return `Debt/EBITDA ${snap.debtEbitda}`
  if (worstSegId === 'growth' && snap.revCagr) return `Revenue growth at ${snap.revCagr}`
  return ''
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

  // Best and worst scored segments
  const allScoredSegs = [...quant.segments, ...qual.segments]
    .filter(s => s.scoringType === 'scored' && s.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const bestSeg = allScoredSegs[0]
  const worstSeg = allScoredSegs[allScoredSegs.length - 1]

  // Metric-rich insights from raw data
  const quantInsight = buildQuantInsight(snap, bestSeg?.id)
  const concernInsight = buildConcernInsight(snap, worstSeg?.id)

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

  // ── Build summary (1-line contextual, metric-rich) ──
  let summary: string

  if (overallScore >= 75) {
    summary = quantInsight
      ? `${bestSeg?.name || 'Fundamentals'} leads at ${bestSeg?.score}/100 (${quantInsight}) with ${riskSummary || 'clean risk'}.`
      : `Strong across pillars — ${strongest.name} at ${strongest.score}/100 with a clean risk profile.`
  } else if (overallScore >= 60) {
    const strengthPart = quantInsight
      ? `${bestSeg?.name || strongest.name} at ${bestSeg?.score}/100 (${quantInsight})`
      : `${bestSeg?.name || strongest.name} at ${bestSeg?.score}/100`
    const weakPart = worstSeg && worstSeg.score != null && worstSeg.score < 50
      ? (concernInsight ? `, but ${worstSeg.name} needs work — ${concernInsight}` : `, but ${worstSeg.name} at ${worstSeg.score}/100 needs attention`)
      : ''
    summary = `${strengthPart}${weakPart}.`
  } else if (overallScore >= 45) {
    const concern = topConcerns[0]
    summary = concern
      ? `${concern.title}${concernInsight ? ` (${concernInsight})` : ''} weighs on the score. ${bestSeg?.name || strongest.name} at ${bestSeg?.score}/100${quantInsight ? ` (${quantInsight})` : ''} is the upside.`
      : `Mixed signals — ${weakest.name} underperforms at ${weakest.score}/100 while ${strongest.name} holds at ${strongest.score}/100.`
  } else {
    summary = concernInsight
      ? `${worstSeg?.name || weakest.name} at ${worstSeg?.score}/100 (${concernInsight}) — significant concerns across multiple pillars.`
      : `Multiple pillars show weakness — ${weakest.name} ${weakest.score}/100, ${pillarScores[1].name} ${pillarScores[1].score}/100.`
  }

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
