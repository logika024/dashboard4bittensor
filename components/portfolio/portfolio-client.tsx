"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { EyeIcon, LayoutGridIcon, PlusIcon, XIcon } from "lucide-react"
import type {
  ColdkeyPortfolioBalances,
  PortfolioBalanceHistory,
} from "@/lib/taoswap/types"
import type { SubnetScreenerRow } from "@/lib/taoswap/subnets"
import { portfolioChannelHref } from "@/lib/portfolio/channels"
import { aggregatePortfolioBalances } from "@/lib/portfolio/balance-table"
import {
  allBalancesScope,
  coldkeyBalanceScope,
} from "@/lib/portfolio/balance-row-counts"
import {
  migrateLocalColdkeys,
  setColdkeyTracked,
  type ColdkeyLabelRecord,
} from "@/lib/portfolio/nicknames"
import { PORTFOLIO_COLDKEYS_STORAGE_KEY } from "@/lib/portfolio/types"
import {
  isPortfolioAllSelection,
  isTrackedColdkeySelection,
  PORTFOLIO_COLDKEY_QUERY,
  PORTFOLIO_SELECTION_ALL,
  type PortfolioColdkeySelection,
} from "@/lib/portfolio/selection"
import { PortfolioBalancesTable } from "@/components/portfolio/portfolio-balances-table"
import { TrackColdkeyModal } from "@/components/portfolio/track-coldkey-modal"
import {
  BalanceHistoryChart,
  type HistoryPeriod,
} from "@/components/portfolio/balance-history-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PortfolioClientProps {
  initialColdkeys: ColdkeyLabelRecord[]
  initialUntrackedColdkeys: ColdkeyLabelRecord[]
  subnets: SubnetScreenerRow[]
}

export function PortfolioClient({
  initialColdkeys,
  initialUntrackedColdkeys,
  subnets,
}: PortfolioClientProps) {
  const router = useRouter()
  const [coldkeys, setColdkeys] = useState(initialColdkeys)
  const [untrackedColdkeys, setUntrackedColdkeys] = useState(
    initialUntrackedColdkeys,
  )
  const [trackModalOpen, setTrackModalOpen] = useState(false)
  const [selection, setSelection] = useQueryState(
    PORTFOLIO_COLDKEY_QUERY,
    parseAsString.withDefault(PORTFOLIO_SELECTION_ALL),
  )
  const [isSaving, startSaving] = useTransition()
  const [balanceCache, setBalanceCache] = useState<
    Record<string, ColdkeyPortfolioBalances>
  >({})

  const cacheBalance = useCallback(
    (scope: string, data: ColdkeyPortfolioBalances) => {
      setBalanceCache((prev) => ({ ...prev, [scope]: data }))
    },
    [],
  )

  useEffect(() => {
    setColdkeys(initialColdkeys)
    setUntrackedColdkeys(initialUntrackedColdkeys)
  }, [initialColdkeys, initialUntrackedColdkeys])

  useEffect(() => {
    if (
      isPortfolioAllSelection(selection) ||
      isTrackedColdkeySelection(selection, coldkeys)
    ) {
      return
    }
    void setSelection(PORTFOLIO_SELECTION_ALL)
  }, [coldkeys, selection, setSelection])

  useEffect(() => {
    const raw = localStorage.getItem(PORTFOLIO_COLDKEYS_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      void migrateLocalColdkeys(parsed).then((result) => {
        if (result.imported > 0) {
          localStorage.removeItem(PORTFOLIO_COLDKEYS_STORAGE_KEY)
          router.refresh()
        }
      })
    } catch {
      localStorage.removeItem(PORTFOLIO_COLDKEYS_STORAGE_KEY)
    }
  }, [router])

  function handleUntrack(id: string) {
    const removed = coldkeys.find((c) => c.id === id)
    startSaving(async () => {
      const result = await setColdkeyTracked(id, false)
      if (!result.ok) return
      setColdkeys((prev) => prev.filter((c) => c.id !== id))
      if (result.data) {
        setUntrackedColdkeys((prev) => [result.data!, ...prev])
      } else if (removed) {
        setUntrackedColdkeys((prev) => [
          { ...removed, tracked: false },
          ...prev,
        ])
      }
      if (removed && selection === removed.coldkey) {
        void setSelection(PORTFOLIO_SELECTION_ALL)
      }
    })
  }

  function handleTrack(id: string) {
    startSaving(async () => {
      const result = await setColdkeyTracked(id, true)
      if (!result.ok || !result.data) return
      setUntrackedColdkeys((prev) => prev.filter((c) => c.id !== id))
      setColdkeys((prev) => [...prev, result.data!])
      void setSelection(result.data.coldkey)
      setTrackModalOpen(false)
    })
  }

  const isAllSelected = isPortfolioAllSelection(selection)
  const selectedColdkey = useMemo(
    () =>
      isAllSelected
        ? null
        : (coldkeys.find((c) => c.coldkey === selection) ?? null),
    [coldkeys, isAllSelected, selection],
  )

  const allScopeKey = useMemo(() => allBalancesScope(coldkeys), [coldkeys])
  const myColdkeysHref = portfolioChannelHref("my-coldkeys")

  function handleSelect(next: PortfolioColdkeySelection) {
    void setSelection(next)
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-425 flex-col gap-6 p-6 animate-in fade-in-0 duration-300">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Portfolio
        </h1>
        <p className="text-sm text-muted-foreground">
          Balances and history from{" "}
          <a
            href="https://taoswap.org/"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            taoswap.org
          </a>
        </p>
      </header>

      {coldkeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          There&apos;s no coldkeys being tracked — go to{" "}
          <Link
            href={myColdkeysHref}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            #my coldkeys
          </Link>{" "}
          to create a new one!
        </p>
      ) : (
        <>
          <PortfolioTabBar
            coldkeys={coldkeys}
            selection={selection}
            onSelect={handleSelect}
            onUntrack={handleUntrack}
            onAdd={() => setTrackModalOpen(true)}
            untrackDisabled={isSaving}
          />

          <TrackColdkeyModal
            open={trackModalOpen}
            onOpenChange={setTrackModalOpen}
            coldkeys={untrackedColdkeys}
            onTrack={handleTrack}
            trackDisabled={isSaving}
            myColdkeysHref={myColdkeysHref}
          />

          {isAllSelected ? (
            <PortfolioAllView
              coldkeys={coldkeys}
              subnets={subnets}
              scopeKey={allScopeKey}
              cachedBalances={balanceCache[allScopeKey]}
              onBalancesLoaded={cacheBalance}
            />
          ) : selectedColdkey ? (
            <PortfolioColdkeyDetail
              coldkey={selectedColdkey}
              subnets={subnets}
              scopeKey={coldkeyBalanceScope(selectedColdkey.coldkey)}
              cachedBalances={
                balanceCache[coldkeyBalanceScope(selectedColdkey.coldkey)]
              }
              onBalancesLoaded={cacheBalance}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

interface PortfolioTabBarProps {
  coldkeys: ColdkeyLabelRecord[]
  selection: PortfolioColdkeySelection
  onSelect: (selection: PortfolioColdkeySelection) => void
  onUntrack: (id: string) => void
  onAdd: () => void
  untrackDisabled?: boolean
}

function PortfolioTabBar({
  coldkeys,
  selection,
  onSelect,
  onUntrack,
  onAdd,
  untrackDisabled,
}: PortfolioTabBarProps) {
  return (
    <div className="inline-flex w-fit max-w-full self-start items-stretch overflow-hidden rounded-lg border border-border bg-muted/30">
      <div
        role="tablist"
        className="scrollbar-subtle flex min-w-0 items-center gap-1.5 overflow-x-auto p-1.5"
      >
        <TabPill
          active={isPortfolioAllSelection(selection)}
          onClick={() => onSelect(PORTFOLIO_SELECTION_ALL)}
          icon={<LayoutGridIcon className="size-3.5 shrink-0" />}
          label="All"
        />

        {coldkeys.map((ck) => (
          <ColdkeyTabPill
            key={ck.id}
            label={ck.nickname}
            active={selection === ck.coldkey}
            onSelect={() => onSelect(ck.coldkey)}
            onUntrack={() => onUntrack(ck.id)}
            untrackDisabled={untrackDisabled}
          />
        ))}
      </div>

      <div className="flex shrink-0 items-center border-l border-border/50 px-1 py-1.5">
        <button
          type="button"
          onClick={onAdd}
          className="flex cursor-pointer items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Track a coldkey"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}

interface TabPillProps {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}

function TabPill({ active, onClick, icon, label }: TabPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      )}
    >
      <span className={cn(active && "text-orange-500")}>{icon}</span>
      {label}
    </button>
  )
}

interface ColdkeyTabPillProps {
  label: string
  active: boolean
  onSelect: () => void
  onUntrack: () => void
  untrackDisabled?: boolean
}

function ColdkeyTabPill({
  label,
  active,
  onSelect,
  onUntrack,
  untrackDisabled,
}: ColdkeyTabPillProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center rounded-md pr-1.5 text-sm transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex cursor-pointer items-center gap-1.5 py-1.5 pl-2.5 pr-1"
      >
        <EyeIcon
          className={cn(
            "size-3.5 shrink-0",
            active ? "text-orange-500" : "text-muted-foreground",
          )}
        />
        <span className="max-w-[12rem] truncate">{label}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onUntrack()
        }}
        disabled={untrackDisabled}
        className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        aria-label={`Stop tracking ${label}`}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  )
}

async function fetchColdkeyBalances(
  coldkey: string,
): Promise<ColdkeyPortfolioBalances> {
  const res = await fetch(
    `/api/portfolio/balance?coldkey=${encodeURIComponent(coldkey)}`,
  )
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return data as ColdkeyPortfolioBalances
}

function PortfolioAllView({
  coldkeys,
  subnets,
  scopeKey,
  cachedBalances,
  onBalancesLoaded,
}: {
  coldkeys: ColdkeyLabelRecord[]
  subnets: SubnetScreenerRow[]
  scopeKey: string
  cachedBalances?: ColdkeyPortfolioBalances
  onBalancesLoaded: (scope: string, data: ColdkeyPortfolioBalances) => void
}) {
  const [loading, setLoading] = useState(() => !cachedBalances)
  const [error, setError] = useState<string | null>(null)
  const [balances, setBalances] = useState<ColdkeyPortfolioBalances | null>(
    () => cachedBalances ?? null,
  )

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.all(
        coldkeys.map((ck) => fetchColdkeyBalances(ck.coldkey)),
      )
      const aggregated = aggregatePortfolioBalances(results)
      setBalances(aggregated)
      onBalancesLoaded(scopeKey, aggregated)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load totals")
    } finally {
      setLoading(false)
    }
  }, [coldkeys, onBalancesLoaded, scopeKey])

  useEffect(() => {
    setBalances(cachedBalances ?? null)
    setError(null)
    setLoading(!cachedBalances)
    void fetchAll()
  }, [fetchAll, scopeKey])

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBalancesTable
        balances={balances}
        subnets={subnets}
        loading={loading}
        error={error}
        asOf={balances?.asOf}
        rowCountScope={scopeKey}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={loading}
        onClick={() => void fetchAll()}
      >
        Refresh
      </Button>
    </div>
  )
}

function PortfolioColdkeyDetail({
  coldkey,
  subnets,
  scopeKey,
  cachedBalances,
  onBalancesLoaded,
}: {
  coldkey: ColdkeyLabelRecord
  subnets: SubnetScreenerRow[]
  scopeKey: string
  cachedBalances?: ColdkeyPortfolioBalances
  onBalancesLoaded: (scope: string, data: ColdkeyPortfolioBalances) => void
}) {
  const [balances, setBalances] = useState<ColdkeyPortfolioBalances | null>(
    () => cachedBalances ?? null,
  )
  const [history, setHistory] = useState<PortfolioBalanceHistory | null>(null)
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>(30)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => !cachedBalances)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async (days: HistoryPeriod) => {
    setHistoryLoading(true)
    setHistoryError(null)
    setHistory(null)
    try {
      const res = await fetch(
        `/api/portfolio/history?coldkey=${encodeURIComponent(coldkey.coldkey)}&days=${days}`,
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? `History request failed (${res.status})`)
      }
      setHistory(data as PortfolioBalanceHistory)
    } catch (e) {
      setHistoryError(
        e instanceof Error ? e.message : "Failed to load balance history",
      )
    } finally {
      setHistoryLoading(false)
    }
  }, [coldkey.coldkey])

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchColdkeyBalances(coldkey.coldkey)
      setBalances(data)
      onBalancesLoaded(scopeKey, data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balances")
    } finally {
      setLoading(false)
    }
  }, [coldkey.coldkey, onBalancesLoaded, scopeKey])

  const refresh = useCallback(() => {
    void fetchBalances()
    void fetchHistory(historyPeriod)
  }, [fetchBalances, fetchHistory, historyPeriod])

  useEffect(() => {
    setBalances(cachedBalances ?? null)
    setError(null)
    setLoading(!cachedBalances)
    void fetchBalances()
  }, [fetchBalances, scopeKey])

  useEffect(() => {
    setHistory(null)
    void fetchHistory(historyPeriod)
  }, [fetchHistory, historyPeriod, scopeKey])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">{coldkey.nickname}</h2>
        <p className="font-mono text-xs text-muted-foreground break-all">
          {coldkey.coldkey}
        </p>
      </div>

      <PortfolioBalancesTable
        balances={balances}
        subnets={subnets}
        loading={loading}
        error={error}
        asOf={balances?.asOf}
        rowCountScope={scopeKey}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={loading}
        onClick={refresh}
      >
        Refresh
      </Button>

      <Card className="gap-0 bg-muted/20 py-0 shadow-none">
        <CardContent className="min-w-0 p-4">
          <BalanceHistoryChart
            history={history}
            loading={historyLoading}
            error={historyError}
            period={historyPeriod}
            onPeriodChange={setHistoryPeriod}
          />
        </CardContent>
      </Card>
    </div>
  )
}
