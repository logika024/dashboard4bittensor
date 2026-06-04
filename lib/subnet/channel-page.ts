import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { parseNetuid } from "@/lib/subnet/channels"

export async function requireSubnetChannelPage(rawNetuid: string) {
  const netuid = parseNetuid(rawNetuid)
  if (netuid == null) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return netuid
}
