"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import type { SubnetHyperparams } from "@/lib/taoswap/subnets"

/** Bittensor mainnet block time is a constant 12 s. */
const SECONDS_PER_BLOCK = 12

interface HyperparamsGridProps {
  data: SubnetHyperparams
}

export function HyperparamsGrid({ data }: HyperparamsGridProps) {
  // Anchor the countdown to mount time and tick `now` once a second. We avoid
  // re-fetching the data every tick — the chain advances deterministically at
  // 12s per block, so we can compute the live remaining time client-side.
  const [mountTime] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const epochLengthMs = data.tempo * SECONDS_PER_BLOCK * 1000
  const initialRemainingMs =
    data.blocksUntilNextEpoch * SECONDS_PER_BLOCK * 1000

  // Wrap at the epoch boundary so the counter resets cleanly instead of
  // sitting at 0 forever if the user leaves the page open through a tempo.
  let remainingMs = initialRemainingMs - (now - mountTime)
  while (remainingMs < 0) remainingMs += epochLengthMs

  const remainingBlocks = Math.max(
    0,
    Math.ceil(remainingMs / (SECONDS_PER_BLOCK * 1000)),
  )
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000))

  return (
    <Card className="gap-5 px-5 py-5">
      <h2 className="text-sm font-semibold tracking-wide text-foreground/90 uppercase">
        Settings &amp; Metrics
      </h2>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Maximum UIDs (Neurons)" value={data.maxNeurons} />
        <Metric label="Active Validators" value={data.activeValidators} />
        <Metric label="Number of Active UIDs" value={data.activeKeys} />
        <Metric label="Active Miners" value={data.activeMiners} />
        <Metric label="Mech Count" value={data.mechCount} />

        <Metric
          label="Blocks Until Next Epoch"
          value={remainingBlocks.toLocaleString()}
          live
        />
        <Metric
          label="Time Until Next Epoch"
          value={formatDuration(remainingSeconds)}
          live
        />
        <Metric
          label="Mech Emission Split"
          value={formatMechSplit(data.mechEmissionSplit)}
        />
        <Metric label="Tempo (blocks)" value={data.tempo.toLocaleString()} />
      </div>
    </Card>
  )
}

function Metric({
  label,
  value,
  live,
}: {
  label: string
  value: string | number
  live?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground">
        {label}
        {live && (
          <span
            aria-label="updates live"
            title="updates live"
            className="size-1.5 animate-pulse rounded-full bg-positive"
          />
        )}
      </p>
      <p className="font-heading text-lg font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </div>
  )
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—"
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatMechSplit(split: string[]): string {
  if (!split.length) return "—"
  return split
    .map((v) => `${(Number.parseFloat(v) * 100).toFixed(0)}%`)
    .join(" / ")
}
