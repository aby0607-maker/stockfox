import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { getVerdictV2 } from '@/data/verdictsV2'
import { getProfileById } from '@/data/profiles'
import { OverallVerdictCard } from '@/components/scoring'
import { cn } from '@/lib/utils'
import { VariantA_FocusMode } from './VariantA_FocusMode'
import { VariantB_DeltaSort } from './VariantB_DeltaSort'
import { VariantC_HorizontalTabs } from './VariantC_HorizontalTabs'

type Variant = 'A' | 'B' | 'C'

const DEMO_STOCKS = [
  { id: 'zomato', label: 'Eternal', ticker: 'ZOMATO' },
  { id: 'axisbank', label: 'Axis Bank', ticker: 'AXISBANK' },
  { id: 'tcs', label: 'TCS', ticker: 'TCS' },
] as const

const VARIANTS: { key: Variant; label: string; description: string }[] = [
  { key: 'A', label: 'Focus Mode', description: 'Choose which segments to see' },
  { key: 'B', label: 'Delta Sort', description: 'Sort by biggest changes' },
  { key: 'C', label: 'Horiz. Tabs', description: 'One pillar at a time' },
]

export function Lab() {
  const { currentProfile } = useAppStore()
  const profileId = currentProfile?.id || 'kavya'
  const profile = getProfileById(profileId)

  const [selectedStock, setSelectedStock] = useState<string>('zomato')
  const [selectedVariant, setSelectedVariant] = useState<Variant>('C')

  const verdict = getVerdictV2(selectedStock, profileId)

  if (!verdict) {
    return (
      <div className="p-6 text-center text-neutral-400">
        No verdict data available for this stock/profile combination.
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-dark-900/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary-400" />
            <h1 className="text-base font-semibold text-white">Scorecard Lab</h1>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 font-medium">
            EXPERIMENTAL
          </span>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stock Picker */}
        <div className="flex gap-2">
          {DEMO_STOCKS.map(stock => (
            <button
              key={stock.id}
              onClick={() => setSelectedStock(stock.id)}
              className={cn(
                'flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all border',
                selectedStock === stock.id
                  ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                  : 'bg-dark-800 border-white/5 text-neutral-400 hover:text-white hover:border-white/10'
              )}
            >
              {stock.label}
            </button>
          ))}
        </div>

        {/* Profile indicator */}
        {profile && (
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <span>{profile.avatar}</span>
            <span>Viewing as <span className="text-neutral-300 font-medium">{profile.displayName}</span></span>
          </div>
        )}

        {/* L1 Hero — shared across all variants */}
        <OverallVerdictCard verdict={verdict} profileName={profile?.displayName} />

        {/* Variant Picker */}
        <div className="flex gap-1 p-1 rounded-xl bg-dark-800 border border-white/5">
          {VARIANTS.map(v => (
            <button
              key={v.key}
              onClick={() => setSelectedVariant(v.key)}
              className={cn(
                'flex-1 relative py-2 px-2 rounded-lg text-center transition-colors',
                selectedVariant === v.key
                  ? 'text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              {selectedVariant === v.key && (
                <motion.div
                  layoutId="variant-bg"
                  className="absolute inset-0 bg-dark-700 rounded-lg border border-white/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <div className="text-xs font-semibold">{v.key}: {v.label}</div>
                <div className="text-[9px] text-neutral-500 mt-0.5">{v.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Variant Content */}
        <div className="mt-2">
          {selectedVariant === 'C' && (
            <VariantC_HorizontalTabs verdict={verdict} />
          )}
          {selectedVariant === 'A' && (
            <VariantA_FocusMode verdict={verdict} profileId={profileId} />
          )}
          {selectedVariant === 'B' && (
            <VariantB_DeltaSort verdict={verdict} stockId={selectedStock} profileId={profileId} />
          )}
        </div>
      </div>
    </div>
  )
}
