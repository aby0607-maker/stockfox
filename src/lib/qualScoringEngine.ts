/**
 * Qual Scoring Engine — Hybrid Anchor-Group Pattern
 *
 * All 5 qual factors use the same aggregation algorithm:
 * 1. Score each signal 0-100
 * 2. Compute group averages (equal weight within group, N/A excluded)
 * 3. Anchor group sets ceiling/floor band
 * 4. Final = (Anchor × 0.50) + (Non-anchor composite × 0.50), clamped to band
 * 5. Hard overrides suppress score entirely → Red Flag replaces display
 * 6. Suppression if anchor group has insufficient signals
 */

import type {
  SignalGroup,
  QualSignal,
  RedFlagV2,
  ConfidenceIndicator,
  ScoreBandV2,
} from '@/types'
import { getScoreBandEnum } from './scoring'

// --- Factor Configuration ---

export interface BandConfig {
  groupScore: [number, number]  // [min, max] range for anchor group score
  ceiling: number               // Max final score in this band
  floor: number                 // Min final score in this band
}

export interface FactorConfig {
  factorId: string
  anchorGroup: string                     // Which group anchors (A for most, C for CD)
  bands: BandConfig[]
  nonAnchorWeights: Record<string, number> // e.g., { B: 0.50, C: 0.50 }
  minAnchorSignals: number                // Below this → suppress
  hardOverrides: string[]                 // Signal IDs that suppress on trigger
  labels: Record<string, string>          // Score band → custom label
}

// --- Factor Configs (from Qual Layer 4 spec) ---

export const FACTOR_CONFIGS: Record<string, FactorConfig> = {
  management_governance: {
    factorId: 'management_governance',
    anchorGroup: 'A',
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 30 },
      { groupScore: [40, 69],  ceiling: 75,  floor: 15 },
      { groupScore: [0, 39],   ceiling: 50,  floor: 0 },
    ],
    nonAnchorWeights: { B: 0.50, C: 0.50 },
    minAnchorSignals: 2,
    hardOverrides: ['A1_pledge_50', 'B1_auditor', 'B3_sebi', 'fraud'],
    labels: { strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK' },
  },

  business_quality: {
    factorId: 'business_quality',
    anchorGroup: 'A',
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 35 },
      { groupScore: [40, 69],  ceiling: 72,  floor: 18 },
      { groupScore: [0, 39],   ceiling: 48,  floor: 0 },
    ],
    nonAnchorWeights: { CD: 1.0 },  // C+D combined, B excluded from score
    minAnchorSignals: 3,
    hardOverrides: [],
    labels: { strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK' },
  },

  capital_discipline: {
    factorId: 'capital_discipline',
    anchorGroup: 'C',   // ONLY factor where C anchors
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 40 },
      { groupScore: [40, 69],  ceiling: 75,  floor: 20 },
      { groupScore: [0, 39],   ceiling: 50,  floor: 0 },
    ],
    nonAnchorWeights: { A: 0.30, B: 0.45, D: 0.25 },  // NOT equal — only factor
    minAnchorSignals: 2,
    hardOverrides: ['promoter_pledge_50'],
    labels: { strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK' },
  },

  earnings_quality: {
    factorId: 'earnings_quality',
    anchorGroup: 'A',
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 40 },
      { groupScore: [40, 69],  ceiling: 75,  floor: 20 },
      { groupScore: [0, 39],   ceiling: 50,  floor: 0 },
    ],
    nonAnchorWeights: { B: 0.60, D: 0.40 },
    minAnchorSignals: 2,
    hardOverrides: ['C3_auditor_opinion', 'C2_accounting_policy'],
    labels: { strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK' },
  },

  execution_quality: {
    factorId: 'execution_quality',
    anchorGroup: 'A',
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 40 },
      { groupScore: [40, 69],  ceiling: 75,  floor: 20 },
      { groupScore: [0, 39],   ceiling: 50,  floor: 0 },
    ],
    nonAnchorWeights: { B: 1.0 },  // Group C is v2 NLP, excluded at launch
    minAnchorSignals: 2,
    hardOverrides: ['X1_no_guidance'],
    labels: { strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK' },
  },
}

// --- Scoring Functions ---

/**
 * Compute the average score for a signal group, excluding N/A signals
 */
export function computeGroupScore(signals: QualSignal[]): number | null {
  const scoreable = signals.filter(
    s => s.state !== 'not_applicable' && s.score !== undefined
  )
  if (scoreable.length === 0) return null
  const sum = scoreable.reduce((acc, s) => acc + (s.score ?? 0), 0)
  return sum / scoreable.length
}

/**
 * Find the ceiling/floor band based on anchor group score
 */
export function findBand(
  anchorScore: number,
  bands: BandConfig[]
): { ceiling: number; floor: number } {
  for (const band of bands) {
    if (anchorScore >= band.groupScore[0] && anchorScore <= band.groupScore[1]) {
      return { ceiling: band.ceiling, floor: band.floor }
    }
  }
  // Default to most restrictive band
  return { ceiling: bands[bands.length - 1].ceiling, floor: bands[bands.length - 1].floor }
}

/**
 * Check if any hard override signals are triggered
 */
export function checkHardOverrides(
  groups: SignalGroup[],
  hardOverrideIds: string[]
): RedFlagV2[] {
  const flags: RedFlagV2[] = []
  for (const group of groups) {
    for (const signal of group.signals) {
      if (
        hardOverrideIds.includes(signal.id) &&
        signal.isTriggered
      ) {
        flags.push({
          signalId: signal.id,
          severity: 'hard',
          title: signal.name,
          description: signal.userText,
          source: `${signal.group}-${signal.id}`,
        })
      }
    }
  }
  return flags
}

/**
 * Check for soft escalation triggers
 */
export function checkSoftEscalations(
  groups: SignalGroup[]
): RedFlagV2[] {
  const flags: RedFlagV2[] = []
  for (const group of groups) {
    for (const signal of group.signals) {
      if (
        signal.escalationTier === 'soft' &&
        signal.isTriggered
      ) {
        flags.push({
          signalId: signal.id,
          severity: 'soft',
          title: signal.name,
          description: signal.userText,
          source: `${signal.group}-${signal.id}`,
        })
      }
    }
  }
  return flags
}

export interface FactorScoreResult {
  score: number
  scoreBand: ScoreBandV2
  label: string
  isSuppressed: boolean
  suppressionReason?: string
  hardFlags: RedFlagV2[]
  softFlags: RedFlagV2[]
  confidence: ConfidenceIndicator
  groupScores: Record<string, number | null>
  scoreJustification?: string
}

/**
 * Score a single qual factor using the hybrid anchor-group pattern.
 *
 * @param groups - Signal groups with scored signals (Group A, B, C, D)
 * @param config - Factor-specific configuration
 * @returns Factor score result with band, flags, and confidence
 */
export function scoreQualFactor(
  groups: SignalGroup[],
  config: FactorConfig
): FactorScoreResult {
  // Step 1: Check hard overrides first
  const hardFlags = checkHardOverrides(groups, config.hardOverrides)
  if (hardFlags.length > 0) {
    return {
      score: 0,
      scoreBand: 'suppressed',
      label: 'RED FLAG',
      isSuppressed: true,
      suppressionReason: hardFlags[0].description,
      hardFlags,
      softFlags: [],
      confidence: buildConfidence(groups, 'suppressed'),
      groupScores: {},
    }
  }

  // Step 2: Compute group scores
  const groupScores: Record<string, number | null> = {}
  for (const group of groups) {
    groupScores[group.id] = computeGroupScore(group.signals)
  }

  // Step 3: Find anchor group and check minimum signals
  const anchorGroup = groups.find(g => g.id === config.anchorGroup)
  if (!anchorGroup) {
    return buildSuppressedResult('Anchor group data unavailable', groups)
  }

  const anchorSignalsAvailable = anchorGroup.signals.filter(
    s => s.state !== 'not_applicable' && s.score !== undefined
  ).length

  if (anchorSignalsAvailable < config.minAnchorSignals) {
    return buildSuppressedResult(
      `Insufficient anchor signals (${anchorSignalsAvailable}/${config.minAnchorSignals})`,
      groups
    )
  }

  const anchorScore = groupScores[config.anchorGroup]
  if (anchorScore === null) {
    return buildSuppressedResult('Anchor group has no scoreable signals', groups)
  }

  // Step 4: Find ceiling/floor band from anchor score
  const { ceiling, floor } = findBand(anchorScore, config.bands)

  // Step 5: Compute non-anchor composite
  let nonAnchorComposite = 0
  let totalWeight = 0

  for (const [groupId, weight] of Object.entries(config.nonAnchorWeights)) {
    const groupScore = groupScores[groupId]
    if (groupScore !== null) {
      nonAnchorComposite += groupScore * weight
      totalWeight += weight
    }
  }

  // Normalize if not all non-anchor groups had data
  if (totalWeight > 0) {
    nonAnchorComposite = nonAnchorComposite / totalWeight
  }

  // Step 6: Hybrid formula — (Anchor × 0.50) + (Non-anchor × 0.50)
  // When no non-anchor data exists (all not_applicable), use anchor score directly
  let rawScore = totalWeight > 0
    ? (anchorScore * 0.50) + (nonAnchorComposite * 0.50)
    : anchorScore

  // Step 7: Clamp to ceiling/floor
  const finalScore = Math.max(floor, Math.min(ceiling, Math.round(rawScore)))

  // Step 8: Check soft escalations
  const softFlags = checkSoftEscalations(groups)

  // Step 9: Determine band and label
  const scoreBand = getScoreBandEnum(finalScore)
  const label = config.labels[scoreBand] || scoreBand.toUpperCase()

  const scoreJustification = [
    `Anchor: ${Math.round(anchorScore)}/100`,
    totalWeight > 0 ? `Non-anchor composite: ${Math.round(nonAnchorComposite)}/100` : null,
    totalWeight > 0
      ? `Hybrid: ${Math.round(anchorScore)}×50% + ${Math.round(nonAnchorComposite)}×50% = ${Math.round(rawScore)}`
      : `Anchor only (no non-anchor data)`,
    Math.round(rawScore) !== finalScore ? `Clamped [${floor}, ${ceiling}] → ${finalScore}` : null,
    softFlags.length > 0 ? `${softFlags.length} soft flag(s) flagged` : null,
    `Final: ${finalScore}/100`,
  ].filter(Boolean).join(' → ')

  return {
    score: finalScore,
    scoreBand,
    label,
    isSuppressed: false,
    hardFlags: [],
    softFlags,
    confidence: buildConfidence(groups, scoreBand === 'suppressed' ? 'suppressed' : undefined),
    groupScores,
    scoreJustification,
  }
}

// --- Helpers ---

function buildSuppressedResult(reason: string, groups: SignalGroup[]): FactorScoreResult {
  return {
    score: 0,
    scoreBand: 'suppressed',
    label: 'RED FLAG',
    isSuppressed: true,
    suppressionReason: reason,
    hardFlags: [],
    softFlags: [],
    confidence: buildConfidence(groups, 'suppressed'),
    groupScores: {},
  }
}

function buildConfidence(
  groups: SignalGroup[],
  overrideState?: 'suppressed'
): ConfidenceIndicator {
  let computed = 0
  let total = 0

  for (const group of groups) {
    for (const signal of group.signals) {
      if (signal.version === 'v1') {
        total++
        if (signal.state !== 'not_applicable' && signal.score !== undefined) {
          computed++
        }
      }
    }
  }

  let state: ConfidenceIndicator['state']
  if (overrideState === 'suppressed') {
    state = 'suppressed'
  } else if (computed === total) {
    state = 'full'
  } else if (computed >= total * 0.7) {
    state = 'partial'
  } else {
    state = 'limited_history'
  }

  return {
    signalsComputed: computed,
    signalsTotal: total,
    state,
    tooltip: state === 'suppressed'
      ? 'Score suppressed due to red flag'
      : `Based on ${computed} of ${total} signals`,
  }
}
