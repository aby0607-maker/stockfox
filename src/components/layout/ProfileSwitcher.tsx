import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { activeProfiles } from '@/data/profiles'
import { cn } from '@/lib/utils'

export function ProfileSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const { currentProfile, setCurrentProfile } = useAppStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectProfile = (profileId: string) => {
    setCurrentProfile(profileId)
    setIsOpen(false)
  }

  if (!currentProfile) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          'hover:bg-white/5',
          isOpen && 'bg-white/5'
        )}
      >
        <span className="text-xl">{currentProfile.avatar}</span>
        <span className="text-sm font-medium text-white hidden sm:block">
          {currentProfile.displayName}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-neutral-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 bg-dark-800 rounded-xl shadow-2xl border border-white/10 py-2 z-50"
          >
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs text-neutral-500">Switch demo profile</p>
            </div>

            {activeProfiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => handleSelectProfile(profile.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 transition-colors',
                  'hover:bg-white/5',
                  currentProfile.id === profile.id && 'bg-primary-500/10'
                )}
              >
                <span className="text-2xl">{profile.avatar}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">
                    {profile.displayName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {profile.investmentThesis.charAt(0).toUpperCase() + profile.investmentThesis.slice(1)} Investor
                  </p>
                </div>
                {currentProfile.id === profile.id && (
                  <Check className="w-5 h-5 text-primary-400" />
                )}
              </button>
            ))}

            <div className="px-3 py-2 mt-2 border-t border-white/5">
              <p className="text-[11px] text-neutral-500">
                Switching profiles shows how the same stock gets different verdicts
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
