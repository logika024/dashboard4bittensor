"use client"

import { useCallback, useEffect, useState } from "react"
import type { ColdkeyPortfolioBalances } from "@/lib/taoapp/types"
import type { PortfolioBalanceHistory } from "@/lib/taoswap/types"
import {
  PORTFOLIO_COLDKEYS_STORAGE_KEY,
  type TrackedColdkey,
} from "@/lib/portfolio/types"
import {
  BalanceHistoryChart,
  type HistoryPeriod,
} from "@/components/portfolio/balance-history-chart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const ALL_ID = "__all__"

function loadTrackedColdkeys(): TrackedColdkey[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(PORTFOLIO_COLDKEYS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrackedColdkey[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveTrackedColdkeys(items: TrackedColdkey[]) {
  localStorage.setItem(PORTFOLIO_COLDKEYS_STORAGE_KEY, JSON.stringify(items))
}

function formatTao(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

export function PortfolioClient() {
  const [coldkeys, setColdkeys] = useState<TrackedColdkey[]>([])
  const [selectedId, setSelectedId] = useState<string>(ALL_ID)
  const [newAddress, setNewAddress] = useState("")
  const [newNickname, setNewNickname] = useState("")
  const [balances, setBalances] = useState<ColdkeyPortfolioBalances | null>(
    null,
  )
  const [history, setHistory] = useState<PortfolioBalanceHistory | null>(null)
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>(30)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = loadTrackedColdkeys()
    setColdkeys(stored)
    if (stored.length > 0) {
      setSelectedId(stored[0].address)
    }
  }, [])

  const selectedColdkey =
    selectedId === ALL_ID
      ? null
      : coldkeys.find((c) => c.address === selectedId) ?? null

  const fetchHistory = useCallback(
    async (address: string, days: HistoryPeriod) => {
      setHistoryLoading(true)
      setHistoryError(null)
      setHistory(null)
      try {
        const res = await fetch(
          `/api/portfolio/history?coldkey=${encodeURIComponent(address)}&days=${days}`,
        )
        const data = await res.json()
        if (!res.ok) {
          throw new Error(
            data.error ?? `History request failed (${res.status})`,
          )
        }
        setHistory(data as PortfolioBalanceHistory)
      } catch (e) {
        setHistoryError(
          e instanceof Error ? e.message : "Failed to load balance history",
        )
      } finally {
        setHistoryLoading(false)
      }
    },
    [],
  )

  const fetchBalances = useCallback(async (address: string) => {
    setLoading(true)
    setError(null)
    setBalances(null)
    try {
      const res = await fetch(
        `/api/portfolio/balance?coldkey=${encodeURIComponent(address)}`,
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }
      setBalances(data as ColdkeyPortfolioBalances)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balances")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedColdkey) {
      setBalances(null)
      setError(null)
      setHistory(null)
      setHistoryError(null)
      return
    }
    void fetchBalances(selectedColdkey.address)
    void fetchHistory(selectedColdkey.address, historyPeriod)
  }, [selectedColdkey, fetchBalances, fetchHistory, historyPeriod])

  function handleAdd() {
    const address = newAddress.trim()
    const nickname = newNickname.trim() || address.slice(0, 8)
    if (!address) return
    if (coldkeys.some((c) => c.address === address)) {
      setError("Coldkey already tracked")
      return
    }
    const next = [...coldkeys, { address, nickname }]
    setColdkeys(next)
    saveTrackedColdkeys(next)
    setSelectedId(address)
    setNewAddress("")
    setNewNickname("")
    setError(null)
  }

  function handleRemove(address: string) {
    const next = coldkeys.filter((c) => c.address !== address)
    setColdkeys(next)
    saveTrackedColdkeys(next)
    if (selectedId === address) {
      setSelectedId(next[0]?.address ?? ALL_ID)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Live balances from TAO.app · history from Taoswap (
          <a
            href="https://taoswap.org/"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            taoswap.org
          </a>
          )
        </p>
      </div>

      {/* Coldkey row (chip-style tabs) */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
        <button
          type="button"
          onClick={() => setSelectedId(ALL_ID)}
          className={`rounded-md px-3 py-1.5 text-sm ${
            selectedId === ALL_ID
              ? "bg-muted font-medium"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          All
        </button>
        {coldkeys.map((ck) => (
          <div
            key={ck.address}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm ${
              selectedId === ck.address
                ? "bg-muted font-medium"
                : "text-muted-foreground"
            }`}
          >
            <button type="button" onClick={() => setSelectedId(ck.address)}>
              {ck.nickname}
            </button>
            <button
              type="button"
              className="ml-1 text-xs opacity-60 hover:opacity-100"
              onClick={() => handleRemove(ck.address)}
              aria-label={`Remove ${ck.nickname}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add coldkey */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add coldkey</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Coldkey address (5...)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
          <Input
            placeholder="Nickname"
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
          />
          <Button type="button" onClick={handleAdd}>
            Add
          </Button>
        </CardContent>
      </Card>

      {/* Balances for selected coldkey */}
      {selectedId === ALL_ID && (
        <p className="text-sm text-muted-foreground">
          Select a coldkey to view balances.
        </p>
      )}

      {selectedColdkey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedColdkey.nickname}
            </CardTitle>
            <p className="font-mono text-xs text-muted-foreground break-all">
              {selectedColdkey.address}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {balances && !loading && (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Free TAO</p>
                    <p className="text-lg font-medium">
                      {formatTao(balances.freeTao)} τ
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Alpha in TAO (total)
                    </p>
                    <p className="text-lg font-medium">
                      {formatTao(balances.totalAlphaInTao)} τ
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Reserved / Frozen
                    </p>
                    <p className="text-sm">
                      {formatTao(balances.reservedTao)} /{" "}
                      {formatTao(balances.frozenTao)} τ
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">
                    Alpha balance by subnet
                  </p>
                  {balances.alphaBySubnet.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No subnet stakes
                    </p>
                  ) : (
                    <ul className="divide-y rounded-md border text-sm">
                      {balances.alphaBySubnet.map((row) => (
                        <li
                          key={row.netuid}
                          className="flex justify-between px-3 py-2"
                        >
                          <span>Subnet {row.netuid}</span>
                          <span className="text-muted-foreground">
                            {formatTao(row.alpha)} α →{" "}
                            {formatTao(row.alphaInTao)} τ
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void fetchBalances(selectedColdkey.address)
                    void fetchHistory(selectedColdkey.address, historyPeriod)
                  }}
                >
                  Refresh
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {selectedColdkey && (
        <Card>
          <CardContent className="pt-6">
            <BalanceHistoryChart
              history={history}
              loading={historyLoading}
              error={historyError}
              period={historyPeriod}
              onPeriodChange={setHistoryPeriod}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
