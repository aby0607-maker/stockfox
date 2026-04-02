import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, TrendingUp, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { searchCompanies } from '@/services/cmots'
import type { CMOTSCompany } from '@/types'

// Demo stocks shown when search is empty
const DEMO_STOCKS = [
  { symbol: 'ZOMATO', name: 'Eternal (Zomato)', sector: 'Food Tech' },
  { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT Services' },
]

export function SearchDialog() {
  const { isSearchOpen, toggleSearch } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CMOTSCompany[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Focus input when dialog opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isSearchOpen])

  // Keyboard shortcut: Cmd/Ctrl+K to toggle search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleSearch()
      }
      if (e.key === 'Escape' && isSearchOpen) {
        toggleSearch()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen, toggleSearch])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const companies = await searchCompanies(q)
      setResults(companies)
      setSelectedIndex(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  function navigateToStock(symbol: string) {
    toggleSearch()
    navigate(`/stock/${symbol.toLowerCase()}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const maxIndex = results.length > 0 ? results.length - 1 : DEMO_STOCKS.length - 1
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, maxIndex))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results.length > 0) {
        const company = results[selectedIndex]
        navigateToStock(company.nsesymbol || company.bsecode)
      } else if (query.length < 2) {
        navigateToStock(DEMO_STOCKS[selectedIndex].symbol)
      }
    }
  }

  if (!isSearchOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={toggleSearch}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="max-w-xl mx-auto mt-[15vh] bg-dark-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <Search className="w-5 h-5 text-neutral-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search 5,000+ BSE stocks..."
              className="flex-1 bg-transparent text-white placeholder-neutral-500 outline-none text-sm"
            />
            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-block text-[10px] text-neutral-500 bg-dark-700 px-1.5 py-0.5 rounded border border-white/10">ESC</kbd>
              <button onClick={toggleSearch} className="p-1 text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-neutral-500 text-sm">
                No stocks found for "{query}"
              </div>
            )}

            {!loading && results.length > 0 && (
              <ul className="py-1">
                {results.map((company, i) => (
                  <li key={company.co_code}>
                    <button
                      onClick={() => navigateToStock(company.nsesymbol || company.bsecode)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === selectedIndex ? 'bg-primary-500/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {company.nsesymbol || company.bsecode}
                          </span>
                          <span className="text-[10px] text-neutral-500 px-1.5 py-0.5 rounded bg-dark-700">
                            {company.mcaptype || 'Equity'}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 truncate">
                          {company.companyname}
                          {company.sectorname && (
                            <span className="text-neutral-600"> · {company.sectorname}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Demo stocks when empty */}
            {!loading && query.length < 2 && (
              <div className="py-2">
                <div className="px-4 py-1.5 text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">
                  Demo Stocks
                </div>
                {DEMO_STOCKS.map((stock, i) => (
                  <button
                    key={stock.symbol}
                    onClick={() => navigateToStock(stock.symbol)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === selectedIndex ? 'bg-primary-500/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-white">{stock.symbol}</span>
                      <span className="text-xs text-neutral-400 ml-2">{stock.name}</span>
                    </div>
                    <span className="text-[10px] text-neutral-600">{stock.sector}</span>
                  </button>
                ))}
                <div className="px-4 py-2 text-[10px] text-neutral-600">
                  Type 2+ characters to search all BSE stocks · <kbd className="bg-dark-700 px-1 py-0.5 rounded border border-white/10">⌘K</kbd>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
