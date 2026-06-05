import { createClient } from "@/lib/supabase/server"
import { LabelColdkeysView } from "@/components/portfolio/label-coldkeys-view"
import { requirePortfolioChannelPage } from "@/lib/portfolio/channel-page"
import { listLabeledColdkeys } from "@/lib/portfolio/nicknames"

export const metadata = {
  title: "Label coldkeys · Portfolio",
}

export default async function PortfolioLabelColdkeysPage() {
  await requirePortfolioChannelPage()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const initialLabels = user ? await listLabeledColdkeys() : []

  return (
    <LabelColdkeysView
      userSignedIn={Boolean(user)}
      initialLabels={initialLabels}
    />
  )
}
