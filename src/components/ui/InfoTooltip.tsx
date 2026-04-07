/**
 * InfoTooltip — ⓘ icon that shows an explanation popover on tap/click.
 *
 * Uses a portal to render the popover at document.body level,
 * avoiding overflow:hidden clipping from parent containers.
 *
 * Mobile-first: no hover dependency. Tap to open, tap elsewhere to dismiss.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  /** Explanation text shown in the popover */
  content: string
  /** Icon size */
  size?: 'sm' | 'md'
  /** Preferred position (auto-adjusts if near viewport edge) */
  position?: 'top' | 'bottom' | 'left'
  /** Additional className for the icon button */
  className?: string
}

export function InfoTooltip({
  content,
  size = 'sm',
  position = 'top',
  className,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Calculate position relative to viewport
  const updatePosition = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const popoverWidth = 300
    const popoverHeight = 120 // estimate

    // Default: above the button, right-aligned
    let top = rect.top - popoverHeight - 8
    let left = rect.right - popoverWidth

    // If would go above viewport, show below
    if (top < 8) {
      top = rect.bottom + 8
    }

    // If would go off left edge, align to left of button
    if (left < 8) {
      left = rect.left
    }

    // If would go off right edge
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8
    }

    setCoords({ top, left })
  }, [])

  // Update position when opening
  useEffect(() => {
    if (open) updatePosition()
  }, [open, updatePosition])

  // Dismiss on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Dismiss on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Dismiss on scroll
  useEffect(() => {
    if (!open) return
    const handleScroll = () => setOpen(false)
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [open])

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className={cn(
          'inline-flex items-center justify-center flex-shrink-0',
          'rounded-full transition-colors',
          open ? 'text-primary-400' : 'text-neutral-600 hover:text-neutral-400',
          className,
        )}
        aria-label="More info"
        aria-expanded={open}
      >
        <Info className={iconSize} />
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          role="tooltip"
          className="fixed z-[9999] px-3.5 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-[12px] leading-relaxed text-neutral-200 shadow-2xl"
          style={{
            top: coords.top,
            left: coords.left,
            maxWidth: 320,
            minWidth: 200,
          }}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  )
}
