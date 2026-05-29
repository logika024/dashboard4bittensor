import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string
  label?: string
}

/**
 * CSS-only spinner — inherits `currentColor`, so size and color follow the
 * surrounding text by default. Override with `className` (e.g. `size-5`).
 */
export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  )
}
