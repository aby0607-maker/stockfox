/**
 * Services Layer - Centralized data access with caching
 */

// Cache utilities
export { cache, Cache } from './cache'

// API services — import via namespace to avoid name collisions
// Usage: import * as cmots from '@/services/cmots'
//        import * as dhan from '@/services/dhan'
//        import * as indianapi from '@/services/indianapi'

// Stock service
export {
  getStockBySymbol,
  getStockById,
  getAllStocks,
  searchStocks,
  getStocksBySector,
  invalidateStockCache,
} from './stockService'

// Verdict service
export {
  buildVerdictForStock,
} from './verdictService'

// Journal service
export {
  getJournalForProfile,
  getJournalStats,
  getRecentJournalEntries,
  getJournalEntriesByStock,
  getAllJournalEntries,
  invalidateJournalCache,
} from './journalService'
