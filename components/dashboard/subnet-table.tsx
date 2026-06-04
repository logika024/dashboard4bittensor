"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  SearchIcon,
  StarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const SORT_THROTTLE_MS = 180
const SEARCH_DEBOUNCE_MS = 300
const SUBNET_COL_WIDTH = "w-[220px] min-w-[220px] max-w-[220px]"
const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100", "all"] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]
const DEFAULT_PAGE_SIZE: PageSizeOption = "25"

const SORT_KEY_OPTIONS = [
  "emission",
  "price",
  "price1h",
  "price1d",
  "price1w",
  "price1m",
  "flow1d",
  "flow1w",
  "mcap",
  "liquidity",
  "totalEmission",
  "incentiveBurn",
] as const
type SortKey = (typeof SORT_KEY_OPTIONS)[number]

const SORT_DIR_OPTIONS = ["asc", "desc"] as const
type SortDir = (typeof SORT_DIR_OPTIONS)[number]

interface SubnetTableProps {
  subnets: SubnetScreenerRow[]
  loadError: string | null
}

function pageSizeLabel(size: PageSizeOption): string {
  return size === "all" ? "All" : size
}

function parsePageSize(value: string): PageSizeOption {
  if ((PAGE_SIZE_OPTIONS as readonly string[]).includes(value)) {
    return value as PageSizeOption
  }
  return DEFAULT_PAGE_SIZE
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`
}

function formatPrice(value: number): string {
  return value.toFixed(6)
}

function formatTaoCompact(tao: number): string {
  if (!Number.isFinite(tao) || tao <= 0) return "—"
  if (tao >= 1_000_000_000) return `${(tao / 1_000_000_000).toFixed(2)}B`
  if (tao >= 1_000_000) return `${(tao / 1_000_000).toFixed(2)}M`
  if (tao >= 1_000) return `${(tao / 1_000).toFixed(2)}K`
  return tao.toFixed(2)
}

function formatFlow(value: number): string {
  if (!Number.isFinite(value)) return "—"
  if (value === 0) return "0.000000"
  const sign = value > 0 ? "+" : "-"
  return `${sign}${Math.abs(value).toFixed(6)}`
}

function formatFlowMaybe(value: number | null): string {
  if (value == null) return "—"
  return formatFlow(value)
}

function formatTaoMetric(value: number): string {
  if (!Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  if (abs === 0 || abs < 0.0001) return "0"
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  if (abs >= 1) return value.toFixed(2)
  return value.toFixed(4)
}

function formatBurnPct(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}%`
}

function pctClass(fraction: number): string {
  if (fraction > 0) return "text-positive"
  if (fraction < 0) return "text-red-300"
  return "text-muted-foreground"
}

function chipToneClass(tone: "positive" | "negative" | "neutral"): string {
  if (tone === "positive")
    return "bg-positive/10 text-positive"
  if (tone === "negative") return "bg-red-500/10 text-red-300"
  return "bg-muted/35 text-foreground/90"
}

function signedTone(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive"
  if (value < 0) return "negative"
  return "neutral"
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
  price1h: (s) => s.price_1h_pct_change,
  price1d: (s) => s.price_1d_pct_change,
  price1w: (s) => s.price_7d_pct_change,
  price1m: (s) => s.price_1m_pct_change,
  flow1d: (s) => s.flow_1d,
  flow1w: (s) => s.flow_1w ?? 0,
  mcap: (s) => s.marketCap,
  liquidity: (s) => s.liquidity,
  totalEmission: (s) => s.totalEmission,
  incentiveBurn: (s) => s.incentiveBurn,
}

export function SubnetTable({ subnets, loadError }: SubnetTableProps) {
  const [
    {
      query,
      page,
      rows: pageSize,
      sort_by: sortKey,
      sort_dir: sortDir,
    },
    setTableState,
  ] = useQueryStates({
    query: parseAsString.withDefault("").withOptions({ throttleMs: SEARCH_DEBOUNCE_MS }),
    page: parseAsInteger.withDefault(1),
    rows: parseAsStringLiteral(PAGE_SIZE_OPTIONS).withDefault(DEFAULT_PAGE_SIZE),
    sort_by: parseAsStringLiteral(SORT_KEY_OPTIONS).withDefault("emission"),
    sort_dir: parseAsStringLiteral(SORT_DIR_OPTIONS).withDefault("desc"),
  })
  const lastSortClickAtRef = useRef(0)
  const [searchDraft, setSearchDraft] = useState(query)
  // Local-only favorites (resets on reload) — TODO: persist once we have a user table.
  const [favorites, setFavorites] = useState<Set<number>>(new Set())

  useEffect(() => {
    setSearchDraft(query)
  }, [query])

  useEffect(() => {
    const normalizedDraft = searchDraft.trim()
    const normalizedQuery = query.trim()
    if (normalizedDraft === normalizedQuery) return

    const handle = window.setTimeout(() => {
      void setTableState({
        query: normalizedDraft.length ? normalizedDraft : null,
        page: 1,
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
  }, [searchDraft, query, setTableState])

  const rows = useMemo(() => {
    const filtered = subnets.filter((s) => matchesQuery(s, searchDraft))
    const value = SORT_VALUE[sortKey]
    const sign = sortDir === "desc" ? -1 : 1
    filtered.sort((a, b) => sign * (value(a) - value(b)))
    return filtered
  }, [subnets, searchDraft, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    const now = Date.now()
    if (now - lastSortClickAtRef.current < SORT_THROTTLE_MS) return
    lastSortClickAtRef.current = now

    if (sortKey === key) {
      void setTableState({
        sort_dir: sortDir === "desc" ? "asc" : "desc",
        page: 1,
      })
    } else {
      void setTableState({
        sort_by: key,
        sort_dir: "desc",
        page: 1,
      })
    }
  }

  const pageSizeValue =
    pageSize === "all" ? rows.length : Number.parseInt(pageSize, 10)
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(rows.length / Math.max(pageSizeValue, 1)))
  const safePage = pageSize === "all" ? 1 : Math.min(Math.max(page, 1), totalPages)
  const start = pageSize === "all" ? 0 : (safePage - 1) * pageSizeValue
  const end = pageSize === "all" ? rows.length : start + pageSizeValue
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
  const bodyKey = `${safePage}|${searchDraft}|${sortKey}|${sortDir}`

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
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Rows: {pageSizeLabel(pageSize)}
                <ChevronDownIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={String(pageSize)}
                onValueChange={(value) => {
                  void setTableState({
                    rows: parsePageSize(value),
                    page: 1,
                  })
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <DropdownMenuRadioItem key={String(size)} value={String(size)}>
                    {pageSizeLabel(size)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <p
            key={`count-${rows.length}-${searchDraft}`}
            className="text-xs text-muted-foreground animate-in fade-in-0 duration-300"
          >
            {rows.length} {rows.length === 1 ? "subnet" : "subnets"}
            {searchDraft.trim() && ` matching "${searchDraft.trim()}"`}
          </p>
        </div>
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
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-8 w-12 text-xs font-medium text-muted-foreground">
                #
              </TableHead>
              <TableHead className="h-8 w-8" />
              <TableHead
                className={cn(
                  "h-8 text-xs font-medium text-muted-foreground",
                  SUBNET_COL_WIDTH,
                )}
              >
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
                label="1H"
                active={sortKey === "price1h"}
                direction={sortDir}
                onClick={() => toggleSort("price1h")}
              />
              <SortableHead
                label="1D"
                active={sortKey === "price1d"}
                direction={sortDir}
                onClick={() => toggleSort("price1d")}
              />
              <SortableHead
                label="1W"
                active={sortKey === "price1w"}
                direction={sortDir}
                onClick={() => toggleSort("price1w")}
              />
              <SortableHead
                label="1M"
                active={sortKey === "price1m"}
                direction={sortDir}
                onClick={() => toggleSort("price1m")}
              />
              <SortableHead
                label="Flow 1D τ"
                active={sortKey === "flow1d"}
                direction={sortDir}
                onClick={() => toggleSort("flow1d")}
              />
              <SortableHead
                label="Flow 1W τ"
                active={sortKey === "flow1w"}
                direction={sortDir}
                onClick={() => toggleSort("flow1w")}
              />
              <SortableHead
                label="M Cap τ"
                active={sortKey === "mcap"}
                direction={sortDir}
                onClick={() => toggleSort("mcap")}
              />
              <SortableHead
                label="Liquidity τ"
                active={sortKey === "liquidity"}
                direction={sortDir}
                onClick={() => toggleSort("liquidity")}
              />
              <SortableHead
                label="Total Emission τ"
                active={sortKey === "totalEmission"}
                direction={sortDir}
                onClick={() => toggleSort("totalEmission")}
              />
              <SortableHead
                label="Incentive Burn %"
                active={sortKey === "incentiveBurn"}
                direction={sortDir}
                onClick={() => toggleSort("incentiveBurn")}
              />
            </TableRow>
          </TableHeader>
          <TableBody key={bodyKey} className="[&_td]:py-1.5">
            {visibleRows.length === 0 ? (
              <TableRow className="hover:bg-transparent animate-in fade-in-0 duration-300">
                <TableCell
                  colSpan={15}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {subnets.length === 0
                    ? "No subnets to display"
                    : `No subnets match "${searchDraft.trim()}"`}
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
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
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
                        className="cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:text-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <StarIcon
                          className={cn(
                            "size-3.5",
                            isFav && "fill-yellow-400 text-yellow-400",
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell className={SUBNET_COL_WIDTH}>
                      <Link
                        href={`/subnet/${s.netuid}`}
                        className={cn(
                          "group/subnet -mx-1 flex max-w-full items-center gap-2.5 rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                          SUBNET_COL_WIDTH,
                        )}
                      >
                        <SubnetIcon
                          netuid={s.netuid}
                          name={s.name}
                          logoUrl={s.logoUrl}
                        />
                        <div className="min-w-0 flex flex-col leading-tight">
                          <span className="truncate text-xs font-medium text-foreground decoration-foreground/50 underline-offset-2 group-hover/subnet:underline">
                            {s.name}
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground">
                            SN{s.netuid}
                          </span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPct(s.emission_pct)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(s.price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-1.5 py-0.5 font-medium",
                          chipToneClass(signedTone(s.price_1h_pct_change)),
                          pctClass(s.price_1h_pct_change),
                        )}
                      >
                        {formatPct(s.price_1h_pct_change)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-1.5 py-0.5 font-medium",
                          chipToneClass(signedTone(s.price_1d_pct_change)),
                          pctClass(s.price_1d_pct_change),
                        )}
                      >
                        {formatPct(s.price_1d_pct_change)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-1.5 py-0.5 font-medium",
                          chipToneClass(signedTone(s.price_7d_pct_change)),
                          pctClass(s.price_7d_pct_change),
                        )}
                      >
                        {formatPct(s.price_7d_pct_change)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-1.5 py-0.5 font-medium",
                          chipToneClass(signedTone(s.price_1m_pct_change)),
                          pctClass(s.price_1m_pct_change),
                        )}
                      >
                        {formatPct(s.price_1m_pct_change)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-1.5 py-0.5 font-medium",
                          chipToneClass(signedTone(s.flow_1d)),
                          pctClass(s.flow_1d),
                        )}
                      >
                        {formatFlow(s.flow_1d)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-1.5 py-0.5 font-medium",
                          chipToneClass(
                            s.flow_1w == null ? "neutral" : signedTone(s.flow_1w),
                          ),
                          s.flow_1w == null
                            ? "text-muted-foreground"
                            : pctClass(s.flow_1w),
                        )}
                      >
                        {formatFlowMaybe(s.flow_1w)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTaoCompact(s.marketCap)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTaoCompact(s.liquidity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTaoMetric(s.totalEmission)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBurnPct(s.incentiveBurn)}
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
            {pageSize !== "all" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void setTableState({ page: Math.max(1, safePage - 1) })
                  }}
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
                  onClick={() => {
                    void setTableState({
                      page: Math.min(totalPages, safePage + 1),
                    })
                  }}
                  disabled={safePage >= totalPages}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRightIcon className="size-4" />
                </Button>
              </>
            )}
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
    <TableHead
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      className="h-8 text-right text-xs font-medium text-muted-foreground"
    >
      <button
        type="button"
        onClick={onClick}
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

