import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { TaoswapError } from "@/lib/taoswap/client"
import {
  getSubnetHyperparams,
  getSubnetMetagraph,
  getSubnetScreener,
  type MetagraphNeuron,
  type SubnetHyperparams,
  type SubnetScreenerRow,
} from "@/lib/taoswap/subnets"
import { SubnetIcon } from "@/components/dashboard/subnet-icon"
import { HyperparamsGrid } from "@/components/dashboard/hyperparams-grid"
import { IncentiveChart } from "@/components/dashboard/incentive-chart"
import { MetagraphTable } from "@/components/dashboard/metagraph-table"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PageProps {
  params: Promise<{ netuid: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { netuid } = await params
  return {
    title: `Subnet ${netuid} · Dashboard`,
  }
}

export default async function SubnetDetailPage({ params }: PageProps) {
  const { netuid: raw } = await params
  const netuid = Number.parseInt(raw, 10)
  // Match `\d+` only — strings like "abc" or "12a" become NaN and 404.
  if (!Number.isInteger(netuid) || String(netuid) !== raw || netuid < 0) {
    notFound()
  }

  // Auth guard — middleware already enforces this, but keep server-side.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fan out: screener (cached), hyperparams (single-netuid call), metagraph
  // (one call up to 1024 neurons). Promise.allSettled so one upstream blip
  // doesn't sink the whole page.
  const [screenerR, hyperR, metaR] = await Promise.allSettled([
    getSubnetScreener(),
    getSubnetHyperparams(netuid),
    getSubnetMetagraph(netuid),
  ])

  let subnet: SubnetScreenerRow | null = null
  let loadError: string | null = null
  if (screenerR.status === "fulfilled") {
    subnet = screenerR.value.find((s) => s.netuid === netuid) ?? null
  } else {
    loadError =
      screenerR.reason instanceof TaoswapError
        ? screenerR.reason.message
        : "Failed to load subnet data"
  }

  let hyperparams: SubnetHyperparams | null = null
  let hyperError: string | null = null
  if (hyperR.status === "fulfilled") {
    hyperparams = hyperR.value
  } else {
    hyperError =
      hyperR.reason instanceof TaoswapError
        ? hyperR.reason.message
        : "Failed to load hyperparameters"
  }

  let metagraph: MetagraphNeuron[] = []
  let metaError: string | null = null
  if (metaR.status === "fulfilled") {
    metagraph = metaR.value
  } else {
    metaError =
      metaR.reason instanceof TaoswapError
        ? metaR.reason.message
        : "Failed to load metagraph"
  }

  // If the metadata call confirms the netuid doesn't exist (no row returned),
  // OR neither the screener nor hyperparams could place it, 404.
  if (!subnet && !hyperparams && !loadError && !hyperError) notFound()

  return (
    <div className="mx-auto flex w-full max-w-425 flex-col gap-6 p-6 animate-in fade-in-0 duration-300">
      <Link
        href="/dashboard"
        className="group inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to subnets
      </Link>

      {loadError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {loadError}
        </p>
      )}

      {subnet && (
        <>
          <header className="flex flex-wrap items-center gap-5">
            <SubnetIcon
              netuid={subnet.netuid}
              name={subnet.name}
              logoUrl={subnet.logoUrl}
              size="size-16"
            />
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                {subnet.name}
              </h1>
              <p className="text-sm text-muted-foreground tabular-nums">
                SN{subnet.netuid}
              </p>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Price τ" value={subnet.price.toFixed(6)} />
            <StatCard
              label="Emission"
              value={`${(subnet.emission_pct * 100).toFixed(2)}%`}
            />
            <StatCard
              label="M Cap τ"
              value={formatMarketCap(subnet.marketCap)}
            />
            <StatCard
              label="24h"
              value={formatPctSigned(subnet.price_1d_pct_change)}
              tone={subnet.price_1d_pct_change >= 0 ? "up" : "down"}
            />
          </div>

        </>
      )}

      {hyperparams && <HyperparamsGrid data={hyperparams} />}
      {hyperError && !hyperparams && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {hyperError}
        </p>
      )}

      {metagraph.length > 0 && <IncentiveChart neurons={metagraph} />}

      <MetagraphTable neurons={metagraph} loadError={metaError} />
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  tone?: "up" | "down"
}

function StatCard({ label, value, tone }: StatCardProps) {
  return (
    <Card className="gap-1.5 px-5 py-4">
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-heading text-2xl font-semibold tabular-nums tracking-tight",
          tone === "up" && "text-emerald-400",
          tone === "down" && "text-red-400",
        )}
      >
        {value}
      </p>
    </Card>
  )
}

function formatPctSigned(fraction: number): string {
  const sign = fraction >= 0 ? "+" : ""
  return `${sign}${(fraction * 100).toFixed(2)}%`
}

function formatMarketCap(tao: number): string {
  if (!Number.isFinite(tao) || tao <= 0) return "—"
  if (tao >= 1_000_000_000) return `${(tao / 1_000_000_000).toFixed(2)}B`
  if (tao >= 1_000_000) return `${(tao / 1_000_000).toFixed(2)}M`
  if (tao >= 1_000) return `${(tao / 1_000).toFixed(2)}K`
  return tao.toFixed(2)
}
