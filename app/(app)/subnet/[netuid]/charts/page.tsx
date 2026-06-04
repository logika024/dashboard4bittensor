import { SubnetEmptyChannel } from "@/components/subnet/subnet-empty-channel"
import { requireSubnetChannelPage } from "@/lib/subnet/channel-page"

interface PageProps {
  params: Promise<{ netuid: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { netuid } = await params
  return { title: `Charts · SN${netuid}` }
}

export default async function SubnetChartsPage({ params }: PageProps) {
  const { netuid: raw } = await params
  await requireSubnetChannelPage(raw)

  return (
    <SubnetEmptyChannel
      title="Charts"
      description="Subnet alpha price view — coming soon."
    />
  )
}
