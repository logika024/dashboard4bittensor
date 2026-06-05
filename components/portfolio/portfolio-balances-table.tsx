"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
} from "lucide-react"
import { SubnetIcon } from "@/components/dashboard/subnet-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  buildPortfolioBalanceRows,
  matchesBalanceQuery,
  PORTFOLIO_BALANCE_SORT_KEYS,
  sortPortfolioBalanceRows,
  type PortfolioBalanceSortDir,
  type PortfolioBalanceSortKey,
  type PortfolioBalanceTableRow,
} from "@/lib/portfolio/balance-table"
import type { ColdkeyPortfolioBalances } from "@/lib/taoswap/types"
import type { SubnetScreenerRow } from "@/lib/taoswap/subnets"
import { cn } from "@/lib/utils"
import {
  getStoredBalanceRowCount,
  setStoredBalanceRowCount,
  skeletonRowCount,
} from "@/lib/portfolio/balance-row-counts"

const SEARCH_DEBOUNCE_MS = 300
const SORT_THROTTLE_MS = 180
const PAGE_SIZE_OPTIONS = ["10", "25", "100"] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]
const DEFAULT_PAGE_SIZE: PageSizeOption = "25"
const SORT_DIR_OPTIONS = ["asc", "desc"] as const

function formatTao(value: number, maxFraction = 4): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFraction,
  })
}

function formatUsd(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatShare(value: number): string {
  if (value >= 10) return `${value.toFixed(1)}%`
  if (value >= 1) return `${value.toFixed(2)}%`
  if (value > 0) return `${value.toFixed(2)}%`
  return "0%"
}

interface PortfolioBalancesTableProps {
  balances: ColdkeyPortfolioBalances | null
  subnets: SubnetScreenerRow[]
  loading?: boolean
  error?: string | null
  asOf?: string | null
  /** Key used to remember row count in localStorage (coldkey address or all-view scope). */
  rowCountScope?: string
}

export function PortfolioBalancesTable({
  balances,
  subnets,
  loading = false,
  error = null,
  asOf,
  rowCountScope,
}: PortfolioBalancesTableProps) {
  const [
    { q, page, rows: pageSize, sort_by: sortKey, sort_dir: sortDir },
    setTableState,
  ] = useQueryStates({
    q: parseAsString.withDefault("").withOptions({ throttleMs: SEARCH_DEBOUNCE_MS }),
    page: parseAsInteger.withDefault(1),
    rows: parseAsStringLiteral(PAGE_SIZE_OPTIONS).withDefault(DEFAULT_PAGE_SIZE),
    sort_by: parseAsStringLiteral(PORTFOLIO_BALANCE_SORT_KEYS).withDefault(
      "value_tao",
    ),
    sort_dir: parseAsStringLiteral(SORT_DIR_OPTIONS).withDefault("desc"),
  })

  const lastSortClickAtRef = useRef(0)
  const [searchDraft, setSearchDraft] = useState(q)

  useEffect(() => {
    setSearchDraft(q)
  }, [q])

  useEffect(() => {
    const normalizedDraft = searchDraft.trim()
    const normalizedQuery = q.trim()
    if (normalizedDraft === normalizedQuery) return

    const handle = window.setTimeout(() => {
      void setTableState({
        q: normalizedDraft.length ? normalizedDraft : null,
        page: 1,
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
  }, [searchDraft, q, setTableState])

  const allRows = useMemo(() => {
    if (!balances) return []
    return buildPortfolioBalanceRows(balances, subnets)
  }, [balances, subnets])

  useEffect(() => {
    if (rowCountScope && allRows.length > 0) {
      setStoredBalanceRowCount(rowCountScope, allRows.length)
    }
  }, [allRows.length, rowCountScope])

  const storedRowCount = rowCountScope
    ? getStoredBalanceRowCount(rowCountScope)
    : null

  const rows = useMemo(() => {
    const filtered = allRows.filter((row) => matchesBalanceQuery(row, searchDraft))
    return sortPortfolioBalanceRows(
      filtered,
      sortKey as PortfolioBalanceSortKey,
      sortDir as PortfolioBalanceSortDir,
    )
  }, [allRows, searchDraft, sortKey, sortDir])

  const pageSizeValue = Number.parseInt(pageSize, 10)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSizeValue))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * pageSizeValue
  const visibleRows = rows.slice(start, start + pageSizeValue)

  function toggleSort(key: PortfolioBalanceSortKey) {
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

  const snapshotDate = asOf ?? balances?.asOf ?? null
  const hasData = balances != null
  const isInitialLoad = loading && !hasData
  const isRefreshing = loading && hasData
  const showTable = hasData && !isInitialLoad
  const loadingSkeletonRows = skeletonRowCount(rowCountScope, pageSizeValue)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-sm font-medium">
          Balances
          <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {isInitialLoad ? (
              storedRowCount != null ? (
                storedRowCount
              ) : (
                <Skeleton className="inline-block h-3 w-4" />
              )
            ) : (
              allRows.length
            )}
          </span>
        </span>
        {snapshotDate && (
          <span className="text-xs text-muted-foreground">
            Snapshot as of {snapshotDate}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search by name, symbol, or netuid…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="h-8 rounded-md px-2 pl-8 text-sm"
          />
        </div>

        <div className="flex h-8 shrink-0 items-center rounded-md border p-0.5">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                void setTableState({ rows: size, page: 1 })
              }}
              className={cn(
                "h-full rounded px-2.5 text-sm font-medium tabular-nums",
                pageSize === size
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isInitialLoad ? (
        <PortfolioBalancesTableSkeleton rows={loadingSkeletonRows} />
      ) : showTable ? (
        <div className="relative overflow-x-auto rounded-xl border border-border bg-card">
          {isRefreshing && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/40 backdrop-blur-[2px]"
              aria-busy="true"
              aria-live="polite"
            >
              <Spinner className="size-6 text-muted-foreground" label="Refreshing balances" />
            </div>
          )}
          <Table className="min-w-[960px] text-xs">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortableHead
                  label="Subnet"
                  align="left"
                  active={sortKey === "subnet"}
                  direction={sortDir}
                  onClick={() => toggleSort("subnet")}
                />
                <SortableHead
                  label="Name"
                  align="left"
                  active={sortKey === "name"}
                  direction={sortDir}
                  onClick={() => toggleSort("name")}
                />
                <SortableHead
                  label="Price (τ)"
                  active={sortKey === "price_tao"}
                  direction={sortDir}
                  onClick={() => toggleSort("price_tao")}
                />
                <SortableHead
                  label="Price ($)"
                  active={sortKey === "price_usd"}
                  direction={sortDir}
                  onClick={() => toggleSort("price_usd")}
                />
                <SortableHead
                  label="Balance"
                  active={sortKey === "balance"}
                  direction={sortDir}
                  onClick={() => toggleSort("balance")}
                />
                <SortableHead
                  label="Value (τ)"
                  active={sortKey === "value_tao"}
                  direction={sortDir}
                  onClick={() => toggleSort("value_tao")}
                />
                <SortableHead
                  label="Value ($)"
                  active={sortKey === "value_usd"}
                  direction={sortDir}
                  onClick={() => toggleSort("value_usd")}
                />
                <SortableHead
                  label="Share"
                  active={sortKey === "share"}
                  direction={sortDir}
                  onClick={() => toggleSort("share")}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {allRows.length === 0
                      ? "No balances found"
                      : "No rows match your search"}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => (
                  <BalanceRow key={rowKey(row)} row={row} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {showTable && rows.length > pageSizeValue && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {start + 1}–{Math.min(start + pageSizeValue, rows.length)} of{" "}
            {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage <= 1}
              onClick={() => void setTableState({ page: safePage - 1 })}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="min-w-[4rem] text-center tabular-nums">
              {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage >= totalPages}
              onClick={() => void setTableState({ page: safePage + 1 })}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PortfolioBalancesTableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table className="min-w-[960px] text-xs">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="h-8 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Subnet
            </TableHead>
            <TableHead className="h-8 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Name
            </TableHead>
            {["Price (τ)", "Price ($)", "Balance", "Value (τ)", "Value ($)", "Share"].map(
              (label) => (
                <TableHead
                  key={label}
                  className="h-8 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  {label}
                </TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-5 w-8" />
              </TableCell>
              <TableCell>
                <div className="flex min-w-[140px] items-center gap-2">
                  <Skeleton className="size-5 shrink-0 rounded-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-3 w-14" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-3 w-12" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-3 w-16" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-3 w-14" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-3 w-12" />
              </TableCell>
              <TableCell>
                <div className="flex min-w-[88px] items-center gap-2">
                  <Skeleton className="h-1.5 flex-1" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function rowKey(row: PortfolioBalanceTableRow): string {
  return row.netuid == null ? "available" : String(row.netuid)
}

function BalanceRow({ row }: { row: PortfolioBalanceTableRow }) {
  const accent =
    row.share >= 50 ? "text-orange-400" : row.netuid == null ? "text-sky-400" : "text-blue-400"
  const barColor =
    row.share >= 50 ? "bg-orange-400" : row.netuid == null ? "bg-sky-400" : "bg-blue-400"

  return (
    <TableRow className="hover:bg-muted/20">
      <TableCell className="font-mono tabular-nums">
        {row.netuid != null ? (
          <span className="inline-flex min-w-[2rem] items-center justify-center rounded bg-muted px-1.5 py-0.5 text-[11px]">
            {row.netuid}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex min-w-[140px] items-center gap-2">
          {row.netuid != null ? (
            <SubnetIcon
              netuid={row.netuid}
              name={row.name}
              logoUrl={row.logoUrl}
              size="size-5"
            />
          ) : (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
              τ
            </span>
          )}
          <span className="truncate">
            {row.symbol && (
              <span className="mr-1 text-muted-foreground">{row.symbol}</span>
            )}
            {row.name}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatTao(row.priceTao, 4)} τ
      </TableCell>
      <TableCell className="text-right tabular-nums text-emerald-400">
        {formatUsd(row.priceUsd)}
      </TableCell>
      <TableCell className={cn("text-right tabular-nums font-medium", accent)}>
        {formatTao(row.balance, 4)} {row.balanceSymbol}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatTao(row.valueTao, 2)} τ
      </TableCell>
      <TableCell className="text-right tabular-nums text-emerald-400">
        {formatUsd(row.valueUsd)}
      </TableCell>
      <TableCell>
        <div className="flex min-w-[88px] items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", barColor)}
              style={{ width: `${Math.min(row.share, 100)}%` }}
            />
          </div>
          <span className="w-10 text-right tabular-nums text-muted-foreground">
            {formatShare(row.share)}
          </span>
        </div>
      </TableCell>
    </TableRow>
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
  direction: string
  onClick: () => void
  align?: "left" | "right"
}) {
  return (
    <TableHead
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(
        "h-8 text-xs font-medium text-muted-foreground uppercase tracking-wide",
        align === "left" ? "text-left" : "text-right",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          align === "right" && "ml-auto",
          active && "text-foreground",
        )}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ChevronUpIcon className="size-3" />
          ) : (
            <ChevronDownIcon className="size-3" />
          )
        ) : null}
      </button>
    </TableHead>
  )
}
