"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { SubnetIcon } from "@/components/dashboard/subnet-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { addMySavedSubnet } from "@/lib/sidebar/saved-subnets"
import type { SubnetScreenerRow } from "@/lib/taoswap/subnets"
import { cn } from "@/lib/utils"

interface AddSubnetSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allSubnets: SubnetScreenerRow[]
  savedNetuids: Set<number>
}

export function AddSubnetSheet({
  open,
  onOpenChange,
  allSubnets,
  savedNetuids,
}: AddSubnetSheetProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allSubnets
      .filter((s) => !savedNetuids.has(s.netuid))
      .filter((s) => {
        if (!q) return true
        return (
          s.name.toLowerCase().includes(q) ||
          String(s.netuid).includes(q) ||
          `sn${s.netuid}`.includes(q)
        )
      })
      .slice(0, 50)
  }, [allSubnets, savedNetuids, query])

  function handleAdd(netuid: number) {
    setError(null)
    startTransition(async () => {
      const result = await addMySavedSubnet({ netuid })
      if (!result.ok) {
        setError(result.error ?? "Failed to add subnet")
        return
      }
      onOpenChange(false)
      setQuery("")
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full border-[#1e1f22] bg-[#2b2d31] text-[#dbdee1] sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="text-[#f2f3f5]">Add a subnet</SheetTitle>
          <SheetDescription className="text-[#949ba4]">
            Pin a subnet to your sidebar for quick access.
          </SheetDescription>
        </SheetHeader>

        <div className="relative mt-4">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#949ba4]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or SN number…"
            className="h-9 border-[#1e1f22] bg-[#1e1f22] pl-9 text-[#dbdee1] placeholder:text-[#949ba4]"
          />
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-[#f23f43]">
            {error}
          </p>
        )}

        <ul className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto">
          {available.length === 0 ? (
            <li className="px-2 py-4 text-sm text-[#949ba4]">
              {savedNetuids.size >= allSubnets.length
                ? "You’ve added every available subnet."
                : "No subnets match your search."}
            </li>
          ) : (
            available.map((subnet) => (
              <li key={subnet.netuid}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAdd(subnet.netuid)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded px-2 py-2 text-left transition-colors",
                    "hover:bg-[#35373c] disabled:opacity-50",
                  )}
                >
                  <SubnetIcon
                    netuid={subnet.netuid}
                    name={subnet.name}
                    logoUrl={subnet.logoUrl}
                    size="size-10"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#f2f3f5]">
                      {subnet.name}
                    </p>
                    <p className="text-xs text-[#949ba4] tabular-nums">
                      SN{subnet.netuid}
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#404249] bg-transparent text-[#dbdee1] hover:bg-[#35373c]"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
