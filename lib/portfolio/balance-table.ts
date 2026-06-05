import type { ColdkeyPortfolioBalances } from "@/lib/taoswap/types"
import type { SubnetScreenerRow } from "@/lib/taoswap/subnets"

export const PORTFOLIO_BALANCE_SORT_KEYS = [
  "subnet",
  "name",
  "price_tao",
  "price_usd",
  "balance",
  "value_tao",
  "value_usd",
  "share",
] as const

export type PortfolioBalanceSortKey =
  (typeof PORTFOLIO_BALANCE_SORT_KEYS)[number]

export type PortfolioBalanceSortDir = "asc" | "desc"

/** One row in the portfolio balances table. `netuid` is null for free TAO. */
export interface PortfolioBalanceTableRow {
  netuid: number | null
  name: string
  symbol: string | null
  logoUrl: string | null
  priceTao: number
  priceUsd: number
  balance: number
  balanceSymbol: string
  valueTao: number
  valueUsd: number
  share: number
}

export function buildPortfolioBalanceRows(
  balances: ColdkeyPortfolioBalances,
  subnets: SubnetScreenerRow[],
): PortfolioBalanceTableRow[] {
  const subnetById = new Map(subnets.map((s) => [s.netuid, s]))
  const taoUsd = taoUsdRate(balances)
  const rows: PortfolioBalanceTableRow[] = []

  if (balances.freeTao > 0) {
    rows.push({
      netuid: null,
      name: "Available",
      symbol: "τ",
      logoUrl: null,
      priceTao: 1,
      priceUsd: taoUsd,
      balance: balances.freeTao,
      balanceSymbol: "τ",
      valueTao: balances.freeTao,
      valueUsd: balances.freeUsd,
      share: 0,
    })
  }

  for (const row of balances.alphaBySubnet) {
    if (row.alpha <= 0 && row.alphaInTao <= 0) continue

    const meta = subnetById.get(row.netuid)
    const symbol = meta?.symbol ?? "α"
    const impliedPriceTao =
      row.alpha > 0 ? row.alphaInTao / row.alpha : (meta?.price ?? 0)
    const priceTao = subnetSpotPriceTao(
      row.netuid,
      subnetById,
      impliedPriceTao,
    )
    const priceUsd =
      priceTao > 0 && taoUsd > 0
        ? priceTao * taoUsd
        : row.alpha > 0
          ? row.alphaInUsd / row.alpha
          : 0
    const valueTao = row.alpha * priceTao
    const valueUsd = row.alpha * priceUsd

    rows.push({
      netuid: row.netuid,
      name: meta?.name ?? `Subnet ${row.netuid}`,
      symbol,
      logoUrl: meta?.logoUrl ?? null,
      priceTao,
      priceUsd,
      balance: row.alpha,
      balanceSymbol: symbol,
      valueTao,
      valueUsd,
      share: 0,
    })
  }

  const totalValueTao = rows.reduce((sum, r) => sum + r.valueTao, 0)
  for (const row of rows) {
    row.share =
      totalValueTao > 0 ? (row.valueTao / totalValueTao) * 100 : 0
  }

  return rows
}

function taoUsdRate(balances: ColdkeyPortfolioBalances): number {
  if (balances.freeTao > 0) return balances.freeUsd / balances.freeTao
  if (balances.totalTao > 0) return balances.totalUsd / balances.totalTao
  return 0
}

function subnetSpotPriceTao(
  netuid: number,
  subnetById: Map<number, SubnetScreenerRow>,
  /** Fallback when screener row is missing — implied from portfolio snapshot. */
  implied: number,
): number {
  const spot = subnetById.get(netuid)?.price
  return spot != null && spot > 0 ? spot : implied
}

export function aggregatePortfolioBalances(
  balances: ColdkeyPortfolioBalances[],
): ColdkeyPortfolioBalances {
  const subnetMap = new Map<
    number,
    { alpha: number; alphaInTao: number; alphaInUsd: number }
  >()
  let freeTao = 0
  let freeUsd = 0
  let stakedTao = 0
  let totalAlphaInTao = 0
  let totalTao = 0
  let totalUsd = 0
  let asOf: string | null = null

  for (const b of balances) {
    freeTao += b.freeTao
    freeUsd += b.freeUsd
    stakedTao += b.stakedTao
    totalAlphaInTao += b.totalAlphaInTao
    totalTao += b.totalTao
    totalUsd += b.totalUsd
    if (b.asOf && (!asOf || b.asOf > asOf)) asOf = b.asOf

    for (const row of b.alphaBySubnet) {
      const existing = subnetMap.get(row.netuid) ?? {
        alpha: 0,
        alphaInTao: 0,
        alphaInUsd: 0,
      }
      subnetMap.set(row.netuid, {
        alpha: existing.alpha + row.alpha,
        alphaInTao: existing.alphaInTao + row.alphaInTao,
        alphaInUsd: existing.alphaInUsd + row.alphaInUsd,
      })
    }
  }

  const alphaBySubnet = [...subnetMap.entries()]
    .map(([netuid, row]) => ({ netuid, ...row }))
    .sort((a, b) => a.netuid - b.netuid)

  return {
    coldkey: "all",
    accountKnown: balances.every((b) => b.accountKnown),
    asOf,
    freeTao,
    freeUsd,
    stakedTao,
    alphaBySubnet,
    totalAlphaInTao,
    totalTao,
    totalUsd,
  }
}

export function matchesBalanceQuery(
  row: PortfolioBalanceTableRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  if (row.netuid != null && String(row.netuid).includes(q)) return true
  if (row.name.toLowerCase().includes(q)) return true
  if (row.symbol?.toLowerCase().includes(q)) return true
  return false
}

const SORT_VALUE: Record<
  PortfolioBalanceSortKey,
  (row: PortfolioBalanceTableRow) => number | string
> = {
  subnet: (row) => row.netuid ?? -1,
  name: (row) => row.name.toLowerCase(),
  price_tao: (row) => row.priceTao,
  price_usd: (row) => row.priceUsd,
  balance: (row) => row.balance,
  value_tao: (row) => row.valueTao,
  value_usd: (row) => row.valueUsd,
  share: (row) => row.share,
}

export function sortPortfolioBalanceRows(
  rows: PortfolioBalanceTableRow[],
  sortKey: PortfolioBalanceSortKey,
  sortDir: PortfolioBalanceSortDir,
): PortfolioBalanceTableRow[] {
  const sorted = [...rows]
  const value = SORT_VALUE[sortKey]
  const sign = sortDir === "desc" ? -1 : 1

  sorted.sort((a, b) => {
    const av = value(a)
    const bv = value(b)
    if (typeof av === "string" && typeof bv === "string") {
      return sign * av.localeCompare(bv)
    }
    return sign * (Number(av) - Number(bv))
  })

  return sorted
}
