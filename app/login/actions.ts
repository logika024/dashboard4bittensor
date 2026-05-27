"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { Provider } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export async function signInWithProvider(provider: Provider, next?: string) {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get("origin") ?? ""
  const callback = new URL("/auth/callback", origin)
  if (next) callback.searchParams.set("next", next)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }
  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
