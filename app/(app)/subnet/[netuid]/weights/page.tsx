import { WeightsView } from "@/components/subnet/weights-view"
import { requireSubnetChannelPage } from "@/lib/subnet/channel-page"
import { SubtensorError } from "@/lib/subtensor/client"
import {
  getSubnetWeights,
  type SubnetWeightsData,
} from "@/lib/subtensor/weights"

interface PageProps {
  params: Promise<{ netuid: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { netuid } = await params
  return { title: `Weights · SN${netuid}` }
}

const EMPTY_WEIGHTS: SubnetWeightsData = {
  netuid: 0,
  maxUids: 0,
  validators: [],
  miners: [],
  ownerUid: null,
  incentiveBurn: null,
  hyperparams: {
    weightsRateLimit: 0,
    weightsVersion: 0,
    minAllowedWeights: 0,
    maxWeightsLimit: 0,
    activityCutoff: 0,
    blocksUntilNextEpoch: 0,
    tempo: 360,
    kappa: 0,
    commitRevealEnabled: false,
    commitRevealInterval: 0,
    bondsMovingAvg: 0,
  },
}

export default async function SubnetWeightsPage({ params }: PageProps) {
  const { netuid: raw } = await params
  const netuid = await requireSubnetChannelPage(raw)

  let data = { ...EMPTY_WEIGHTS, netuid }
  let loadError: string | null = null

  try {
    data = await getSubnetWeights(netuid)
  } catch (err) {
    loadError =
      err instanceof SubtensorError
        ? err.message
        : "Failed to load weights from chain"
  }

  return <WeightsView data={data} loadError={loadError} />
}
