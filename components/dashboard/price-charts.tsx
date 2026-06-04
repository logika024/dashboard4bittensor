"use client"

import { useEffect, useRef, useState } from "react"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  PRICE_RANGES,
  type CoinKey,
  type PricePoint,
  type PriceRange,
  type PriceSummary,
} from "@/lib/coingecko/price"
import { cn } from "@/lib/utils"

interface PriceChartsProps {
  /** Initial range data fetched server-side, so first paint is instant. */
  initialTao: PriceSummary | null
  initialBtc: PriceSummary | null
  initialTaoError: string | null
  initialBtcError: string | null
  initialRange: PriceRange
}

export function PriceCharts({
  initialTao,
  initialBtc,
  initialTaoError,
  initialBtcError,
  initialRange,
}: PriceChartsProps) {
  const [range, setRange] = useQueryState(
    "range",
    parseAsStringLiteral(["24h", "7d", "30d", "90d", "1y"] as const).withDefault(
      initialRange,
    ),
  )
  const [tao, setTao] = useState<PriceSummary | null>(initialTao)
  const [btc, setBtc] = useState<PriceSummary | null>(initialBtc)
  const [taoError, setTaoError] = useState<string | null>(initialTaoError)
  const [btcError, setBtcError] = useState<string | null>(initialBtcError)
  const [loading, setLoading] = useState(false)
  // Skip the first effect run — initial data is already populated from props.
  const isInitial = useRef(true)

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchPrice("tao", range),
      fetchPrice("btc", range),
    ])
      .then(([taoResult, btcResult]) => {
        if (cancelled) return
        if (taoResult.ok) {
          setTao(taoResult.data)
          setTaoError(null)
        } else {
          setTaoError(taoResult.error)
        }
        if (btcResult.ok) {
          setBtc(btcResult.data)
          setBtcError(null)
        } else {
          setBtcError(btcResult.error)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range])

  return (
    <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-500">
      <RangeTabs
        value={range}
        onChange={(next) => {
          void setRange(next)
        }}
        loading={loading}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PriceCard
          label="TAO"
          symbol="τ"
          data={tao}
          error={taoError}
          range={range}
          loading={loading}
        />
        <PriceCard
          label="BTC"
          symbol="₿"
          data={btc}
          error={btcError}
          range={range}
          loading={loading}
        />
      </div>
    </div>
  )
}

interface FetchOk {
  ok: true
  data: PriceSummary
}
interface FetchErr {
  ok: false
  error: string
}

async function fetchPrice(
  coin: CoinKey,
  range: PriceRange,
): Promise<FetchOk | FetchErr> {
  try {
    const res = await fetch(`/api/prices/${coin}?range=${range}`)
    const json = await res.json()
    if (!res.ok) {
      return { ok: false, error: json.error ?? `Request failed (${res.status})` }
    }
    return { ok: true, data: json as PriceSummary }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    }
  }
}

interface RangeTabsProps {
  value: PriceRange
  onChange: (next: PriceRange) => void
  loading: boolean
}

function RangeTabs({ value, onChange, loading }: RangeTabsProps) {
  return (
    <div className="flex items-center gap-1 self-start rounded-lg border border-border bg-card p-1">
      {PRICE_RANGES.map((r) => (
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
      {loading && (
        <Spinner
          label="Updating charts"
          className="ml-1 size-3 text-muted-foreground"
        />
      )}
    </div>
  )
}

interface PriceCardProps {
  label: string
  symbol: string
  data: PriceSummary | null
  error: string | null
  range: PriceRange
  loading: boolean
}

function PriceCard({
  label,
  symbol,
  data,
  error,
  range,
  loading,
}: PriceCardProps) {
  const positive = (data?.changePct ?? 0) >= 0
  const accent = positive ? "#00dbbc" : "#f87171" // positive / red-400
  const gradientId = `price-grad-${label.toLowerCase()}`

  return (
    <Card
      className={cn(
        "gap-4 px-5 py-5 transition-opacity duration-200",
        loading && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            <span className="font-mono text-base text-foreground/80">
              {symbol}
            </span>
            {label}/USD
          </p>
          {data ? (
            <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
              {formatUsd(data.current)}
            </p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-2xl text-muted-foreground">—</p>
          )}
        </div>
        {data && (
          <div className="text-right">
            <p
              className={cn(
                "text-sm font-medium tabular-nums",
                positive ? "text-positive" : "text-red-400",
              )}
            >
              {formatPctSigned(data.changePct)}
            </p>
            <p className="text-xs text-muted-foreground">{range}</p>
          </div>
        )}
      </div>

      {data && data.history.length > 1 ? (
        <div className="-mx-3 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.history}
              margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              {/* Tight Y domain keeps small wiggles visible. */}
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ms: number) => formatTick(ms, range)}
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
                stroke="currentColor"
              />
              <Tooltip
                content={<PriceTooltip />}
                cursor={{
                  stroke: "currentColor",
                  strokeOpacity: 0.25,
                  strokeDasharray: "3 3",
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={accent}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                activeDot={{ r: 3, fill: accent, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-32" />
      )}
    </Card>
  )
}

/**
 * Recharts 3.x removed the `TooltipProps` shape we used to import — declare
 * our own minimal type for just the fields the tooltip actually reads, so
 * we're not coupled to Recharts internal type shifts.
 */
interface PriceTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: PricePoint }>
}

function PriceTooltip({ active, payload }: PriceTooltipProps) {
  if (!active || !payload?.[0]) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium tabular-nums text-foreground">
        {formatUsd(point.price)}
      </p>
      <p className="text-muted-foreground">
        {new Date(point.timestamp).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  )
}

function formatUsd(value: number): string {
  const decimals = value >= 1000 ? 2 : value >= 1 ? 2 : 6
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatPctSigned(fraction: number): string {
  const sign = fraction >= 0 ? "+" : ""
  return `${sign}${(fraction * 100).toFixed(2)}%`
}

/**
 * X-axis tick formatter.
 *
 * Timezone contract: this runs only client-side (parent is `"use client"`,
 * Recharts defers tick rendering until ResponsiveContainer has measured DOM
 * dimensions). With no `timeZone` option set, Intl.DateTimeFormat resolves
 * to the browser's local zone — exactly what we want.
 *
 * The `"en-US"` argument only fixes the *locale* (AM/PM, English month/day
 * names) so tick labels are consistent across user locales; it does NOT
 * affect timezone.
 */
function formatTick(ms: number, range: PriceRange): string {
  const d = new Date(ms)
  switch (range) {
    case "24h":
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      })
    case "7d":
      return d.toLocaleDateString("en-US", { weekday: "short" })
    case "30d":
    case "90d":
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    case "1y":
      return d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      })
  }
}
