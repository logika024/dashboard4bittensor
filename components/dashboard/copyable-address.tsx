"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyableAddressProps {
  /** Full address to copy on click. */
  address: string
  /** Chars from the start of the address to show before the ellipsis. */
  prefix?: number
  /** Chars from the end of the address to show after the ellipsis. */
  suffix?: number
  className?: string
}

/**
 * Click-to-copy address pill — truncated display, copy icon on hover,
 * brief check-mark feedback after the clipboard write resolves. Shared
 * between the metagraph table and the chart info bar; the two callers
 * just pick different prefix/suffix sizes for their layout.
 */
export function CopyableAddress({
  address,
  prefix = 10,
  suffix = 8,
  className,
}: CopyableAddressProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {
        // Some browsers block clipboard writes in non-secure or unfocused
        // contexts — silently no-op; the title attr still exposes the address.
      })
  }

  const display =
    address.length <= prefix + suffix + 1
      ? address
      : `${address.slice(0, prefix)}…${address.slice(-suffix)}`

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy address: ${address}`}
      aria-label={copied ? "Address copied" : `Copy address ${address}`}
      className={cn(
        "group/copy -mx-1 inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 font-mono transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span>{display}</span>
      {copied ? (
        <CheckIcon className="size-3 shrink-0 text-positive" />
      ) : (
        <CopyIcon className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100" />
      )}
    </button>
  )
}
