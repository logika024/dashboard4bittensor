import { createClient } from "@/lib/supabase/server"
import { listMySavedSubnets } from "@/lib/sidebar/saved-subnets"
import { TaoswapError } from "@/lib/taoswap/client"
import {
  getSubnetScreener,
  type SubnetScreenerRow,
} from "@/lib/taoswap/subnets"
import {
  DiscordAppShell,
  type AppShellUser,
  type SavedSubnetItem,
} from "@/components/app-shell/discord-app-shell"
import type { User } from "@supabase/supabase-js"

export function getUserDisplay(user: User): AppShellUser {
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "User"
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const initial = displayName.trim().charAt(0).toUpperCase() || "?"
  return { displayName, avatarUrl, initial }
}

function enrichSavedSubnets(
  saved: Awaited<ReturnType<typeof listMySavedSubnets>>,
  screener: SubnetScreenerRow[],
): SavedSubnetItem[] {
  const byNetuid = new Map(screener.map((s) => [s.netuid, s]))
  return saved.map((row) => {
    const meta = byNetuid.get(row.netuid)
    return {
      id: row.id,
      netuid: row.netuid,
      name: meta?.name ?? `Subnet ${row.netuid}`,
      logoUrl: meta?.logoUrl ?? null,
    }
  })
}

interface AppLayoutProps {
  children: React.ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <>{children}</>
  }

  const [savedR, screenerR] = await Promise.allSettled([
    listMySavedSubnets(),
    getSubnetScreener(),
  ])

  const saved =
    savedR.status === "fulfilled" ? savedR.value : []
  let allSubnets: SubnetScreenerRow[] = []
  if (screenerR.status === "fulfilled") {
    allSubnets = screenerR.value
  } else if (screenerR.reason instanceof TaoswapError) {
    console.error("[AppLayout] screener:", screenerR.reason.message)
  }

  const savedSubnets = enrichSavedSubnets(saved, allSubnets)

  return (
    <DiscordAppShell
      user={getUserDisplay(user)}
      savedSubnets={savedSubnets}
      allSubnets={allSubnets}
    >
      {children}
    </DiscordAppShell>
  )
}
