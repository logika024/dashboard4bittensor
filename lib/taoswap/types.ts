/** Raw Taoswap GET /portfolio-balance/ response (partial). */
export interface TaoswapPortfolioBalanceRaw {
  account_known: boolean
  coldkey_swap: unknown
  rank: TaoswapRank | null
  value_change: TaoswapValueChange | null
  subnet_value_change: unknown
  results: TaoswapPortfolioBalanceDayRaw[]
}

export interface TaoswapRank {
  rank: number
  rank_alpha: number
  total_accounts: number
  as_of: string
}

export interface TaoswapValueChangePeriod {
  tao_abs: number
  tao_pct: number
  usd_abs: string
  usd_pct: number
}

export interface TaoswapValueChange {
  as_of: string
  "24h": TaoswapValueChangePeriod
  "7d": TaoswapValueChangePeriod
  "30d": TaoswapValueChangePeriod
}

export interface TaoswapPortfolioBalanceDayRaw {
  date: string
  free: number
  staked_tao: number
  staked_alpha: number
  staked_alpha_in_tao: number
  total_tao: number
  free_in_usd: string
  staked_tao_in_usd: string
  staked_alpha_in_usd: string
  total_usd: string
  subnets?: TaoswapSubnetBalanceRaw[]
}

export interface TaoswapSubnetBalanceRaw {
  netuid: number
  alpha_amount: string
  alpha_in_tao: string
  alpha_in_usd: string
}

/** Normalized history returned by our API route. */
export interface PortfolioBalanceHistory {
  coldkey: string
  accountKnown: boolean
  rank: TaoswapRank | null
  valueChange: TaoswapValueChange | null
  days: number
  results: PortfolioBalanceHistoryDay[]
}

export interface PortfolioBalanceHistoryDay {
  date: string
  freeTao: number
  stakedTao: number
  stakedAlphaInTao: number
  totalTao: number
  freeUsd: number
  stakedTaoUsd: number
  stakedAlphaUsd: number
  totalUsd: number
  subnets?: PortfolioSubnetBalanceDay[]
}

export interface PortfolioSubnetBalanceDay {
  netuid: number
  alpha: number
  alphaInTao: number
  alphaInUsd: number
}

export interface AlphaSubnetBalance {
  netuid: number
  alpha: number
  alphaInTao: number
  alphaInUsd: number
}

/** Latest balance snapshot derived from Taoswap portfolio-balance (daily). */
export interface ColdkeyPortfolioBalances {
  coldkey: string
  accountKnown: boolean
  /** Snapshot date (YYYY-MM-DD) from Taoswap; null if no rows returned. */
  asOf: string | null
  freeTao: number
  freeUsd: number
  stakedTao: number
  alphaBySubnet: AlphaSubnetBalance[]
  totalAlphaInTao: number
  totalTao: number
  totalUsd: number
}
