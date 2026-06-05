import { PortfolioClient } from "@/components/portfolio/portfolio-client"
import { requirePortfolioChannelPage } from "@/lib/portfolio/channel-page"
import { listTrackedMyColdkeys, listUntrackedMyColdkeys } from "@/lib/portfolio/nicknames"
import { getSubnetScreener } from "@/lib/taoswap/subnets"

export const metadata = {
  title: "Portfolio",
  description: "Track coldkey balances and label coldkeys",
}

export default async function PortfolioPage() {
  await requirePortfolioChannelPage()
  const [initialColdkeys, initialUntrackedColdkeys, subnets] = await Promise.all([
    listTrackedMyColdkeys(),
    listUntrackedMyColdkeys(),
    getSubnetScreener().catch(() => []),
  ])
  return (
    <PortfolioClient
      initialColdkeys={initialColdkeys}
      initialUntrackedColdkeys={initialUntrackedColdkeys}
      subnets={subnets}
    />
  )
}
