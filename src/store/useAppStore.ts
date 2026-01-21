import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, Alert } from '@/types'

// Import mock data (will be populated later)
import { profiles } from '@/data/profiles'

// Analysis mode types
type AnalysisMode = 'dfy' | 'diy'

// Recent analysis entry
interface RecentAnalysis {
  stockId: string
  stockSymbol: string
  stockName: string
  timestamp: number
  score: number
  verdict: string
}

// Loading state keys
type LoadingKey = 'stocks' | 'verdicts' | 'journal' | 'alerts' | 'discovery'

// Error state
interface ErrorState {
  key: string
  message: string
  timestamp: number
}

interface AppState {
  // Current profile
  currentProfileId: string
  currentProfile: UserProfile | null

  // UI state
  isSidebarOpen: boolean
  isSearchOpen: boolean

  // Analysis mode (DFY = Done For You, DIY = Do It Yourself)
  analysisMode: AnalysisMode

  // Demo mode for investor presentations (available for all profiles)
  demoMode: boolean

  // Alerts
  alerts: Alert[]
  unreadAlertCount: number

  // Watchlist & Favorites
  watchlist: string[] // Stock symbols
  favorites: string[] // Stock symbols

  // Recent analyses (for quick access)
  recentAnalyses: RecentAnalysis[]

  // Loading states
  loading: Record<LoadingKey, boolean>

  // Errors
  errors: ErrorState[]

  // Actions - Profile
  setCurrentProfile: (profileId: string) => void

  // Actions - UI
  toggleSidebar: () => void
  toggleSearch: () => void
  setAnalysisMode: (mode: AnalysisMode) => void
  toggleAnalysisMode: () => void
  setDemoMode: (enabled: boolean) => void
  toggleDemoMode: () => void

  // Actions - Alerts
  markAlertAsRead: (alertId: string) => void
  markAllAlertsAsRead: () => void
  addAlert: (alert: Alert) => void

  // Actions - Watchlist & Favorites
  addToWatchlist: (symbol: string) => void
  removeFromWatchlist: (symbol: string) => void
  toggleFavorite: (symbol: string) => void
  isInWatchlist: (symbol: string) => boolean
  isFavorite: (symbol: string) => boolean

  // Actions - Recent Analyses
  addRecentAnalysis: (analysis: RecentAnalysis) => void
  clearRecentAnalyses: () => void

  // Actions - Loading
  setLoading: (key: LoadingKey, value: boolean) => void

  // Actions - Errors
  addError: (key: string, message: string) => void
  clearError: (key: string) => void
  clearAllErrors: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProfileId: 'ankit',
      currentProfile: profiles.find(p => p.id === 'ankit') || null,

      isSidebarOpen: false,
      isSearchOpen: false,

      // Default to DFY (Done For You) mode
      analysisMode: 'dfy',

      // Demo mode disabled by default
      demoMode: false,

      alerts: [],
      unreadAlertCount: 0,

      // Watchlist & Favorites
      watchlist: [],
      favorites: [],

      // Recent analyses
      recentAnalyses: [],

      // Loading states
      loading: {
        stocks: false,
        verdicts: false,
        journal: false,
        alerts: false,
        discovery: false,
      },

      // Errors
      errors: [],

      // Actions - Profile
      setCurrentProfile: (profileId: string) => {
        const profile = profiles.find(p => p.id === profileId) || null
        set({
          currentProfileId: profileId,
          currentProfile: profile,
        })
      },

      // Actions - UI
      toggleSidebar: () => {
        set(state => ({ isSidebarOpen: !state.isSidebarOpen }))
      },

      toggleSearch: () => {
        set(state => ({ isSearchOpen: !state.isSearchOpen }))
      },

      setAnalysisMode: (mode: AnalysisMode) => {
        set({ analysisMode: mode })
      },

      toggleAnalysisMode: () => {
        set(state => ({
          analysisMode: state.analysisMode === 'dfy' ? 'diy' : 'dfy'
        }))
      },

      setDemoMode: (enabled: boolean) => {
        set({ demoMode: enabled })
      },

      toggleDemoMode: () => {
        set(state => ({ demoMode: !state.demoMode }))
      },

      // Actions - Alerts
      markAlertAsRead: (alertId: string) => {
        set(state => ({
          alerts: state.alerts.map(alert =>
            alert.id === alertId ? { ...alert, isRead: true } : alert
          ),
          unreadAlertCount: Math.max(0, state.unreadAlertCount - 1),
        }))
      },

      markAllAlertsAsRead: () => {
        set(state => ({
          alerts: state.alerts.map(alert => ({ ...alert, isRead: true })),
          unreadAlertCount: 0,
        }))
      },

      addAlert: (alert: Alert) => {
        set(state => ({
          alerts: [alert, ...state.alerts],
          unreadAlertCount: state.unreadAlertCount + 1,
        }))
      },

      // Actions - Watchlist & Favorites
      addToWatchlist: (symbol: string) => {
        set(state => ({
          watchlist: state.watchlist.includes(symbol.toUpperCase())
            ? state.watchlist
            : [...state.watchlist, symbol.toUpperCase()],
        }))
      },

      removeFromWatchlist: (symbol: string) => {
        set(state => ({
          watchlist: state.watchlist.filter(s => s !== symbol.toUpperCase()),
        }))
      },

      toggleFavorite: (symbol: string) => {
        const upperSymbol = symbol.toUpperCase()
        set(state => ({
          favorites: state.favorites.includes(upperSymbol)
            ? state.favorites.filter(s => s !== upperSymbol)
            : [...state.favorites, upperSymbol],
        }))
      },

      isInWatchlist: (symbol: string) => {
        return get().watchlist.includes(symbol.toUpperCase())
      },

      isFavorite: (symbol: string) => {
        return get().favorites.includes(symbol.toUpperCase())
      },

      // Actions - Recent Analyses
      addRecentAnalysis: (analysis: RecentAnalysis) => {
        set(state => {
          // Remove existing entry for same stock if present
          const filtered = state.recentAnalyses.filter(
            a => a.stockSymbol !== analysis.stockSymbol
          )
          // Add new entry at the beginning, keep max 10
          return {
            recentAnalyses: [analysis, ...filtered].slice(0, 10),
          }
        })
      },

      clearRecentAnalyses: () => {
        set({ recentAnalyses: [] })
      },

      // Actions - Loading
      setLoading: (key: LoadingKey, value: boolean) => {
        set(state => ({
          loading: { ...state.loading, [key]: value },
        }))
      },

      // Actions - Errors
      addError: (key: string, message: string) => {
        set(state => ({
          errors: [
            ...state.errors.filter(e => e.key !== key),
            { key, message, timestamp: Date.now() },
          ],
        }))
      },

      clearError: (key: string) => {
        set(state => ({
          errors: state.errors.filter(e => e.key !== key),
        }))
      },

      clearAllErrors: () => {
        set({ errors: [] })
      },
    }),
    {
      name: 'stockfox-storage',
      partialize: state => ({
        currentProfileId: state.currentProfileId,
        analysisMode: state.analysisMode,
        demoMode: state.demoMode,
        watchlist: state.watchlist,
        favorites: state.favorites,
        recentAnalyses: state.recentAnalyses,
      }),
    }
  )
)

// Selector hooks for better performance
export const useCurrentProfile = () => useAppStore(state => state.currentProfile)
export const useAnalysisMode = () => useAppStore(state => state.analysisMode)
export const useDemoMode = () => useAppStore(state => state.demoMode)
export const useWatchlist = () => useAppStore(state => state.watchlist)
export const useFavorites = () => useAppStore(state => state.favorites)
export const useRecentAnalyses = () => useAppStore(state => state.recentAnalyses)
export const useLoading = (key: LoadingKey) => useAppStore(state => state.loading[key])
export const useErrors = () => useAppStore(state => state.errors)
