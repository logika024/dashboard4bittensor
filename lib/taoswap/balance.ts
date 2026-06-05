import { getPortfolioBalanceHistory } from "@/lib/taoswap/history"
import type { ColdkeyPortfolioBalances } from "@/lib/taoswap/types"

/**
 * Latest coldkey balances from Taoswap GET /portfolio-balance/ (daily snapshot).
 * Uses `days=1` and `subnets=all` for per-subnet alpha breakdown.
 */
export async function getColdkeyPortfolioBalances(
  coldkey: string,
): Promise<ColdkeyPortfolioBalances> {
  const history = await getPortfolioBalanceHistory({
    coldkey,
    days: 1,
    subnets: "all",
  })

  const latest = history.results.at(-1)
  if (!latest) {
    return {
      coldkey,
      accountKnown: history.accountKnown,
      asOf: null,
      freeTao: 0,
      freeUsd: 0,
      stakedTao: 0,
      alphaBySubnet: [],
      totalAlphaInTao: 0,
      totalTao: 0,
      totalUsd: 0,
    }
  }

  const alphaBySubnet = (latest.subnets ?? [])
    .map((row) => ({
      netuid: row.netuid,
      alpha: row.alpha,
      alphaInTao: row.alphaInTao,
      alphaInUsd: row.alphaInUsd,
    }))
    .sort((a, b) => a.netuid - b.netuid)

  return {
    coldkey,
    accountKnown: history.accountKnown,
    asOf: latest.date,
    freeTao: latest.freeTao,
    freeUsd: latest.freeUsd,
    stakedTao: latest.stakedTao,
    alphaBySubnet,
    totalAlphaInTao: latest.stakedAlphaInTao,
    totalTao: latest.totalTao,
    totalUsd: latest.totalUsd,
  }
}
