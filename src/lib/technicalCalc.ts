/**
 * Technical Indicator Calculations
 *
 * Pure math functions for EMA, RSI, VPT.
 * No scoring logic — that lives in quantScoringService.
 */

/**
 * Exponential Moving Average
 * EMA = (Price × k) + (Previous EMA × (1 - k))
 * where k = 2 / (period + 1)
 */
export function ema(prices: number[], period: number): number[] {
  if (prices.length === 0 || prices.length < period) return []

  const k = 2 / (period + 1)
  const result: number[] = []

  // Start with SMA for the first value
  let sma = 0
  for (let i = 0; i < period; i++) sma += prices[i]
  sma /= period
  result.push(sma)

  // Calculate EMA for remaining values
  let prevEma = sma
  for (let i = period; i < prices.length; i++) {
    const currentEma = prices[i] * k + prevEma * (1 - k)
    result.push(currentEma)
    prevEma = currentEma
  }

  return result
}

/**
 * Relative Strength Index (14-period by default)
 * RSI = 100 - (100 / (1 + RS))
 * where RS = Average Gain / Average Loss
 */
export function rsi(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }
  avgGain /= period
  avgLoss /= period

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgGain === 0 && avgLoss === 0) return 50
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100
}

/**
 * Volume-Price Trend (VPT)
 * VPT = Previous VPT + Volume × ((Close - Previous Close) / Previous Close)
 * Returns the final VPT value normalized as % of average volume.
 */
export function volumePriceTrend(prices: number[], volumes: number[]): number | null {
  if (prices.length < 2 || volumes.length < 2) return null
  if (prices.length !== volumes.length) return null

  let vpt = 0
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] === 0) continue
    vpt += volumes[i] * ((prices[i] - prices[i - 1]) / prices[i - 1])
  }

  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
  if (avgVolume === 0) return 0

  return Math.round((vpt / avgVolume) * 100 * 100) / 100
}

/**
 * Price vs EMA deviation (percentage)
 * Positive = price above EMA (bullish), Negative = below (bearish)
 */
export function priceVsEMA(currentPrice: number, emaValue: number): number {
  if (emaValue === 0) return 0
  return Math.round(((currentPrice - emaValue) / emaValue) * 100 * 100) / 100
}
