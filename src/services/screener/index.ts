/**
 * Screener.in Service — Annual report parsed data for qual signals
 *
 * Usage:
 *   import { getScreenerQualData } from '@/services/screener'
 *   const qualData = await getScreenerQualData('RELIANCE')
 */

export { screenerFetchHtml } from './client'
export { getScreenerQualData, parseScreenerHtml } from './companyData'
