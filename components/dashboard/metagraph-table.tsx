"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  SearchIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CopyableAddress } from "@/components/dashboard/copyable-address"
import type { MetagraphNeuron } from "@/lib/taoswap/subnets"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15

type SortKey =
  | "active"
  | "stake"
  | "v_trust"
  | "trust"
  | "consensus"
  | "incentive"
  | "dividends"
  | "emission"
  | "daily_reward"
type SortDir = "asc" | "desc"

/** Value getter per sortable column. Boolean Active is coerced to 0/1. */
const SORT_VALUE: Record<SortKey, (n: MetagraphNeuron) => number> = {
  active: (n) => (n.active ? 1 : 0),
  stake: (n) => n.totalAlphaStake,
  v_trust: (n) => n.validatorTrust,
  trust: (n) => n.trust,
  consensus: (n) => n.consensus,
  incentive: (n) => n.incentive,
  dividends: (n) => n.dividends,
  emission: (n) => n.emission,
  daily_reward: (n) => n.dailyReward,
}

interface MetagraphTableProps {
  neurons: MetagraphNeuron[]
  loadError?: string | null
}

function matchesQuery(n: MetagraphNeuron, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase().trim()
  // Numeric input matches UID exactly so `42` finds UID 42 (and not UID 142).
  if (/^\d+$/.test(needle) && String(n.uid) === needle) return true
  return (
    n.hotkey.toLowerCase().includes(needle) ||
    n.coldkey.toLowerCase().includes(needle)
  )
}

export function MetagraphTable({ neurons, loadError }: MetagraphTableProps) {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const filteredSorted = useMemo(() => {
    const filtered = neurons.filter((n) => matchesQuery(n, query))
    if (!sortKey) return filtered
    const get = SORT_VALUE[sortKey]
    const sign = sortDir === "desc" ? -1 : 1
    return filtered.sort((a, b) => sign * (get(a) - get(b)))
  }, [neurons, query, sortKey, sortDir])

  // Reset to page 1 on any visible-set change.
  useEffect(() => {
    setPage(1)
  }, [query, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const visible = useMemo(
    () => filteredSorted.slice(start, end),
    [filteredSorted, start, end],
  )
  // Re-key on sort/page/filter change so the row entrance animation replays.
  const bodyKey = `meta-${safePage}-${sortKey ?? "uid"}-${sortDir}-${filteredSorted.length}-${query}`

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  return (
    <Card className="gap-4 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-foreground/90 uppercase">
          Metagraph
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-xs">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Search hotkey, coldkey, or UID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <p className="hidden text-xs tabular-nums text-muted-foreground sm:block">
            {filteredSorted.length}
            {query && ` / ${neurons.length}`}{" "}
            {filteredSorted.length === 1 ? "neuron" : "neurons"}
          </p>
        </div>
      </div>

      {loadError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {loadError}
        </p>
      )}

      <div className="-mx-5 overflow-x-auto border-y border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-14 px-3 text-xs font-medium text-muted-foreground">
                UID
              </TableHead>
              <TableHead className="px-3 text-xs font-medium text-muted-foreground">
                Hotkey
              </TableHead>
              <TableHead className="px-3 text-xs font-medium text-muted-foreground">
                Coldkey
              </TableHead>
              <SortableHead
                label="Active"
                align="center"
                active={sortKey === "active"}
                direction={sortDir}
                onClick={() => toggleSort("active")}
              />
              <SortableHead
                label="Stake α"
                active={sortKey === "stake"}
                direction={sortDir}
                onClick={() => toggleSort("stake")}
              />
              <SortableHead
                label="V-Trust"
                active={sortKey === "v_trust"}
                direction={sortDir}
                onClick={() => toggleSort("v_trust")}
              />
              <SortableHead
                label="Trust"
                active={sortKey === "trust"}
                direction={sortDir}
                onClick={() => toggleSort("trust")}
              />
              <SortableHead
                label="Consensus"
                active={sortKey === "consensus"}
                direction={sortDir}
                onClick={() => toggleSort("consensus")}
              />
              <SortableHead
                label="Incentive"
                active={sortKey === "incentive"}
                direction={sortDir}
                onClick={() => toggleSort("incentive")}
              />
              <SortableHead
                label="Dividends"
                active={sortKey === "dividends"}
                direction={sortDir}
                onClick={() => toggleSort("dividends")}
              />
              <SortableHead
                label="Emission α"
                active={sortKey === "emission"}
                direction={sortDir}
                onClick={() => toggleSort("emission")}
              />
              <SortableHead
                label="Daily Reward α"
                active={sortKey === "daily_reward"}
                direction={sortDir}
                onClick={() => toggleSort("daily_reward")}
              />
            </TableRow>
          </TableHeader>
          <TableBody key={bodyKey}>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={12}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {query
                    ? `No neurons match "${query}"`
                    : "No neurons to display"}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((n, idx) => (
                <TableRow
                  key={n.uid}
                  className={cn(
                    "animate-in fade-in-0 slide-in-from-bottom-1",
                    // Subnet owner gets a subtle amber row tint that survives
                    // hover so it stays visually distinct.
                    n.isOwnerHotkey && "bg-amber-500/6 hover:bg-amber-500/10",
                  )}
                  style={{
                    animationDuration: "280ms",
                    animationDelay: `${Math.min(idx * 14, 200)}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <TableCell className="px-3 text-sm tabular-nums text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{n.uid}</span>
                      {n.isOwnerHotkey && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 uppercase">
                          Owner
                        </span>
                      )}
                      {n.validatorPermit && !n.isOwnerHotkey && (
                        <span
                          title="Validator permit"
                          className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sky-300 uppercase"
                        >
                          V
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-xs">
                    <CopyableAddress address={n.hotkey} />
                  </TableCell>
                  <TableCell className="px-3 text-xs">
                    <CopyableAddress address={n.coldkey} />
                  </TableCell>
                  <TableCell className="px-3 text-center text-sm">
                    <span
                      aria-label={n.active ? "Active" : "Inactive"}
                      title={n.active ? "Active" : "Inactive"}
                      className={n.active ? "text-emerald-400" : "text-red-400"}
                    >
                      ●
                    </span>
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm tabular-nums">
                    {formatTao(n.totalAlphaStake)}
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm tabular-nums">
                    {formatFraction(n.validatorTrust)}
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm tabular-nums">
                    {formatFraction(n.trust)}
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm tabular-nums">
                    {formatFraction(n.consensus)}
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm tabular-nums">
                    {formatFraction(n.incentive)}
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm tabular-nums">
                    {formatFraction(n.dividends)}
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm tabular-nums">
                    {formatTao(n.emission)}
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm tabular-nums">
                    {formatTao(n.dailyReward)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredSorted.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="tabular-nums text-muted-foreground">
            Showing {start + 1}–{Math.min(end, filteredSorted.length)} of{" "}
            {filteredSorted.length}
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
            <span className={cn("px-2 tabular-nums text-muted-foreground")}>
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
    </Card>
  )
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
  align = "right",
}: {
  label: string
  active: boolean
  direction: SortDir
  onClick: () => void
  align?: "left" | "center" | "right"
}) {
  const cellAlign =
    align === "center"
      ? "text-center"
      : align === "left"
        ? "text-left"
        : "text-right"
  const buttonMargin =
    align === "center" ? "mx-auto" : align === "left" ? "mr-auto" : "ml-auto"
  return (
    <TableHead
      className={cn(
        "px-3 text-xs font-medium text-muted-foreground",
        cellAlign,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-sort={
          active ? (direction === "asc" ? "ascending" : "descending") : "none"
        }
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          buttonMargin,
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

function formatFraction(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return value.toFixed(4)
}

/** Format a TAO-denominated number with adaptive precision + K/M/B suffix. */
function formatTao(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0"
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  if (abs >= 1) return value.toFixed(2)
  if (abs >= 0.0001) return value.toFixed(4)
  return value.toExponential(2)
}
