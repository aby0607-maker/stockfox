/**
 * PriceChart — TradingView Lightweight Charts wrapper for stock price display.
 *
 * Uses lightweight-charts by TradingView (same engine as TradingView embeds).
 * Renders an area chart with crosshair, tooltips, and responsive sizing.
 * Dark theme matches StockFox design system.
 */

import { useEffect, useRef, useState } from 'react'
import { createChart, type IChartApi, type ISeriesApi, ColorType, AreaSeries } from 'lightweight-charts'
import { cn } from '@/lib/utils'

interface PriceChartProps {
  data: { time: string; value: number }[]  // YYYY-MM-DD format
  height?: number
  className?: string
}

const TIMEFRAMES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 1095 },
  { label: '5Y', days: 1825 },
]

export function PriceChart({ data, height = 300, className }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const [activeTimeframe, setActiveTimeframe] = useState('1Y')

  // Filter data by timeframe
  const filteredData = (() => {
    const tf = TIMEFRAMES.find(t => t.label === activeTimeframe)
    if (!tf || data.length === 0) return data
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - tf.days)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return data.filter(d => d.time >= cutoffStr)
  })()

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(139, 92, 246, 0.3)', width: 1, style: 2 },
        horzLine: { color: 'rgba(139, 92, 246, 0.3)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    })

    const series = chart.addSeries(AreaSeries, {
      topColor: 'rgba(139, 92, 246, 0.3)',
      bottomColor: 'rgba(139, 92, 246, 0.02)',
      lineColor: '#8b5cf6',
      lineWidth: 2,
    })

    chartRef.current = chart
    seriesRef.current = series

    // Responsive resize
    const resizeObserver = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      chart.applyOptions({ width })
    })
    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [height])

  // Update data when timeframe changes
  useEffect(() => {
    if (seriesRef.current && filteredData.length > 0) {
      seriesRef.current.setData(filteredData as any)
      chartRef.current?.timeScale().fitContent()
    }
  }, [filteredData])

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48 text-neutral-500 text-sm', className)}>
        Price chart data not available
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Timeframe buttons */}
      <div className="flex gap-1 mb-3">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.label}
            onClick={() => setActiveTimeframe(tf.label)}
            className={cn(
              'px-2.5 py-1 rounded text-[10px] font-medium transition-colors',
              activeTimeframe === tf.label
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5',
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
    </div>
  )
}
