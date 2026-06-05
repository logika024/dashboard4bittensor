import { MyColdkeysView } from "@/components/portfolio/my-coldkeys-view"
import { requirePortfolioChannelPage } from "@/lib/portfolio/channel-page"
import { listMyColdkeys } from "@/lib/portfolio/nicknames"

export const metadata = {
  title: "My coldkeys · Portfolio",
}

export default async function PortfolioMyColdkeysPage() {
  await requirePortfolioChannelPage()
  const initialColdkeys = await listMyColdkeys()
  return <MyColdkeysView initialColdkeys={initialColdkeys} />
}
