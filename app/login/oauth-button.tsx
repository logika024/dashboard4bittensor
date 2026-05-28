"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface OAuthSubmitButtonProps {
  /** Provider label, used both as button text and aria-label during pending. */
  label: string
  /** Brand icon rendered to the left of the label when idle. */
  icon: React.ReactNode
}

/**
 * Submit button for an OAuth `<form action={serverAction}>`.
 * Reads `useFormStatus` to swap the label for a spinner while the action
 * is in flight (OAuth redirect can take 1–2s, so without this the button
 * looks unresponsive and invites double-clicks).
 */
export function OAuthSubmitButton({ label, icon }: OAuthSubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      aria-label={pending ? `Redirecting to ${label}` : label}
      className="h-12 w-full justify-center gap-3 text-base font-medium [&_svg:not([class*='size-'])]:size-5"
    >
      {pending ? (
        <>
          <Spinner className="size-5" />
          Redirecting…
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </Button>
  )
}
