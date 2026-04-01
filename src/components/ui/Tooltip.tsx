import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  className?: string
  /** Position relative to trigger */
  position?: 'top' | 'bottom'
  /** Max width in px */
  maxWidth?: number
}

export function Tooltip({
  content,
  children,
  className,
  position = 'top',
  maxWidth = 260,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(true), 300)
  }, [])

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }, [])

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'absolute z-50 px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed',
            'bg-dark-900 border border-white/10 text-neutral-300 shadow-lg',
            'pointer-events-none whitespace-normal',
            position === 'top' && 'bottom-full mb-1.5 left-1/2 -translate-x-1/2',
            position === 'bottom' && 'top-full mt-1.5 left-1/2 -translate-x-1/2',
          )}
          style={{ maxWidth }}
        >
          {content}
        </span>
      )}
    </span>
  )
}
