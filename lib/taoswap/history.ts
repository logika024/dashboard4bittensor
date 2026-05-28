import { taoswapFetch } from "@/lib/taoswap/client"
import { raoToTao } from "@/lib/taoswap/format"
import type {
  PortfolioBalanceHistory,
  PortfolioBalanceHistoryDay,
  PortfolioSubnetBalanceDay,
  TaoswapPortfolioBalanceDayRaw,
  TaoswapPortfolioBalanceRaw,
} from "@/lib/taoswap/types"

export interface GetPortfolioBalanceHistoryOptions {
  coldkey: string
  days?: number
  /** CSV of netuids or "all" — passed through to Taoswap */
  subnets?: string
}

function mapDay(row: TaoswapPortfolioBalanceDayRaw): PortfolioBalanceHistoryDay {
  const subnets: PortfolioSubnetBalanceDay[] | undefined = row.subnets?.map(
    (s) => ({
      netuid: s.netuid,
      alpha: Number(s.alpha_amount),
      alphaInTao: Number(s.alpha_in_tao),
      alphaInUsd: Number(s.alpha_in_usd),
    }),
  )

  return {
    date: row.date,
    freeTao: raoToTao(row.free),
    stakedTao: raoToTao(row.staked_tao),
    stakedAlphaInTao: raoToTao(row.staked_alpha_in_tao),
    totalTao: raoToTao(row.total_tao),
    freeUsd: Number(row.free_in_usd),
    stakedTaoUsd: Number(row.staked_tao_in_usd),
    stakedAlphaUsd: Number(row.staked_alpha_in_usd),
    totalUsd: Number(row.total_usd),
    ...(subnets && subnets.length > 0 ? { subnets } : {}),
  }
}

/**
 * Daily balance history from Taoswap (GET /portfolio-balance/).
 * @see https://api.taoswap.org/portfolio-balance/
 */
export async function getPortfolioBalanceHistory(
  options: GetPortfolioBalanceHistoryOptions,
): Promise<PortfolioBalanceHistory> {
  const days = options.days ?? 30

  const raw = await taoswapFetch<TaoswapPortfolioBalanceRaw>(
    "/portfolio-balance/",
    {
      account: options.coldkey,
      days,
      ...(options.subnets ? { subnets: options.subnets } : {}),
    },
  )

  const results = raw.results.map(mapDay).sort((a, b) =>
    a.date.localeCompare(b.date),
  )

  return {
    coldkey: options.coldkey,
    accountKnown: raw.account_known,
    rank: raw.rank,
    valueChange: raw.value_change,
    days,
    results,
  }
}
