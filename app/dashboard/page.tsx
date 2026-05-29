import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { signOut } from "@/app/login/actions"
import { TaostatsError } from "@/lib/taostats/client"
import {
  getSubnetScreener,
  type SubnetScreenerRow,
} from "@/lib/taostats/subnets"
import { SubnetTable } from "@/components/dashboard/subnet-table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const metadata = {
  title: "Subnets · Dashboard",
  description: "Live Bittensor subnet screener",
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already enforces this — server-side guard for safety.
  if (!user) redirect("/login")

  let subnets: SubnetScreenerRow[] = []
  let loadError: string | null = null
  try {
    subnets = await getSubnetScreener()
  } catch (err) {
    loadError =
      err instanceof TaostatsError
        ? err.message
        : "Failed to load subnets from taostats"
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "friend"
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const initial = displayName.trim().charAt(0).toUpperCase() || "?"

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 animate-in fade-in-0 slide-in-from-top-1 duration-500">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Subnets
          </h1>
          <p className="text-sm text-muted-foreground">
            Live screener from taostats
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {displayName}
          </span>
          <Avatar>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <SubnetTable subnets={subnets} loadError={loadError} />
    </div>
  )
}
