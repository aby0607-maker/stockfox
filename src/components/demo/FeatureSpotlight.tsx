import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lightbulb, Target, TrendingUp, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeatureSpotlight as FeatureSpotlightType, ProductPrinciple } from '@/data/featureSpotlights'
import { principleInfo } from '@/data/featureSpotlights'

interface FeatureSpotlightProps {
  spotlight: FeatureSpotlightType
  onDismiss: () => void
  onNext?: () => void
  onPrev?: () => void
  currentIndex?: number
  totalCount?: number
  position?: 'top' | 'bottom' | 'left' | 'right'
}

// Principle badges component - supports multiple
function PrincipleBadges({ principles }: { principles: ProductPrinciple[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {principles.map((principle) => {
        const info = principleInfo[principle]
        return (
          <div
            key={principle}
            className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', info.bgColor, info.color)}
          >
            <span className="font-bold">{info.emoji}</span>
            <span>{info.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function FeatureSpotlight({
  spotlight,
  onDismiss,
  onNext,
  onPrev,
  currentIndex = 0,
  totalCount = 1,
  position = 'bottom',
}: FeatureSpotlightProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Position styles
  const positionStyles = {
    top: 'bottom-full mb-3',
    bottom: 'top-full mt-3',
    left: 'right-full mr-3',
    right: 'left-full ml-3',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'absolute z-[100] w-80 max-w-[calc(100vw-2rem)]',
        positionStyles[position]
      )}
    >
      {/* Spotlight Card */}
      <div className="bg-dark-800 rounded-2xl border border-primary-500/30 shadow-xl shadow-primary-500/10 overflow-hidden">
        {/* Header with Feature Name & Principle Badge */}
        <div className="p-4 bg-gradient-to-r from-primary-500/10 to-purple-500/10 border-b border-white/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-primary-400" />
                <span className="text-xs text-primary-400 font-medium uppercase tracking-wider">Feature Spotlight</span>
              </div>
              <h4 className="font-semibold text-white text-base leading-tight">{spotlight.featureName}</h4>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Principle Badges */}
          <div className="mt-3">
            <PrincipleBadges principles={spotlight.principles} />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* JTBD - Job To Be Done */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="w-3.5 h-3.5 text-info-400" />
              <span className="text-[10px] font-semibold text-info-400 uppercase tracking-wider">Job To Be Done</span>
            </div>
            <p className="text-sm text-neutral-200 leading-relaxed">{spotlight.jtbd}</p>
          </div>

          {/* User Outcome */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-success-400" />
              <span className="text-[10px] font-semibold text-success-400 uppercase tracking-wider">You Get</span>
            </div>
            <p className="text-sm text-success-300 leading-relaxed font-medium">{spotlight.userOutcome}</p>
          </div>

          {/* Expandable: Competitive Advantage */}
          <div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between py-2 text-left group"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-warning-400" />
                <span className="text-[10px] font-semibold text-warning-400 uppercase tracking-wider">vs Competition</span>
              </div>
              <ChevronRight className={cn(
                'w-4 h-4 text-neutral-500 transition-transform',
                isExpanded && 'rotate-90'
              )} />
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs text-neutral-400 leading-relaxed pb-2 border-l-2 border-warning-500/30 pl-3">
                    {spotlight.competitiveAdvantage}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Footer */}
        {totalCount > 1 && (
          <div className="px-4 py-3 bg-dark-700/50 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={onPrev}
              disabled={currentIndex === 0}
              className={cn(
                'flex items-center gap-1 text-xs font-medium transition-colors',
                currentIndex === 0 ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-400 hover:text-white'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>

            {/* Progress indicator */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalCount, 5) }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    i === currentIndex % 5 ? 'bg-primary-400' : 'bg-dark-600'
                  )}
                />
              ))}
              {totalCount > 5 && (
                <span className="text-[10px] text-neutral-500 ml-1">+{totalCount - 5}</span>
              )}
            </div>

            <button
              onClick={onNext}
              disabled={currentIndex === totalCount - 1}
              className={cn(
                'flex items-center gap-1 text-xs font-medium transition-colors',
                currentIndex === totalCount - 1 ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-400 hover:text-white'
              )}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Arrow pointer */}
      <div className={cn(
        'absolute w-3 h-3 bg-dark-800 border-primary-500/30 transform rotate-45',
        position === 'bottom' && 'left-8 -top-1.5 border-l border-t',
        position === 'top' && 'left-8 -bottom-1.5 border-r border-b',
        position === 'right' && 'top-8 -left-1.5 border-l border-b',
        position === 'left' && 'top-8 -right-1.5 border-r border-t',
      )} />
    </motion.div>
  )
}

// Demo Mode Toggle Component
interface DemoModeToggleProps {
  isEnabled: boolean
  onToggle: () => void
}

export function DemoModeToggle({ isEnabled, onToggle }: DemoModeToggleProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
        isEnabled
          ? 'bg-gradient-to-r from-primary-500/20 to-purple-500/20 border-primary-500/40 text-primary-300'
          : 'bg-dark-700/50 border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
      )}
    >
      <Lightbulb className={cn('w-3.5 h-3.5', isEnabled && 'text-primary-400')} />
      <span>{isEnabled ? 'Demo Mode ON' : 'Demo Mode'}</span>
      <div className={cn(
        'w-8 h-4 rounded-full relative transition-colors',
        isEnabled ? 'bg-primary-500' : 'bg-dark-600'
      )}>
        <motion.div
          animate={{ x: isEnabled ? 16 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow"
        />
      </div>
    </motion.button>
  )
}

// Spotlight Manager - manages which spotlight is active
interface SpotlightManagerProps {
  spotlights: FeatureSpotlightType[]
  isEnabled: boolean
  onClose: () => void
}

export function SpotlightManager({ spotlights, isEnabled, onClose }: SpotlightManagerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!isEnabled || spotlights.length === 0) return null

  const currentSpotlight = spotlights[currentIndex]

  const handleNext = () => {
    if (currentIndex < spotlights.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  return (
    <AnimatePresence>
      <FeatureSpotlight
        spotlight={currentSpotlight}
        onDismiss={onClose}
        onNext={handleNext}
        onPrev={handlePrev}
        currentIndex={currentIndex}
        totalCount={spotlights.length}
      />
    </AnimatePresence>
  )
}
