import { DistributionView } from "@/components/subnet/distribution-view"
import { requireSubnetChannelPage } from "@/lib/subnet/channel-page"
import { TaoswapError } from "@/lib/taoswap/client"
import {
  getMinerDistribution,
  type MinerDistribution,
} from "@/lib/taoswap/distribution"

interface PageProps {
  params: Promise<{ netuid: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { netuid } = await params
  return { title: `Distribution · SN${netuid}` }
}

const EMPTY_DISTRIBUTION: MinerDistribution = {
  byColdkey: [],
  byIp: [],
  totalMiners: 0,
  minersWithKnownIp: 0,
}

export default async function SubnetDistributionPage({ params }: PageProps) {
  const { netuid: raw } = await params
  const netuid = await requireSubnetChannelPage(raw)

  let data = EMPTY_DISTRIBUTION
  let loadError: string | null = null

  try {
    data = await getMinerDistribution(netuid)
  } catch (err) {
    loadError =
      err instanceof TaoswapError
        ? err.message
        : "Failed to load distribution data from taoswap"
  }

  return <DistributionView data={data} loadError={loadError} />
}
