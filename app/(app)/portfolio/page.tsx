import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { listMyNicknames } from "@/lib/portfolio/nicknames"
import { PortfolioClient } from "@/components/portfolio/portfolio-client"
import { NicknamesSection } from "@/components/portfolio/nicknames-section"

export const metadata = {
  title: "Portfolio",
  description: "Track coldkey balances and label coldkeys",
}

export default async function PortfolioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const initialNicknames = user ? await listMyNicknames() : []

  return (
    <>
      <PortfolioClient />
      <div className="mx-auto w-full max-w-4xl px-6 pb-6">
        {user ? (
          <NicknamesSection initialNicknames={initialNicknames} />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card px-5 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              <Link
                href="/login?next=/portfolio"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Sign in
              </Link>{" "}
              to save coldkey nicknames that appear on subnet detail pages.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
