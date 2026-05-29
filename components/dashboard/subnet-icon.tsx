"use client"

import { useState } from "react"

/** Golden-angle hue so each netuid gets a distinct, stable circle color. */
export function subnetColor(netuid: number): string {
  return `hsl(${(netuid * 137.508) % 360} 65% 55%)`
}

interface SubnetIconProps {
  netuid: number
  name: string
  logoUrl: string | null
  /** Tailwind size class, e.g. `size-6` or `size-12`. */
  size?: string
}

/**
 * Subnet identicon — owner-published logo when available, golden-angle
 * colored circle as a stable fallback when the logo is missing or fails
 * to load.
 */
export function SubnetIcon({
  netuid,
  name,
  logoUrl,
  size = "size-6",
}: SubnetIconProps) {
  const [errored, setErrored] = useState(false)

  if (logoUrl && !errored) {
    return (
      // Plain <img> rather than next/image — subnet logos come from arbitrary
      // owner-supplied hosts we can't pre-whitelist. onError falls back to the
      // colored circle if the host blocks us or returns a non-image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        loading="lazy"
        onError={() => setErrored(true)}
        className={`${size} shrink-0 rounded-full bg-muted object-cover animate-in fade-in-0 zoom-in-95 duration-300`}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={`${size} shrink-0 rounded-full`}
      style={{ background: subnetColor(netuid) }}
    />
  )
}
