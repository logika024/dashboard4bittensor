const COINGECKO_BASE = "https://api.coingecko.com/api/v3"

export class CoinGeckoError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "CoinGeckoError"
  }
}

export type PriceRange = "24h" | "7d" | "30d" | "90d" | "1y"

/** Maps a UI range key to the `days=` query CoinGecko expects. */
const RANGE_DAYS: Record<PriceRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
}

/** Coins we expose on the dashboard. `coin` param in the API route is one of these keys. */
export const COIN_IDS = {
  tao: "bittensor",
  btc: "bitcoin",
} as const
export type CoinKey = keyof typeof COIN_IDS

export interface PricePoint {
  /** Unix milliseconds. */
  timestamp: number
  /** Spot price in USD. */
  price: number
}

export interface PriceSummary {
  current: number
  /** Change over the selected range as a fraction (0.02 === +2%). */
  changePct: number
  history: PricePoint[]
  /** Echoed back so the chart knows what window the data is for. */
  range: PriceRange
}

interface MarketChartResponse {
  prices: [number, number][]
}

/**
 * CoinGecko `market_chart` returns auto-bucketed granularity per range:
 * 1d → 5min, 7–30d → hourly, 365d → daily. We compute the displayed
 * Δ% from the first/last sample of the returned window, so it always
 * matches the rendered line.
 */
export async function getPriceSummary(
  coin: CoinKey,
  range: PriceRange,
): Promise<PriceSummary> {
  const days = RANGE_DAYS[range]
  const url = `${COINGECKO_BASE}/coins/${COIN_IDS[coin]}/market_chart?vs_currency=usd&days=${days}`
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 120 },
  })

  if (!res.ok) {
    throw new CoinGeckoError(
      `CoinGecko error: ${res.status} ${res.statusText}`,
      res.status,
    )
  }

  const data = (await res.json()) as MarketChartResponse
  const history: PricePoint[] = data.prices.map(([ts, price]) => ({
    timestamp: ts,
    price,
  }))

  const first = history[0]
  const last = history.at(-1)
  const current = last?.price ?? 0
  const changePct =
    first && last && first.price > 0
      ? (last.price - first.price) / first.price
      : 0

  return { current, changePct, history, range }
}

export const PRICE_RANGES: readonly PriceRange[] = [
  "24h",
  "7d",
  "30d",
  "90d",
  "1y",
]
