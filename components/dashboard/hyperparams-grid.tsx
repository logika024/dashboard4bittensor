import { Card } from "@/components/ui/card"
import type { SubnetHyperparams } from "@/lib/taostats/subnets"

/** Bittensor block time — 12s. Used for "Time Until Next Epoch". */
const SECONDS_PER_BLOCK = 12

interface HyperparamsGridProps {
  data: SubnetHyperparams
}

export function HyperparamsGrid({ data }: HyperparamsGridProps) {
  const timeUntilEpoch = formatDuration(
    data.blocksUntilNextEpoch * SECONDS_PER_BLOCK,
  )

  return (
    <Card className="gap-5 px-5 py-5">
      <h2 className="text-sm font-semibold tracking-wide text-foreground/90 uppercase">
        Settings &amp; Metrics
      </h2>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Maximum UIDs (Neurons)" value={data.maxNeurons} />
        <Metric label="Active Validators" value={data.activeValidators} />
        <Metric label="Number of Active UIDs" value={data.activeKeys} />
        <Metric label="Active Miners" value={data.activeMiners} />
        <Metric label="Maximum Validators" value={data.maxValidators} />
        <Metric label="Active Dual UID's" value={data.activeDual} />

        <Metric
          label="Blocks Until Next Epoch"
          value={data.blocksUntilNextEpoch.toLocaleString()}
        />
        <Metric label="Time Until Next Epoch" value={timeUntilEpoch} />
        <Metric label="Mech Count" value={data.mechCount} />
        <Metric
          label="Mech Emission Split"
          value={formatMechSplit(data.mechEmissionSplit)}
        />
        <Metric label="Tempo (blocks)" value={data.tempo.toLocaleString()} />
        <Metric
          label="Immunity Period"
          value={data.immunityPeriod.toLocaleString()}
        />
      </div>
    </Card>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        {label}
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
