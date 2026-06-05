"use client"

import Link from "next/link"
import { useEffect } from "react"
import { EyeIcon, XIcon } from "lucide-react"
import type { ColdkeyLabelRecord } from "@/lib/portfolio/nicknames"
import { Button } from "@/components/ui/button"

interface TrackColdkeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coldkeys: ColdkeyLabelRecord[]
  onTrack: (id: string) => void
  trackDisabled?: boolean
  myColdkeysHref: string
}

export function TrackColdkeyModal({
  open,
  onOpenChange,
  coldkeys,
  onTrack,
  trackDisabled,
  myColdkeysHref,
}: TrackColdkeyModalProps) {
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false)
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/60 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-coldkey-title"
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 id="track-coldkey-title" className="text-base font-semibold">
              Track a coldkey
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Choose from your saved coldkeys to show on the portfolio tab bar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
          {coldkeys.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              <p>No untracked coldkeys.</p>
              <p className="mt-2">
                Add one in{" "}
                <Link
                  href={myColdkeysHref}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  #my coldkeys
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {coldkeys.map((ck) => (
                <li key={ck.id}>
                  <button
                    type="button"
                    disabled={trackDisabled}
                    onClick={() => onTrack(ck.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <EyeIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {ck.nickname}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {ck.coldkey}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Track
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            asChild
          >
            <Link href={myColdkeysHref} onClick={() => onOpenChange(false)}>
              Manage my coldkeys
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
