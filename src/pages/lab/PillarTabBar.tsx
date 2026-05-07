import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, Brain, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreBandV2 } from '@/lib/scoring'
import type { StockVerdictV2, VerdictPillar } from '@/types'

const PILLAR_META: Record<VerdictPillar, { icon: typeof BarChart3; label: string; color: string }> = {
  quant: { icon: BarChart3, label: 'Quant', color: 'text-primary-400' },
  qual:  { icon: Brain,     label: 'Qual',  color: 'text-purple-400' },
  risk:  { icon: Shield,    label: 'Risk',  color: 'text-amber-400' },
}

const TAB_ORDER: VerdictPillar[] = ['quant', 'qual', 'risk']

interface PillarTabBarProps {
  verdict: StockVerdictV2
  activeTab: VerdictPillar
  onTabChange: (pillar: VerdictPillar) => void
  layoutId: string
}

export function PillarTabBar({ verdict, activeTab, onTabChange, layoutId }: PillarTabBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-dark-900/90 backdrop-blur-xl border-b border-white/5">
      <div className="flex">
        {TAB_ORDER.map(pillarKey => {
          const pillar = verdict.pillars.find(p => p.pillar === pillarKey)
          if (!pillar) return null
          const meta = PILLAR_META[pillarKey]
          const Icon = meta.icon
          const band = getScoreBandV2(pillar.score)
          const isActive = activeTab === pillarKey

          return (
            <button
              key={pillarKey}
              onClick={() => onTabChange(pillarKey)}
              className={cn(
                'flex-1 relative py-3 px-2 flex flex-col items-center gap-1 transition-colors',
                isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={cn('w-4 h-4', isActive ? meta.color : 'text-neutral-500')} />
                <span className="text-xs font-semibold">{meta.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn('text-lg font-bold', isActive ? band.colorClass : 'text-neutral-500')}>
                  {Math.round(pillar.score)}
                </span>
                <span className={cn(
                  'text-[9px] font-semibold px-1.5 py-0.5 rounded',
                  isActive ? `${band.bgClass} ${band.colorClass}` : 'bg-dark-700 text-neutral-500'
                )}>
                  {band.shortLabel}
                </span>
              </div>
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { TAB_ORDER }

interface TabContentWrapperProps {
  activeTab: VerdictPillar
  direction: number
  children: React.ReactNode
}

export function TabContentWrapper({ activeTab, direction, children }: TabContentWrapperProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={activeTab}
        custom={direction}
        initial={{ opacity: 0, x: direction * 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction * -60 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="pt-4 space-y-2"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function useTabDirection() {
  const prevIdx = useRef(0)

  function getDirection(activeTab: VerdictPillar) {
    const idx = TAB_ORDER.indexOf(activeTab)
    const dir = idx >= prevIdx.current ? 1 : -1
    return dir
  }

  function updatePrev(activeTab: VerdictPillar) {
    prevIdx.current = TAB_ORDER.indexOf(activeTab)
  }

  return { getDirection, updatePrev }
}
