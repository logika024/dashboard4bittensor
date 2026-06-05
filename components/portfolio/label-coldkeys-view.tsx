import Link from "next/link"
import type { ColdkeyLabelRecord } from "@/lib/portfolio/nicknames"
import { NicknamesSection } from "@/components/portfolio/nicknames-section"

interface LabelColdkeysViewProps {
  userSignedIn: boolean
  initialLabels: ColdkeyLabelRecord[]
}

export function LabelColdkeysView({
  userSignedIn,
  initialLabels,
}: LabelColdkeysViewProps) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-425 flex-col gap-6 p-6 animate-in fade-in-0 duration-300">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Label coldkeys
        </h1>
        <p className="text-sm text-muted-foreground">
          Your private notes for other people&apos;s coldkeys — only visible to
          you when signed in.
        </p>
      </header>

      {userSignedIn ? (
        <NicknamesSection initialLabels={initialLabels} />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card px-5 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            <Link
              href="/login?next=/portfolio/label-coldkeys"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            to save coldkey labels that appear on subnet detail pages.
          </p>
        </div>
      )}
    </div>
  )
}
