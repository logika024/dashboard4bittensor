"use client"

import { useEffect, useRef } from "react"
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type UTCTimestamp,
} from "lightweight-charts"
import type { SubnetPriceBar } from "@/lib/taoswap/price-history"

const CHART_COLORS = {
  background: "transparent",
  text: "#a1a1aa",
  grid: "rgba(161, 161, 170, 0.08)",
  border: "rgba(161, 161, 170, 0.2)",
  up: "#00dbbc",
  down: "#f87171",
}

interface AlphaPriceChartProps {
  bars: SubnetPriceBar[]
  height?: number
}

export function AlphaPriceChart({ bars, height = 480 }: AlphaPriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || bars.length === 0) return

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    })

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderUpColor: CHART_COLORS.up,
      borderDownColor: CHART_COLORS.down,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
    })

    candles.setData(
      bars.map((b) => ({
        time: b.time as UTCTimestamp,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    )

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    })
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    volume.setData(
      bars.map((b) => ({
        time: b.time as UTCTimestamp,
        value: b.volume,
        color:
          b.close >= b.open
            ? "rgba(0, 219, 188, 0.35)"
            : "rgba(248, 113, 113, 0.35)",
      })),
    )

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth })
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [bars, height])

  if (bars.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No price history for this range.
      </div>
    )
  }

  return <div ref={containerRef} className="w-full" style={{ height }} />
}
