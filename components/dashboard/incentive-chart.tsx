"use client"

import { useMemo, useRef, useState, type MouseEvent } from "react"
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CopyableAddress } from "@/components/dashboard/copyable-address"
import type { MetagraphNeuron } from "@/lib/taoswap/subnets"

const COLOR_MINER = "#00dbbc" // positive accent
const COLOR_HIGHLIGHT = "#8b5cf6" // violet-500 — distinct from miner color

// Chart geometry — must match the <ScatterChart margin> prop and YAxis width.
const MARGIN_LEFT = 8
const MARGIN_RIGHT = 8
const YAXIS_WIDTH = 50

interface IncentiveDatum {
  rank: number
  uid: number
  incentive: number
  hotkey: string
  coldkey: string
  /** User-defined nickname for this coldkey, if one is saved. */
  coldkeyNickname: string | null
  alphaStake: number
  rootStake: number
  totalAlphaStake: number
  dailyRewardAlpha: number
  dailyRewardTao: number
  performance: number
  isOwner: boolean
  validator: boolean
  active: boolean
}

interface IncentiveChartProps {
  neurons: MetagraphNeuron[]
  /** `coldkey → nickname` lookup, fed from the signed-in user's DB rows. */
  nicknames?: Record<string, string>
}

export function IncentiveChart({
  neurons,
  nicknames = {},
}: IncentiveChartProps) {
  // Miners only — owner + validator entries are excluded from the chart
  // entirely. Rank 1..N is assigned among miners by incentive descending.
  const data: IncentiveDatum[] = useMemo(() => {
    const withMetrics = neurons
      .filter((n) => !n.isOwnerHotkey && !n.validatorPermit)
      .map((n) => {
        // Numeric fields from taoswap are already in TAO units (no rao scaling).
        const performance =
          n.totalAlphaStake > 0 ? n.dailyReward / n.totalAlphaStake : 0
        return {
          uid: n.uid,
          incentive: n.incentive,
          hotkey: n.hotkey,
          coldkey: n.coldkey,
          coldkeyNickname: nicknames[n.coldkey] ?? null,
          alphaStake: n.alphaStake,
          rootStake: n.rootStake,
          totalAlphaStake: n.totalAlphaStake,
          dailyRewardAlpha: n.dailyReward,
          dailyRewardTao: n.dailyTotalRewardsAsTao,
          performance,
          isOwner: n.isOwnerHotkey,
          validator: n.validatorPermit,
          active: n.active,
        }
      })
    const ranked = [...withMetrics]
      .sort((a, b) => b.incentive - a.incentive)
      .map((d, i) => ({ ...d, rank: i + 1 }))
    return ranked.sort((a, b) => a.rank - b.rank)
  }, [neurons, nicknames])

  const [highlightColdkey, setHighlightColdkey] = useState("")

  // If a coldkey filter is active, miners whose coldkey contains the filter
  // substring move into `highlighted` (rendered last so they sit on top).
  const groups = useMemo(() => {
    const miners: IncentiveDatum[] = []
    const highlighted: IncentiveDatum[] = []

    const needle = highlightColdkey.trim().toLowerCase()
    for (const d of data) {
      if (needle && d.coldkey.toLowerCase().includes(needle)) {
        highlighted.push(d)
      } else {
        miners.push(d)
      }
    }
    return { miners, highlighted }
  }, [data, highlightColdkey])

  const N = data.length
  const topNeuron = useMemo(
    () => data.find((d) => d.rank === 1) ?? data[0] ?? null,
    [data],
  )
  const [hovered, setHovered] = useState<IncentiveDatum | null>(null)
  // Separate flag controls just the crosshair visibility — we KEEP `hovered`
  // when the cursor leaves so the info bar sticks on the last hovered neuron
  // instead of snapping back to rank 1.
  const [cursorInside, setCursorInside] = useState(false)
  const display = hovered ?? topNeuron

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const byRank = useMemo(() => {
    const map = new Map<number, IncentiveDatum>()
    for (const d of data) map.set(d.rank, d)
    return map
  }, [data])

  // Translate cursor X → rank, look up the data point, update hover state.
  // The plot area starts at MARGIN_LEFT and ends at (width - YAxis - MARGIN_RIGHT).
  // X axis is reversed: rank N at left edge, rank 1 at right edge.
  const handleWrapperMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current || N === 0) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const plotLeft = MARGIN_LEFT
    const plotRight = rect.width - YAXIS_WIDTH - MARGIN_RIGHT
    if (x < plotLeft || x > plotRight) {
      // Outside the plot area horizontally — hide crosshair but keep hovered.
      setCursorInside(false)
      return
    }
    const plotWidth = Math.max(1, plotRight - plotLeft)
    const fraction = (x - plotLeft) / plotWidth // 0 (left) → 1 (right)
    // reversed axis: fraction 0 → rank N, fraction 1 → rank 1
    const rank = Math.round(N - fraction * (N - 1))
    const clamped = Math.max(1, Math.min(N, rank))
    const point = byRank.get(clamped) ?? null
    if (point) {
      setHovered(point)
      setCursorInside(true)
    }
  }

  if (neurons.length === 0 || !display) return null

  return (
    <Card className="gap-4 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-foreground/90 uppercase">
          Incentive Distribution
        </h2>
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="Highlight by coldkey…"
            value={highlightColdkey}
            onChange={(e) => setHighlightColdkey(e.target.value)}
            className="h-9 w-72"
          />
          {highlightColdkey.trim() && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {groups.highlighted.length} matching
            </span>
          )}
        </div>
      </div>

      <InfoBar datum={display} />

      <div
        ref={wrapperRef}
        className="h-72"
        onMouseMove={handleWrapperMouseMove}
        // Intentionally do NOT clear `hovered` on leave — the user wants the
        // info bar to keep showing the last hovered neuron's details. We
        // only flip cursorInside so the crosshair disappears.
        onMouseLeave={() => setCursorInside(false)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 8,
              right: MARGIN_RIGHT,
              left: MARGIN_LEFT,
              bottom: 4,
            }}
          >
            <CartesianGrid
              horizontal
              vertical={false}
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <XAxis
              type="number"
              dataKey="rank"
              domain={[1, N]}
              reversed
              tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              stroke="currentColor"
              allowDecimals={false}
            />
            <YAxis
              type="number"
              dataKey="incentive"
              orientation="right"
              tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(3)}
              width={YAXIS_WIDTH}
              domain={[0, "auto"]}
            />
            <ZAxis range={[24, 24]} />

            {/*
              Custom crosshair, controlled by hover state — renders only
              while the cursor is inside the plot area. The rank-pill label
              sits below the X axis, the Y-value pill sits in the right Y
              axis margin so neither overlaps the dot data.
            */}
            {cursorInside && hovered && (
              <ReferenceLine
                x={hovered.rank}
                stroke="#a1a1aa"
                strokeWidth={1}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
                label={renderRankLabel(hovered.rank)}
              />
            )}

            {cursorInside && hovered && (
              <ReferenceLine
                y={hovered.incentive}
                stroke="#a1a1aa"
                strokeWidth={1}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
                label={renderYValueLabel(hovered.incentive)}
              />
            )}

            <Scatter
              data={groups.miners}
              fill={COLOR_MINER}
              shape={VerticalBarDot}
              isAnimationActive={false}
            />
            {/* Rendered last so it sits on top of the miner color. */}
            <Scatter
              data={groups.highlighted}
              fill={COLOR_HIGHLIGHT}
              shape={VerticalBarDot}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <LegendDot color={COLOR_MINER} label="Miner" />
        {highlightColdkey.trim() && groups.highlighted.length > 0 && (
          <LegendDot color={COLOR_HIGHLIGHT} label="Highlighted" />
        )}
      </div>
    </Card>
  )
}

function VerticalBarDot(props: unknown) {
  const { cx, cy, fill } = props as { cx?: number; cy?: number; fill?: string }
  if (typeof cx !== "number" || typeof cy !== "number") return <g />
  const w = 5
  const h = 15
  return (
    <rect
      x={cx - w / 2}
      y={cy - h / 2}
      width={w}
      height={h}
      fill={fill}
      rx={2.5}
    />
  )
}

/**
 * Y-value pill — sits in the right Y-axis margin (outside the plot area),
 * so it never overlaps with the dots that spike near rank 1's high incentive.
 */
function renderYValueLabel(value: number) {
  return function YValueLabel(props: unknown) {
    const p = props as {
      viewBox?: { x: number; y: number; width: number; height: number }
    }
    const vb = p.viewBox
    if (!vb) return <g />
    // 3-decimal format matches the Y axis tick scale and keeps the pill narrow.
    const text = value.toFixed(3)
    const padX = 5
    const w = text.length * 6.5 + padX * 2
    const h = 16
    // Position OUTSIDE the plot area, in the Y-axis tick column on the right.
    const x = vb.x + vb.width + 2
    const y = vb.y - h / 2
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={3}
          fill="#27272a"
          stroke="#52525b"
          strokeWidth={1}
        />
        <text
          x={x + w / 2}
          y={y + h / 2 + 4}
          fill="#fafafa"
          fontSize={11}
          fontWeight={600}
          textAnchor="middle"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {text}
        </text>
      </g>
    )
  }
}

/**
 * Rank pill — sits below the X axis (in the X-axis tick label region), so
 * the cursor's rank value is visible on the axis itself, not inside the plot.
 */
function renderRankLabel(rank: number) {
  return function RankLabel(props: unknown) {
    const p = props as {
      viewBox?: { x: number; y: number; width: number; height: number }
    }
    const vb = p.viewBox
    if (!vb) return <g />
    const text = `#${rank}`
    const padX = 6
    const w = text.length * 6.5 + padX * 2
    const h = 16
    // ReferenceLine x=const → viewBox is the line: x = x-coord, y = plot top,
    // width = 0, height = plot height. Place pill below the plot, centered.
    const x = vb.x - w / 2
    const y = vb.y + vb.height + 2
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={3}
          fill="#27272a"
          stroke="#52525b"
          strokeWidth={1}
        />
        <text
          x={vb.x}
          y={y + h / 2 + 4}
          fill="#fafafa"
          fontSize={11}
          fontWeight={600}
          textAnchor="middle"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {text}
        </text>
      </g>
    )
  }
}

function InfoBar({ datum }: { datum: IncentiveDatum }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-border bg-muted/30 px-4 py-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
      <Field label="Rank" value={`#${datum.rank}`} accent="orange" />
      <Field label="Incentive" value={datum.incentive.toFixed(5)} />
      <CopyableField
        label="Coldkey"
        address={datum.coldkey}
        nickname={datum.coldkeyNickname}
      />
      <CopyableField label="Hotkey" address={datum.hotkey} />
      <Field label="UID" value={datum.uid.toString()} accent="orange" />
      <Field
        label="Stake"
        value={`τ${formatNum(datum.rootStake)} η${formatNum(datum.alphaStake)}`}
      />
      <Field label="η/Day" value={`η${formatNum(datum.dailyRewardAlpha)}`} />
      <Field label="τ/Day" value={`τ${formatNum(datum.dailyRewardTao)}`} />
      <Field
        label="Performance"
        value={`${(datum.performance * 100).toFixed(2)}%`}
        accent="green"
      />
    </div>
  )
}

function CopyableField({
  label,
  address,
  nickname,
}: {
  label: string
  address: string
  /** When present, displayed as the headline value with the address moved
   * below in muted text. Click anywhere still copies the full address. */
  nickname?: string | null
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {nickname ? (
        <div className="flex flex-col leading-tight">
          <span
            className="truncate text-sm font-semibold text-positive"
            title={nickname}
          >
            {nickname}
          </span>
          <CopyableAddress
            address={address}
            prefix={5}
            suffix={3}
            className="text-[10px] text-muted-foreground"
          />
        </div>
      ) : (
        <CopyableAddress
          address={address}
          prefix={5}
          suffix={3}
          className="text-xs font-semibold text-foreground"
        />
      )}
    </div>
  )
}

function Field({
  label,
  value,
  accent,
  mono,
}: {
  label: string
  value: string
  accent?: "orange" | "green"
  mono?: boolean
}) {
  const valueColor =
    accent === "orange"
      ? "text-orange-400"
      : accent === "green"
        ? "text-positive"
        : "text-foreground"
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${valueColor} ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  )
}

function formatNum(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0"
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  if (abs >= 1) return value.toFixed(2)
  if (abs >= 0.0001) return value.toFixed(4)
  return value.toExponential(2)
}
