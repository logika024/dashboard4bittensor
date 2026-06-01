"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  SearchIcon,
  StarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SubnetIcon } from "@/components/dashboard/subnet-icon"
import type { SubnetScreenerRow } from "@/lib/taoswap/subnets"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15

type SortKey = "emission" | "price" | "mcap"
type SortDir = "asc" | "desc"

interface SubnetTableProps {
  subnets: SubnetScreenerRow[]
  loadError: string | null
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`
}

function formatPrice(value: number): string {
  return value.toFixed(6)
}

function formatMarketCap(tao: number): string {
  if (!Number.isFinite(tao) || tao <= 0) return "—"
  if (tao >= 1_000_000_000) return `${(tao / 1_000_000_000).toFixed(2)}B`
  if (tao >= 1_000_000) return `${(tao / 1_000_000).toFixed(2)}M`
  if (tao >= 1_000) return `${(tao / 1_000).toFixed(2)}K`
  return tao.toFixed(2)
}

function pctClass(fraction: number): string {
  if (fraction > 0) return "text-emerald-400"
  if (fraction < 0) return "text-red-400"
  return "text-muted-foreground"
}

function matchesQuery(s: SubnetScreenerRow, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase().trim()
  if (s.name.toLowerCase().includes(q)) return true
  const stripped = q.replace(/^sn/, "")
  if (/^\d+$/.test(stripped) && String(s.netuid) === stripped) return true
  return false
}

const SORT_VALUE: Record<SortKey, (s: SubnetScreenerRow) => number> = {
  emission: (s) => s.emission_pct,
  price: (s) => s.price,
  mcap: (s) => s.marketCap,
}

export function SubnetTable({ subnets, loadError }: SubnetTableProps) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("emission")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  // Local-only favorites (resets on reload) — TODO: persist once we have a user table.
  const [favorites, setFavorites] = useState<Set<number>>(new Set())

  const rows = useMemo(() => {
    const filtered = subnets.filter((s) => matchesQuery(s, query))
    const value = SORT_VALUE[sortKey]
    const sign = sortDir === "desc" ? -1 : 1
    filtered.sort((a, b) => sign * (value(a) - value(b)))
    return filtered
  }, [subnets, query, sortKey, sortDir])

  // Jump back to page 1 whenever the filter or sort changes.
  useEffect(() => {
    setPage(1)
  }, [query, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const visibleRows = rows.slice(start, end)

  function toggleFavorite(netuid: number) {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(netuid)) next.delete(netuid)
      else next.add(netuid)
      return next
    })
  }

  // Keying the body on filter+sort+page forces React to remount its rows
  // whenever the visible slice changes, which re-runs the row entrance
  // animation. Favorites toggling is intentionally excluded — same key, no
  // remount, no flicker.
  const bodyKey = `${safePage}|${query}|${sortKey}|${sortDir}`

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search by name or SN number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <p
          key={`count-${rows.length}-${query}`}
          className="text-xs text-muted-foreground animate-in fade-in-0 duration-300"
        >
          {rows.length} {rows.length === 1 ? "subnet" : "subnets"}
          {query && ` matching "${query}"`}
        </p>
      </div>

      {loadError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-300"
        >
          {loadError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-12 text-xs font-medium text-muted-foreground">
                #
              </TableHead>
              <TableHead className="w-8" />
              <TableHead className="text-xs font-medium text-muted-foreground">
                Subnet
              </TableHead>
              <SortableHead
                label="Emission"
                active={sortKey === "emission"}
                direction={sortDir}
                onClick={() => toggleSort("emission")}
              />
              <SortableHead
                label="Price τ"
                active={sortKey === "price"}
                direction={sortDir}
                onClick={() => toggleSort("price")}
              />
              <SortableHead
                label="M Cap τ"
                active={sortKey === "mcap"}
                direction={sortDir}
                onClick={() => toggleSort("mcap")}
              />

              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                1H
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                1D
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                1W
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                1M
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody key={bodyKey}>
            {visibleRows.length === 0 ? (
              <TableRow className="hover:bg-transparent animate-in fade-in-0 duration-300">
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {subnets.length === 0
                    ? "No subnets to display"
                    : `No subnets match "${query}"`}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((s, idx) => {
                const isFav = favorites.has(s.netuid)
                return (
                  <TableRow
                    key={s.netuid}
                    className="animate-in fade-in-0 slide-in-from-bottom-1"
                    style={{
                      animationDuration: "320ms",
                      animationDelay: `${Math.min(idx * 18, 280)}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {start + idx + 1}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(s.netuid)}
                        aria-pressed={isFav}
                        aria-label={
                          isFav ? "Remove from favorites" : "Add to favorites"
                        }
                        className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <StarIcon
                          className={cn(
                            "size-4",
                            isFav && "fill-yellow-400 text-yellow-400",
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/subnet/${s.netuid}`}
                        className="group/subnet -mx-1 flex items-center gap-2.5 rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <SubnetIcon
                          netuid={s.netuid}
                          name={s.name}
                          logoUrl={s.logoUrl}
                        />
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-medium text-foreground decoration-foreground/50 underline-offset-2 group-hover/subnet:underline">
                            {s.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            SN{s.netuid}
                          </span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatPct(s.emission_pct)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatPrice(s.price)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatMarketCap(s.marketCap)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm tabular-nums",
                        pctClass(s.price_1h_pct_change),
                      )}
                    >
                      {formatPct(s.price_1h_pct_change)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm tabular-nums",
                        pctClass(s.price_1d_pct_change),
                      )}
                    >
                      {formatPct(s.price_1d_pct_change)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm tabular-nums",
                        pctClass(s.price_7d_pct_change),
                      )}
                    >
                      {formatPct(s.price_7d_pct_change)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm tabular-nums",
                        pctClass(s.price_1m_pct_change),
                      )}
                    >
                      {formatPct(s.price_1m_pct_change)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="tabular-nums text-muted-foreground">
            Showing {start + 1}–{Math.min(end, rows.length)} of {rows.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="size-4" />
              Previous
            </Button>
            <span className="px-2 tabular-nums text-muted-foreground">
              Page {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: SortDir
  onClick: () => void
}) {
  return (
    <TableHead className="text-right text-xs font-medium text-muted-foreground">
      <button
        type="button"
        onClick={onClick}
        aria-sort={
          active ? (direction === "asc" ? "ascending" : "descending") : "none"
        }
        className={cn(
          "ml-auto inline-flex cursor-pointer items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          active && "text-foreground",
        )}
      >
        {label}
        {active &&
          (direction === "desc" ? (
            <ChevronDownIcon className="size-3" />
          ) : (
            <ChevronUpIcon className="size-3" />
          ))}
      </button>
    </TableHead>
  )
}

