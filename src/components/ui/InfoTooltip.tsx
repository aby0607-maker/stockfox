/**
 * InfoTooltip — ⓘ icon that shows an explanation popover on tap/click.
 *
 * Mobile-first: no hover dependency. Tap to open, tap elsewhere to dismiss.
 * Used on Scorecard for contextual explanations of scores, verdicts, and pillars.
 */

import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  /** Explanation text shown in the popover */
  content: string
  /** Position relative to the ⓘ icon */
  position?: 'top' | 'bottom' | 'left'
  /** Icon size */
  size?: 'sm' | 'md'
  /** Additional className for the container */
  className?: string
}

export function InfoTooltip({
  content,
  position = 'top',
  size = 'sm',
  className,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  // Dismiss on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Dismiss on Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
      className={cn(
        'relative inline-flex items-center justify-center flex-shrink-0',
        'rounded-full transition-colors',
        open ? 'text-primary-400' : 'text-neutral-600 hover:text-neutral-400',
        className,
      )}
      aria-label="More info"
      aria-expanded={open}
    >
      <Info className={iconSize} />

      {open && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-2 rounded-lg',
            'bg-dark-900/95 backdrop-blur-sm border border-white/10',
            'text-[11px] leading-relaxed text-neutral-300 shadow-xl',
            'whitespace-normal',
            // Position
            position === 'top' && 'bottom-full mb-2 left-1/2 -translate-x-1/2',
            position === 'bottom' && 'top-full mt-2 left-1/2 -translate-x-1/2',
            position === 'left' && 'right-full mr-2 top-1/2 -translate-y-1/2',
          )}
          style={{ maxWidth: 280, minWidth: 180 }}
        >
          {content}
          {/* Arrow */}
          <div className={cn(
            'absolute w-2 h-2 bg-dark-900/95 border border-white/10 rotate-45',
            position === 'top' && 'top-full -mt-1 left-1/2 -translate-x-1/2 border-t-0 border-l-0',
            position === 'bottom' && 'bottom-full -mb-1 left-1/2 -translate-x-1/2 border-b-0 border-r-0',
            position === 'left' && 'left-full -ml-1 top-1/2 -translate-y-1/2 border-l-0 border-b-0',
          )} />
        </div>
      )}
    </button>
  )
}
