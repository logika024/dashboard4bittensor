"use client"

import { useMemo, useState } from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CopyIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { MetagraphNeuron } from "@/lib/taostats/subnets"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15
const RAO_PER_TAO = 1_000_000_000

type SortKey = "emission" | "daily_reward"
type SortDir = "asc" | "desc"

interface MetagraphTableProps {
  neurons: MetagraphNeuron[]
  loadError?: string | null
}

export function MetagraphTable({ neurons, loadError }: MetagraphTableProps) {
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // Sorted view — when no sort key is active, fall through to the API order
  // (uid asc) so the metagraph reads naturally by neuron position.
  const sorted = useMemo(() => {
    if (!sortKey) return neurons
    const get = (n: MetagraphNeuron) =>
      Number.parseFloat(sortKey === "emission" ? n.emission : n.dailyReward)
    const sign = sortDir === "desc" ? -1 : 1
    return [...neurons].sort((a, b) => sign * (get(a) - get(b)))
  }, [neurons, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const visible = useMemo(
    () => sorted.slice(start, end),
    [sorted, start, end],
  )
  // Re-key on sort/page change so the row entrance animation replays.
  const bodyKey = `meta-${safePage}-${sortKey ?? "uid"}-${sortDir}-${sorted.length}`

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
    setPage(1)
  }

  return (
    <Card className="gap-4 px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-foreground/90 uppercase">
          Metagraph
        </h2>
        <p className="text-xs tabular-nums text-muted-foreground">
          {neurons.length} {neurons.length === 1 ? "neuron" : "neurons"}
        </p>
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
              <TableHead className="px-3 text-center text-xs font-medium text-muted-foreground">
                Active
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-medium text-muted-foreground">
                Stake α
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-medium text-muted-foreground">
                V-Trust
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-medium text-muted-foreground">
                Trust
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-medium text-muted-foreground">
                Consensus
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-medium text-muted-foreground">
                Incentive
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-medium text-muted-foreground">
                Dividends
              </TableHead>
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
                  No neurons to display
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
                    <CopyableAddress address={n.hotkey.ss58} />
                  </TableCell>
                  <TableCell className="px-3 text-xs">
                    <CopyableAddress address={n.coldkey.ss58} />
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
                    {formatRao(n.totalAlphaStake)}
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
                    {formatRao(n.emission)}
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm tabular-nums">
                    {formatRao(n.dailyReward)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {neurons.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="tabular-nums text-muted-foreground">
            Showing {start + 1}–{Math.min(end, neurons.length)} of{" "}
            {neurons.length}
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
}: {
  label: string
  active: boolean
  direction: SortDir
  onClick: () => void
}) {
  return (
    <TableHead className="px-3 text-right text-xs font-medium text-muted-foreground">
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

/**
 * Click-to-copy address pill — truncated display, copy icon on hover,
 * brief check-mark feedback after the clipboard write resolves.
 */
function CopyableAddress({ address }: { address: string }) {
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
        // Browsers can reject clipboard writes in non-secure or unfocused
        // contexts. Silently no-op — the title attr still shows the address.
      })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy address: ${address}`}
      aria-label={copied ? "Address copied" : `Copy address ${address}`}
      className="group/copy -mx-1 inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 font-mono transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span>{truncateAddress(address)}</span>
      {copied ? (
        <CheckIcon className="size-3 text-emerald-400" />
      ) : (
        <CopyIcon className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100" />
      )}
    </button>
  )
}

/** "5DFwFpurRF...QbWdsnJp" — first 10 + last 8 of ss58, separated by ellipsis. */
function truncateAddress(addr: string): string {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`
}

function formatFraction(raw: string): string {
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n)) return "—"
  return n.toFixed(4)
}

/** Format a rao-scale string as TAO with adaptive precision + K/M/B suffix. */
function formatRao(raw: string): string {
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n) || n === 0) return "0"
  const tao = n / RAO_PER_TAO
  const abs = Math.abs(tao)
  if (abs >= 1_000_000) return `${(tao / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(tao / 1_000).toFixed(2)}K`
  if (abs >= 1) return tao.toFixed(2)
  if (abs >= 0.0001) return tao.toFixed(4)
  return tao.toExponential(2)
}
