"use client"

import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { MinerDistribution, MinerDistributionRow } from "@/lib/taoswap/distribution"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

interface DistributionViewProps {
  data: MinerDistribution
  loadError?: string | null
}

function truncateKey(key: string, head = 6, tail = 6): string {
  if (key.length <= head + tail + 3) return key
  return `${key.slice(0, head)}...${key.slice(-tail)}`
}

function segmentColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1)
  const hue = 186 - t * 48
  const saturation = 82 - t * 38
  const lightness = 54 - t * 40
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

interface DistributionBarProps {
  rows: MinerDistributionRow[]
  labelName: string
}

function DistributionBar({ rows, labelName }: DistributionBarProps) {
  const [hovered, setHovered] = useState<{
    row: MinerDistributionRow
    x: number
    y: number
  } | null>(null)

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + row.minerCount, 0) || 1,
    [rows],
  )

  if (rows.length === 0) return null

  return (
    <>
      <div
        className="flex h-12 w-full overflow-hidden rounded-sm border border-black/40 bg-black"
        onMouseLeave={() => setHovered(null)}
      >
        {rows.map((row, index) => {
          const widthPct = (row.minerCount / total) * 100

          return (
            <div
              key={row.key}
              className="relative h-full shrink-0 cursor-default border-r border-black/70 last:border-r-0"
              style={{
                width: `${widthPct}%`,
                minWidth: widthPct > 0 ? "1px" : undefined,
                backgroundColor: segmentColor(index, rows.length),
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setHovered({
                  row,
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                })
              }}
            />
          )
        })}
      </div>

      {hovered &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full pb-2"
            style={{ left: hovered.x, top: hovered.y }}
          >
            <div className="min-w-[148px] rounded-sm border border-white/10 bg-[#1a1a1e] px-3 py-2 text-xs text-white shadow-xl">
              <p className="text-white/70">{labelName}</p>
              <p className="font-mono font-medium">{truncateKey(hovered.row.key)}</p>
              <p className="mt-1.5 text-white/70">Miners Count</p>
              <p className="text-base font-semibold tabular-nums">
                {hovered.row.minerCount}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

function PaginatedTable({
  title,
  subtitle,
  columnLabel,
  rows,
}: {
  title: string
  subtitle: string
  columnLabel: string
  rows: MinerDistributionRow[]
}) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

  const pageRows = useMemo(() => {
    const start = page * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [page, rows])

  const rangeStart = rows.length === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, rows.length)

  return (
    <Card className="flex flex-col gap-4 overflow-visible p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {rows.length > 0 && (
        <DistributionBar rows={rows} labelName={columnLabel} />
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2.5 font-medium">{columnLabel}</th>
              <th className="px-4 py-2.5 font-medium text-right">
                Miner count
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  No data
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-2 font-mono text-xs">{row.key}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.minerCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeftIcon className="size-3.5" />
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter(
              (i) =>
                i === 0 ||
                i === totalPages - 1 ||
                Math.abs(i - page) <= 1,
            )
            .map((pageNum, idx, arr) => {
              const prev = arr[idx - 1]
              const showEllipsis = prev != null && pageNum - prev > 1
              return (
                <span key={pageNum} className="flex items-center gap-1">
                  {showEllipsis && (
                    <span className="px-1 text-muted-foreground">…</span>
                  )}
                  <Button
                    type="button"
                    variant={pageNum === page ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 min-w-7 px-2"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                </span>
              )
            })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRightIcon className="size-3.5" />
          </Button>
        </div>
        <span>
          Showing {rangeStart} to {rangeEnd} of {rows.length} entries
        </span>
      </div>
    </Card>
  )
}

export function DistributionView({ data, loadError }: DistributionViewProps) {
  return (
    <div className="mx-auto flex w-full max-w-425 flex-col gap-6 p-6 animate-in fade-in-0 duration-300">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Distribution
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.totalMiners} active miners · {data.minersWithKnownIp} with a
          known IP · {data.byColdkey.length} coldkeys · {data.byIp.length}{" "}
          unique IPs
        </p>
      </header>

      {loadError && (
        <p
          role="alert"
          className={cn(
            "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive",
          )}
        >
          {loadError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PaginatedTable
          title="By coldkey"
          subtitle="Active miners registered under each coldkey"
          columnLabel="Coldkey"
          rows={data.byColdkey}
        />
        <PaginatedTable
          title="By IP"
          subtitle="Active miners with a published axon IP (miners without IP are excluded)"
          columnLabel="IP"
          rows={data.byIp}
        />
      </div>
    </div>
  )
}
