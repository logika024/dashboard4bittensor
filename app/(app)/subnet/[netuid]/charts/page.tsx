import { ChartsView } from "@/components/subnet/charts-view"
import { requireSubnetChannelPage } from "@/lib/subnet/channel-page"
import { TaoswapError } from "@/lib/taoswap/client"
import {
  getSubnetPriceHistory,
  type AlphaChartRange,
  type SubnetPriceHistory,
} from "@/lib/taoswap/price-history"
import { getSubnetScreener } from "@/lib/taoswap/subnets"

interface PageProps {
  params: Promise<{ netuid: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { netuid } = await params
  return { title: `Charts · SN${netuid}` }
}

const EMPTY_HISTORY = (netuid: number, range: AlphaChartRange): SubnetPriceHistory => ({
  netuid,
  resolution: "D",
  range,
  bars: [],
  latestPrice: null,
  changePct: null,
})

export default async function SubnetChartsPage({ params }: PageProps) {
  const { netuid: raw } = await params
  const netuid = await requireSubnetChannelPage(raw)
  const initialRange: AlphaChartRange = "7d"

  let history = EMPTY_HISTORY(netuid, initialRange)
  let loadError: string | null = null
  let subnetName: string | null = null

  const [historyR, screenerR] = await Promise.allSettled([
    getSubnetPriceHistory(netuid, initialRange),
    getSubnetScreener(),
  ])

  if (historyR.status === "fulfilled") {
    history = historyR.value
  } else {
    loadError =
      historyR.reason instanceof TaoswapError
        ? historyR.reason.message
        : "Failed to load alpha price history from taoswap"
  }

  if (screenerR.status === "fulfilled") {
    subnetName = screenerR.value.find((s) => s.netuid === netuid)?.name ?? null
  }

  return (
    <ChartsView
      netuid={netuid}
      subnetName={subnetName}
      initialHistory={history}
      initialRange={initialRange}
      loadError={loadError}
    />
  )
}
