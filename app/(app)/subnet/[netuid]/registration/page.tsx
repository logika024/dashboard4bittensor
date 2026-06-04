import { RegistrationTable } from "@/components/subnet/registration-table"
import { requireSubnetChannelPage } from "@/lib/subnet/channel-page"
import { TaoswapError } from "@/lib/taoswap/client"
import {
  getNeuronRegistrations,
  type NeuronRegistrationResult,
} from "@/lib/taoswap/registrations"

interface PageProps {
  params: Promise<{ netuid: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { netuid } = await params
  return { title: `Registration · SN${netuid}` }
}

export default async function SubnetRegistrationPage({ params }: PageProps) {
  const { netuid: raw } = await params
  const netuid = await requireSubnetChannelPage(raw)

  let data: NeuronRegistrationResult = { rows: [], totalIndexed: null }
  let loadError: string | null = null

  try {
    data = await getNeuronRegistrations(netuid)
  } catch (err) {
    loadError =
      err instanceof TaoswapError
        ? err.message
        : "Failed to load registration data from taoswap"
  }

  return <RegistrationTable data={data} loadError={loadError} />
}
