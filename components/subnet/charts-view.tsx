"use client"

import { useEffect, useRef, useState } from "react"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { Card } from "@/components/ui/card"
import { AlphaPriceChart } from "@/components/subnet/alpha-price-chart"
import {
  ALPHA_CHART_RANGES,
  type AlphaChartRange,
  type SubnetPriceHistory,
} from "@/lib/taoswap/price-history"
import { cn } from "@/lib/utils"

interface ChartsViewProps {
  netuid: number
  subnetName: string | null
  initialHistory: SubnetPriceHistory
  initialRange: AlphaChartRange
  loadError?: string | null
}

interface FetchOk {
  ok: true
  data: SubnetPriceHistory
}
interface FetchErr {
  ok: false
  error: string
}

async function fetchHistory(
  netuid: number,
  range: AlphaChartRange,
): Promise<FetchOk | FetchErr> {
  try {
    const res = await fetch(`/api/subnet/${netuid}/price-history?range=${range}`)
    const json = await res.json()
    if (!res.ok) {
      return { ok: false, error: json.error ?? `Request failed (${res.status})` }
    }
    return { ok: true, data: json as SubnetPriceHistory }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    }
  }
}

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function ChartsView({
  netuid,
  subnetName,
  initialHistory,
  initialRange,
  loadError,
}: ChartsViewProps) {
  const [range, setRange] = useQueryState(
    "range",
    parseAsStringLiteral(ALPHA_CHART_RANGES).withDefault(initialRange),
  )
  const [history, setHistory] = useState(initialHistory)
  const [error, setError] = useState<string | null>(loadError ?? null)
  const [loading, setLoading] = useState(false)
  const isInitial = useRef(true)

  useEffect(() => {
    setHistory(initialHistory)
    setError(loadError ?? null)
    isInitial.current = true
  }, [netuid, initialHistory, loadError])

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false
      return
    }
    let cancelled = false
    setLoading(true)
    fetchHistory(netuid, range)
      .then((result) => {
        if (cancelled) return
        if (result.ok) {
          setHistory(result.data)
          setError(null)
        } else {
          setError(result.error)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [netuid, range])

  const positive = (history.changePct ?? 0) >= 0
  const title = subnetName ?? `Subnet ${netuid}`

  return (
    <div className="mx-auto flex w-full max-w-425 flex-col gap-6 p-6 animate-in fade-in-0 duration-300">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Charts
          </h1>
          <p className="text-sm text-muted-foreground">
            SN{netuid} · {title} · alpha price in τ
          </p>
        </div>
        {history.latestPrice != null && (
          <div className="flex flex-col items-end gap-0.5">
            <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
              τ{history.latestPrice.toFixed(6)}
            </p>
            <p
              className={cn(
                "text-sm font-medium tabular-nums",
                positive ? "text-positive" : "text-red-400",
              )}
            >
              {formatPct(history.changePct)} · {range}
            </p>
          </div>
        )}
      </header>

      <RangeTabs
        value={range}
        onChange={(next) => {
          void setRange(next)
        }}
        loading={loading}
      />

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Card
        className={cn(
          "gap-0 overflow-hidden px-2 py-4 transition-opacity duration-200 sm:px-4",
          loading && "opacity-70",
        )}
      >
        <AlphaPriceChart bars={history.bars} height={520} />
      </Card>

      <p className="text-xs text-muted-foreground">
        OHLCV from taoswap · volume in τ traded per bar
      </p>
    </div>
  )
}

interface RangeTabsProps {
  value: AlphaChartRange
  onChange: (next: AlphaChartRange) => void
  loading: boolean
}

function RangeTabs({ value, onChange, loading }: RangeTabsProps) {
  return (
    <div
      aria-busy={loading}
      className="flex items-center gap-1 self-start rounded-lg border border-border bg-card p-1"
    >
      {ALPHA_CHART_RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          disabled={loading && r !== value}
          aria-pressed={r === value}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            r === value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
            loading && r !== value && "opacity-50",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  )
}
