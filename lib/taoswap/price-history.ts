import { taoswapFetch } from "@/lib/taoswap/client"

export const ALPHA_CHART_RANGES = ["24h", "7d", "30d", "90d", "1y"] as const
export type AlphaChartRange = (typeof ALPHA_CHART_RANGES)[number]

type SubnetPriceResolution = "1" | "5" | "15" | "30" | "60" | "240" | "D" | "W"

export interface SubnetPriceBar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface SubnetPriceHistory {
  netuid: number
  resolution: string
  range: AlphaChartRange
  bars: SubnetPriceBar[]
  latestPrice: number | null
  changePct: number | null
}

interface TaoswapPriceHistoryResponse {
  netuid: number
  resolution: string
  count: number
  results: SubnetPriceBar[]
}

function rangeQuery(range: AlphaChartRange): {
  resolution: SubnetPriceResolution
  limit: number
} {
  switch (range) {
    case "24h":
      return { resolution: "60", limit: 24 }
    case "7d":
      return { resolution: "240", limit: 42 }
    case "30d":
      return { resolution: "D", limit: 30 }
    case "90d":
      return { resolution: "D", limit: 90 }
    case "1y":
      return { resolution: "W", limit: 52 }
  }
}

export function isAlphaChartRange(value: string): value is AlphaChartRange {
  return (ALPHA_CHART_RANGES as readonly string[]).includes(value)
}

export async function getSubnetPriceHistory(
  netuid: number,
  range: AlphaChartRange = "7d",
): Promise<SubnetPriceHistory> {
  const { resolution, limit } = rangeQuery(range)
  const res = await taoswapFetch<TaoswapPriceHistoryResponse>(
    "/subnet-price-history/",
    { netuid, resolution, limit },
    { revalidate: 120 },
  )

  const bars = [...(res.results ?? [])].sort((a, b) => a.time - b.time)
  const first = bars[0]?.close
  const last = bars.at(-1)?.close ?? null
  const changePct =
    first != null && last != null && first > 0
      ? ((last - first) / first) * 100
      : null

  return {
    netuid,
    resolution: res.resolution ?? resolution,
    range,
    bars,
    latestPrice: last,
    changePct,
  }
}
