"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs"
import { SearchIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type {
  SubnetWeightsData,
  WeightsValidatorRow,
} from "@/lib/subtensor/weights"
import {
  applyExcludeOwnerWeights,
  formatBlockDuration,
} from "@/lib/subtensor/weights"
import { cn } from "@/lib/utils"

const SECONDS_PER_BLOCK = 12
const SEARCH_DEBOUNCE_MS = 300
/** Must match canvas row height and validator sidebar row height. */
const ROW_HEIGHT = 28

interface WeightsViewProps {
  data: SubnetWeightsData
  loadError?: string | null
}

function truncateKey(key: string, head = 5, tail = 4): string {
  if (key.length <= head + tail + 3) return key
  return `${key.slice(0, head)}...${key.slice(-tail)}`
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—"
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}h, ${m}m, ${s}s`
  if (m > 0) return `${m}m, ${s}s`
  return `${s}s`
}

function weightColor(weight: number): string {
  if (weight <= 0) return "#050810"
  const t = Math.min(1, Math.max(0, weight))
  const hue = 200
  const saturation = 40 + t * 55
  const lightness = 8 + t * 52
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

function matchesSearch(
  query: string,
  uid: number,
  hotkey: string,
  coldkey: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (String(uid).includes(q)) return true
  if (hotkey.toLowerCase().includes(q)) return true
  if (coldkey.toLowerCase().includes(q)) return true
  return false
}

function HyperparamMetric({
  label,
  value,
  sub,
  live,
}: {
  label: string
  value: string | number
  sub?: string
  live?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {label}
        {live && (
          <span
            aria-label="updates live"
            className="size-1.5 animate-pulse rounded-full bg-positive"
          />
        )}
      </p>
      <p className="font-heading text-sm font-semibold tabular-nums">{value}</p>
      {sub && (
        <p className="text-[11px] tabular-nums text-muted-foreground">{sub}</p>
      )}
    </div>
  )
}

function WeightsHeatmap({
  data,
  highlightedMiners,
  onHover,
}: {
  data: SubnetWeightsData
  highlightedMiners: Set<number> | null
  onHover: (
    info: {
      validator: WeightsValidatorRow
      minerUid: number
      weight: number
      x: number
      y: number
    } | null,
  ) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const columnCount = data.maxUids
  const rowCount = data.validators.length
  const heatmapHeight = rowCount * ROW_HEIGHT

  const draw = useMemo(
    () => () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container || rowCount === 0) return false

      const width = container.clientWidth
      if (width <= 0) return false

      const dpr = window.devicePixelRatio || 1
      const height = heatmapHeight

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)

      const ctx = canvas.getContext("2d")
      if (!ctx) return false

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = "#050810"
      ctx.fillRect(0, 0, width, height)

      const colWidth = width / columnCount

      for (let row = 0; row < rowCount; row++) {
        const validator = data.validators[row]!
        const y = row * ROW_HEIGHT

        ctx.fillStyle = "#0b1220"
        ctx.fillRect(0, y, width, ROW_HEIGHT - 1)

        for (const { minerUid, weight } of validator.weights) {
          if (minerUid < 0 || minerUid >= columnCount) continue
          const dimmed =
            highlightedMiners != null && !highlightedMiners.has(minerUid)
          ctx.fillStyle = dimmed
            ? "rgba(8, 14, 24, 0.85)"
            : weightColor(weight)
          ctx.fillRect(
            minerUid * colWidth,
            y + 1,
            Math.max(1, colWidth),
            ROW_HEIGHT - 2,
          )
        }
      }

      return true
    },
    [columnCount, data.validators, heatmapHeight, highlightedMiners, rowCount],
  )

  const [canvasReady, setCanvasReady] = useState(false)

  useEffect(() => {
    setCanvasReady(false)

    const container = containerRef.current
    if (!container) return

    let raf = 0
    const scheduleDraw = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (draw()) setCanvasReady(true)
      })
    }

    scheduleDraw()

    const observer = new ResizeObserver(scheduleDraw)
    observer.observe(container)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [draw])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || rowCount === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const colWidth = rect.width / columnCount
    const minerUid = Math.floor(x / colWidth)
    const row = Math.floor(y / ROW_HEIGHT)

    if (
      minerUid < 0 ||
      minerUid >= columnCount ||
      row < 0 ||
      row >= rowCount
    ) {
      onHover(null)
      return
    }

    const validator = data.validators[row]!
    const entry = validator.weights.find((w) => w.minerUid === minerUid)
    if (!entry) {
      onHover(null)
      return
    }

    onHover({
      validator,
      minerUid,
      weight: entry.weight,
      x: e.clientX,
      y: e.clientY,
    })
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-sm border border-black/50"
      style={{ height: heatmapHeight }}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "block h-full w-full cursor-crosshair",
          !canvasReady && "opacity-0",
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHover(null)}
      />
    </div>
  )
}

function MinerAxisTicks({ maxUids }: { maxUids: number }) {
  const ticks = useMemo(() => {
    const last = maxUids - 1
    const result: number[] = [0]
    for (let t = 50; t < maxUids; t += 50) result.push(t)

    if (last > 0 && result[result.length - 1] !== last) {
      const prev = result[result.length - 1] ?? 0
      // Drop the prior tick when it would crowd the final UID label (e.g. 250 vs 255).
      const minGap = Math.max(30, Math.round(last * 0.1))
      if (last - prev < minGap) result.pop()
      result.push(last)
    }

    return result
  }, [maxUids])

  const lastTick = maxUids - 1

  return (
    <div className="relative h-4">
      {ticks.map((tick) => {
        const isFirst = tick === 0
        const isLast = tick === lastTick
        const pct = (tick / Math.max(1, lastTick)) * 100

        return (
          <span
            key={tick}
            className={cn(
              "absolute text-[10px] tabular-nums text-muted-foreground",
              isFirst && "left-0",
              isLast && "right-0",
              !isFirst && !isLast && "-translate-x-1/2",
            )}
            style={!isFirst && !isLast ? { left: `${pct}%` } : undefined}
          >
            {tick}
          </span>
        )
      })}
    </div>
  )
}

function ValidatorSidebar({
  validators,
  onHoverValidator,
}: {
  validators: WeightsValidatorRow[]
  onHoverValidator: (
    info: { validator: WeightsValidatorRow; x: number; y: number } | null,
  ) => void
}) {
  return (
    <div className="sticky left-0 z-10 shrink-0 border-r border-border/60 bg-[#030508]">
      {validators.map((v) => (
        <div
          key={v.uid}
          className="flex items-center justify-end border-b border-border/30 px-3 text-xs last:border-0"
          style={{ height: ROW_HEIGHT }}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            onHoverValidator({
              validator: v,
              x: rect.left + rect.width / 2,
              y: rect.top,
            })
          }}
          onMouseLeave={() => onHoverValidator(null)}
        >
          <div
            className="grid shrink-0 grid-cols-[3ch_1ch_max-content] items-center gap-x-1 font-mono text-[11px] text-foreground/90"
          >
            <span className="text-right tabular-nums">{v.uid}</span>
            <span className="text-center text-muted-foreground/50">·</span>
            <span>{truncateKey(v.hotkey)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function WeightsView({ data, loadError }: WeightsViewProps) {
  const [{ q: search, exclude_burn: excludeOwnerBurn }, setParams] =
    useQueryStates({
      q: parseAsString.withDefault("").withOptions({ throttleMs: SEARCH_DEBOUNCE_MS }),
      exclude_burn: parseAsBoolean.withDefault(false),
    })
  const [hovered, setHovered] = useState<{
    validator: WeightsValidatorRow
    minerUid: number
    weight: number
    x: number
    y: number
  } | null>(null)
  const [hoveredValidator, setHoveredValidator] = useState<{
    validator: WeightsValidatorRow
    x: number
    y: number
  } | null>(null)

  const [mountTime] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const epochLengthMs = data.hyperparams.tempo * SECONDS_PER_BLOCK * 1000
  const initialRemainingMs =
    data.hyperparams.blocksUntilNextEpoch * SECONDS_PER_BLOCK * 1000
  let remainingMs = initialRemainingMs - (now - mountTime)
  while (remainingMs < 0) remainingMs += epochLengthMs
  const remainingBlocks = Math.max(
    0,
    Math.ceil(remainingMs / (SECONDS_PER_BLOCK * 1000)),
  )
  const epochPct =
    data.hyperparams.tempo > 0
      ? ((data.hyperparams.tempo - remainingBlocks) / data.hyperparams.tempo) *
        100
      : 0

  const highlightedMiners = useMemo(() => {
    const q = search.trim()
    if (!q) return null
    const set = new Set<number>()
    for (const miner of data.miners) {
      if (matchesSearch(q, miner.uid, miner.hotkey, miner.coldkey)) {
        set.add(miner.uid)
      }
    }
    return set
  }, [data.miners, search])

  const canExcludeOwner = data.ownerUid != null

  const displayData = useMemo((): SubnetWeightsData => {
    if (!excludeOwnerBurn || data.ownerUid == null) return data
    return {
      ...data,
      validators: applyExcludeOwnerWeights(data.validators, data.ownerUid),
    }
  }, [data, excludeOwnerBurn])

  const excludeOwnerLabel = useMemo(() => {
    if (data.incentiveBurn != null && data.incentiveBurn > 0) {
      return `Exclude owner burn (${data.incentiveBurn.toFixed(1)}%)`
    }
    return "Exclude owner burn"
  }, [data.incentiveBurn])

  const gridHeight = displayData.validators.length * ROW_HEIGHT

  const hp = data.hyperparams

  return (
    <div className="mx-auto flex w-full max-w-425 flex-col gap-6 p-6 animate-in fade-in-0 duration-300">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Weights
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.validators.length} validators · {data.maxUids} miner slots ·
          chain state via Finney
        </p>
      </header>

      {loadError && (
        <p
          role="alert"
          className={cn(
            "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive",
          )}
        >
          {loadError}
        </p>
      )}

      <Card className="gap-4 overflow-visible p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          <HyperparamMetric
            label="Weights Set Rate Limit"
            value={hp.weightsRateLimit}
            sub={formatBlockDuration(hp.weightsRateLimit)}
          />
          <HyperparamMetric label="Version Key" value={hp.weightsVersion} />
          <HyperparamMetric
            label="Weight Limit"
            value={`Min ${(hp.minAllowedWeights / 65535).toFixed(0)} Max ${(hp.maxWeightsLimit / 65535).toFixed(0)}`}
          />
          <HyperparamMetric
            label="Bonds Avg"
            value={hp.bondsMovingAvg.toFixed(1)}
          />
          <HyperparamMetric
            label="Activity Cutoff"
            value={hp.activityCutoff.toLocaleString()}
            sub={formatBlockDuration(hp.activityCutoff)}
          />
          <HyperparamMetric
            label="Blocks Until Next Epoch"
            value={remainingBlocks.toLocaleString()}
            sub={`${formatDuration(Math.floor(remainingMs / 1000))} · ${epochPct.toFixed(2)}%`}
            live
          />
          <HyperparamMetric label="Kappa" value={hp.kappa.toFixed(2)} />
          <HyperparamMetric
            label="Commit Reveal"
            value={hp.commitRevealEnabled ? "Enabled" : "Disabled"}
            sub={hp.commitRevealEnabled ? `Interval ${hp.commitRevealInterval}` : undefined}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setParams({ q: e.target.value })}
              placeholder="Search by miner UID, hotkey, or coldkey"
              className="h-9 pl-9 font-mono text-xs"
            />
          </div>
          <div
            className="flex shrink-0 items-center gap-2"
            title={
              canExcludeOwner
                ? data.ownerUid != null
                  ? `Remove UID ${data.ownerUid} from each validator row and renormalize miner weights`
                  : undefined
                : "Owner hotkey is not registered on this subnet"
            }
          >
            <Switch
              id="exclude-owner-burn"
              checked={excludeOwnerBurn && canExcludeOwner}
              disabled={!canExcludeOwner}
              onCheckedChange={(checked) => setParams({ exclude_burn: checked })}
            />
            <Label
              htmlFor="exclude-owner-burn"
              className={cn(
                "cursor-pointer text-xs font-normal whitespace-nowrap text-muted-foreground",
                !canExcludeOwner && "cursor-not-allowed opacity-50",
              )}
            >
              {excludeOwnerLabel}
            </Label>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>0</span>
            <div
              className="h-2.5 w-28 rounded-sm border border-black/40"
              style={{
                background:
                  "linear-gradient(90deg, #050810 0%, hsl(200 95% 60%) 100%)",
              }}
            />
            <span>1</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border/80 bg-[#030508]">
          <div
            className="overflow-auto"
            style={{ maxHeight: "min(72vh, 720px)" }}
          >
            <div
              className="grid min-w-full"
              style={{
                gridTemplateColumns: "auto 1fr",
                gridTemplateRows: "auto auto auto",
              }}
            >
              <div className="sticky top-0 left-0 z-30 border-b border-border/60 bg-[#030508] px-3 py-2 text-[11px] whitespace-nowrap text-muted-foreground">
                ↓ Validator
              </div>
              <div className="sticky top-0 z-20 border-b border-border/60 bg-[#030508] px-3 py-2 text-right text-[11px] text-muted-foreground">
                Miner →
              </div>

              <div
                className="sticky top-[33px] left-0 z-20 border-b border-border/60 bg-[#030508]"
                aria-hidden
              />
              <div className="sticky top-[33px] z-20 border-b border-border/60 bg-[#030508] px-3 py-1">
                <MinerAxisTicks maxUids={data.maxUids} />
              </div>

              <ValidatorSidebar
                validators={data.validators}
                onHoverValidator={setHoveredValidator}
              />
              <div className="min-w-0 px-3 pb-3" style={{ height: gridHeight }}>
                <WeightsHeatmap
                  data={displayData}
                  highlightedMiners={highlightedMiners}
                  onHover={setHovered}
                />
              </div>
            </div>
          </div>
        </div>

        {search.trim() && highlightedMiners?.size === 0 && (
          <p className="text-xs text-muted-foreground">
            No miners match &ldquo;{search.trim()}&rdquo;.
          </p>
        )}
      </Card>

      {hoveredValidator &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full pb-2"
            style={{ left: hoveredValidator.x, top: hoveredValidator.y }}
          >
            <div className="min-w-[160px] rounded-sm border border-white/10 bg-[#1a1a1e] px-3 py-2 text-xs text-white shadow-xl">
              {hoveredValidator.validator.name && (
                <>
                  <p className="text-white/70">Validator</p>
                  <p className="font-medium">{hoveredValidator.validator.name}</p>
                </>
              )}
              <p className={hoveredValidator.validator.name ? "mt-1.5 text-white/70" : "text-white/70"}>
                Hotkey
              </p>
              <p className="font-mono text-[11px]">
                {truncateKey(hoveredValidator.validator.hotkey, 8, 6)}
              </p>
              <p className="mt-1.5 text-white/70">UID</p>
              <p className="font-semibold tabular-nums">{hoveredValidator.validator.uid}</p>
            </div>
          </div>,
          document.body,
        )}

      {hovered &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full pb-2"
            style={{ left: hovered.x, top: hovered.y }}
          >
            <div className="min-w-[180px] rounded-sm border border-white/10 bg-[#1a1a1e] px-3 py-2 text-xs text-white shadow-xl">
              <p className="text-white/70">Validator</p>
              <p className="font-medium">
                {hovered.validator.name ?? `UID ${hovered.validator.uid}`}
              </p>
              <p className="mt-1.5 text-white/70">Miner UID</p>
              <p className="font-mono font-semibold tabular-nums">
                {hovered.minerUid}
              </p>
              <p className="mt-1.5 text-white/70">Weight</p>
              <p className="font-semibold tabular-nums">
                {hovered.weight.toFixed(4)}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
