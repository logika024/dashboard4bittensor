import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TaoswapError } from "@/lib/taoswap/client"
import {
  getSubnetScreener,
  type SubnetScreenerRow,
} from "@/lib/taoswap/subnets"
import {
  CoinGeckoError,
  getPriceSummary,
  PRICE_RANGES,
  type PriceSummary,
  type PriceRange,
} from "@/lib/coingecko/price"
import { SubnetTable } from "@/components/dashboard/subnet-table"
import { PriceCharts } from "@/components/dashboard/price-charts"

export const metadata = {
  title: "Subnets · Dashboard",
  description: "Live Bittensor subnet screener",
}

interface DashboardPageProps {
  searchParams: Promise<{ range?: string | string[] | undefined }>
}

function parseInitialRange(raw: string | string[] | undefined): PriceRange {
  const value = Array.isArray(raw) ? raw[0] : raw
  return PRICE_RANGES.includes(value as PriceRange)
    ? (value as PriceRange)
    : "24h"
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { range } = await searchParams
  const initialRange = parseInitialRange(range)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [screenerR, taoR, btcR] = await Promise.allSettled([
    getSubnetScreener(),
    getPriceSummary("tao", initialRange),
    getPriceSummary("btc", initialRange),
  ])

  let subnets: SubnetScreenerRow[] = []
  let loadError: string | null = null
  if (screenerR.status === "fulfilled") {
    subnets = screenerR.value
  } else {
    loadError =
      screenerR.reason instanceof TaoswapError
        ? screenerR.reason.message
        : "Failed to load subnets from taoswap"
  }

  let tao: PriceSummary | null = null
  let taoError: string | null = null
  if (taoR.status === "fulfilled") {
    tao = taoR.value
  } else {
    taoError =
      taoR.reason instanceof CoinGeckoError
        ? taoR.reason.message
        : "Failed to load TAO price"
  }

  let btc: PriceSummary | null = null
  let btcError: string | null = null
  if (btcR.status === "fulfilled") {
    btc = btcR.value
  } else {
    btcError =
      btcR.reason instanceof CoinGeckoError
        ? btcR.reason.message
        : "Failed to load BTC price"
  }

  return (
    <div className="mx-auto flex w-full max-w-425 flex-col gap-6 p-6">
      <header className="animate-in fade-in-0 slide-in-from-top-1 duration-500">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Subnets
        </h1>
        <p className="text-sm text-muted-foreground">
          Live screener from taoswap
        </p>
      </header>

      <PriceCharts
        initialTao={tao}
        initialBtc={btc}
        initialTaoError={taoError}
        initialBtcError={btcError}
        initialRange={initialRange}
      />

      <SubnetTable subnets={subnets} loadError={loadError} />
    </div>
  )
}
