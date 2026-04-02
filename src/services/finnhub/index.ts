/**
 * Finnhub Service — Analyst consensus data for ExQ signals
 *
 * Usage:
 *   import { getAnalystConsensus } from '@/services/finnhub'
 *   const consensus = await getAnalystConsensus('RELIANCE')
 */

export { getAnalystConsensus } from './client'
export type { FinnhubConsensus, FinnhubRecommendation } from './client'
