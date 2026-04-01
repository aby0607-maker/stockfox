/**
 * Centralized scoring utilities for consistent score display across the app
 */

// Score band thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 8,
  GOOD: 6,
  FAIR: 4,
} as const

// Score band types
export type ScoreBandType = 'excellent' | 'good' | 'fair' | 'poor'

export interface ScoreBandInfo {
  band: ScoreBandType
  label: string
  shortLabel: string
  colorClass: string
  bgClass: string
  borderClass: string
  hexColor: string
  gradientColors: [string, string]
}

/**
 * Get complete score band information for a given score
 */
export function getScoreBand(score: number): ScoreBandInfo {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) {
    return {
      band: 'excellent',
      label: 'Excellent',
      shortLabel: 'GREAT',
      colorClass: 'text-success-400',
      bgClass: 'bg-success-500/10',
      borderClass: 'border-success-500/30',
      hexColor: '#00C489',
      gradientColors: ['#00C489', '#22c55e'],
    }
  }
  if (score >= SCORE_THRESHOLDS.GOOD) {
    return {
      band: 'good',
      label: 'Good',
      shortLabel: 'GOOD',
      colorClass: 'text-teal-400',
      bgClass: 'bg-teal-500/10',
      borderClass: 'border-teal-500/30',
      hexColor: '#69E2B0',
      gradientColors: ['#69E2B0', '#2dd4bf'],
    }
  }
  if (score >= SCORE_THRESHOLDS.FAIR) {
    return {
      band: 'fair',
      label: 'Fair',
      shortLabel: 'FAIR',
      colorClass: 'text-warning-400',
      bgClass: 'bg-warning-500/10',
      borderClass: 'border-warning-500/30',
      hexColor: '#FC6200',
      gradientColors: ['#FC6200', '#fbbf24'],
    }
  }
  return {
    band: 'poor',
    label: 'Poor',
    shortLabel: 'WEAK',
    colorClass: 'text-destructive-400',
    bgClass: 'bg-destructive-500/10',
    borderClass: 'border-destructive-500/30',
    hexColor: '#f87171',
    gradientColors: ['#f87171', '#ef4444'],
  }
}

/**
 * Get score text color class
 */
export function getScoreColor(score: number): string {
  return getScoreBand(score).colorClass
}

/**
 * Get score background color class
 */
export function getScoreBgColor(score: number): string {
  return getScoreBand(score).bgClass
}

/**
 * Get score hex color for charts
 */
export function getScoreHexColor(score: number): string {
  return getScoreBand(score).hexColor
}

/**
 * Get gradient colors for charts
 */
export function getScoreGradient(score: number): [string, string] {
  return getScoreBand(score).gradientColors
}

/**
 * Get human-readable score label
 */
export function getScoreLabel(score: number): string {
  return getScoreBand(score).shortLabel
}

/**
 * Get verdict label with full styling info
 */
export function getVerdictLabel(score: number): {
  label: string
  colorClass: string
  bgClass: string
} {
  const band = getScoreBand(score)
  return {
    label: band.shortLabel,
    colorClass: band.colorClass,
    bgClass: band.bgClass,
  }
}

/**
 * Get verdict color based on verdict string
 */
export function getVerdictColor(verdict: string): string {
  const v = verdict.toUpperCase()
  if (v.includes('BUY')) return 'text-verdict-buy'
  if (v === 'HOLD' || v === 'STRONG HOLD') return 'text-verdict-hold'
  return 'text-verdict-avoid'
}

/**
 * Get verdict badge class
 */
export function getVerdictBadgeClass(verdict: string): string {
  const v = verdict.toUpperCase()
  if (v.includes('BUY')) return 'badge-buy'
  if (v === 'HOLD' || v === 'STRONG HOLD') return 'badge-hold'
  return 'badge-avoid'
}

/**
 * Get rank styling based on position
 */
export function getRankStyle(rank: number, total: number): {
  colorClass: string
  bgClass: string
  medal: string | null
  label: string
} {
  const position = rank / total

  if (rank === 1) {
    return {
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/15 border border-amber-500/30',
      medal: '🥇',
      label: 'Top',
    }
  }
  if (rank === 2) {
    return {
      colorClass: 'text-slate-300',
      bgClass: 'bg-slate-400/15 border border-slate-400/30',
      medal: '🥈',
      label: 'Top',
    }
  }
  if (rank === 3) {
    return {
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-700/15 border border-amber-600/30',
      medal: '🥉',
      label: '',
    }
  }
  if (position <= 0.5) {
    return {
      colorClass: 'text-teal-400',
      bgClass: 'bg-teal-500/10 border border-teal-500/20',
      medal: null,
      label: '',
    }
  }
  if (position <= 0.75) {
    return {
      colorClass: 'text-warning-400',
      bgClass: 'bg-warning-500/10 border border-warning-500/20',
      medal: null,
      label: '',
    }
  }
  return {
    colorClass: 'text-destructive-400',
    bgClass: 'bg-destructive-500/10 border border-destructive-500/20',
    medal: null,
    label: 'Bottom',
  }
}

/**
 * Get glow/shadow effect for score
 */
export function getScoreGlow(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) {
    return 'drop-shadow-[0_0_12px_rgba(0,196,137,0.6)]'
  }
  if (score >= SCORE_THRESHOLDS.GOOD) {
    return 'drop-shadow-[0_0_12px_rgba(105,226,176,0.5)]'
  }
  if (score >= SCORE_THRESHOLDS.FAIR) {
    return 'drop-shadow-[0_0_10px_rgba(252,98,0,0.5)]'
  }
  return 'drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]'
}

/**
 * Get metric status color
 */
export function getMetricStatusColor(status: string): string {
  switch (status) {
    case 'excellent':
    case 'positive':
      return 'text-success-400'
    case 'good':
      return 'text-teal-400'
    case 'fair':
    case 'neutral':
      return 'text-warning-400'
    case 'poor':
    case 'negative':
      return 'text-destructive-400'
    default:
      return 'text-neutral-400'
  }
}

/**
 * Get trend color based on direction
 */
export function getTrendColor(trend: 'up' | 'down' | 'flat' | 'improving' | 'declining' | 'stable'): string {
  switch (trend) {
    case 'up':
    case 'improving':
      return 'text-success-400'
    case 'down':
    case 'declining':
      return 'text-destructive-400'
    default:
      return 'text-neutral-400'
  }
}

// ============================================================
// V2 SCORING — 0-100 Scale
// ============================================================

import type { ScoreBandV2, OverallVerdictLabel } from '@/types'

// V2 Pillar/Segment/Factor score band thresholds (0-100)
export const SCORE_THRESHOLDS_V2 = {
  STRONG: 80,
  GOOD: 60,
  MIXED: 40,
} as const

// V2 Overall verdict thresholds (same scale, different labels)
export const OVERALL_VERDICT_THRESHOLDS = {
  STRONG_BUY: 80,
  BUY: 60,
  HOLD: 40,
} as const

export type ScoreBandTypeV2 = 'strong' | 'good' | 'mixed' | 'weak' | 'suppressed'

export interface ScoreBandInfoV2 {
  band: ScoreBandTypeV2
  label: string
  shortLabel: string
  colorClass: string
  bgClass: string
  borderClass: string
  hexColor: string
  gradientColors: [string, string]
}

/**
 * Get V2 score band info for pillar/segment/factor scores (0-100)
 */
export function getScoreBandV2(score: number, isSuppressed?: boolean): ScoreBandInfoV2 {
  if (isSuppressed) {
    return {
      band: 'suppressed',
      label: 'Suppressed',
      shortLabel: 'RED FLAG',
      colorClass: 'text-destructive-400',
      bgClass: 'bg-destructive-500/20',
      borderClass: 'border-destructive-500/40',
      hexColor: '#ef4444',
      gradientColors: ['#ef4444', '#dc2626'],
    }
  }
  if (score >= SCORE_THRESHOLDS_V2.STRONG) {
    return {
      band: 'strong',
      label: 'Strong',
      shortLabel: 'STRONG',
      colorClass: 'text-success-400',
      bgClass: 'bg-success-500/10',
      borderClass: 'border-success-500/30',
      hexColor: '#00C489',
      gradientColors: ['#00C489', '#22c55e'],
    }
  }
  if (score >= SCORE_THRESHOLDS_V2.GOOD) {
    return {
      band: 'good',
      label: 'Good',
      shortLabel: 'GOOD',
      colorClass: 'text-teal-400',
      bgClass: 'bg-teal-500/10',
      borderClass: 'border-teal-500/30',
      hexColor: '#69E2B0',
      gradientColors: ['#69E2B0', '#2dd4bf'],
    }
  }
  if (score >= SCORE_THRESHOLDS_V2.MIXED) {
    return {
      band: 'mixed',
      label: 'Mixed',
      shortLabel: 'MIXED',
      colorClass: 'text-warning-400',
      bgClass: 'bg-warning-500/10',
      borderClass: 'border-warning-500/30',
      hexColor: '#FC6200',
      gradientColors: ['#FC6200', '#fbbf24'],
    }
  }
  return {
    band: 'weak',
    label: 'Weak',
    shortLabel: 'WEAK',
    colorClass: 'text-destructive-400',
    bgClass: 'bg-destructive-500/10',
    borderClass: 'border-destructive-500/30',
    hexColor: '#f87171',
    gradientColors: ['#f87171', '#ef4444'],
  }
}

/**
 * Get the ScoreBandV2 enum value for a score
 */
export function getScoreBandEnum(score: number, isSuppressed?: boolean): ScoreBandV2 {
  return getScoreBandV2(score, isSuppressed).band
}

/**
 * Get overall verdict label and styling (independent of pillar scores)
 */
export function getOverallVerdict(score: number): {
  verdict: OverallVerdictLabel
  label: string
  colorClass: string
  bgClass: string
  borderClass: string
} {
  if (score >= OVERALL_VERDICT_THRESHOLDS.STRONG_BUY) {
    return {
      verdict: 'strong_buy',
      label: 'Strong Buy',
      colorClass: 'text-success-400',
      bgClass: 'bg-success-500/15',
      borderClass: 'border-success-500/30',
    }
  }
  if (score >= OVERALL_VERDICT_THRESHOLDS.BUY) {
    return {
      verdict: 'buy',
      label: 'Buy',
      colorClass: 'text-teal-400',
      bgClass: 'bg-teal-500/15',
      borderClass: 'border-teal-500/30',
    }
  }
  if (score >= OVERALL_VERDICT_THRESHOLDS.HOLD) {
    return {
      verdict: 'hold',
      label: 'Hold',
      colorClass: 'text-warning-400',
      bgClass: 'bg-warning-500/15',
      borderClass: 'border-warning-500/30',
    }
  }
  return {
    verdict: 'sell',
    label: 'Sell',
    colorClass: 'text-destructive-400',
    bgClass: 'bg-destructive-500/15',
    borderClass: 'border-destructive-500/30',
  }
}

/**
 * Get V2 score glow effect (0-100 scale)
 */
export function getScoreGlowV2(score: number): string {
  if (score >= SCORE_THRESHOLDS_V2.STRONG) {
    return 'drop-shadow-[0_0_12px_rgba(0,196,137,0.6)]'
  }
  if (score >= SCORE_THRESHOLDS_V2.GOOD) {
    return 'drop-shadow-[0_0_12px_rgba(105,226,176,0.5)]'
  }
  if (score >= SCORE_THRESHOLDS_V2.MIXED) {
    return 'drop-shadow-[0_0_10px_rgba(252,98,0,0.5)]'
  }
  return 'drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]'
}

/**
 * Map factor-specific labels (allows per-factor overrides if needed)
 */
export function getFactorLabel(
  band: ScoreBandV2,
  customLabels?: Record<string, string>
): string {
  if (customLabels && customLabels[band]) {
    return customLabels[band]
  }
  const defaults: Record<ScoreBandV2, string> = {
    strong: 'STRONG',
    good: 'GOOD',
    mixed: 'MIXED',
    weak: 'WEAK',
    suppressed: 'RED FLAG',
  }
  return defaults[band]
}
