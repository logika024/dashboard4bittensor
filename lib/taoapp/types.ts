/** Raw response from GET /api/beta/accounting/spot-balance */
export interface AccountingSpotBalanceResponse {
  stake: AccountingSpotStake[]
  free: number
  reserved: number
  frozen: number
}

export interface AccountingSpotStake {
  netuid: number
  hotkey: string
  stake: number
  locked: number
  emission: number
  tao_emission: number
  drain: number
  subnet_token_price: number | null
}

/** Raw response from GET /api/beta/accounting/price-at-block */
export interface AlphaPriceAtBlock {
  block: number
  netuid: number
  price: number
}

export interface AlphaSubnetBalance {
  netuid: number
  /** Alpha stake in TAO units (human-readable) */
  alpha: number
  /** Alpha stake converted to TAO at current subnet price */
  alphaInTao: number
}

export interface ColdkeyPortfolioBalances {
  coldkey: string
  /** Unstaked free TAO balance */
  freeTao: number
  reservedTao: number
  frozenTao: number
  /** Per-subnet alpha stakes */
  alphaBySubnet: AlphaSubnetBalance[]
  /** Sum of alphaInTao across subnets */
  totalAlphaInTao: number
}
