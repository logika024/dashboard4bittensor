"use client"

import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { PortfolioBalanceHistory } from "@/lib/taoswap/types"
import { cn } from "@/lib/utils"

export type HistoryPeriod = 7 | 30 | 365
export type HistoryCurrency = "tao" | "usd"

const PERIODS: { label: string; days: HistoryPeriod }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "1y", days: 365 },
]

const SERIES = [
  { key: "total", label: "Total", color: "#f59e0b", fill: "rgba(245, 158, 11, 0.2)" },
  { key: "free", label: "Free", color: "#3b82f6", fill: "rgba(59, 130, 246, 0.15)" },
  {
    key: "staked",
    label: "Staked τ",
    color: "#22c55e",
    fill: "rgba(34, 197, 94, 0.12)",
  },
  {
    key: "alpha",
    label: "Alpha in τ",
    color: "#eab308",
    fill: "rgba(234, 179, 8, 0.12)",
  },
] as const

type SeriesKey = (typeof SERIES)[number]["key"]

interface ChartPoint {
  date: string
  label: string
  total: number
  free: number
  staked: number
  alpha: number
}

function formatAxisValue(value: number, currency: HistoryCurrency): string {
  if (currency === "usd") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
    return `$${value.toFixed(2)}`
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toFixed(2)
}

function formatTooltipValue(value: number, currency: HistoryCurrency): string {
  if (currency === "usd") {
    return value.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    })
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} τ`
}

function formatXLabel(dateIso: string, index: number, total: number): string {
  const d = new Date(`${dateIso}T00:00:00`)
  if (index === 0) {
    return d.toLocaleDateString(undefined, { month: "short" })
  }
  const showEvery = total > 20 ? 5 : total > 10 ? 3 : 1
  if (index % showEvery !== 0 && index !== total - 1) return ""
  return String(d.getDate())
}

interface BalanceHistoryChartProps {
  history: PortfolioBalanceHistory | null
  loading: boolean
  error: string | null
  period: HistoryPeriod
  onPeriodChange: (days: HistoryPeriod) => void
}

export function BalanceHistoryChart({
  history,
  loading,
  error,
  period,
  onPeriodChange,
}: BalanceHistoryChartProps) {
  const [currency, setCurrency] = useState<HistoryCurrency>("tao")
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set())

  const chartData = useMemo((): ChartPoint[] => {
    if (!history?.results.length) return []
    return history.results.map((row) => {
      const tao = currency === "tao"
      return {
        date: row.date,
        label: row.date,
        total: tao ? row.totalTao : row.totalUsd,
        free: tao ? row.freeTao : row.freeUsd,
        staked: tao ? row.stakedTao : row.stakedTaoUsd,
        alpha: tao ? row.stakedAlphaInTao : row.stakedAlphaUsd,
      }
    })
  }, [history, currency])

  const toggleSeries = (key: SeriesKey) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-medium">Balance history</h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setCurrency("tao")}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium",
                currency === "tao"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              τ
            </button>
            <button
              type="button"
              onClick={() => setCurrency("usd")}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium",
                currency === "usd"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              $
            </button>
          </div>
          <div className="flex rounded-md border p-0.5">
            {PERIODS.map(({ label, days }) => (
              <button
                key={days}
                type="button"
                onClick={() => onPeriodChange(days)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium",
                  period === days
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {history?.rank && (
        <p className="text-sm text-muted-foreground">
          Rank #{history.rank.rank} of{" "}
          {history.rank.total_accounts.toLocaleString()} (as of{" "}
          {history.rank.as_of})
        </p>
      )}

      {loading && (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          Loading chart…
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && history && !history.accountKnown && (
        <p className="text-sm text-muted-foreground">
          Account not yet indexed by Taoswap.
        </p>
      )}

      {!loading && !error && chartData.length === 0 && history?.accountKnown && (
        <p className="text-sm text-muted-foreground">
          No daily balance history for this period.
        </p>
      )}

      {!loading && !error && chartData.length > 0 && (
        <>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(value, index) =>
                    formatXLabel(value, index, chartData.length)
                  }
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v) => formatAxisValue(Number(v), currency)}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label) =>
                    new Date(`${label}T00:00:00`).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" },
                    )
                  }
                  formatter={(value, name) => {
                    const series = SERIES.find((s) => s.key === name)
                    return [
                      formatTooltipValue(Number(value), currency),
                      series?.label ?? name,
                    ]
                  }}
                />
                {SERIES.map((s) =>
                  hidden.has(s.key) ? null : (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.key}
                      stroke={s.color}
                      fill={s.fill}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ),
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-3">
            {SERIES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSeries(s.key)}
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  hidden.has(s.key) && "opacity-40",
                )}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
